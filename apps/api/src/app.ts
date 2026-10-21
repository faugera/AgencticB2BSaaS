import Fastify from 'fastify';
import type { HealthResponse } from '@enterprise/shared';

export function buildApp({ logger = false }: { logger?: boolean } = {}) {
  const app = Fastify({
    logger,
    bodyLimit: 1_048_576,
    requestTimeout: 10_000,
    trustProxy: false,
  });

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
