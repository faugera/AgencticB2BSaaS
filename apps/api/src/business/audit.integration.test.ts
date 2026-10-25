import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import type { AuditPage } from '@enterprise/shared';
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
const accounts: { id: string; actor: string; cookie: string }[] = [];
const tenants: string[] = [];
let app: ReturnType<typeof buildApp>;
const account = (index: number) => {
  const value = accounts[index];
  if (!value) throw new Error('Missing account');
  return value;
};
const read = (query = '', index = 0) => app.inject({ url: '/api/platform/audit' + query, headers: { cookie: account(index).cookie } });

describe('persistent mutation audit and super-admin consultation', () => {
  beforeAll(async () => {
    await provisionRoles(migrationURL, databaseURL, businessURL);
    await migrateAuth(config, migrationURL);
    await operator.query('TRUNCATE identity."rateLimit"');
    app = buildApp({ authConfig: config });
    const auth = createAuth(config, identity, async () => {}, true);
    for (let index = 0; index < 3; index++) {
      const password = randomBytes(24).toString('base64url');
      const email = `audit-${randomBytes(8).toString('hex')}@example.test`;
      const created = await auth.api.signUpEmail({ body: { email, name: 'Audit fixture', password } });
      await operator.query('UPDATE identity."user" SET "emailVerified"=true WHERE id=$1', [created.user.id]);
      const actor = await businessTransaction(business, created.user.id, undefined, 'fixture.read', async (_client, context) => context.actorId);
      const response = await app.inject({ method: 'POST', url: '/api/auth/sign-in/email', headers: { origin: config.baseURL }, payload: { email, password } });
      expect(response.statusCode).toBe(200);
      accounts.push({ id: created.user.id, actor, cookie: response.cookies.map((cookie) => cookie.name + '=' + cookie.value).join('; ') });
    }
    await operator.query("UPDATE authorization_private.actors SET platform_role='super_admin' WHERE id=$1", [account(0).actor]);
    for (let index = 0; index < 2; index++) {
      const tenant = await businessTransaction(business, account(0).id, undefined, 'fixture.create', async (client) =>
        (await client.query<{ id: string }>('INSERT INTO business.tenants(name) VALUES($1) RETURNING id', ['Audit tenant'])).rows[0]?.id);
      if (!tenant) throw new Error('Missing tenant');
      tenants.push(tenant);
      await operator.query('INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,$3)', [account(index + 1).actor, tenant, index === 0 ? 'tenant_admin' : 'member']);
    }
  });
  afterAll(async () => {
    await app?.close();
    if (accounts[0]) await operator.query('UPDATE authorization_private.actors SET platform_role=NULL WHERE id=$1', [accounts[0].actor]);
    await operator.query('TRUNCATE identity."rateLimit"');
    await Promise.all([operator.end(), identity.end(), business.end()]);
  });

  it('refuses anonymous, ordinary roles, disabled super-admins and direct SQL access', async () => {
    expect((await app.inject('/api/platform/audit')).statusCode).toBe(401);
    for (const index of [1, 2]) {
      expect((await read('', index)).statusCode).toBe(403);
      await expect(businessTransaction(business, account(index).id, undefined, 'audit.read', (client) => client.query('SELECT * FROM business.audit_events()'))).rejects.toThrow();
    }
    await expect(business.query('SELECT * FROM business.audit_events()')).rejects.toThrow();
    for (const sql of ['SELECT * FROM authorization_private.audit', 'DELETE FROM authorization_private.audit', "UPDATE authorization_private.audit SET action='hidden'", 'TRUNCATE authorization_private.audit'])
      await expect(business.query(sql)).rejects.toThrow();
    await operator.query('UPDATE authorization_private.actors SET enabled=false WHERE id=$1', [account(0).actor]);
    try { expect((await read()).statusCode).toBe(403); }
    finally { await operator.query('UPDATE authorization_private.actors SET enabled=true WHERE id=$1', [account(0).actor]); }
  });

  it('records the exact resource, author and field keys atomically without profile values', async () => {
    const tenant = tenants[0];
    const resource = await businessTransaction(business, account(1).id, tenant, 'workspace.created', async (client) =>
      (await client.query<{ id: string }>('INSERT INTO business.workspaces(tenant_id,name) VALUES($1,$2) RETURNING id', [tenant, 'Sensitive workspace name'])).rows[0]?.id);
    expect(resource).toBeTruthy();
    await businessTransaction(business, account(1).id, tenant, 'workspace.updated', (client) => client.query('UPDATE business.workspaces SET name=$1 WHERE id=$2', ['Another private value', resource]));
    const response = await read('?tenantId=' + tenant);
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const changes = response.json<AuditPage>().events.filter((event) => event.resource_id === resource);
    expect(changes.map((event) => event.action)).toEqual(['change.updated', 'change.created']);
    expect(changes[0]).toMatchObject({ actor_id: account(1).actor, tenant_id: tenant, resource_type: 'workspace', changed_fields: ['name'] });
    expect(response.body).not.toContain('Sensitive workspace name');
    expect(response.body).not.toContain('Another private value');
    await businessTransaction(business, account(1).id, tenant, 'workspace.read', (client) => client.query('UPDATE business.workspaces SET name=name WHERE id=$1', [resource]));
    await expect(businessTransaction(business, account(1).id, tenant, 'workspace.updated', async (client) => {
      await client.query("UPDATE business.workspaces SET name='rolled back' WHERE id=$1", [resource]);
      throw new Error('Rollback fixture');
    })).rejects.toThrow('Rollback fixture');
    expect((await read('?tenantId=' + tenant)).json<AuditPage>().events.filter((event) => event.resource_id === resource)).toHaveLength(2);
  });

  it('keeps deletion history and records identity changes with no fabricated author or secrets', async () => {
    const target = await operator.query<{ id: string }>("INSERT INTO business.tenants(name) VALUES('Transient') RETURNING id");
    const id = target.rows[0]?.id;
    await operator.query('DELETE FROM business.tenants WHERE id=$1', [id]);
    const deleted = (await read('?tenantId=' + id)).json<AuditPage>().events;
    expect(deleted.map((event) => event.action)).toEqual(['change.deleted', 'change.created']);
    await identity.query('UPDATE identity."user" SET name=$1 WHERE id=$2', ['Secret profile value', account(1).id]);
    const response = await read();
    expect(response.json<AuditPage>().events.find((event) => event.resource_type === 'user' && event.resource_id === account(1).id && event.action === 'change.updated')).toMatchObject({ actor_id: null, changed_fields: ['name'] });
    expect(response.body).not.toContain('Secret profile value');
    expect(response.body).not.toContain('token_hash');
  });

  it('paginates descending identifiers without overlap and filters tenants in SQL', async () => {
    await businessTransaction(business, account(0).id, tenants[1], 'fixture.bulk', (client) => client.query(
      "INSERT INTO business.workspaces(tenant_id,name) SELECT $1,'Page fixture' FROM generate_series(1,55)", [tenants[1]],
    ));
    const first = (await read('?tenantId=' + tenants[1])).json<AuditPage>();
    expect(first.events).toHaveLength(50);
    expect(first.nextCursor).toBeTruthy();
    expect(first.events.every((event) => event.tenant_id === tenants[1])).toBe(true);
    const second = (await read('?tenantId=' + tenants[1] + '&before=' + first.nextCursor)).json<AuditPage>();
    expect(second.events.length).toBeGreaterThan(0);
    expect(second.events.every((event) => BigInt(event.id) < BigInt(first.nextCursor ?? '0'))).toBe(true);
    expect(new Set([...first.events, ...second.events].map((event) => event.id)).size).toBe(first.events.length + second.events.length);
  });
});
