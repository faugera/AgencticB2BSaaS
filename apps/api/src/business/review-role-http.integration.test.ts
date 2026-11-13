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
const config: AuthConfig = { baseURL: 'http://127.0.0.1:5173', secret: randomBytes(48).toString('base64url'), databaseURL, businessDatabaseURL: businessURL, outboxEncryption: { activeKeyId: 'test-v1', keys: { 'test-v1': randomBytes(32).toString('base64url') } }, smtp: { host: '127.0.0.1', port: 1025, secure: false, from: 'test@example.test' } };
const operator = new Pool({ connectionString: migrationURL });
const identity = createAuthPool(databaseURL);
const business = createBusinessPool(businessURL);
let app: ReturnType<typeof buildApp>;
let superActor = '';
let cookie = '';
let defaultTenant = '';
let allowedTenant = '';
let foreignTenant = '';

describe('Portée HTTP du catalogue de rôles', () => {
  beforeAll(async () => {
    await provisionRoles(migrationURL, databaseURL, businessURL);
    await migrateAuth(config, migrationURL);
    app = buildApp({ authConfig: config });
    const auth = createAuth(config, identity, async () => {}, true);
    const actors: { identity: string; actor: string; cookie: string }[] = [];
    for (let index = 0; index < 2; index++) {
      const email = `role-scope-${randomBytes(8).toString('hex')}@example.test`;
      const password = randomBytes(24).toString('base64url');
      const created = await auth.api.signUpEmail({ body: { email, name: 'Fixture rôles', password } });
      await operator.query('UPDATE identity."user" SET "emailVerified"=true WHERE id=$1', [created.user.id]);
      const actor = await businessTransaction(business, created.user.id, undefined, 'fixture.read', async (_client, context) => context.actorId);
      if (!actor) throw new Error('Missing fixture actor');
      const remoteAddress = `2001:db8:${randomBytes(2).toString('hex')}:${randomBytes(2).toString('hex')}::1`;
      const login = await app.inject({ method: 'POST', url: '/api/auth/sign-in/email', remoteAddress, headers: { origin: config.baseURL }, payload: { email, password } });
      expect(login.statusCode).toBe(200);
      actors.push({ identity: created.user.id, actor, cookie: login.cookies.map((item) => item.name + '=' + item.value).join('; ') });
    }
    const superUser = actors[0]; const user = actors[1];
    if (!superUser || !user) throw new Error('Missing fixture accounts');
    superActor = superUser.actor; cookie = user.cookie;
    await operator.query("UPDATE authorization_private.actors SET platform_role='super_admin' WHERE id=$1", [superActor]);
    const tx = <T>(run: Parameters<typeof businessTransaction<T>>[4]) => businessTransaction(business, superUser.identity, undefined, 'fixture.read', run);
    const createOrganization = async (name: string) => tx(async (client) => (await client.query<{ id: string }>('SELECT business.create_organization($1) id', [name])).rows[0]?.id ?? '');
    const createTenant = async (org: string) => tx(async (client) => (await client.query<{ id: string }>('SELECT business.create_tenant($1,$2,$3) id', [org, 'Tenant rôles', 'billing@example.test'])).rows[0]?.id ?? '');
    const org = await createOrganization('Client rôles');
    const foreignOrg = await createOrganization('Client étranger rôles');
    const localTenants = [await createTenant(org), await createTenant(org)].sort();
    defaultTenant = localTenants[0] ?? ''; allowedTenant = localTenants[1] ?? '';
    foreignTenant = await createTenant(foreignOrg);
    expect([defaultTenant, allowedTenant, foreignTenant].every(Boolean)).toBe(true);
    await operator.query("INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,'member'),($1,$3,'tenant_admin')", [user.actor, defaultTenant, allowedTenant]);
  });
  afterAll(async () => {
    await app?.close();
    if (superActor) await operator.query('UPDATE authorization_private.actors SET platform_role=NULL WHERE id=$1', [superActor]);
    await Promise.all([operator.end(), identity.end(), business.end()]);
  });

  it('autorise le tenant non défaut attribué et refuse les portées étrangères ou invalides', async () => {
    const get = (query: string) => app.inject({ url: '/api/roles' + query, headers: { cookie } });
    expect((await get('')).statusCode).toBe(403);
    const allowed = await get('?tenantId=' + allowedTenant);
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json<unknown[]>().length).toBeGreaterThan(0);
    expect((await get('?tenantId=' + foreignTenant)).statusCode).toBe(403);
    expect((await get('?tenantId=invalid')).statusCode).toBe(400);
    expect((await get('?tenantId=' + allowedTenant + '&extra=1')).statusCode).toBe(400);
  });
});
