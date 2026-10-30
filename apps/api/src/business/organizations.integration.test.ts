import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
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
const ids = Array.from({ length: 6 }, () => randomUUID());
const actors: string[] = [];
const organizations: string[] = [];
const tenants: string[] = [];
let superIdentity = '';
let workspace = '';
let foreignWorkspace = '';
let customRole = '';
let deletedOrganization = '';
const tx = <T>(identity: string, tenant: string | undefined, run: Parameters<typeof businessTransaction<T>>[4]) =>
  businessTransaction(runtime, identity, tenant, 'test.read', run);
const at = (values: string[], index: number) => {
  const value = values[index];
  if (!value) throw new Error('Missing test fixture');
  return value;
};

describe('Organisation et RBAC persistés', () => {
  beforeAll(async () => {
    await provisionRoles(migrationURL, identityURL, businessURL);
    await migrateAuth({ databaseURL: identityURL, baseURL: 'http://localhost:5173', secret: randomUUID(),
      smtp: { host: 'localhost', port: 1025, secure: false, from: 'test@example.test' } }, migrationURL);
    for (const id of ids) {
      await operator.query('INSERT INTO identity."user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)', [id, 'RBAC fixture', `${id}@example.test`]);
      actors.push(await tx(id, undefined, async (_client, context) => context.actorId));
    }
    const existing = await operator.query<{ identity_id: string }>("SELECT identity_id FROM authorization_private.actors WHERE platform_role='super_admin'");
    superIdentity = existing.rows[0]?.identity_id ?? at(ids, 5);
    if (!existing.rowCount) await operator.query('SELECT business.bootstrap_super($1,$2)', [superIdentity, 'rbac-super']);
    for (const label of ['Client A', 'Client B']) {
      organizations.push(await tx(superIdentity, undefined, async client =>
        (await client.query<{ id: string }>('SELECT business.create_organization($1) id', [label])).rows[0]?.id ?? ''));
    }
    deletedOrganization = await tx(superIdentity, undefined, async client =>
      (await client.query<{ id: string }>('SELECT business.create_organization($1) id', ['Client supprimé'])).rows[0]?.id ?? '');
    await tx(superIdentity, undefined, client => client.query(
      'UPDATE business.organizations SET deleted_at=now() WHERE id=$1', [deletedOrganization]));
    for (const index of [0, 0, 1]) {
      tenants.push(await tx(superIdentity, undefined, async client =>
        (await client.query<{ id: string }>('SELECT business.create_tenant($1,$2,$3) id', [at(organizations, index), 'Tenant', 'billing@example.test'])).rows[0]?.id ?? ''));
    }
    await operator.query("INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,'tenant_admin'),($3,$2,'member'),($3,$4,'member'),($5,$2,'tenant_admin')", [at(actors, 1), at(tenants, 0), at(actors, 2), at(tenants, 1), at(actors, 3)]);
    await tx(superIdentity, undefined, client => client.query("SELECT business.assign_role($1,(SELECT id FROM jsonb_to_recordset(business.role_catalog()) AS r(id uuid,code text) WHERE code='organization_admin'),$2,NULL,NULL,'grant')", [at(actors, 0), at(organizations, 0)]));
    workspace = await tx(superIdentity, at(tenants, 0), async client =>
      (await client.query<{ id: string }>("INSERT INTO business.workspaces(tenant_id,name) VALUES($1,'Private') RETURNING id", [at(tenants, 0)])).rows[0]?.id ?? '');
    foreignWorkspace = await tx(superIdentity, at(tenants, 2), async client =>
      (await client.query<{ id: string }>("INSERT INTO business.workspaces(tenant_id,name) VALUES($1,'Foreign') RETURNING id", [at(tenants, 2)])).rows[0]?.id ?? '');
  });
  afterAll(async () => { await Promise.all([operator.end(), runtime.end()]); });

  it('autorise deux tenants du même client, refuse le client étranger et les tables privées', async () => {
    const context = await tx(at(ids, 2), at(tenants, 1), async (_client, value) => value);
    expect(context.tenantId).toBe(at(tenants, 1));
    await expect(tx(at(ids, 2), at(tenants, 2), client => client.query('SELECT * FROM business.tenants'))).rejects.toThrow();
    await expect(operator.query("INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,'member')", [at(actors, 2), at(tenants, 2)])).rejects.toThrow();
    await expect(runtime.query('SELECT * FROM authorization_private.role_catalog')).rejects.toThrow();
    await expect(runtime.query('SELECT business.role_catalog()')).rejects.toThrow('ACCESS_DENIED');
    expect((await runtime.query('SELECT * FROM business.organizations')).rowCount).toBe(0);
    await expect(tx(at(ids, 2), at(tenants, 0), client => client.query('SELECT business.role_catalog()'))).rejects.toThrow();
    expect((await tx(at(ids, 1), at(tenants, 0), client => client.query<{ roles: unknown[] }>('SELECT business.role_catalog() roles'))).rows[0]?.roles.length).toBeGreaterThan(0);
    expect((await tx(at(ids, 0), undefined, client => client.query<{ roles: unknown[] }>('SELECT business.role_catalog() roles'))).rows[0]?.roles.length).toBeGreaterThan(0);
  });

  it('limite l’annuaire au client de l’acteur et exclut les organisations supprimées', async () => {
    const memberDirectory = await tx(at(ids, 2), at(tenants, 1), client =>
      client.query<{ id: string }>('SELECT * FROM business.organization_directory()'));
    expect(memberDirectory.rows.map(row => row.id)).toEqual([at(organizations, 0)]);
    const superDirectory = await tx(superIdentity, undefined, client =>
      client.query<{ id: string }>('SELECT * FROM business.organization_directory()'));
    expect(superDirectory.rows.map(row => row.id)).toEqual(organizations);
    expect(superDirectory.rows.map(row => row.id)).not.toContain(deletedOrganization);
  });

  it('organisation-admin traverse les workspaces privés de son client seulement', async () => {
    expect(await tx(at(ids, 0), at(tenants, 0), async client =>
      (await client.query('SELECT * FROM business.workspaces WHERE id=$1', [workspace])).rowCount)).toBe(1);
    await expect(tx(at(ids, 0), at(tenants, 2), client => client.query('SELECT * FROM business.workspaces'))).rejects.toThrow();
    expect(await tx(at(ids, 0), at(tenants, 0), async client =>
      (await client.query<{ allowed: boolean }>("SELECT business.can('workspace.update',$1) allowed", [foreignWorkspace])).rows[0]?.allowed)).toBe(false);
    expect((await tx(at(ids, 0), at(tenants, 0), client => client.query("UPDATE business.workspaces SET name='Renommé'"))).rowCount).toBe(1);
    expect((await operator.query<{ name: string }>('SELECT name FROM business.workspaces WHERE id=$1', [foreignWorkspace])).rows[0]?.name).toBe('Foreign');
    await operator.query("INSERT INTO authorization_private.memberships(actor_id,tenant_id,role,status) VALUES($1,$2,'member','suspended')", [at(actors, 0), at(tenants, 0)]);
    await expect(tx(at(ids, 0), at(tenants, 0), client => client.query('SELECT * FROM business.workspaces'))).rejects.toThrow();
    await operator.query("UPDATE authorization_private.memberships SET status='active' WHERE actor_id=$1 AND tenant_id=$2", [at(actors, 0), at(tenants, 0)]);
    expect((await tx(at(ids, 0), at(tenants, 0), client => client.query('SELECT * FROM business.workspaces'))).rowCount).toBe(1);
  });

  it('refuse mutations de soi et de pairs, même par les fonctions historiques', async () => {
    for (const actor of [at(actors, 1), at(actors, 3)]) {
      await expect(tx(at(ids, 1), at(tenants, 0), client => client.query('SELECT business.remove_member($1)', [actor]))).rejects.toThrow();
      await expect(tx(at(ids, 1), at(tenants, 0), client => client.query("SELECT business.set_membership_status($1,'suspended')", [actor]))).rejects.toThrow();
    }
    await expect(tx(at(ids, 1), at(tenants, 0), client => client.query("SELECT business.invite('peer@example.test','tenant_admin','hash')"))).rejects.toThrow();
    await operator.query("UPDATE authorization_private.memberships SET status='suspended' WHERE actor_id=$1 AND tenant_id=$2", [at(actors, 3), at(tenants, 0)]);
    await expect(tx(at(ids, 1), at(tenants, 0), client => client.query("SELECT business.set_membership_status($1,'active')", [at(actors, 3)]))).rejects.toThrow();
    await operator.query("UPDATE authorization_private.memberships SET status='active' WHERE actor_id=$1 AND tenant_id=$2", [at(actors, 3), at(tenants, 0)]);
  });

  it('cumule les rôles, impose la confirmation et révoque les permissions immédiatement', async () => {
    customRole = await tx(superIdentity, undefined, async client =>
      (await client.query<{ id: string }>("SELECT business.save_role(NULL,'Lecteur audit','tenant',ARRAY['audit.read'],true,false,false) id")).rows[0]?.id ?? '');
    await tx(at(ids, 1), at(tenants, 0), client => client.query("SELECT business.assign_role($1,$2,$3,$4,NULL,'grant')", [at(actors, 2), customRole, at(organizations, 0), at(tenants, 0)]));
    expect(await tx(at(ids, 2), at(tenants, 0), async client => (await client.query<{ allowed: boolean }>("SELECT business.can('audit.read') allowed")).rows[0]?.allowed)).toBe(true);
    expect(await tx(at(ids, 2), at(tenants, 1), async client => (await client.query<{ allowed: boolean }>("SELECT business.can('audit.read') allowed")).rows[0]?.allowed)).toBe(false);
    await expect(tx(superIdentity, undefined, client => client.query("SELECT business.save_role($1,'Lecteur audit','tenant',ARRAY[]::text[],true,false,false)", [customRole]))).rejects.toThrow();
    await tx(superIdentity, undefined, client => client.query("SELECT business.save_role($1,'Lecteur audit','tenant',ARRAY[]::text[],true,false,true)", [customRole]));
    expect(await tx(at(ids, 2), at(tenants, 0), async client => (await client.query<{ allowed: boolean }>("SELECT business.can('audit.read') allowed")).rows[0]?.allowed)).toBe(false);
  });

  it('ferme les écritures catalogue et les attributions forgées', async () => {
    await expect(tx(at(ids, 1), at(tenants, 0), client => client.query("SELECT business.save_role(NULL,'Interdit','tenant',ARRAY['audit.read'],true,false,false)"))).rejects.toThrow();
    await expect(tx(superIdentity, undefined, client => client.query("SELECT business.save_role(NULL,'Plateforme','tenant',ARRAY['super_admin'],true,false,false)"))).rejects.toThrow();
    await expect(tx(superIdentity, undefined, client => client.query("SELECT business.save_role(NULL,'Hors scope','tenant',ARRAY['organization.manage'],true,false,false)"))).rejects.toThrow();
    await expect(tx(at(ids, 1), at(tenants, 0), client => client.query("SELECT business.assign_role($1,$2,$3,$4,NULL,'grant')", [at(actors, 1), customRole, at(organizations, 0), at(tenants, 0)]))).rejects.toThrow();
    await expect(tx(at(ids, 1), at(tenants, 0), client => client.query("SELECT business.assign_role($1,$2,$3,$4,NULL,'grant')", [at(actors, 2), customRole, at(organizations, 1), at(tenants, 2)]))).rejects.toThrow();
    expect(await tx(at(ids, 0), at(tenants, 0), async client => (await client.query<{ allowed: boolean }>("SELECT business.can('super_admin') allowed")).rows[0]?.allowed)).toBe(false);
  });

  it('accepte les invitations du même client avec auteur, refuse rejeu et second client', async () => {
    const identity = randomUUID();
    const email = `${identity}@example.test`;
    await operator.query('INSERT INTO identity."user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)', [identity, 'Invitation B2B', email]);
    const actor = await tx(identity, undefined, async (_client, context) => context.actorId);
    const inviter = await tx(superIdentity, undefined, async (_client, context) => context.actorId);
    for (const index of [0, 1, 2]) {
      const hash = randomUUID();
      await tx(superIdentity, at(tenants, index), client => client.query("SELECT business.invite($1,'member',$2)", [email, hash]));
      const accept = () => tx(identity, undefined, client => client.query('SELECT business.accept_invitation($1)', [hash]));
      if (index === 2) await expect(accept()).rejects.toThrow();
      else { await accept(); await expect(accept()).rejects.toThrow(); }
    }
    const rows = await operator.query<{ invited_by: string; joined_at: Date }>('SELECT invited_by,joined_at FROM authorization_private.memberships WHERE actor_id=$1 ORDER BY tenant_id', [actor]);
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows.every(row => row.invited_by === inviter && row.joined_at instanceof Date)).toBe(true);
  });

  it('suspension coupe une session existante sans affecter la seconde membership', async () => {
    await tx(at(ids, 1), at(tenants, 0), client => client.query("SELECT business.set_membership_status($1,'suspended')", [at(actors, 2)]));
    await expect(tx(at(ids, 2), at(tenants, 0), client => client.query('SELECT * FROM business.tenants'))).rejects.toThrow();
    expect((await tx(at(ids, 2), at(tenants, 1), client => client.query('SELECT * FROM business.tenants'))).rowCount).toBe(1);
  });

  it('expose les droits workspace seulement dans leur portée exacte', async () => {
    await operator.query("INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,'member')", [at(actors, 4), at(tenants, 0)]);
    await operator.query("INSERT INTO authorization_private.workspace_members(tenant_id,workspace_id,actor_id,role) VALUES($1,$2,$3,'workspace_admin')", [at(tenants, 0), workspace, at(actors, 4)]);
    const scoped = await tx(at(ids, 4), at(tenants, 0), client => client.query<{ level: number; allowed: boolean; people: unknown[] }>("SELECT business.workspace_level($1) level,business.can('roles.assign',$1) allowed,business.role_people($2,$1) people", [workspace, at(tenants, 0)]));
    expect(scoped.rows[0]?.level).toBe(1);
    expect((await tx(at(ids, 4), at(tenants, 0), client => client.query<{ roles: unknown[] }>('SELECT business.role_catalog() roles'))).rows[0]?.roles.length).toBeGreaterThan(0);
    expect(scoped.rows[0]?.allowed).toBe(true);
    expect(scoped.rows[0]?.people.length).toBeGreaterThan(0);
    expect((await tx(at(ids, 4), at(tenants, 0), client => client.query<{ level: number }>('SELECT business.workspace_level($1) level', [foreignWorkspace]))).rows[0]?.level).toBe(0);
    await expect(tx(at(ids, 4), at(tenants, 0), client => client.query('SELECT business.role_people($1,$2)', [at(tenants, 0), foreignWorkspace]))).rejects.toThrow();
  });

  it('ne confond pas niveau sensible et capacité effective du dernier administrateur tenant', async () => {
    const tenant = await tx(superIdentity, undefined, async client => (await client.query<{ id: string }>("SELECT business.create_tenant($1,'Admin guard','billing@example.test') id", [at(organizations, 0)])).rows[0]?.id ?? '');
    await operator.query("INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$3,'tenant_admin'),($2,$3,'member')", [at(actors, 1), at(actors, 3), tenant]);
    const role = await tx(superIdentity, undefined, async client => (await client.query<{ id: string }>("SELECT business.save_role(NULL,'Créateur espaces','tenant',ARRAY['workspace.create'],true,false,false) id")).rows[0]?.id ?? '');
    await tx(superIdentity, tenant, client => client.query("SELECT business.assign_role($1,$2,$3,$4,NULL,'grant')", [at(actors, 3), role, at(organizations, 0), tenant]));
    await tx(superIdentity, tenant, client => client.query("SELECT business.assign_role($1,$2,$3,$4,NULL,'grant')", [at(actors, 1), role, at(organizations, 0), tenant]));
    await tx(superIdentity, tenant, client => client.query("SELECT business.assign_role($1,$2,$3,$4,NULL,'revoke')", [at(actors, 1), role, at(organizations, 0), tenant]));
    const redundant = await tx(superIdentity, undefined, async client => (await client.query<{ id: string }>("SELECT business.save_role(NULL,'Admin redondant','tenant',ARRAY['tenant.manage'],true,false,false) id")).rows[0]?.id ?? '');
    await tx(superIdentity, tenant, client => client.query("SELECT business.assign_role($1,$2,$3,$4,NULL,'grant')", [at(actors, 1), redundant, at(organizations, 0), tenant]));
    await tx(superIdentity, tenant, client => client.query("SELECT business.assign_role($1,$2,$3,$4,NULL,'revoke')", [at(actors, 1), redundant, at(organizations, 0), tenant]));
    const builtin = await operator.query<{ id: string }>("SELECT id FROM authorization_private.role_catalog WHERE code='tenant_admin'");
    await expect(tx(superIdentity, tenant, client => client.query("SELECT business.assign_role($1,$2,$3,$4,NULL,'revoke')", [at(actors, 1), builtin.rows[0]?.id, at(organizations, 0), tenant]))).rejects.toThrow();
    await expect(tx(superIdentity, tenant, client => client.query('SELECT business.disable_actor($1)', [at(actors, 1)]))).rejects.toThrow();
    await expect(tx(superIdentity, tenant, client => client.query("SELECT business.set_membership_status($1,'suspended')", [at(actors, 1)]))).rejects.toThrow();
    await tx(superIdentity, undefined, client => client.query("SELECT business.save_role($1,'Admin custom','tenant',ARRAY['tenant.manage'],true,false,true)", [role]));
    await operator.query("UPDATE authorization_private.memberships SET status='suspended' WHERE actor_id=$1 AND tenant_id=$2", [at(actors, 1), tenant]);
    await expect(tx(superIdentity, undefined, client => client.query("SELECT business.save_role($1,'Créateur espaces','tenant',ARRAY['workspace.create'],true,false,true)", [role]))).rejects.toThrow();
  });

  it('sérialise deux retraits du dernier administrateur actif', async () => {
    await operator.query("UPDATE authorization_private.memberships SET role='tenant_admin' WHERE actor_id=$1 AND tenant_id=$2", [at(actors, 2), at(tenants, 1)]);
    await operator.query("INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,'tenant_admin')", [at(actors, 4), at(tenants, 1)]);
    const results = await Promise.allSettled([at(actors, 2), at(actors, 4)].map(actor =>
      tx(superIdentity, at(tenants, 1), client => client.query("SELECT business.set_membership_status($1,'suspended')", [actor]))));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
  });

  it('protège le dernier administrateur organisation lors de retraits concurrents', async () => {
    const row = await tx(superIdentity, undefined, client => client.query<{ id: string }>("SELECT id FROM jsonb_to_recordset(business.role_catalog()) AS r(id uuid,code text) WHERE code='organization_admin'"));
    const role = row.rows[0]?.id;
    if (!role) throw new Error('Missing builtin role');
    await tx(superIdentity, undefined, client => client.query("SELECT business.assign_role($1,$2,$3,NULL,NULL,'grant')", [at(actors, 1), role, at(organizations, 0)]));
    const results = await Promise.allSettled([at(actors, 0), at(actors, 1)].map(actor =>
      tx(superIdentity, undefined, client => client.query("SELECT business.assign_role($1,$2,$3,NULL,NULL,'revoke')", [actor, role, at(organizations, 0)]))));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
  });

  it('protège un dernier administrateur organisation custom contre disable, archive et retrait de capacité', async () => {
    const identity = randomUUID();
    await operator.query('INSERT INTO identity."user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)', [identity, 'Dernier admin', `${identity}@example.test`]);
    const actor = await tx(identity, undefined, async (_client, context) => context.actorId);
    const role = await tx(superIdentity, undefined, async client =>
      (await client.query<{ id: string }>("SELECT business.save_role(NULL,'Admin client','organization',ARRAY['organization.manage','tenant.read','audit.read','workspace.read'],false,false,false) id")).rows[0]?.id ?? '');
    await tx(superIdentity, undefined, client => client.query("SELECT business.assign_role($1,$2,$3,NULL,NULL,'grant')", [actor, role, at(organizations, 1)]));
    expect((await tx(identity, at(tenants, 2), client => client.query('SELECT * FROM business.workspaces'))).rowCount).toBe(1);
    await tx(identity, at(tenants, 2), client => client.query('SELECT * FROM business.audit_log_events($1)', [at(tenants, 2)]));
    await tx(superIdentity, undefined, client => client.query("SELECT business.save_role($1,'Admin client','organization',ARRAY['organization.manage','tenant.read'],false,false,true)", [role]));
    const context = await tx(identity, at(tenants, 2), async (_client, value) => value);
    expect([...context.permissions ?? []].sort()).toEqual(['organization.manage', 'tenant.read']);
    expect((await tx(identity, undefined, client => client.query<{ id: string }>("SELECT business.create_tenant($1,'Custom capability','billing@example.test') id", [at(organizations, 1)]))).rows[0]?.id).toBeTruthy();
    expect((await tx(identity, at(tenants, 2), client => client.query('SELECT * FROM business.workspaces'))).rowCount).toBe(0);
    expect((await tx(identity, at(tenants, 2), client => client.query<{ allowed: boolean }>("SELECT business.can('audit.read') allowed"))).rows[0]?.allowed).toBe(false);
    await expect(tx(identity, at(tenants, 2), client => client.query('SELECT * FROM business.audit_log_events($1)', [at(tenants, 2)]))).rejects.toThrow();
    await expect(tx(superIdentity, undefined, client => client.query('SELECT business.disable_actor($1)', [actor]))).rejects.toThrow();
    for (const archived of [false, true]) {
      await expect(tx(superIdentity, undefined, client => client.query("SELECT business.save_role($1,'Admin client','organization',ARRAY[]::text[],false,$2,true)", [role, archived]))).rejects.toThrow();
    }
  });

  it('refuse aussi le contexte sans tenant lorsque le client est supprimé logiquement', async () => {
    await operator.query('UPDATE business.organizations SET deleted_at=now() WHERE id=$1', [at(organizations, 0)]);
    await expect(tx(at(ids, 0), undefined, client => client.query('SELECT business.context()'))).rejects.toThrow();
    await expect(tx(superIdentity, at(tenants, 0), client => client.query('SELECT * FROM business.workspaces'))).rejects.toThrow();
  });
});
