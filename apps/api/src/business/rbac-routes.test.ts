import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { registerRbacRoutes } from './rbac-routes.js';
import { AccessError } from './store.js';

describe('frontière des nouveaux contrats RBAC', () => {
  it('refuse les propriétés et portées non fiables avant la transaction', async () => {
    const app = Fastify();
    app.setErrorHandler((error, _request, reply) => reply.code(error instanceof AccessError ? error.status : 500).send({ code: 'ERROR' }));
    const transact = vi.fn(async () => { throw new Error('Authorization required'); });
    registerRbacRoutes(app, transact);
    try {
      for (const payload of [
        { name: 'Rôle', scope: 'platform', permissions: [] },
        { name: 'Rôle', scope: 'tenant', permissions: ['super_admin'] },
        { name: 'Rôle', scope: 'tenant', permissions: [], actorId: 'forged' },
        { name: ' ', scope: 'tenant', permissions: [] },
      ]) expect((await app.inject({ method: 'POST', url: '/api/roles', payload })).statusCode).toBe(400);
      expect((await app.inject('/api/role-assignments?tenantId=invalid')).statusCode).toBe(400);
      expect((await app.inject('/api/role-assignments?workspaceId=invalid')).statusCode).toBe(400);
      expect((await app.inject({ method: 'POST', url: '/api/role-assignments', payload: { operation: 'grant', roleId: 'invalid' } })).statusCode).toBe(400);
      expect(transact).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
  it('exige une autorisation serveur pour un DTO valide', async () => {
    const app = Fastify();
    const transact = vi.fn(async () => { throw new Error('Authorization required'); });
    registerRbacRoutes(app, transact);
    try {
      await app.inject({ method: 'POST', url: '/api/roles', payload: { name: 'Lecture', scope: 'tenant', permissions: ['audit.read'] } });
      expect(transact).toHaveBeenCalledOnce();
    } finally { await app.close(); }
  });
  it('transmet la portée tenant validée au catalogue de rôles', async () => {
    const app = Fastify();
    let scopedTenant: string | undefined;
    const transact = vi.fn(async (_request: unknown, _action: string, _run: unknown, tenant?: string) => {
      scopedTenant = tenant;
      throw new Error('Authorization required');
    }) as Parameters<typeof registerRbacRoutes>[1];
    const tenantId = '00000000-0000-4000-8000-000000000001';
    registerRbacRoutes(app, transact);
    try {
      await app.inject('/api/roles?tenantId=' + tenantId);
      expect(scopedTenant).toBe(tenantId);
    } finally { await app.close(); }
  });
});
