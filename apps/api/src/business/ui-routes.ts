import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import type { AccessContext, UIPreferences } from '@enterprise/shared';

type Transact = <T>(request: FastifyRequest, action: string, run: (client: PoolClient, context: AccessContext) => Promise<T>, tenant?: string) => Promise<T>;
const uuid = { type: 'string', format: 'uuid' } as const;
export function registerUIRoutes(app: FastifyInstance, transact: Transact) {
  app.get('/api/preferences', async (request) => transact(request, 'preferences.read', async (client) => {
    const result = await client.query<{ preferences: UIPreferences | null }>('SELECT business.ui_preferences() preferences');
    return result.rows[0]?.preferences ?? null;
  }));
  app.put<{ Body: UIPreferences & { timezone?: string; date_format?: string } }>('/api/preferences', {
    schema: { body: { type: 'object', additionalProperties: false, required: ['locale', 'theme'], properties: {
      locale: { type: 'string', enum: ['fr', 'en'] }, theme: { type: 'string', enum: ['system', 'light', 'dark'] },
      timezone: { type: 'string', minLength: 1, maxLength: 100 }, date_format: { type: 'string', enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
    } } },
  }, async (request) => transact(request, 'preferences.updated', async (client) => {
    await client.query('SELECT business.save_ui_preferences($1,$2,$3,$4)', [request.body.locale, request.body.theme, request.body.timezone ?? null, request.body.date_format ?? null]);
    const result = await client.query<{ preferences: UIPreferences }>('SELECT business.ui_preferences() preferences');
    return result.rows[0]?.preferences ?? null;
  }));
  app.put<{ Params: { id: string }; Querystring: { tenantId?: string }; Body: { color: string | null } }>('/api/workspaces/:id/appearance', {
    schema: {
      params: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: uuid } },
      querystring: { type: 'object', additionalProperties: false, properties: { tenantId: uuid } },
      body: { type: 'object', additionalProperties: false, required: ['color'], properties: { color: { anyOf: [{ type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }, { type: 'null' }] } } },
    },
  }, async (request) => transact(request, 'workspace.appearance.updated', async (client) => {
    await client.query('SELECT business.save_workspace_color($1,$2)', [request.params.id, request.body.color]);
    return { color: request.body.color };
  }, request.query.tenantId));
}
