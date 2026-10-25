import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool, PoolClient } from 'pg';
import type { AccessContext } from '@enterprise/shared';
import { AccessError } from './store.js';
import { documentation } from './documentation.js';

type Transact = <T>(request: FastifyRequest, action: string, run: (client: PoolClient, context: AccessContext) => Promise<T>, tenant?: string) => Promise<T>;
type Deliver = (request: FastifyRequest, tenant: string, id: string, email: string, token: string) => Promise<'sent' | 'failed'>;
const uuid = { type: 'string', format: 'uuid' } as const;
const tenantQuery = { type: 'object', additionalProperties: false, properties: { tenantId: uuid } } as const;
type Scoped = { Querystring: { tenantId?: string } };

export function registerAccessRoutes(app: FastifyInstance, dependencies: { pool: Pool; origin: string; transact: Transact; deliver: Deliver }) {
  const { pool, origin, transact, deliver } = dependencies;
  app.post<{ Body: { link: string; firstName: string; lastName: string; email: string } }>('/api/access-requests', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
    schema: { body: { type: 'object', additionalProperties: false, required: ['link', 'firstName', 'lastName', 'email'], properties: {
      link: uuid,
      firstName: { type: 'string', minLength: 1, maxLength: 100, pattern: '\\S' },
      lastName: { type: 'string', minLength: 1, maxLength: 100, pattern: '\\S' },
      email: { type: 'string', format: 'email', maxLength: 254 },
    } } },
  }, async (request, reply) => {
    if (request.headers.origin !== origin) throw new AccessError(403, 'UNTRUSTED_ORIGIN');
    const body = request.body;
    await pool.query('SELECT business.submit_access_request($1,$2,$3,$4)', [body.link, body.firstName, body.lastName, body.email]);
    return reply.code(202).send({ received: true });
  });
  app.post<Scoped>('/api/access-link', { schema: { querystring: tenantQuery } }, async (request) =>
    transact(request, 'access_link.created', async (client) => {
      const result = await client.query<{ token: string }>('SELECT business.access_link() token');
      const token = result.rows[0]?.token;
      if (!token) throw new AccessError(403, 'ACCESS_DENIED');
      return { url: origin + '/signup?link=' + token };
    }, request.query.tenantId));
  app.get<{ Querystring: { tenantId?: string; before?: string } }>('/api/access-requests', {
    schema: { querystring: { type: 'object', additionalProperties: false, properties: { tenantId: uuid, before: uuid } } },
  }, async (request) =>
    transact(request, 'access_requests.read', async (client) => (await client.query('SELECT * FROM business.access_requests($1)', [request.query.before ?? null])).rows, request.query.tenantId));
  app.post<Scoped & { Params: { id: string }; Body: { operation: 'approve' | 'reject'; role: 'member' | 'tenant_admin' } }>('/api/access-requests/:id', {
    schema: {
      querystring: tenantQuery,
      params: { type: 'object', required: ['id'], properties: { id: uuid } },
      body: { type: 'object', additionalProperties: false, required: ['operation', 'role'], properties: {
        operation: { type: 'string', enum: ['approve', 'reject'] }, role: { type: 'string', enum: ['member', 'tenant_admin'] },
      } },
    },
  }, async (request) => {
    const token = randomBytes(32).toString('base64url');
    const result = await transact(request, 'access_request.reviewed', async (client) => {
      const response = await client.query<{ email: string; tenant_id: string; invitation_id: string | null }>(
        'SELECT * FROM business.review_access_request($1,$2,$3,$4)',
        [request.params.id, request.body.operation, request.body.role, createHash('sha256').update(token).digest('hex')]);
      const row = response.rows[0];
      if (!row) throw new AccessError(403, 'ACCESS_DENIED');
      return row;
    }, request.query.tenantId);
    return result.invitation_id
      ? { delivery: await deliver(request, result.tenant_id, result.invitation_id, result.email, token) }
      : { ok: true };
  });
  app.get('/api/platform/docs', async (request) => transact(request, 'platform.docs.read', async (_client, context) => {
    if (context.platformRole !== 'super_admin') throw new AccessError(403, 'ACCESS_DENIED');
    return documentation;
  }));
}
