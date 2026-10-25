import { Pool } from 'pg';
import type { PoolClient } from 'pg';

import type { AccessContext } from '@enterprise/shared';
export type { AccessContext } from '@enterprise/shared';
export class AccessError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}
export function createBusinessPool(connectionString: string) {
  if (new URL(connectionString).username !== 'business_runtime')
    throw new Error('Business runtime requires business_runtime');
  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10_000,
    options:
      '-c statement_timeout=5000 -c idle_in_transaction_session_timeout=10000',
  });
  pool.on('error', () => {
    console.error('Business database idle connection lost');
  });
  return pool;
}

export async function businessTransaction<T>(
  pool: Pool,
  identityId: string,
  tenant: string | undefined,
  action: string,
  run: (client: PoolClient, context: AccessContext) => Promise<T>,
  metadata?: { readonly ip: string; readonly userAgent: string | null },
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "SELECT set_config('app.identity_id',$1,true),set_config('app.tenant_id',$2,true),set_config('app.request_ip',$3,true),set_config('app.user_agent',$4,true)",
      [identityId, tenant ?? '', metadata?.ip ?? '', metadata?.userAgent?.slice(0, 512) ?? ''],
    );
    const result = await client.query<{ context: AccessContext }>(
      'SELECT business.context() context',
    );
    const context = result.rows[0]?.context;
    if (!context) throw new AccessError(403, 'ACCESS_DENIED');
    if (
      tenant &&
      tenant !== context.tenantId &&
      context.platformRole !== 'super_admin'
    )
      throw new AccessError(403, 'ACCESS_DENIED');
    const scope = tenant ?? context.tenantId;
    if (scope)
      await client.query("SELECT set_config('app.tenant_id',$1,true)", [scope]);
    const response = await run(client, context);
    if (context.platformRole === 'super_admin' || context.organizationRole === 'organization_admin' || context.level === 3 || !action.endsWith('.read')) {
      await client.query('SELECT business.record_audit($1)', [action]);
    }
    await client.query('COMMIT');
    return response;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function assertRuntimePrivileges(pool: Pool) {
  const result = await pool.query<{
    safe: boolean;
  }>(`SELECT NOT (r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR r.rolcreaterole)
    AND NOT EXISTS(SELECT FROM pg_auth_members WHERE member=r.oid)
    AND NOT EXISTS(SELECT FROM pg_database WHERE datname=current_database() AND datdba=r.oid)
    AND NOT EXISTS(SELECT FROM pg_namespace WHERE nspname IN ('identity','business','authorization_private','migration_history') AND nspowner=r.oid)
    AND NOT EXISTS(SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('identity','business','authorization_private','migration_history') AND c.relowner=r.oid)
    AND NOT has_schema_privilege(current_user,'authorization_private','USAGE')
    AND NOT has_schema_privilege(current_user,'migration_history','USAGE')
    AND (current_user<>'identity_runtime' OR NOT has_schema_privilege(current_user,'business','USAGE'))
    AND (current_user<>'business_runtime' OR NOT has_schema_privilege(current_user,'identity','USAGE'))
    AND NOT pg_has_role(current_user,'business_owner','MEMBER') AS safe
    FROM pg_roles r WHERE r.rolname=current_user`);
  if (!result.rows[0]?.safe)
    throw new Error('Unsafe runtime database privileges');
}
