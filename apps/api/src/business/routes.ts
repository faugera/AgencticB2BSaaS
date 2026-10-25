import { createHash, randomBytes } from 'node:crypto';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool, PoolClient } from 'pg';
import type { Auth } from '../auth/service.js';
import type { AuthConfig } from '../auth/config.js';
import type { SendAuthMail } from '../auth/mail.js';
import { inviteIdentity } from '../auth/operator.js';
import { AccessError, businessTransaction } from './store.js';
import type { AccessContext } from './store.js';
import { registerUIRoutes } from './ui-routes.js';
import { registerAuditRoutes } from './audit-routes.js';
import { registerAccessRoutes } from './access-routes.js';
import { registerProfileRoutes } from './profile-routes.js';
import { registerRbacRoutes } from './rbac-routes.js';

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
const hash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
type Scoped = { Querystring: { tenantId?: string } };

export function registerBusinessRoutes(
  app: FastifyInstance,
  auth: Auth,
  pool: Pool,
  config: AuthConfig,
  send: SendAuthMail,
) {
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
    return businessTransaction(
      pool,
      session.user.id,
      tenant,
      action,
      async (client, context) => run(client, context),
      { ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
    );
  };
  const requireSuper = (context: AccessContext) => {
    if (context.platformRole !== 'super_admin')
      throw new AccessError(403, 'ACCESS_DENIED');
  };
  const deliver = async (
    request: FastifyRequest,
    tenant: string,
    invitationId: string,
    email: string,
    token: string,
  ) => {
    let delivery: 'sent' | 'failed' = 'sent';
    try {
      await inviteIdentity(
        config,
        send,
        email,
        '',
        false,
      );
      await send({
        to: email,
        subject: 'Votre invitation / Your invitation',
        text: `Rejoindre votre organisation / Join your organization:\n${config.baseURL}/invite#${token}\n\n48 heures / 48 hours. Connectez-vous avec cette adresse vérifiée / Sign in with this verified email.`,
      });
    } catch {
      delivery = 'failed';
    }
    await transact(
      request,
      'invitation.delivery',
      (client) =>
        client.query('SELECT business.update_invitation($1,$2)', [
          invitationId,
          delivery,
        ]),
      tenant,
    );
    return delivery;
  };
  registerUIRoutes(app, transact);
  registerProfileRoutes(app, transact);
  registerRbacRoutes(app, transact);
  registerAuditRoutes(app, transact);
  registerAccessRoutes(app, { pool, origin: config.baseURL, transact, deliver });
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
        workspaces: (
          await client.query(
            'SELECT id,tenant_id,name,visibility,business.workspace_admin(id,tenant_id) can_manage,business.can($$roles.assign$$,id) can_assign_roles,business.workspace_level(id) role_level,business.workspace_color(id) color FROM business.workspaces ORDER BY name',
          )
        ).rows,
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
          return { id: tenant.id, invitationId: invitation.id };
        },
      );
      const delivery = await deliver(
        request,
        result.id,
        result.invitationId,
        request.body.adminEmail,
        token,
      );
      return reply.code(201).send({ ...result, delivery });
  };
  const tenantBody = { type: 'object', additionalProperties: false, required: ['name', 'adminEmail'], properties: { name: shortName, adminEmail: emailSchema } } as const;
  app.post<{ Body: { name: string; adminEmail: string } }>('/api/platform/tenants', { config: { rateLimit: { max: 3, timeWindow: '1 minute' } }, schema: { body: tenantBody } }, (request, reply) => createTenant(request, reply));
  app.post<{ Params: { id: string }; Body: { name: string; adminEmail: string } }>('/api/organizations/:id/tenants', { config: { rateLimit: { max: 3, timeWindow: '1 minute' } }, schema: { params: { type: 'object', required: ['id'], additionalProperties: false, properties: { id: uuid } }, body: tenantBody } }, (request, reply) => createTenant(request, reply, request.params.id));
  app.get<Scoped>(
    '/api/workspaces',
    { schema: { querystring: tenantQuery } },
    async (request) =>
      transact(
        request,
        'workspaces.read',
        async (client) =>
          (
            await client.query(
              'SELECT id,tenant_id,name,visibility,business.workspace_admin(id,tenant_id) can_manage,business.can($$roles.assign$$,id) can_assign_roles,business.workspace_level(id) role_level,business.workspace_color(id) color FROM business.workspaces ORDER BY name',
            )
          ).rows,
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
  app.get<Scoped>(
    '/api/members',
    { schema: { querystring: tenantQuery } },
    async (request) =>
      transact(
        request,
        'members.read',
        async (client) =>
          (await client.query('SELECT * FROM business.members()')).rows,
        request.query.tenantId,
      ),
  );
  app.get<Scoped>(
    '/api/invitations',
    { schema: { querystring: tenantQuery } },
    async (request) =>
      transact(
        request,
        'invitations.read',
        async (client) =>
          (await client.query('SELECT * FROM business.invitations()')).rows,
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
          return { id: row.id, tenant };
        },
        request.query.tenantId,
      );
      return reply.code(201).send({
        id: result.id,
        delivery: await deliver(
          request,
          result.tenant,
          result.id,
          request.body.email,
          token,
        ),
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
      const result = await transact(
        request,
        'invitation.updated',
        async (client) => {
          const row = (
            await client.query<{ email: string }>(
              'SELECT business.update_invitation($1,$2,$3) email',
              [request.params.id, request.body.operation, hash(token)],
            )
          ).rows[0]!;
          return {
            ...row,
            tenant: (
              await client.query<{ tenant: string }>(
                "SELECT current_setting('app.tenant_id') tenant",
              )
            ).rows[0]!.tenant,
          };
        },
        request.query.tenantId,
      );
      return request.body.operation === 'retry'
        ? {
            delivery: await deliver(
              request,
              result.tenant,
              request.params.id,
              result.email,
              token,
            ),
          }
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
