import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { registerUIRoutes } from './ui-routes.js';

describe('UI preference trust-boundary schemas', () => {
 it('rejects unknown fields, enum values, CSS injection and malformed scope before transactions', async () => {
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  const transact = vi.fn();
  registerUIRoutes(app, async () => { transact(); throw new Error('Session required'); });
  try {
   for (const payload of [{ locale: 'es', theme: 'system' }, { locale: 'fr', theme: 'auto' }, { locale: 'fr', theme: 'light', actorId: 'other' }]) {
    expect((await app.inject({ method: 'PUT', url: '/api/preferences', payload })).statusCode).toBe(400);
   }
   const id = '10000000-0000-4000-8000-000000000001';
   for (const payload of [{ color: 'red' }, { color: '#fff;display:none' }, { color: '#ffffff', tenantId: id }]) {
    expect((await app.inject({ method: 'PUT', url: '/api/workspaces/' + id + '/appearance', payload })).statusCode).toBe(400);
   }
   expect((await app.inject({ method: 'PUT', url: '/api/workspaces/' + id + '/appearance?tenantId=invalid', payload: { color: null } })).statusCode).toBe(400);
   expect(transact).not.toHaveBeenCalled();
   await app.inject({ method: 'PUT', url: '/api/preferences', payload: { locale: 'en', theme: 'dark' } });
   expect(transact).toHaveBeenCalledTimes(1);
  } finally { await app.close(); }
 });
});
