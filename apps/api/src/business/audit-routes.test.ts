import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { Client } from 'pg';
import type { AccessContext } from '@enterprise/shared';
import { registerAuditRoutes } from './audit-routes.js';

describe('audit request boundary', () => {
  it('rejects every ordinary business role before querying audit data', async () => {
    const app = Fastify();
    const client = Object.assign(new Client(), { release: vi.fn() });
    const query = vi.spyOn(client, 'query');
    const context: AccessContext = { actorId: 'fixture', platformRole: null, tenantRole: 'tenant_admin', tenantId: 'tenant', handle: null };
    registerAuditRoutes(app, (_request, _action, run) => run(client, context));
    try {
      expect((await app.inject('/api/platform/audit')).statusCode).toBe(403);
      expect(query).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
  it('rejects malformed scope, overflowing bigint and unknown queries before authorization', async () => {
    const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
    const transact = vi.fn(async () => { throw new Error('Session required'); });
    registerAuditRoutes(app, transact);
    try {
      for (const query of ['tenantId=bad', 'before=0', 'before=-1', 'before=9223372036854775808', 'before=1.5', 'actorId=other', 'before=1%20OR%201=1']) {
        expect((await app.inject('/api/platform/audit?' + query)).statusCode).toBe(400);
      }
      expect(transact).not.toHaveBeenCalled();
      await app.inject('/api/platform/audit?before=9223372036854775807');
      expect(transact).toHaveBeenCalledTimes(1);
    } finally { await app.close(); }
  });
});
