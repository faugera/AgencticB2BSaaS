import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { HealthResponse } from '@enterprise/shared';
import type { FastifyError } from 'fastify';
import type { AuthConfig } from './auth/config.js';
import { createAuth, createAuthPool } from './auth/service.js';
import { createMailer } from './auth/mail.js';
import { registerAuthRoutes } from './auth/routes.js';
import type { Auth } from './auth/service.js';
import {
  AccessError,
  assertRuntimePrivileges,
  createBusinessPool,
} from './business/store.js';
import { registerBusinessRoutes } from './business/routes.js';

export function buildApp({
  logger = false,
  authConfig,
  authInstance,
  trustedProxies = [],
}: {
  logger?: boolean;
  authConfig?: AuthConfig;
  authInstance?: Auth;
  trustedProxies?: string[];
} = {}) {
  const app = Fastify({
    logger: logger
      ? {
          redact: [
            'req.url',
            'req.headers.cookie',
            'req.headers.authorization',
            'res.headers["set-cookie"]',
          ],
        }
      : false,
    bodyLimit: 1_048_576,
    requestTimeout: 10_000,
    trustProxy: trustedProxies.length ? trustedProxies : false,
  });
  void app.register(helmet);
  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({ code: 'NOT_FOUND' }),
  );
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error instanceof AccessError)
      return reply.code(error.status).send({ code: error.code });
    const sqlCode = typeof error.code === 'string' ? error.code : '';
    if (error.validation)
      return reply.code(400).send({ code: 'INVALID_REQUEST' });
    if (sqlCode === '42501')
      return reply.code(403).send({ code: 'ACCESS_DENIED' });
    if (sqlCode === '23505') return reply.code(409).send({ code: 'CONFLICT' });
    if (['22023', '22P02', '23503', '23514', '23502'].includes(sqlCode))
      return reply.code(400).send({ code: 'INVALID_REQUEST' });
    // Neither SQL parameters nor Better Auth/SMTP errors belong in logs/responses.
    request.log.error(
      { requestId: request.id, route: request.routeOptions.url },
      'Request failed',
    );
    return reply
      .code(error.statusCode === 429 ? 429 : 500)
      .send({
        code: error.statusCode === 429 ? 'RATE_LIMITED' : 'INTERNAL_ERROR',
      });
  });
  let ready: () => Promise<void> = async () => {
    throw new Error('Authentication not configured');
  };

  if (authInstance) {
    registerAuthRoutes(app, authInstance);
  } else if (authConfig) {
    const pool = createAuthPool(authConfig.databaseURL);
    const mailer = createMailer(authConfig.smtp);
    const auth = createAuth(authConfig, pool, mailer.send);
    const business = authConfig.businessDatabaseURL
      ? createBusinessPool(authConfig.businessDatabaseURL)
      : undefined;
    registerAuthRoutes(app, auth, !!business);
    if (business) void app.register(async (scope) => {
      // Await installation before route declaration: rate limiting uses onRoute.
      // Encapsulation leaves Better Auth's SDK/database limits untouched.
      await scope.register(rateLimit,{global:true,max:120,timeWindow:'1 minute',hook:'preHandler'});
      registerBusinessRoutes(scope,auth,business,authConfig,mailer.send);
    });
    ready = async () => {
      await assertRuntimePrivileges(pool);
      await pool.query('SELECT 1 FROM identity."user" LIMIT 1');
      if (!business) throw new Error('Business not configured');
      await assertRuntimePrivileges(business);
      await business.query('SELECT 1 FROM business.tenants LIMIT 1');
    };
    app.addHook('onReady', async () => {
      await assertRuntimePrivileges(pool);
      if (business) await assertRuntimePrivileges(business);
    });
    app.addHook('onClose', async () => {
      mailer.close();
      await Promise.all([pool.end(), business?.end()]);
    });
  } else {
    registerAuthRoutes(app);
  }
  app.get('/ready', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
    try {
      await ready();
      return { status: 'ready' };
    } catch {
      return reply.code(503).send({ status: 'unavailable' });
    }
  });

  app.get<{ Reply: HealthResponse }>(
    '/health',
    {
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
    },
    async () => ({ status: 'ok' }),
  );

  return app;
}
