import { getMigrations } from 'better-auth/db/migration';
import { Pool } from 'pg';
import type { AuthConfig } from './config.js';
import { createAuth, createAuthPool } from './service.js';

// Explicit operator operation, never run automatically at server startup.
export async function migrateAuth(config: AuthConfig, migrationURL: string) {
  const runtime = new URL(config.databaseURL);
  const operator = new URL(migrationURL);
  if (runtime.username !== 'identity_runtime' || !runtime.password) {
    throw new Error('DATABASE_URL must use identity_runtime with its own password');
  }
  if (operator.username === runtime.username || operator.host !== runtime.host || operator.pathname !== runtime.pathname) {
    throw new Error('Use separate migration credentials for the same PostgreSQL database');
  }
  const admin = new Pool({ connectionString: migrationURL, max: 1, connectionTimeoutMillis: 5000 });
  const client = await admin.connect();
  let pool: Pool | undefined;
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('enterprise-identity-migrations'))");
    await client.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'identity_runtime') THEN
        CREATE ROLE identity_runtime LOGIN;
      END IF;
    END $$`);
    await client.query('ALTER ROLE identity_runtime NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS');
    const passwordSQL = await client.query<{ sql: string }>(
      "SELECT format('ALTER ROLE identity_runtime PASSWORD %L', $1::text) AS sql",
      [decodeURIComponent(runtime.password)],
    );
    const sql = passwordSQL.rows[0]?.sql;
    if (!sql) throw new Error('Could not configure runtime credentials');
    await client.query(sql);
    await client.query('CREATE SCHEMA IF NOT EXISTS identity');
    await client.query('REVOKE ALL ON SCHEMA identity FROM PUBLIC');
    // Only the operator creates/owns schema and tables. Auth runtime gets DML.
    pool = createAuthPool(migrationURL);
    const auth = createAuth(config, pool, async () => { throw new Error('Migration must not send email'); });
    const migrations = await getMigrations(auth.options);
    if (migrations.unsafeChanges.length || migrations.schemaProblems.length) {
      throw new Error('Unsafe identity schema drift: review the migration before continuing');
    }
    await migrations.runMigrations();
    await client.query('GRANT USAGE ON SCHEMA identity TO identity_runtime');
    await client.query('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity TO identity_runtime');
    await client.query('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA identity TO identity_runtime');
  } finally {
    await pool?.end();
    await client.query("SELECT pg_advisory_unlock(hashtext('enterprise-identity-migrations'))");
    client.release();
    await admin.end();
  }
}
