import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { buildApp } from '../app.js';
import { createAuth, createAuthPool } from '../auth/service.js';
import { provisionRoles } from '../auth/provision.js';
import { migrateAuth } from '../auth/migrate.js';
import type { AuthConfig } from '../auth/config.js';
import { businessTransaction, createBusinessPool } from './store.js';

vi.mock('../auth/mail.js', () => ({ createMailer: () => ({ send: vi.fn(async () => undefined), close: vi.fn() }) }));
const databaseURL = process.env.AUTH_TEST_DATABASE_URL;
const migrationURL = process.env.AUTH_TEST_MIGRATION_DATABASE_URL;
if (!databaseURL || !migrationURL || !new URL(databaseURL).pathname.startsWith('/enterprise_auth_test'))
  throw new Error('Explicit disposable PostgreSQL database required');
const businessURL = databaseURL.replace('identity_runtime:', 'business_runtime:');
const config: AuthConfig = { baseURL: 'http://127.0.0.1:5173', secret: randomBytes(48).toString('base64url'), databaseURL, businessDatabaseURL: businessURL, smtp: { host: '127.0.0.1', port: 1025, secure: false, from: 'test@example.test' } };
const operator = new Pool({ connectionString: migrationURL });
const identity = createAuthPool(databaseURL);
const business = createBusinessPool(businessURL);
const accounts: { id: string; actor: string; cookie: string }[] = [];
const tenants: string[] = [];
const organizations: string[] = [];
let app: ReturnType<typeof buildApp>;
let roleId = '';
const at = (values: string[], index: number) => {
  const value = values[index];
  if (!value) throw new Error('Missing fixture identifier');
  return value;
};
const account = (index: number) => {
  const value = accounts[index];
  if (!value) throw new Error('Missing fixture account');
  return value;
};
const get = (url: string, index = 0) => app.inject({ url, headers: { cookie: account(index).cookie } });
const write = (method: 'POST' | 'PUT' | 'PATCH', url: string, payload: object, index = 0) =>
  app.inject({ method, url, headers: { origin: config.baseURL, cookie: account(index).cookie }, payload });
const profilePath = (index: number) => '/api/profile?tenantId=' + at(tenants, index);
const auditPath = (index: number) => '/api/audit-logs?tenantId=' + at(tenants, index);
const roleBody = (permissions: string[], confirmed = false) => ({ name: 'HTTP audit reader', scope: 'tenant', permissions, delegable: true, confirmed });

describe('Contrats B2B HTTP avec sessions et PostgreSQL réels', () => {
  beforeAll(async () => {
    await provisionRoles(migrationURL, databaseURL, businessURL);
    await migrateAuth(config, migrationURL);
    app = buildApp({ authConfig: config });
    const auth = createAuth(config, identity, async () => {}, true);
    for (let index = 0; index < 3; index++) {
      const email = `http-${randomBytes(8).toString('hex')}@example.test`;
      const password = randomBytes(24).toString('base64url');
      const created = await auth.api.signUpEmail({ body: { email, name: 'HTTP fixture', password } });
      await operator.query('UPDATE identity."user" SET "emailVerified"=true WHERE id=$1', [created.user.id]);
      const actor = await businessTransaction(business, created.user.id, undefined, 'fixture.read', async (_client, context) => context.actorId);
      const login = await app.inject({ method: 'POST', url: '/api/auth/sign-in/email', headers: { origin: config.baseURL }, payload: { email, password } });
      expect(login.statusCode).toBe(200);
      accounts.push({ id: created.user.id, actor, cookie: login.cookies.map((cookie) => cookie.name + '=' + cookie.value).join('; ') });
    }
    await operator.query('UPDATE identity."user" SET name=$1 WHERE id=$2', ['   ', account(1).id]);
    await operator.query("UPDATE authorization_private.actors SET platform_role='super_admin' WHERE id=$1", [account(0).actor]);
    for (const name of ['HTTP client A', 'HTTP client B']) {
      const created = await write('POST', '/api/organizations', { name });
      expect(created.statusCode).toBe(201);
      organizations.push(created.json<{ id: string }>().id);
    }
    for (const [index, organizationIndex] of [0, 0, 1].entries()) {
      const created = await write('POST', '/api/organizations/' + at(organizations, organizationIndex) + '/tenants', { name: 'HTTP tenant ' + index, adminEmail: `http-admin-${randomBytes(8).toString('hex')}@example.test` });
      expect(created.statusCode).toBe(201);
      expect(created.json().delivery).toBe('sent');
      tenants.push(created.json<{ id: string }>().id);
    }
    await operator.query("INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,'member'),($1,$3,'member'),($4,$2,'tenant_admin')", [account(1).actor, at(tenants, 0), at(tenants, 1), account(2).actor]);
  });
  afterAll(async () => {
    await app?.close();
    if (accounts[0]) await operator.query('UPDATE authorization_private.actors SET platform_role=NULL WHERE id=$1', [account(0).actor]);
    await Promise.all([operator.end(), identity.end(), business.end()]);
  });

  it('crée organisation et tenants par HTTP et conserve leur portée persistée', async () => {
    expect((await get('/api/organizations')).statusCode).toBe(200);
    const persisted = await operator.query<{ organization_id: string }>('SELECT organization_id FROM business.tenants WHERE id=ANY($1) ORDER BY name', [tenants]);
    expect(persisted.rows.map((row) => row.organization_id)).toEqual([at(organizations, 0), at(organizations, 0), at(organizations, 1)]);
    expect((await write('POST', '/api/organizations', { name: 'Forbidden' }, 1)).statusCode).toBe(403);
    expect((await get('/api/tenants', 1)).json<{ id: string }[]>().map((tenant) => tenant.id).sort()).toEqual(tenants.slice(0, 2).sort());
  });

  it('lit un ancien nom incomplet puis enregistre prénom et nom seuls dans la vérité SDK', async () => {
    const initial = await get(profilePath(0), 1);
    expect(initial.statusCode).toBe(200);
    expect(initial.json()).toMatchObject({ first_name: null, last_name: null, phone_number: null, avatar_url: null });
    const saved = await write('PUT', profilePath(0), { first_name: '  Alice ', last_name: ' Martin  ' }, 1);
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toMatchObject({ first_name: 'Alice', last_name: 'Martin', phone_number: null, avatar_url: null });
    expect((await operator.query('SELECT name,first_name,last_name,"emailVerified" FROM identity."user" WHERE id=$1', [account(1).id])).rows[0]).toEqual({ name: 'Alice Martin', first_name: 'Alice', last_name: 'Martin', emailVerified: true });
    const sdk = await get('/api/auth/get-session', 1);
    expect(sdk.statusCode).toBe(200);
    expect(sdk.json().user.name).toBe('Alice Martin');
  });

  it('persiste poste et département dans le tenant actif sans donner accès au client étranger', async () => {
    const profile = { first_name: 'Alice', last_name: 'Martin' };
    expect((await write('PUT', profilePath(0), { ...profile, job_title: 'Architecte', department: 'Produit' }, 1)).statusCode).toBe(200);
    expect((await get(profilePath(1), 1)).json()).toMatchObject({ job_title: null, department: null });
    expect((await write('PUT', profilePath(1), { ...profile, job_title: 'Conseil', department: 'Recherche' }, 1)).statusCode).toBe(200);
    expect((await get(profilePath(0), 1)).json()).toMatchObject({ job_title: 'Architecte', department: 'Produit' });
    expect((await get(profilePath(1), 1)).json()).toMatchObject({ job_title: 'Conseil', department: 'Recherche' });
    expect((await get(profilePath(2), 1)).statusCode).toBe(403);
    expect((await write('PUT', profilePath(0), { ...profile, role: 'tenant_admin' }, 1)).statusCode).toBe(400);
    expect((await operator.query('SELECT role FROM authorization_private.memberships WHERE actor_id=$1 AND tenant_id=$2', [account(1).actor, at(tenants, 0)])).rows[0]?.role).toBe('member');
  });

  it('applique les rôles custom dès la requête suivante et exige confirmation de leur impact', async () => {
    expect((await get(auditPath(0), 1)).statusCode).toBe(403);
    expect((await write('POST', '/api/roles', roleBody(['audit.read']), 2)).statusCode).toBe(403);
    const created = await write('POST', '/api/roles', roleBody(['audit.read']));
    expect(created.statusCode).toBe(201);
    roleId = created.json<{ id: string }>().id;
    const assignment = { actorId: account(1).actor, roleId, organizationId: at(organizations, 0), tenantId: at(tenants, 0), operation: 'grant' };
    expect((await write('POST', '/api/role-assignments', assignment)).statusCode).toBe(200);
    expect((await get(auditPath(0), 1)).statusCode).toBe(200);
    expect((await get(auditPath(1), 1)).statusCode).toBe(403);
    expect((await get(auditPath(2), 1)).statusCode).toBe(403);
    expect((await write('PUT', '/api/roles/' + roleId, roleBody([], false))).statusCode).toBe(400);
    expect((await get(auditPath(0), 1)).statusCode).toBe(200);
    expect((await write('PUT', '/api/roles/' + roleId, roleBody([], true))).statusCode).toBe(200);
    expect((await get(auditPath(0), 1)).statusCode).toBe(403);
    expect((await write('PUT', '/api/roles/' + roleId, roleBody(['audit.read'], true))).statusCode).toBe(200);
    expect((await get(auditPath(0), 1)).statusCode).toBe(200);
  });

  it('refuse les memberships invited et suspended avec une session SDK toujours valide', async () => {
    const path = '/api/members/' + account(1).actor + '/status?tenantId=' + at(tenants, 0);
    for (const status of ['invited', 'suspended']) {
      expect((await write('PATCH', path, { status }, 2)).statusCode).toBe(200);
      expect((await get(profilePath(0), 1)).statusCode).toBe(403);
      expect((await get(auditPath(0), 1)).statusCode).toBe(403);
      expect((await get(profilePath(1), 1)).statusCode).toBe(200);
      expect((await get('/api/auth/get-session', 1)).json().user.id).toBe(account(1).id);
    }
    expect((await write('PATCH', path, { status: 'active' }, 2)).statusCode).toBe(200);
    expect((await get(auditPath(0), 1)).statusCode).toBe(200);
    expect((await get(profilePath(0), 1)).statusCode).toBe(200);
  });
});
