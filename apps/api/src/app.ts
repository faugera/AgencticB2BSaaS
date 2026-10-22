import Fastify from 'fastify';
import type { HealthResponse } from '@enterprise/shared';
import type { AuthConfig } from './auth/config.js';
import { createAuth, createAuthPool } from './auth/service.js';
import { createMailer } from './auth/mail.js';
import { registerAuthRoutes } from './auth/routes.js';
import type { Auth } from './auth/service.js';

export function buildApp({ logger = false, authConfig, authInstance }: { logger?: boolean; authConfig?: AuthConfig; authInstance?: Auth } = {}) {
  const app = Fastify({
    logger: logger ? { redact: ['req.url', 'req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'] } : false,
    bodyLimit: 1_048_576,
    requestTimeout: 10_000,
    trustProxy: false,
  });

  if (authInstance) {
    registerAuthRoutes(app, authInstance);
  } else if (authConfig) {
    const pool = createAuthPool(authConfig.databaseURL);
    const mailer = createMailer(authConfig.smtp);
    registerAuthRoutes(app, createAuth(authConfig, pool, mailer.send));
    app.addHook('onClose', async () => { mailer.close(); await pool.end(); });
  } else {
    registerAuthRoutes(app);
  }

  app.get<{ Reply: HealthResponse }>('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          additionalProperties: false,
          required: ['status'],
          properties: { status: { type: 'string', const: 'ok' } },
        },
      },
    },
  }, async () => ({ status: 'ok' }));

  return app;
}
