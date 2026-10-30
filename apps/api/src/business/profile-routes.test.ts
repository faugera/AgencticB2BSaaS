import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { AccessError } from './store.js';
import { registerProfileRoutes } from './profile-routes.js';

const profile = { first_name: 'Anne', last_name: 'Dupont', avatar_url: null, phone_number: null, job_title: null, department: null };
describe('profil : routes', () => {
  it('refuse les entrées invalides avant toute transaction', async () => {
    const app = Fastify();
    app.setErrorHandler((error, _request, reply) => {
      if (error instanceof AccessError) return reply.code(error.status).send({ code: error.code });
      throw error;
    });
    const transact = vi.fn();
    registerProfileRoutes(app, async () => { transact(); throw new AccessError(401, 'UNAUTHENTICATED'); });
    try {
      for (const url of ['/api/profile?tenantId=invalid', '/api/profile?actorId=other']) {
        expect((await app.inject({ method: 'GET', url })).statusCode).toBe(400);
      }
      expect((await app.inject({ method: 'PUT', url: '/api/profile', payload: { ...profile, status: 'active' } })).statusCode).toBe(400);
      expect(transact).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
  it('délègue les sessions et origines au même contrôle transactionnel', async () => {
    const app = Fastify();
    app.setErrorHandler((error, _request, reply) => {
      if (error instanceof AccessError) return reply.code(error.status).send({ code: error.code });
      throw error;
    });
    const scopes: (string | undefined)[] = [];
    registerProfileRoutes(app, async (request, _action, _run, tenant) => {
      scopes.push(tenant);
      throw new AccessError(request.method === 'PUT' ? 403 : 401, 'ACCESS_DENIED');
    });
    const tenant = '10000000-0000-4000-8000-000000000001';
    try {
      expect((await app.inject({ method: 'GET', url: '/api/profile' })).statusCode).toBe(401);
      expect((await app.inject({ method: 'PUT', url: '/api/profile?tenantId=' + tenant, payload: profile })).statusCode).toBe(403);
      expect(scopes).toEqual([undefined, tenant]);
    } finally { await app.close(); }
  });
});
