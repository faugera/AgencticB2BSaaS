import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import type { AccessContext } from '@enterprise/shared';
import type { OrganizationSummary, RoleDefinition, RolePerson } from '@enterprise/shared';
import { z } from 'zod';
import { AccessError } from './store.js';

type Transact = <T>(request: FastifyRequest, action: string, run: (client: PoolClient, context: AccessContext) => Promise<T>, tenant?: string) => Promise<T>;

const permission = z.enum(['organization.manage', 'tenant.read', 'tenant.manage', 'workspace.read', 'workspace.create', 'workspace.update', 'workspace.members.manage', 'members.read', 'members.manage', 'invitations.manage', 'audit.read', 'roles.assign']);
const scopeQuery = z.strictObject({ tenantId: z.uuid().optional() });
const peopleQuery = scopeQuery.extend({ workspaceId: z.uuid().optional() });
const roleInput = z.strictObject({
  name: z.string().trim().min(1).max(100), scope: z.enum(['organization', 'tenant', 'workspace']),
  permissions: z.array(permission).max(12), delegable: z.boolean().default(false),
  archived: z.boolean().default(false), confirmed: z.boolean().default(false),
});
const assignmentInput = z.strictObject({
  actorId: z.uuid(), roleId: z.uuid(), organizationId: z.uuid(),
  tenantId: z.uuid().nullable().optional(), workspaceId: z.uuid().nullable().optional(),
  operation: z.enum(['grant', 'revoke']),
});

export function registerRbacRoutes(app: FastifyInstance, transact: Transact) {
  app.get('/api/tenants', async (request) => transact(request, 'tenants.read', async (_client, context) => context.tenants ?? []));
  app.get('/api/organizations', async (request) => transact(request, 'organizations.read', async (client) =>
    (await client.query<OrganizationSummary>('SELECT * FROM business.organization_directory()')).rows));
  app.post('/api/organizations', async (request, reply) => {
    const input = z.strictObject({ name: z.string().trim().min(1).max(100) }).safeParse(request.body);
    if (!input.success) throw new AccessError(400, 'INVALID_REQUEST');
    return reply.code(201).send(await transact(request, 'organization.created', async (client) =>
      (await client.query<{ id: string }>('SELECT business.create_organization($1) id', [input.data.name])).rows[0]));
  });
  app.get('/api/roles', async (request) => transact(request, 'roles.read', async (client) =>
    (await client.query<{ roles: readonly RoleDefinition[] }>('SELECT business.role_catalog() roles')).rows[0]?.roles ?? []));
  app.post('/api/roles', async (request, reply) => {
    const input = roleInput.safeParse(request.body);
    if (!input.success) throw new AccessError(400, 'INVALID_REQUEST');
    const role = input.data;
    return reply.code(201).send(await transact(request, 'role.created', async (client) =>
      (await client.query<{ id: string }>('SELECT business.save_role(NULL,$1,$2,$3,$4,$5,$6) id',
        [role.name, role.scope, role.permissions, role.delegable, role.archived, role.confirmed])).rows[0]));
  });
  app.put<{ Params: { id: string } }>('/api/roles/:id', async (request) => {
    const id = z.uuid().safeParse(request.params.id);
    const input = roleInput.safeParse(request.body);
    if (!id.success || !input.success) throw new AccessError(400, 'INVALID_REQUEST');
    const role = input.data;
    return transact(request, 'role.updated', async (client) =>
      (await client.query<{ id: string }>('SELECT business.save_role($1,$2,$3,$4,$5,$6,$7) id',
        [id.data, role.name, role.scope, role.permissions, role.delegable, role.archived, role.confirmed])).rows[0]);
  });
  app.get('/api/role-assignments', async (request) => {
    const query = peopleQuery.safeParse(request.query);
    if (!query.success) throw new AccessError(400, 'INVALID_REQUEST');
    return transact(request, 'role_assignments.read', async (client) =>
      (await client.query<{ people: readonly RolePerson[] }>('SELECT business.role_people($1,$2) people', [query.data.tenantId ?? null, query.data.workspaceId ?? null])).rows[0]?.people ?? [], query.data.tenantId);
  });
  app.post('/api/role-assignments', async (request) => {
    const input = assignmentInput.safeParse(request.body);
    if (!input.success) throw new AccessError(400, 'INVALID_REQUEST');
    const body = input.data;
    return transact(request, 'role_assignment.updated', async (client) => {
      await client.query('SELECT business.assign_role($1,$2,$3,$4,$5,$6)', [body.actorId, body.roleId, body.organizationId, body.tenantId ?? null, body.workspaceId ?? null, body.operation]);
      return { ok: true };
    }, body.tenantId ?? undefined);
  });
  app.patch<{ Params: { id: string } }>('/api/members/:id/status', async (request) => {
    const query = scopeQuery.safeParse(request.query);
    const id = z.uuid().safeParse(request.params.id);
    const input = z.strictObject({ status: z.enum(['invited', 'active', 'suspended']) }).safeParse(request.body);
    if (!query.success || !id.success || !input.success) throw new AccessError(400, 'INVALID_REQUEST');
    return transact(request, 'membership.status.updated', async (client) => {
      await client.query('SELECT business.set_membership_status($1,$2)', [id.data, input.data.status]);
      return { ok: true };
    }, query.data.tenantId);
  });
}
