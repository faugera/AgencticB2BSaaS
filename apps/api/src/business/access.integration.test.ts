import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { buildApp } from '../app.js';
import { createAuth, createAuthPool } from '../auth/service.js';
import { provisionRoles } from '../auth/provision.js';
import { migrateAuth } from '../auth/migrate.js';
import type { AuthConfig } from '../auth/config.js';
import { businessTransaction, createBusinessPool } from './store.js';

const databaseURL = process.env.AUTH_TEST_DATABASE_URL;
const migrationURL = process.env.AUTH_TEST_MIGRATION_DATABASE_URL;
if (!databaseURL || !migrationURL || !new URL(databaseURL).pathname.startsWith('/enterprise_auth_test'))
  throw new Error('Explicit disposable PostgreSQL database required');
const businessURL = databaseURL.replace('identity_runtime:', 'business_runtime:');
const config: AuthConfig = { baseURL: 'http://127.0.0.1:5173', secret: randomBytes(48).toString('base64url'), databaseURL, businessDatabaseURL: businessURL, smtp: { host: '127.0.0.1', port: 1025, secure: false, from: 'test@example.test' } };
const operator = new Pool({ connectionString: migrationURL });
const identity = createAuthPool(databaseURL);
const business = createBusinessPool(businessURL);
const password = randomBytes(24).toString('base64url');
const accounts: { id: string; actor: string; email: string; cookie: string }[] = [];
const tenants: string[] = [];
let app: ReturnType<typeof buildApp>;
let link = '';
let requestId = '';
const headers = { origin: config.baseURL };
const account = (index: number) => {
  const value = accounts[index];
  if (!value) throw new Error('Missing test account');
  return value;
};
const post = (url: string, payload: object, index?: number) => app.inject({ method: 'POST', url, headers: { ...headers, ...(index === undefined ? {} : { cookie: account(index).cookie }) }, payload });

describe('access requests, protected documentation and own-account profile', () => {
  beforeAll(async () => {
    await provisionRoles(migrationURL, databaseURL, businessURL);
    await migrateAuth(config, migrationURL);
    app = buildApp({ authConfig: config });
    const auth = createAuth(config, identity, async () => {}, true);
    for (let index = 0; index < 4; index++) {
      const email = `pages-${randomBytes(8).toString('hex')}@example.test`;
      const created = await auth.api.signUpEmail({ body: { email, name: 'Profile fixture', password } });
      await operator.query('UPDATE identity."user" SET "emailVerified"=true WHERE id=$1', [created.user.id]);
      const actor = await businessTransaction(business, created.user.id, undefined, 'fixture.read', async (_client, context) => context.actorId);
      const response = await post('/api/auth/sign-in/email', { email, password });
      expect(response.statusCode).toBe(200);
      accounts.push({ id: created.user.id, actor, email, cookie: response.cookies.map((cookie) => cookie.name + '=' + cookie.value).join('; ') });
    }
    await operator.query("UPDATE authorization_private.actors SET platform_role='super_admin' WHERE id=$1", [account(3).actor]);
    for (let index = 0; index < 2; index++) {
      const result = await businessTransaction(business, account(3).id, undefined, 'fixture.tenant', async (client) =>
        (await client.query<{ id: string }>('INSERT INTO business.tenants(name) VALUES($1) RETURNING id', ['Access fixture'])).rows[0]?.id);
      if (!result) throw new Error('Missing fixture tenant');
      tenants.push(result);
      await operator.query("INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,'tenant_admin')", [account(index * 2).actor, result]);
    }
    await operator.query("INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,'member')", [account(1).actor, tenants[0]]);
  });
  it('isolates preferences by identity and workspace appearance by tenant and role', async () => {
    const put = (url: string, payload: object, index?: number) => app.inject({ method: 'PUT', url, headers: { ...headers, ...(index === undefined ? {} : { cookie: account(index).cookie }) }, payload });
    const get = (index: number) => app.inject({ url: '/api/preferences', headers: { cookie: account(index).cookie } });
    expect((await put('/api/preferences', { locale: 'en', theme: 'dark' })).statusCode).toBe(401);
    expect((await put('/api/preferences', { locale: 'en', theme: 'dark' }, 0)).statusCode).toBe(200);
    expect((await get(0)).json()).toEqual({ locale: 'en', theme: 'dark' });
    expect((await get(1)).json()).toBeNull();
    expect((await put('/api/preferences', { locale: 'fr', theme: 'light', actorId: account(1).actor }, 0)).statusCode).toBe(400);
    const created = await post('/api/workspaces', { name: 'Appearance fixture', visibility: 'tenant' }, 0);
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    const path = '/api/workspaces/' + id + '/appearance';
    expect((await put(path, { color: '#b5a2df' }, 1)).statusCode).toBe(403);
    expect((await put(path + '?tenantId=' + tenants[0], { color: '#b5a2df' }, 2)).statusCode).toBe(403);
    expect((await put(path, { color: '#ffffff;display:none' }, 0)).statusCode).toBe(400);
    expect((await put(path, { color: '#b5a2df' }, 0)).statusCode).toBe(200);
    const read = await app.inject({ url: '/api/workspaces/' + id, headers: { cookie: account(1).cookie } });
    expect(read.json().color).toBe('#b5a2df');
    const hidden = await businessTransaction(business, account(2).id, tenants[1], 'appearance.read', async (client) => client.query<{ color: string | null }>('SELECT business.workspace_color($1) color', [id]));
    expect(hidden.rows[0]?.color).toBeNull();
    await expect(business.query('SELECT * FROM authorization_private.ui_preferences')).rejects.toThrow();
    await expect(business.query('SELECT * FROM authorization_private.workspace_appearance')).rejects.toThrow();
    expect((await put(path, { color: null }, 0)).statusCode).toBe(200);
  });
  afterAll(async () => {
    if (accounts[3]) await operator.query('UPDATE authorization_private.actors SET platform_role=NULL WHERE id=$1', [account(3).actor]);
    await app?.close();
    await Promise.all([operator.end(), identity.end(), business.end()]);
  });
  it('protects documentation at HTTP and database identity boundaries', async () => {
    expect((await app.inject('/api/platform/docs')).statusCode).toBe(401);
    for (const index of [0, 1, 2]) expect((await app.inject({ url: '/api/platform/docs', headers: { cookie: account(index).cookie } })).statusCode).toBe(403);
    const response = await app.inject({ url: '/api/platform/docs', headers: { cookie: account(3).cookie } });
    expect(response.statusCode).toBe(200);
    expect(response.json().fr[0].title).toBe('Accès et organisations');
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('allows only a tenant administrator to generate their own opaque link', async () => {
    expect((await post('/api/access-link', {}, 1)).statusCode).toBe(403);
    expect((await post('/api/access-link?tenantId=' + tenants[1], {}, 0)).statusCode).toBe(403);
    const response = await post('/api/access-link', {}, 0);
    expect(response.statusCode).toBe(200);
    const url = new URL(response.json().url);
    link = url.searchParams.get('link') ?? '';
    expect(link).toMatch(/^[0-9a-f-]{36}$/);
    expect(link).not.toBe(tenants[0]);
    expect((await post('/api/access-link', {}, 0)).json()).toEqual(response.json());
    await expect(business.query('SELECT * FROM authorization_private.access_requests')).rejects.toThrow();
  });
  it('records a bounded request once, with no identity or membership and no public tenant disclosure', async () => {
    const email = `candidate-${randomBytes(8).toString('hex')}@example.test`;
    const payload = { link, firstName: 'Candidate', lastName: 'Applicant', email };
    const initial = await post('/api/access-requests', payload);
    expect(initial.statusCode).toBe(202);
    expect((await post('/api/access-requests', payload)).json()).toEqual(initial.json());
    expect((await post('/api/access-requests', { ...payload, link: randomUUID() })).json()).toEqual(initial.json());
    const records = await operator.query('SELECT id FROM authorization_private.access_requests WHERE email=$1', [email]);
    expect(records.rows).toHaveLength(1);
    requestId = records.rows[0]?.id;
    expect((await identity.query('SELECT id FROM identity."user" WHERE email=$1', [email])).rowCount).toBe(0);
  });
  it('rejects invalid input, untrusted origins and rate-limits public submissions', async () => {
    const payload = { link, firstName: 'Test', lastName: 'Candidate', email: 'valid@example.test' };
    const invalid = await app.inject({ method: 'POST', url: '/api/access-requests', remoteAddress: '198.51.100.22', headers, payload: { ...payload, firstName: ' ', email: 'invalid' } });
    expect(invalid.statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/access-requests', remoteAddress: '198.51.100.23', payload })).statusCode).toBe(403);
    let status = 0;
    for (let i = 0; i < 4; i++) status = (await app.inject({ method: 'POST', url: '/api/access-requests', remoteAddress: '198.51.100.24', headers, payload })).statusCode;
    expect(status).toBe(429);
  });
  it('denies cross-tenant review and serializes approval through the existing invitation flow', async () => {
    expect((await app.inject({ url: '/api/access-requests', headers: { cookie: account(1).cookie } })).statusCode).toBe(403);
    expect((await app.inject({ url: '/api/access-requests', headers: { cookie: account(2).cookie } })).json()).toEqual([]);
    expect((await post('/api/access-requests/' + requestId, { operation: 'approve', role: 'member' }, 2)).statusCode).toBe(403);
    const decisions = await Promise.all([0, 1].map(() => post('/api/access-requests/' + requestId, { operation: 'approve', role: 'member' }, 0)));
    expect(decisions.map((response) => response.statusCode).sort()).toEqual([200, 409]);
    expect((await operator.query('SELECT status,invitation_id FROM authorization_private.access_requests WHERE id=$1', [requestId])).rows[0]).toMatchObject({ status: 'approved', invitation_id: expect.any(String) });
    expect((await app.inject({ url: '/api/access-requests', headers: { cookie: account(0).cookie } })).statusCode).toBe(200);
  });
  it('keeps email and roles read-only and limits session revocation to the current user', async () => {
    expect((await post('/api/auth/update-user', { name: 'Updated profile' }, 0)).statusCode).toBe(200);
    expect((await identity.query('SELECT name FROM identity."user" WHERE id=$1', [account(0).id])).rows[0]?.name).toBe('Updated profile');
    expect((await post('/api/auth/update-user', { name: 'Escalation', email: 'other@example.test', platformRole: 'super_admin' }, 0)).statusCode).toBe(400);
    expect((await post('/api/auth/update-user', { name: ' ' }, 0)).statusCode).toBe(400);
    const second = await post('/api/auth/sign-in/email', { email: account(0).email, password });
    expect(second.statusCode).toBe(200);
    const secondCookie = second.cookies.map((cookie) => cookie.name + '=' + cookie.value).join('; ');
    const sessions = await app.inject({ url: '/api/auth/list-sessions', headers: { cookie: account(0).cookie } });
    expect(sessions.json().length).toBeGreaterThanOrEqual(2);
    expect((await post('/api/auth/revoke-other-sessions', {}, 0)).statusCode).toBe(200);
    expect((await app.inject({ url: '/api/auth/get-session', headers: { cookie: account(0).cookie } })).json()?.user.id).toBe(account(0).id);
    expect((await app.inject({ url: '/api/auth/get-session', headers: { cookie: secondCookie } })).json()).toBeNull();
    expect((await app.inject({ url: '/api/auth/get-session', headers: { cookie: account(1).cookie } })).json()?.user.id).toBe(account(1).id);
  });
});
