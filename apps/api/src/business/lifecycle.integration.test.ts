import { createHash, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import type { QueryResult } from 'pg';
import { migrateAuth } from '../auth/migrate.js';
import { provisionRoles } from '../auth/provision.js';
import { createAuth, createAuthPool } from '../auth/service.js';
import type { AuthConfig } from '../auth/config.js';
import { buildApp } from '../app.js';
import { businessTransaction, createBusinessPool } from './store.js';

const databaseURL = process.env.AUTH_TEST_DATABASE_URL;
const migrationURL = process.env.AUTH_TEST_MIGRATION_DATABASE_URL;
if (!databaseURL || !migrationURL || !new URL(databaseURL).pathname.startsWith('/enterprise_auth_test'))
  throw new Error('Explicit disposable PostgreSQL database required');
const businessURL = databaseURL.replace('identity_runtime:', 'business_runtime:');
const config: AuthConfig = {
  baseURL: 'http://127.0.0.1:5173', secret: randomBytes(48).toString('base64url'),
  databaseURL, businessDatabaseURL: businessURL,
  smtp: { host: '127.0.0.1', port: 1025, secure: false, from: 'test@example.test' },
};
const operator = new Pool({ connectionString: migrationURL });
const identity = createAuthPool(databaseURL);
const business = createBusinessPool(businessURL);
const password = randomBytes(24).toString('base64url');
const testIP = `2001:db8:${randomBytes(2).toString('hex')}:${randomBytes(2).toString('hex')}::1`;
const candidateEmail = `lifecycle-candidate-${randomBytes(8).toString('hex')}@example.test`;
let adminId = '', memberId = '', candidateId = '', controlId = '', superId = '', tenantA = '', tenantB = '';
let app: ReturnType<typeof buildApp>;
const tx = <T>(id: string, tenant: string | undefined, run: Parameters<typeof businessTransaction<T>>[4]) =>
  businessTransaction(business, id, tenant, 'lifecycle.read', run);

async function verifiedIdentity(email: string) {
  const auth = createAuth(config, identity, async () => {}, true);
  const result = await auth.api.signUpEmail({ body: { email, name: 'Lifecycle fixture', password } });
  await operator.query('UPDATE identity."user" SET "emailVerified"=true WHERE id=$1', [result.user.id]);
  return result.user.id;
}

describe('user and organization lifecycle metadata', () => {
  beforeAll(async () => {
    await provisionRoles(migrationURL, databaseURL, businessURL);
    await migrateAuth(config, migrationURL);
    adminId = await verifiedIdentity(`lifecycle-admin-${randomBytes(8).toString('hex')}@example.test`);
    memberId = await verifiedIdentity(`lifecycle-member-${randomBytes(8).toString('hex')}@example.test`);
    candidateId = await verifiedIdentity(candidateEmail);
    controlId = await verifiedIdentity(`lifecycle-control-${randomBytes(8).toString('hex')}@example.test`);
    const existing = await operator.query<{ identity_id: string }>("SELECT identity_id FROM authorization_private.actors WHERE platform_role='super_admin'");
    superId = existing.rows[0]?.identity_id ?? candidateId;
    if (!existing.rowCount) await operator.query('SELECT business.bootstrap_super($1,$2)', [superId, 'lifecycle-operator']);
    for (const [id, role] of [[adminId, 'tenant_admin'], [memberId, 'member'], [controlId, 'tenant_admin']] as const) {
      const actor = await tx(id, undefined, async (_client, context) => context.actorId);
      let tenant = tenantA;
      if (id !== memberId) tenant = await tx(superId, undefined, async (client) => {
        const result = await client.query<{ id: string }>('INSERT INTO business.tenants(name) VALUES($1) RETURNING id', ['Lifecycle organization']);
        const row = result.rows[0];
        if (!row) throw new Error('Tenant fixture missing');
        await client.query("SELECT set_config('app.tenant_id',$1,true)", [row.id]);
        await client.query('INSERT INTO business.workspaces(tenant_id,name) VALUES($1,$2)', [row.id, 'Private fixture']);
        return row.id;
      });
      if (id === adminId) tenantA = tenant;
      if (id === controlId) tenantB = tenant;
      await operator.query('INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,$3)', [actor, tenant, role]);
    }
    app = buildApp({ authInstance: createAuth(config, identity, async () => {}) });
  });
  afterAll(async () => {
    await app?.close();
    await Promise.all([operator.end(), identity.end(), business.end()]);
  });

  it('creates unique identities and organizations with creation dates and no deletion date', async () => {
    const users = await operator.query('SELECT id,"createdAt","updatedAt","deletedAt" FROM identity."user" WHERE id=ANY($1)', [[adminId, memberId, controlId]]);
    expect(new Set(users.rows.map((row) => row.id)).size).toBe(3);
    for (const row of users.rows) {
      expect(row.createdAt).toBeInstanceOf(Date);
      expect(row.updatedAt).toBeInstanceOf(Date);
      expect(row.deletedAt).toBeNull();
    }
    const tenants = await operator.query('SELECT id,created_at,updated_at,deleted_at FROM business.tenants WHERE id=ANY($1)', [[tenantA, tenantB]]);
    expect(new Set(tenants.rows.map((row) => row.id)).size).toBe(2);
    for (const row of tenants.rows) {
      expect(row.created_at).toBeInstanceOf(Date);
      expect(row.updated_at).toBeInstanceOf(Date);
      expect(row.deleted_at).toBeNull();
    }
  });

  it('sets modification dates in PostgreSQL while preserving identifiers and creation dates', async () => {
    const beforeUser = (await operator.query('SELECT "createdAt" FROM identity."user" WHERE id=$1', [memberId])).rows[0];
    const user = (await operator.query('UPDATE identity."user" SET name=$1,"updatedAt"=$2 WHERE id=$3 RETURNING *', ['Renamed', '2000-01-01', memberId])).rows[0];
    expect(user.id).toBe(memberId);
    expect(user.createdAt).toEqual(beforeUser.createdAt);
    expect(user.updatedAt.getUTCFullYear()).toBeGreaterThan(2000);
    const beforeTenant = (await operator.query('SELECT created_at FROM business.tenants WHERE id=$1', [tenantA])).rows[0];
    const tenant = (await operator.query('UPDATE business.tenants SET name=$1,updated_at=$2 WHERE id=$3 RETURNING *', ['Renamed', '2000-01-01', tenantA])).rows[0];
    expect(tenant.id).toBe(tenantA);
    expect(tenant.created_at).toEqual(beforeTenant.created_at);
    expect(tenant.updated_at.getUTCFullYear()).toBeGreaterThan(2000);
  });

  it('keeps a deleted user, revokes existing sessions and refuses new sign-ins', async () => {
    const user = (await operator.query('SELECT email FROM identity."user" WHERE id=$1', [memberId])).rows[0];
    const login = () => app.inject({ method: 'POST', url: '/api/auth/sign-in/email', remoteAddress: testIP, headers: { origin: config.baseURL }, payload: { email: user.email, password } });
    const session = await login();
    expect(session.statusCode).toBe(200);
    const cookie = session.cookies.map((value) => `${value.name}=${value.value}`).join('; ');
    await operator.query('UPDATE identity."user" SET "deletedAt"=now() WHERE id=$1', [memberId]);
    const retained = (await operator.query('SELECT "deletedAt" FROM identity."user" WHERE id=$1', [memberId])).rows[0];
    expect(retained.deletedAt).toBeInstanceOf(Date);
    expect((await operator.query('SELECT 1 FROM identity.session WHERE "userId"=$1', [memberId])).rowCount).toBe(0);
    expect((await app.inject({ url: '/api/me', headers: { cookie } })).statusCode).toBe(401);
    expect((await login()).statusCode).toBe(401);
    await expect(tx(memberId, tenantA, async () => null)).rejects.toThrow('ACCESS_DENIED');
  });

  it('keeps a deleted organization, closes its workspace scope and revokes pending invitations', async () => {
    const token = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(token).digest('hex');
    await tx(adminId, tenantA, async (client) => client.query("SELECT business.invite($1,'member',$2)", [candidateEmail, hash]));
    await operator.query('UPDATE business.tenants SET deleted_at=now() WHERE id=$1', [tenantA]);
    expect((await operator.query('SELECT deleted_at FROM business.tenants WHERE id=$1', [tenantA])).rows[0].deleted_at).toBeInstanceOf(Date);
    expect(await tx(adminId, tenantA, async (client) => (await client.query('SELECT * FROM business.workspaces')).rowCount)).toBe(0);
    expect(await tx(superId, tenantA, async (client) => (await client.query('SELECT * FROM business.workspaces')).rowCount)).toBe(0);
    expect(await tx(controlId, tenantB, async (client) => (await client.query('SELECT * FROM business.workspaces')).rowCount)).toBe(1);
    await expect(tx(candidateId, undefined, async (client) => client.query('SELECT business.accept_invitation($1)', [hash]))).rejects.toThrow('INVITATION_INVALID');
    await expect(tx(adminId, tenantA, async (client) => client.query("SELECT business.invite($1,'member',$2)", [candidateEmail, hash]))).rejects.toThrow('ACCESS_DENIED');
  });

  it('does not permit the identity runtime to physically delete a user', async () => {
    await expect(identity.query('DELETE FROM identity."user" WHERE id=$1', [memberId])).rejects.toThrow('permission denied');
  });

  it('serializes a new session against concurrent logical deletion and blocks lazy actor recreation', async () => {
    const id = await verifiedIdentity(`lifecycle-race-${randomBytes(8).toString('hex')}@example.test`);
    const writer = await operator.connect();
    const session = await identity.connect();
    let pending: Promise<QueryResult<Record<string, unknown>>> | undefined;
    try {
      const pid = (await session.query<{ pid: number }>('SELECT pg_backend_pid() pid')).rows[0]?.pid;
      await writer.query('BEGIN');
      await writer.query('UPDATE identity."user" SET "deletedAt"=now() WHERE id=$1', [id]);
      pending = session.query('INSERT INTO identity.session(id,token,"userId","expiresAt","updatedAt") VALUES($1,$2,$3,now()+interval \'1 hour\',now())', [randomBytes(12).toString('hex'), randomBytes(24).toString('hex'), id]);
      await expect.poll(async () => (await operator.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1', [pid])).rows[0]?.wait_event_type).toBe('Lock');
      await writer.query('COMMIT');
      expect((await pending).rowCount).toBe(0);
      await expect(tx(id, undefined, async () => null)).rejects.toThrow('ACCESS_DENIED');
    } finally {
      await writer.query('ROLLBACK');
      await pending?.catch(() => undefined);
      writer.release();
      session.release();
    }
  });
});
