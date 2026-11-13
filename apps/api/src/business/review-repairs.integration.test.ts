import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateAuth } from '../auth/migrate.js';
import { provisionRoles } from '../auth/provision.js';
import { businessTransaction, createBusinessPool } from './store.js';

const identityURL = process.env.AUTH_TEST_DATABASE_URL;
const migrationURL = process.env.AUTH_TEST_MIGRATION_DATABASE_URL;
if (!identityURL || !migrationURL || !new URL(identityURL).pathname.startsWith('/enterprise_auth_test'))
  throw new Error('Explicit disposable PostgreSQL test database required');
const businessURL = identityURL.replace('identity_runtime:', 'business_runtime:');
const operator = new Pool({ connectionString: migrationURL });
const runtime = createBusinessPool(businessURL);
const identity = randomUUID();
const actor = randomUUID();
const organization = randomUUID();
const [tenantA, tenantB] = [randomUUID(), randomUUID()].sort();
if (!tenantA || !tenantB) throw new Error('Missing tenant fixtures');
const tx = <T>(tenant: string | undefined, run: Parameters<typeof businessTransaction<T>>[4]) =>
  businessTransaction(runtime, identity, tenant, 'review.read', run);

describe('Régressions SQL des correctifs de revue', () => {
  beforeAll(async () => {
    await provisionRoles(migrationURL, identityURL, businessURL);
    await migrateAuth({ databaseURL: identityURL, baseURL: 'http://localhost:5173', secret: randomUUID(),
      smtp: { host: 'localhost', port: 1025, secure: false, from: 'test@example.test' } }, migrationURL);
    await operator.query('INSERT INTO identity."user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)', [identity, 'Review fixture', `${identity}@example.test`]);
    await operator.query('INSERT INTO authorization_private.actors(id,identity_id) VALUES($1,$2)', [actor, identity]);
    await operator.query('INSERT INTO business.organizations(id,name,slug) VALUES($1,$2,$3)', [organization, 'Review', organization]);
    await operator.query("INSERT INTO business.tenants(id,organization_id,name,billing_email) VALUES($1,$3,'A','billing@example.test'),($2,$3,'B','billing@example.test')", [tenantA, tenantB, organization]);
    await operator.query("INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,'tenant_admin'),($1,$3,'member')", [actor, tenantA, tenantB]);
  });
  afterAll(async () => { await Promise.all([operator.end(), runtime.end()]); });

  it('exclut du contexte super-admin les tenants des organisations supprimées', async () => {
    const deletedOrg = randomUUID();
    const deletedTenant = randomUUID();
    await operator.query('INSERT INTO business.organizations(id,name,slug) VALUES($1,$2,$3)', [deletedOrg, 'Supprimée', deletedOrg]);
    await operator.query("INSERT INTO business.tenants(id,organization_id,name,billing_email) VALUES($1,$2,'Masqué','billing@example.test')", [deletedTenant, deletedOrg]);
    await operator.query('UPDATE business.organizations SET deleted_at=now() WHERE id=$1', [deletedOrg]);
    await operator.query("UPDATE authorization_private.actors SET platform_role='super_admin' WHERE id=$1", [actor]);
    try {
      const context = await tx(undefined, async (_client, value) => value);
      expect(context.tenants?.map(tenant => tenant.id)).toContain(tenantA);
      expect(context.tenants?.map(tenant => tenant.id)).not.toContain(deletedTenant);
    } finally {
      await operator.query('UPDATE authorization_private.actors SET platform_role=NULL WHERE id=$1', [actor]);
    }
  });

  it('refuse une insertion dans un autre tenant accessible malgré une capacité dans le tenant courant', async () => {
    expect(await tx(tenantA, async client => (await client.query<{ allowed: boolean }>("SELECT business.can('workspace.create') allowed")).rows[0]?.allowed)).toBe(true);
    expect(await tx(tenantB, async client => (await client.query<{ allowed: boolean }>("SELECT business.can('workspace.create') allowed")).rows[0]?.allowed)).toBe(false);
    const workspace = randomUUID();
    await expect(tx(tenantA, client => client.query("INSERT INTO business.workspaces(id,tenant_id,name) VALUES($1,$2,'Interdit')", [workspace, tenantB]))).rejects.toThrow();
    expect((await operator.query('SELECT id FROM business.workspaces WHERE id=$1', [workspace])).rowCount).toBe(0);
    expect((await tx(tenantA, client => client.query("INSERT INTO business.workspaces(tenant_id,name) VALUES($1,'Autorisé')", [tenantA]))).rowCount).toBe(1);
  });

  it('choisit le premier tenant actif même si le premier membership appartient à un tenant supprimé', async () => {
    expect((await tx(undefined, async (_client, context) => context)).tenantId).toBe(tenantA);
    await operator.query('UPDATE business.tenants SET deleted_at=now() WHERE id=$1', [tenantA]);
    expect((await tx(undefined, async (_client, context) => context)).tenantId).toBe(tenantB);
    await expect(tx(tenantA, async (_client, context) => context)).rejects.toThrow();
    await operator.query('UPDATE business.tenants SET deleted_at=now() WHERE id=$1', [tenantB]);
    expect((await tx(undefined, async (_client, context) => context)).tenantId).toBeNull();
  });

  it('recopie intégralement et une seule fois les événements historiques sans contexte RLS', async () => {
    const client = await operator.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE business.tenants SET deleted_at=coalesce(deleted_at,now()) WHERE id=$1', [tenantA]);
      const action = 'a'.repeat(101);
      const kind = 'k'.repeat(51);
      const events = await client.query<{ id: string }>(`INSERT INTO authorization_private.audit
        (actor_id,tenant_id,action,resource_type,resource_id,changed_fields,occurred_at) VALUES
        ($1,NULL,$3,$4,'global',ARRAY['name'],'2020-01-02T03:04:05Z'),
        ($1,$2,'deleted-tenant','tenant','tenant',ARRAY['deleted_at'],'2020-02-03T04:05:06Z') RETURNING id`, [actor, tenantA, action, kind]);
      const ids = events.rows.map(row => row.id);
      const sql = await readFile(new URL('../../migrations/0017_review_security_repairs.sql', import.meta.url), 'utf8');
      await client.query(sql);
      await client.query(sql);
      const copied = await client.query('SELECT legacy_id,organization_id,tenant_id,actor_id,action,target_type,target_id,payload,created_at FROM business.audit_logs WHERE legacy_id=ANY($1::bigint[]) ORDER BY legacy_id', [ids]);
      expect(copied.rows).toEqual([
        { legacy_id: ids[0], organization_id: null, tenant_id: null, actor_id: actor, action, target_type: kind, target_id: 'global', payload: { changed_fields: ['name'] }, created_at: new Date('2020-01-02T03:04:05Z') },
        { legacy_id: ids[1], organization_id: organization, tenant_id: tenantA, actor_id: actor, action: 'deleted-tenant', target_type: 'tenant', target_id: 'tenant', payload: { changed_fields: ['deleted_at'] }, created_at: new Date('2020-02-03T04:05:06Z') },
      ]);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
