import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import type { AccessContext, AuditEvent, AuditPage } from '@enterprise/shared';
import { AccessError } from './store.js';

type Transact = <T>(request: FastifyRequest, action: string, run: (client: PoolClient, context: AccessContext) => Promise<T>, tenant?: string) => Promise<T>;

export function registerAuditRoutes(app: FastifyInstance, transact: Transact) {
  app.get<{ Querystring: { tenantId?: string; before?: string } }>('/api/platform/audit', {
    schema: { querystring: {
      type: 'object', additionalProperties: false,
      properties: {
        tenantId: { type: 'string', format: 'uuid' },
        before: { type: 'string', pattern: '^[1-9][0-9]{0,18}$' },
      },
    } },
  }, async (request, reply): Promise<AuditPage> => {
    const { tenantId, before } = request.query;
    if (before && BigInt(before) > 9223372036854775807n)
      throw new AccessError(400, 'INVALID_REQUEST');
    reply.header('cache-control', 'no-store');
    return transact(request, 'audit.read', async (client, context) => {
      if (context.platformRole !== 'super_admin') throw new AccessError(403, 'ACCESS_DENIED');
      const result = await client.query<AuditEvent>(
        'SELECT * FROM business.audit_events($1,$2)', [tenantId ?? null, before ?? null],
      );
      const events = result.rows.slice(0, 50);
      return { events, nextCursor: result.rows.length > 50 ? events.at(-1)?.id ?? null : null };
    }, tenantId);
  });
}
