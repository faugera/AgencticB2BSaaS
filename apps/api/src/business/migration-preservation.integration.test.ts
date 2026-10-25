import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';
import { migrateAuth } from '../auth/migrate.js';
import { provisionRoles } from '../auth/provision.js';
import type { AuthConfig } from '../auth/config.js';

describe.skipIf(process.env.AUTH_TEST_MIGRATION_PRESERVATION !== 'true')('reprise historique B2B sans perte et rejeu du migrateur', () => {
  it('préserve identité/dates et refuse atomiquement le billing impossible avant reprise', async () => {
    const databaseURL = process.env.AUTH_TEST_DATABASE_URL;
    const migrationURL = process.env.AUTH_TEST_MIGRATION_DATABASE_URL;
    if (!databaseURL || !migrationURL || !/^\/enterprise_auth_test_b2b_migration\d*$/.test(new URL(databaseURL).pathname))
      throw new Error('Explicit empty disposable migration-preservation database required');
    const businessURL = databaseURL.replace('identity_runtime:', 'business_runtime:');
    const config: AuthConfig = { baseURL: 'http://127.0.0.1:5173', secret: randomBytes(48).toString('base64url'), databaseURL, businessDatabaseURL: businessURL, smtp: { host: '127.0.0.1', port: 1025, secure: false, from: 'test@example.test' } };
    const operator = new Pool({ connectionString: migrationURL, max: 1 });
    const tenant = randomUUID();
    const invitedTenant = randomUUID();
    const workspace = randomUUID();
    const actor = randomUUID();
    const created = '2023-01-02T03:04:05.000Z';
    const updated = '2024-02-03T04:05:06.000Z';
    const deleted = '2024-03-04T05:06:07.000Z';
    try {
      expect((await operator.query("SELECT to_regnamespace('identity') present")).rows[0]?.present).toBeNull();
      await provisionRoles(migrationURL, databaseURL, businessURL);
      const client = await operator.connect();
      try {
        await client.query('BEGIN');
        await client.query('CREATE SCHEMA migration_history');
        await client.query('CREATE TABLE migration_history.versions(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
        const directory = new URL('../../migrations/', import.meta.url);
        for (const name of (await readdir(directory)).filter((name) => /^00(?:0[1-9]|1[0-2])_.*\.sql$/.test(name)).sort()) {
          const sql = await readFile(new URL(name, directory), 'utf8');
          await client.query(sql);
          await client.query('INSERT INTO migration_history.versions(name,checksum) VALUES($1,$2)', [name, createHash('sha256').update(sql).digest('hex')]);
        }
        await client.query(`INSERT INTO identity."user"(id,name,email,"emailVerified",image,"createdAt","updatedAt","deletedAt") VALUES
          ('legacy-admin','  Anne   Marie Dupont  ','admin@example.test',true,'https://example.test/avatar.png',$1,$2,NULL),
          ('legacy-mononym','Prince','prince@example.test',false,NULL,$1,$2,NULL),
          ('legacy-deleted','  ','deleted@example.test',true,NULL,$1,$2,$3)`, [created, updated, deleted]);
        await client.query('INSERT INTO authorization_private.actors(id,identity_id) VALUES($1,$2)', [actor, 'legacy-admin']);
        await client.query('INSERT INTO business.tenants(id,name,created_at,updated_at) VALUES($1,$2,$5,$6),($3,$4,$5,$6)', [tenant, 'Client historique', invitedTenant, 'Invitation historique', created, updated]);
        await client.query("INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES($1,$2,'tenant_admin')", [actor, tenant]);
        await client.query('INSERT INTO business.workspaces(id,tenant_id,name) VALUES($1,$2,$3)', [workspace, tenant, 'Atelier historique']);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
      await expect(migrateAuth(config, migrationURL)).rejects.toThrow('BILLING_EMAIL_BACKFILL_REQUIRED');
      expect((await operator.query("SELECT count(*)::int count FROM migration_history.versions WHERE name LIKE '0013_%'")).rows[0]?.count).toBe(0);
      expect((await operator.query("SELECT count(*)::int count FROM information_schema.columns WHERE table_schema='identity' AND table_name='user' AND column_name='first_name'")).rows[0]?.count).toBe(0);
      await operator.query("INSERT INTO authorization_private.invitations(tenant_id,email,role,token_hash) VALUES($1,'invited-admin@example.test','tenant_admin',$2)", [invitedTenant, randomBytes(32).toString('hex')]);
      await migrateAuth(config, migrationURL);
      const users = await operator.query('SELECT id,name,email,"emailVerified",image,"createdAt","updatedAt","deletedAt",first_name,last_name FROM identity."user" ORDER BY id');
      expect(users.rows).toEqual([
        { id: 'legacy-admin', name: '  Anne   Marie Dupont  ', email: 'admin@example.test', emailVerified: true, image: 'https://example.test/avatar.png', createdAt: new Date(created), updatedAt: new Date(updated), deletedAt: null, first_name: 'Anne', last_name: 'Marie Dupont' },
        { id: 'legacy-deleted', name: '  ', email: 'deleted@example.test', emailVerified: true, image: null, createdAt: new Date(created), updatedAt: new Date(updated), deletedAt: new Date(deleted), first_name: null, last_name: null },
        { id: 'legacy-mononym', name: 'Prince', email: 'prince@example.test', emailVerified: false, image: null, createdAt: new Date(created), updatedAt: new Date(updated), deletedAt: null, first_name: 'Prince', last_name: null },
      ]);
      const tenantRows = await operator.query('SELECT id,billing_email,slug,created_at,updated_at FROM business.tenants ORDER BY id');
      expect(tenantRows.rows).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: tenant, billing_email: 'admin@example.test', slug: 'client-historique-' + tenant.replaceAll('-', ''), created_at: new Date(created), updated_at: new Date(updated) }),
        expect.objectContaining({ id: invitedTenant, billing_email: 'invited-admin@example.test', created_at: new Date(created), updated_at: new Date(updated) }),
      ]));
      expect((await operator.query('SELECT actor_id,tenant_id,status,joined_at FROM authorization_private.memberships')).rows).toEqual([{ actor_id: actor, tenant_id: tenant, status: 'active', joined_at: null }]);
      expect((await operator.query('SELECT id,tenant_id,slug FROM business.workspaces')).rows).toEqual([{ id: workspace, tenant_id: tenant, slug: 'atelier-historique-' + workspace.replaceAll('-', '') }]);
      const versions = await operator.query('SELECT * FROM migration_history.versions ORDER BY name');
      await migrateAuth(config, migrationURL);
      expect((await operator.query('SELECT * FROM migration_history.versions ORDER BY name')).rows).toEqual(versions.rows);
      expect((await operator.query('SELECT id,name,email,"emailVerified",image,"createdAt","updatedAt","deletedAt",first_name,last_name FROM identity."user" ORDER BY id')).rows).toEqual(users.rows);
      expect((await operator.query('SELECT id,billing_email,slug,created_at,updated_at FROM business.tenants ORDER BY id')).rows).toEqual(tenantRows.rows);
    } finally { await operator.end(); }
  });
});
