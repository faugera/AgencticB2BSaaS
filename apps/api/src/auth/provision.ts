import { Pool } from 'pg';

// Explicit credentials operation: never called by migrations or application startup.
export async function provisionRoles(
  migrationURL: string,
  identityURL: string,
  businessURL: string,
) {
  const operator = new URL(migrationURL);
  const pool = new Pool({ connectionString: migrationURL, max: 1 });
  try {
    for (const [role, url] of [
      ['identity_runtime', identityURL],
      ['business_runtime', businessURL],
    ] as const) {
      const target = new URL(url);
      if (
        target.username !== role ||
        !target.password ||
        target.host !== operator.host ||
        target.pathname !== operator.pathname ||
        operator.username === role
      ) {
        throw new Error(
          'Separate operator and runtime credentials must target the same database',
        );
      }
      await pool.query(
        `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='${role}') THEN CREATE ROLE ${role} LOGIN; END IF; END $$`,
      );
      const quoted = await pool.query<{ sql: string }>(
        `SELECT format('ALTER ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD %L', $1::text) sql`,
        [decodeURIComponent(target.password)],
      );
      await pool.query(quoted.rows[0]!.sql);
    }
    await pool.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='business_owner') THEN CREATE ROLE business_owner NOLOGIN; END IF; END $$`,
    );
    await pool.query(
      'ALTER ROLE business_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',
    );
    const grant = await pool.query<{ sql: string }>(
      "SELECT format('GRANT business_owner TO %I', current_user) sql",
    );
    await pool.query(grant.rows[0]!.sql);
  } finally {
    await pool.end();
  }
}
