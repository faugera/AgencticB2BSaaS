import { randomBytes } from 'node:crypto';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool, PoolClient } from 'pg';
import type { Auth } from '../auth/service.js';
import type { AuthConfig } from '../auth/config.js';
import { AccessError, businessTransaction } from './store.js';
import type { AccessContext } from './store.js';
import { registerUIRoutes } from './ui-routes.js';
import { registerAuditRoutes } from './audit-routes.js';
import { registerAccessRoutes } from './access-routes.js';
import { registerProfileRoutes } from './profile-routes.js';
import { registerRbacRoutes } from './rbac-routes.js';
import { enqueueInvitation, digest, requestDigest } from './jobs/outbox-store.js';
import { decodePageCursor, encodePageCursor } from './page-cursor.js';

const uuid = { type: 'string', format: 'uuid' } as const;
const shortName = { type: 'string', minLength: 1, maxLength: 100 } as const;
const emailSchema = {
  type: 'string',
  format: 'email',
  maxLength: 254,
} as const;
const roleSchema = {
  type: 'string',
  enum: ['tenant_admin', 'member'],
} as const;
const tenantQuery = {
  type: 'object',
  additionalProperties: false,
  properties: { tenantId: uuid },
} as const;
const hash = digest;
type Scoped = { Querystring: { tenantId?: string } };
type PageScoped = {
  Querystring: { tenantId?: string; before?: string };
};
const pageSize = 50;
const pageQuery = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tenantId: uuid,
    before: { type: 'string', maxLength: 512 },
  },
} as const;

export function registerBusinessRoutes(
  app: FastifyInstance,
  auth: Auth,
  pool: Pool,
  config: AuthConfig,
) {
  const keyring = config.outboxEncryption;
  if (!keyring) throw new Error('Outbox encryption is not configured');
  const transact = async <T>(
    request: FastifyRequest,
    action: string,
    run: (client: PoolClient, context: AccessContext) => Promise<T>,
    tenant?: string,
  ) => {
    if (
      !['GET', 'HEAD'].includes(request.method) &&
      request.headers.origin !== config.baseURL
    )
      throw new AccessError(403, 'UNTRUSTED_ORIGIN');
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session?.user.emailVerified)
      throw new AccessError(401, 'UNAUTHENTICATED');
    const rawKey = request.headers['idempotency-key'];
    const idempotentAction = [
      'tenant.created',
      'invitation.created',
      'invitation.updated',
      'access_request.reviewed',
    ].includes(action);
    const idempotencyKey =
      typeof rawKey === 'string' &&
      idempotentAction &&
      !['GET', 'HEAD'].includes(request.method)
        ? rawKey
        : undefined;
    if (
      rawKey !== undefined &&
      idempotentAction &&
      (typeof rawKey !== 'string' ||
        rawKey.length > 200 ||
        !rawKey.trim() ||
        /[\r\n]/.test(rawKey))
    )
      throw new AccessError(400, 'INVALID_REQUEST');
    return businessTransaction(
      pool,
      session.user.id,
      tenant,
      action,
      async (client, context) => {
        if (!idempotencyKey) return run(client, context);
        const keyHash = hash(idempotencyKey);
        const params = request.params;
        const resourceScope =
          params &&
          typeof params === 'object' &&
          'id' in params &&
          typeof params.id === 'string'
            ? params.id
            : undefined;
        const contextTenant = context.tenantId === '00000000-0000-0000-0000-000000000000' ? null : context.tenantId;
        const scope = tenant ?? contextTenant ?? resourceScope ?? 'platform';
        const bodyHash = requestDigest({
          method: request.method,
          route: request.routeOptions.url,
          params,
          query: request.query,
          body: request.body ?? null,
        });
        const reservation = await client.query<{
          result: { replay: boolean; response?: T };
        }>('SELECT business.begin_idempotency($1,$2,$3,$4) result', [
          action,
          scope,
          keyHash,
          bodyHash,
        ]);
        const decision = reservation.rows[0]?.result;
        if (!decision) throw new Error('Idempotency reservation was not returned');
        if (decision.replay) {
          if (decision.response === undefined)
            throw new Error('Completed idempotency result is missing');
          return decision.response;
        }
        const response = await run(client, context);
        await client.query(
          'SELECT business.complete_idempotency($1,$2,$3,$4,$5::jsonb)',
          [action, scope, keyHash, bodyHash, JSON.stringify(response)],
        );
        return response;
      },
      { ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
    );
  };
  const requireSuper = (context: AccessContext) => {
    if (context.platformRole !== 'super_admin')
      throw new AccessError(403, 'ACCESS_DENIED');
  };
  const enqueue = (
    client: PoolClient,
    tenantId: string,
    invitationId: string,
    email: string,
    token: string,
  ) => enqueueInvitation(client, keyring, {
    id: invitationId,
    tenantId,
    email,
    token,
  });
  const pageResult = <T extends { id: string; created_at: Date | string }>(
    rows: readonly T[],
    tenantId: string | null,
  ) => {
    const hasMore = rows.length > pageSize;
    const items = rows.slice(0, pageSize);
    const last = items.at(-1);
    const nextCursor =
      hasMore && last && tenantId
        ? encodePageCursor(tenantId, last.created_at, last.id)
        : null;
    return {
      items: items.map((row) => {
        const { created_at: createdAt, ...item } = row;
        void createdAt;
        return item;
      }),
      nextCursor,
    };
  };
  const validateCursorScope = (
    cursor: ReturnType<typeof decodePageCursor>,
    requestedTenant: string | undefined,
    context: AccessContext,
  ) => {
    const tenantId = requestedTenant ?? context.tenantId;
    if (cursor && cursor.tenantId !== tenantId)
      throw new AccessError(400, 'INVALID_CURSOR');
    return tenantId;
  };
  registerUIRoutes(app, transact);
  registerProfileRoutes(app, transact);
  registerRbacRoutes(app, transact);
  registerAuditRoutes(app, transact);
  registerAccessRoutes(app, { pool, origin: config.baseURL, transact, enqueue });
  app.get<Scoped>('/api/me', { schema: { querystring: tenantQuery } }, async (request) =>
    transact(request, 'context.read', async (client, context) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      return {
        user: {
          id: session!.user.id,
          name: session!.user.name,
          email: session!.user.email,
        },
        access: context,
        can_assign_workspace_roles: (
          await client.query<{ allowed: boolean }>(
            "SELECT EXISTS(SELECT 1 FROM business.workspaces w WHERE business.can('roles.assign',w.id)) allowed",
          )
        ).rows[0]?.allowed ?? false,
      };
    }, request.query.tenantId),
  );
  app.get('/api/platform/tenants', async (request) =>
    transact(request, 'platform.tenants.read', async (client, context) => {
      requireSuper(context);
      return (
        await client.query('SELECT id,name FROM business.tenants ORDER BY name')
      ).rows;
    }),
  );
  const createTenant = async (request: FastifyRequest<{ Body: { name: string; adminEmail: string } }>, reply: import('fastify').FastifyReply, organization?: string) => {
    const token = randomBytes(32).toString('base64url');
      const result = await transact(
        request,
        'tenant.created',
        async (client) => {
          const organizationId = organization ?? (await client.query<{ id: string }>('SELECT business.create_organization($1) id', [request.body.name])).rows[0]?.id;
          if (!organizationId) throw new AccessError(403, 'ACCESS_DENIED');
          const tenant = (await client.query<{ id: string }>('SELECT business.create_tenant($1,$2,$3) id', [organizationId, request.body.name, request.body.adminEmail])).rows[0];
          if (!tenant) throw new AccessError(403, 'ACCESS_DENIED');
          await client.query("SELECT set_config('app.tenant_id',$1,true)", [
            tenant.id,
          ]);
          const invitation = (
            await client.query<{ id: string }>(
              "SELECT business.invite($1,'tenant_admin',$2) id",
              [request.body.adminEmail, hash(token)],
            )
          ).rows[0]!;
          await client.query(
            "INSERT INTO business.workspaces(tenant_id,name) VALUES($1,'General')",
            [tenant.id],
          );
          await enqueue(client, tenant.id, invitation.id, request.body.adminEmail, token);
          return { id: tenant.id, invitationId: invitation.id };
        },
      );
      return reply.code(201).send({ ...result, delivery: 'pending' });
  };
  const tenantBody = { type: 'object', additionalProperties: false, required: ['name', 'adminEmail'], properties: { name: shortName, adminEmail: emailSchema } } as const;
  app.post<{ Body: { name: string; adminEmail: string } }>('/api/platform/tenants', { config: { rateLimit: { max: 3, timeWindow: '1 minute' } }, schema: { body: tenantBody } }, (request, reply) => createTenant(request, reply));
  app.post<{ Params: { id: string }; Body: { name: string; adminEmail: string } }>('/api/organizations/:id/tenants', { config: { rateLimit: { max: 3, timeWindow: '1 minute' } }, schema: { params: { type: 'object', required: ['id'], additionalProperties: false, properties: { id: uuid } }, body: tenantBody } }, (request, reply) => createTenant(request, reply, request.params.id));
  app.get<PageScoped>(
    '/api/workspaces',
    { schema: { querystring: pageQuery } },
    async (request) =>
      transact(
        request,
        'workspaces.read',
        async (client, context) => {
          const cursor = decodePageCursor(request.query.before);
          const tenantId = validateCursorScope(
            cursor,
            request.query.tenantId,
            context,
          );
          const rows = await client.query<{
            id: string;
            tenant_id: string;
            name: string;
            visibility: 'private' | 'tenant';
            can_manage: boolean;
            can_assign_roles: boolean;
            role_level: number;
            color: string | null;
            created_at: string;
          }>(
            'SELECT * FROM business.workspaces_page($1,$2,$3)',
            [cursor?.createdAt ?? null, cursor?.id ?? null, pageSize + 1],
          );
          return pageResult(rows.rows, tenantId);
        },
        request.query.tenantId,
      ),
  );
  app.post<
    Scoped & { Body: { name: string; visibility?: 'private' | 'tenant' } }
  >(
    '/api/workspaces',
    {
      schema: {
        querystring: tenantQuery,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['name'],
          properties: {
            name: shortName,
            visibility: { type: 'string', enum: ['private', 'tenant'] },
          },
        },
      },
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(
          await transact(
            request,
            'workspace.created',
            async (client) =>
              (
                await client.query(
                  "INSERT INTO business.workspaces(tenant_id,name,visibility) VALUES(nullif(current_setting('app.tenant_id',true),'')::uuid,$1,$2) RETURNING id,name,visibility",
                  [request.body.name, request.body.visibility ?? 'private'],
                )
              ).rows[0],
            request.query.tenantId,
          ),
        ),
  );
  app.get<Scoped & { Params: { id: string } }>(
    '/api/workspaces/:id',
    {
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: uuid } },
        querystring: tenantQuery,
      },
    },
    async (request) =>
      transact(
        request,
        'workspace.read',
        async (client) => {
          const result = await client.query(
            'SELECT id,tenant_id,name,visibility,business.workspace_admin(id,tenant_id) can_manage,business.can($$roles.assign$$,id) can_assign_roles,business.workspace_level(id) role_level,business.workspace_color(id) color FROM business.workspaces WHERE id=$1',
            [request.params.id],
          );
          if (!result.rowCount) throw new AccessError(404, 'NOT_FOUND');
          return result.rows[0];
        },
        request.query.tenantId,
      ),
  );
  app.get<PageScoped>(
    '/api/members',
    { schema: { querystring: pageQuery } },
    async (request) =>
      transact(
        request,
        'members.read',
        async (client, context) => {
          const cursor = decodePageCursor(request.query.before);
          const tenantId = validateCursorScope(
            cursor,
            request.query.tenantId,
            context,
          );
          const rows = await client.query<{
            id: string;
            name: string;
            email: string;
            role: string | null;
            created_at: string;
          }>(
            'SELECT * FROM business.members_page($1,$2,$3)',
            [cursor?.createdAt ?? null, cursor?.id ?? null, pageSize + 1],
          );
          return pageResult(rows.rows, tenantId);
        },
        request.query.tenantId,
      ),
  );
  app.get<PageScoped>(
    '/api/invitations',
    { schema: { querystring: pageQuery } },
    async (request) =>
      transact(
        request,
        'invitations.read',
        async (client, context) => {
          const cursor = decodePageCursor(request.query.before);
          const tenantId = validateCursorScope(
            cursor,
            request.query.tenantId,
            context,
          );
          const rows = await client.query<{
            id: string;
            email: string;
            role: string;
            expires_at: Date;
            accepted_at: Date | null;
            revoked_at: Date | null;
            delivery: string;
            created_at: string;
          }>(
            'SELECT * FROM business.invitations_page($1,$2,$3)',
            [cursor?.createdAt ?? null, cursor?.id ?? null, pageSize + 1],
          );
          return pageResult(rows.rows, tenantId);
        },
        request.query.tenantId,
      ),
  );
  app.post<
    Scoped & { Body: { email: string; role: 'tenant_admin' | 'member' } }
  >(
    '/api/invitations',
    {
      config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
      schema: {
        querystring: tenantQuery,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['email', 'role'],
          properties: { email: emailSchema, role: roleSchema },
        },
      },
    },
    async (request, reply) => {
      const token = randomBytes(32).toString('base64url');
      const result = await transact(
        request,
        'invitation.created',
        async (client) => {
          const row = (
            await client.query<{ id: string }>(
              'SELECT business.invite($1,$2,$3) id',
              [request.body.email, request.body.role, hash(token)],
            )
          ).rows[0]!;
          const tenant = (
            await client.query<{ tenant: string }>(
              "SELECT current_setting('app.tenant_id') tenant",
            )
          ).rows[0]!.tenant;
          await enqueue(client, tenant, row.id, request.body.email, token);
          return { id: row.id, tenant };
        },
        request.query.tenantId,
      );
      return reply.code(201).send({
        id: result.id,
        delivery: 'pending',
      });
    },
  );
  app.post<{ Body: { token: string } }>(
    '/api/invitations/accept',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['token'],
          properties: {
            token: { type: 'string', minLength: 40, maxLength: 100 },
          },
        },
      },
    },
    async (request) =>
      transact(
        request,
        'invitation.accepted',
        async (client) =>
          (
            await client.query(
              'SELECT business.accept_invitation($1) AS "tenantId"',
              [hash(request.body.token)],
            )
          ).rows[0],
      ),
  );
  app.post<
    Scoped & { Params: { id: string }; Body: { operation: 'retry' | 'revoke' } }
  >(
    '/api/invitations/:id',
    {
      config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
      schema: {
        querystring: tenantQuery,
        params: { type: 'object', required: ['id'], properties: { id: uuid } },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['operation'],
          properties: {
            operation: { type: 'string', enum: ['retry', 'revoke'] },
          },
        },
      },
    },
    async (request) => {
      const token = randomBytes(32).toString('base64url');
      await transact(
        request,
        'invitation.updated',
        async (client) => {
          const row = (
            await client.query<{ email: string }>(
              'SELECT business.update_invitation($1,$2,$3) email',
              [request.params.id, request.body.operation, hash(token)],
            )
          ).rows[0]!;
          if (request.body.operation === 'retry') {
            const tenant = (
              await client.query<{ tenant: string }>(
                "SELECT current_setting('app.tenant_id') tenant",
              )
            ).rows[0]!.tenant;
            await enqueue(client, tenant, request.params.id, row.email, token);
          }
          return { ok: true };
        },
        request.query.tenantId,
      );
      return request.body.operation === 'retry'
        ? { delivery: 'pending' }
        : { ok: true };
    },
  );
  app.post<
    Scoped & {
      Params: { id: string };
      Body: { actorId: string; role: 'workspace_admin' | 'member' };
    }
  >(
    '/api/workspaces/:id/members',
    {
      schema: {
        querystring: tenantQuery,
        params: { type: 'object', required: ['id'], properties: { id: uuid } },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['actorId', 'role'],
          properties: {
            actorId: uuid,
            role: { type: 'string', enum: ['workspace_admin', 'member'] },
          },
        },
      },
    },
    async (request) =>
      transact(
        request,
        'workspace.membership.updated',
        async (client) => {
          await client.query('SELECT business.assign_workspace($1,$2,$3)', [
            request.params.id,
            request.body.actorId,
            request.body.role,
          ]);
          return { ok: true };
        },
        request.query.tenantId,
      ),
  );
  app.get<Scoped & { Params: { id: string } }>(
    '/api/workspaces/:id/members',
    {
      schema: {
        querystring: tenantQuery,
        params: { type: 'object', required: ['id'], properties: { id: uuid } },
      },
    },
    async (request) =>
      transact(
        request,
        'workspace.members.read',
        async (client) =>
          (
            await client.query('SELECT * FROM business.workspace_people($1)', [
              request.params.id,
            ])
          ).rows,
        request.query.tenantId,
      ),
  );
  app.delete<Scoped & { Params: { id: string; actorId: string } }>(
    '/api/workspaces/:id/members/:actorId',
    {
      schema: {
        querystring: tenantQuery,
        params: {
          type: 'object',
          required: ['id', 'actorId'],
          properties: { id: uuid, actorId: uuid },
        },
      },
    },
    async (request) =>
      transact(
        request,
        'workspace.member.removed',
        async (client) => {
          await client.query('SELECT business.remove_member($1,$2)', [
            request.params.actorId,
            request.params.id,
          ]);
          return { ok: true };
        },
        request.query.tenantId,
      ),
  );
  app.patch<
    Scoped & {
      Params: { id: string };
      Body: { name: string; visibility: 'private' | 'tenant' };
    }
  >(
    '/api/workspaces/:id',
    {
      schema: {
        querystring: tenantQuery,
        params: { type: 'object', required: ['id'], properties: { id: uuid } },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'visibility'],
          properties: {
            name: shortName,
            visibility: { type: 'string', enum: ['private', 'tenant'] },
          },
        },
      },
    },
    async (request) =>
      transact(
        request,
        'workspace.updated',
        async (client) => {
          const result = await client.query(
            'UPDATE business.workspaces SET name=$1,visibility=$2 WHERE id=$3 RETURNING id,name,visibility',
            [request.body.name, request.body.visibility, request.params.id],
          );
          if (!result.rowCount) throw new AccessError(404, 'NOT_FOUND');
          return result.rows[0];
        },
        request.query.tenantId,
      ),
  );
  app.delete<Scoped & { Params: { id: string } }>(
    '/api/members/:id',
    {
      schema: {
        querystring: tenantQuery,
        params: { type: 'object', required: ['id'], properties: { id: uuid } },
      },
    },
    async (request) =>
      transact(
        request,
        'membership.removed',
        async (client) => {
          await client.query('SELECT business.remove_member($1)', [
            request.params.id,
          ]);
          return { ok: true };
        },
        request.query.tenantId,
      ),
  );
  app.post<{ Params: { id: string } }>(
    '/api/platform/actors/:id/disable',
    {
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: uuid } },
      },
    },
    async (request) =>
      transact(request, 'actor.disabled', async (client, context) => {
        requireSuper(context);
        await client.query('SELECT business.disable_actor($1)', [
          request.params.id,
        ]);
        return { ok: true };
      }),
  );
}
