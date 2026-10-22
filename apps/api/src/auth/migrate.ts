import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Pool } from 'pg';
import type { AuthConfig } from './config.js';

// Versioned, checksummed SQL only. Credentials are provisioned separately.
export async function migrateAuth(config: AuthConfig, migrationURL: string) {
  const runtime = new URL(config.databaseURL);
  const operator = new URL(migrationURL);
  if (
    runtime.username !== 'identity_runtime' ||
    operator.username === runtime.username ||
    operator.host !== runtime.host ||
    operator.pathname !== runtime.pathname
  ) {
    throw new Error(
      'Use separate migration credentials for the same PostgreSQL database',
    );
  }
  const pool = new Pool({
    connectionString: migrationURL,
    max: 1,
    connectionTimeoutMillis: 5000,
    options: '-c statement_timeout=30000 -c lock_timeout=5000',
  });
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext('enterprise-schema-migrations'))",
      );
      await client.query('CREATE SCHEMA IF NOT EXISTS migration_history');
      await client.query('REVOKE ALL ON SCHEMA migration_history FROM PUBLIC');
      await client.query(
        'CREATE TABLE IF NOT EXISTS migration_history.versions (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
      );
      const directory = new URL('../../migrations/', import.meta.url);
      for (const name of (await readdir(directory))
        .filter((name) => /^\d{4}_.*\.sql$/.test(name))
        .sort()) {
        const sql = await readFile(new URL(name, directory), 'utf8');
        const checksum = createHash('sha256').update(sql).digest('hex');
        const previous = await client.query<{ checksum: string }>(
          'SELECT checksum FROM migration_history.versions WHERE name=$1',
          [name],
        );
        if (previous.rowCount) {
          if (previous.rows[0]?.checksum !== checksum)
            throw new Error('Applied migration checksum changed');
          continue;
        }
        await client.query(sql);
        await client.query(
          'INSERT INTO migration_history.versions(name,checksum) VALUES($1,$2)',
          [name, checksum],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
