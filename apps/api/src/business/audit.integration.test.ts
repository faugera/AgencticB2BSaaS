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
const read = (query = '', index = 0) => app.inject({ url: '/api/audit-logs' + query, headers: { cookie: account(index).cookie } });

describe('persistent unified audit and scoped administrator consultation', () => {
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
      const tenant = await businessTransaction(business, account(0).id, undefined, 'fixture.create', async (client) => {
        const org = (await client.query<{ id: string }>("SELECT business.create_organization('Audit organization') id")).rows[0]?.id;
        return (await client.query<{ id: string }>("SELECT business.create_tenant($1,'Audit tenant','audit-admin@example.test') id", [org])).rows[0]?.id;
      });
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
    expect((await app.inject('/api/audit-logs')).statusCode).toBe(401);
    for (const index of [1, 2]) {
      expect((await read('', index)).statusCode).toBe(403);
      await expect(businessTransaction(business, account(index).id, undefined, 'audit.read', (client) => client.query('SELECT * FROM business.audit_log_events()'))).rejects.toThrow();
    }
    await expect(business.query('SELECT * FROM business.audit_log_events()')).rejects.toThrow();
    for (const sql of ['SELECT * FROM authorization_private.audit', 'DELETE FROM business.audit_logs', "UPDATE business.audit_logs SET action='hidden'", 'TRUNCATE business.audit_logs', "INSERT INTO business.audit_logs(action) VALUES('forged')"])
      await expect(business.query(sql)).rejects.toThrow();
    await operator.query('UPDATE authorization_private.actors SET enabled=false WHERE id=$1', [account(0).actor]);
    try { expect((await read()).statusCode).toBe(403); }
    finally { await operator.query('UPDATE authorization_private.actors SET enabled=true WHERE id=$1', [account(0).actor]); }
  });

  it('allows scoped tenant admins and denies members and foreign tenants', async () => {
    expect((await read('?tenantId=' + tenants[0], 1)).statusCode).toBe(200);
    expect((await read('?tenantId=' + tenants[1], 1)).statusCode).toBe(403);
    expect((await read('?tenantId=' + tenants[1], 2)).statusCode).toBe(403);
    expect((await app.inject('/api/platform/audit')).statusCode).toBe(404);
  });

  it('forces RLS and keeps the former source as a frozen archive', async () => {
    const policy = await operator.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='business.audit_logs'::regclass");
    expect(policy.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
    const before = (await operator.query<{ count: string }>('SELECT count(*) FROM authorization_private.audit')).rows[0]?.count;
    await businessTransaction(business, account(0).id, undefined, 'archive.probe', async () => undefined);
    expect((await operator.query<{ count: string }>('SELECT count(*) FROM authorization_private.audit')).rows[0]?.count).toBe(before);
    const isolated = await operator.connect();
    try {
      await isolated.query('BEGIN');
      await isolated.query('SET LOCAL ROLE business_owner');
      await isolated.query("SELECT set_config('app.identity_id','',true),set_config('app.tenant_id','',true)");
      expect((await isolated.query('SELECT * FROM business.audit_logs')).rows).toHaveLength(0);
    } finally { await isolated.query('ROLLBACK'); isolated.release(); }
  });

  it('snapshots server request metadata without unbounded user agents', async () => {
    await businessTransaction(business, account(0).id, tenants[0], 'metadata.probe', async () => undefined, { ip: '192.0.2.4', userAgent: 'test' + String.fromCharCode(10) + 'x'.repeat(600) });
    const result = await operator.query<{ ip_address: string; user_agent: string; organization_id: string; actor_id: string }>("SELECT ip_address,user_agent,organization_id,actor_id FROM business.audit_logs WHERE action='metadata.probe' ORDER BY created_at DESC LIMIT 1");
    expect(result.rows[0]?.ip_address).toBe('192.0.2.4');
    expect(result.rows[0]?.user_agent).toHaveLength(511);
    expect(result.rows[0]?.user_agent).not.toContain(String.fromCharCode(10));
    expect(result.rows[0]?.actor_id).toBe(account(0).actor);
    expect(result.rows[0]?.organization_id).toBeTruthy();
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
    const target = await operator.query<{ id: string }>("INSERT INTO business.tenants(name,billing_email,organization_id) SELECT 'Transient','audit-admin@example.test',organization_id FROM business.tenants WHERE id=$1 RETURNING id", [tenants[0]]);
    const id = target.rows[0]?.id;
    await operator.query('UPDATE business.tenants SET deleted_at=clock_timestamp() WHERE id=$1', [id]);
    const deleted = (await read()).json<AuditPage>().events.filter((event) => event.tenant_id === id);
    expect(deleted.map((event) => event.action)).toEqual(['change.updated', 'change.created']);
    await identity.query('UPDATE identity."user" SET name=$1 WHERE id=$2', ['Secret profile value', account(1).id]);
    const response = await read();
    expect(response.json<AuditPage>().events.find((event) => event.resource_type === 'user' && event.resource_id === account(1).id && event.action === 'change.updated')).toMatchObject({ actor_id: null, changed_fields: ['first_name', 'last_name', 'name'] });
    expect(response.body).not.toContain('Secret profile value');
    expect(response.body).not.toContain('token_hash');
  });

  it('allows only the organization administrator own tenant and excludes platform events', async () => {
    const granted = await operator.query<{ id: string }>("INSERT INTO authorization_private.role_assignments(actor_id,role_id,organization_id) SELECT a.id,r.id,a.organization_id FROM authorization_private.actors a CROSS JOIN authorization_private.role_catalog r WHERE a.id=$1 AND r.code='organization_admin' RETURNING id", [account(2).actor]);
    try {
      expect((await read('?tenantId=' + tenants[1], 2)).statusCode).toBe(200);
      expect((await read('?tenantId=' + tenants[0], 2)).statusCode).toBe(403);
      expect((await read('', 2)).statusCode).toBe(403);
      const own = (await read('?tenantId=' + tenants[1], 2)).json<AuditPage>();
      expect(own.events.every((event) => event.tenant_id === tenants[1])).toBe(true);
    } finally { await operator.query('DELETE FROM authorization_private.role_assignments WHERE id=$1', [granted.rows[0]?.id]); }
  });

  it('records global capability additions, removals and archival with the real author', async () => {
    const role = await businessTransaction(business, account(0).id, undefined, 'audit.role.probe', async (client) =>
      (await client.query<{ id: string }>("SELECT business.save_role(NULL,'Audit role','tenant',ARRAY['audit.read'],true,false,true) id")).rows[0]?.id);
    await businessTransaction(business, account(0).id, undefined, 'audit.role.probe', (client) =>
      client.query("SELECT business.save_role($1,'Audit role','tenant',ARRAY['workspace.read'],true,false,true)", [role]));
    await businessTransaction(business, account(0).id, undefined, 'audit.role.probe', (client) =>
      client.query("SELECT business.save_role($1,'Audit role','tenant',ARRAY['workspace.read'],true,true,true)", [role]));
    const result = await operator.query<{ tenant_id: string | null; actor_id: string; payload: { permissions_added: string[]; permissions_removed: string[] } }>("SELECT tenant_id,actor_id,payload FROM business.audit_logs WHERE target_type='role' AND target_id=$1 ORDER BY created_at,id", [role]);
    expect(result.rows).toHaveLength(3);
    expect(result.rows.every((event) => event.tenant_id === null && event.actor_id === account(0).actor)).toBe(true);
    expect(result.rows.map((event) => [event.payload.permissions_added, event.payload.permissions_removed])).toEqual([
      [['audit.read'], []], [['workspace.read'], ['audit.read']], [[], ['workspace.read']],
    ]);
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
    expect(second.events.every((event) => !first.events.some((previous) => previous.id === event.id))).toBe(true);
    expect(new Set([...first.events, ...second.events].map((event) => event.id)).size).toBe(first.events.length + second.events.length);
  });
});
