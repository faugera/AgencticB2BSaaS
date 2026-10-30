import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { Client } from 'pg';
import type { AccessContext } from '@enterprise/shared';
import { registerAuditRoutes } from './audit-routes.js';

const tenant = '11111111-1111-4111-8111-111111111111';
const cursor = '22222222-2222-4222-8222-222222222222';
describe('audit request boundary', () => {
  it('requires explicit tenant scope for ordinary administrators', async () => {
    const app = Fastify();
    const client = Object.assign(new Client(), { release: vi.fn() });
    const query = vi.spyOn(client, 'query');
    const context: AccessContext = { actorId: 'fixture', platformRole: null, tenantRole: 'tenant_admin', tenantId: tenant, handle: null };
    registerAuditRoutes(app, (_request, _action, run) => run(client, context));
    try {
      expect((await app.inject('/api/audit-logs')).statusCode).toBe(403);
      expect(query).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
  it('rejects malformed scope, non-UUID cursors and unknown queries before authorization', async () => {
    const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
    const transact = vi.fn(async () => { throw new Error('Session required'); });
    registerAuditRoutes(app, transact);
    try {
      for (const query of ['tenantId=bad', 'before=0', 'before=-1', 'before=9223372036854775808', 'before=1.5', 'actorId=other', 'before=1%20OR%201=1']) {
        expect((await app.inject('/api/audit-logs?' + query)).statusCode).toBe(400);
      }
      expect(transact).not.toHaveBeenCalled();
      await app.inject('/api/audit-logs?before=' + cursor);
      expect(transact).toHaveBeenCalledTimes(1);
      expect((await app.inject('/api/platform/audit')).statusCode).toBe(404);
    } finally { await app.close(); }
  });
  it('rejects a member or explicit missing audit capability before querying', async () => {
    const app = Fastify();
    const client = Object.assign(new Client(), { release: vi.fn() });
    const query = vi.spyOn(client, 'query');
    const context: AccessContext = { actorId: 'fixture', platformRole: null, tenantRole: 'tenant_admin', tenantId: tenant, handle: null, permissions: [] };
    registerAuditRoutes(app, (_request, _action, run) => run(client, context));
    try {
      expect((await app.inject('/api/audit-logs?tenantId=' + tenant)).statusCode).toBe(403);
      context.tenantRole = 'member';
      expect((await app.inject('/api/audit-logs?tenantId=' + tenant)).statusCode).toBe(403);
      expect(query).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
  it('uses SQL authorization and UUID pagination for scoped reads', async () => {
    const app = Fastify();
    const client = Object.assign(new Client(), { release: vi.fn() });
    const query = vi.spyOn(client, 'query').mockImplementation(async () => ({ rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] }));
    const context: AccessContext = { actorId: 'fixture', platformRole: null, tenantRole: 'tenant_admin', tenantId: tenant, handle: null };
    registerAuditRoutes(app, (_request, _action, run) => run(client, context));
    try {
      const response = await app.inject('/api/audit-logs?tenantId=' + tenant + '&before=' + cursor);
      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(query).toHaveBeenCalledWith('SELECT * FROM business.audit_log_events($1,$2)', [tenant, cursor]);
      expect(response.json()).toEqual({ events: [], nextCursor: null });
    } finally { await app.close(); }
  });
});
