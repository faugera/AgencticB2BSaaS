import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance } from 'fastify';
import type { Auth } from './service.js';

export function registerAuthRoutes(
  app: FastifyInstance,
  auth?: Auth,
  businessEnabled = false,
) {
  app.addHook('onSend', async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      reply.header('cache-control', 'no-store');
      reply.header('referrer-policy', 'no-referrer');
    }
  });
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      if (!auth) return reply.code(503).send({ code: 'AUTH_NOT_CONFIGURED' });
      if (
        request.method === 'POST' &&
        request.headers.origin !== auth.options.baseURL
      ) {
        return reply.code(403).send({ code: 'UNTRUSTED_ORIGIN' });
      }
      if (request.method === 'POST' && request.url.split('?')[0] === '/api/auth/update-user') {
        const body = request.body;
        if (typeof body !== 'object' || body === null || !('name' in body) ||
          typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100 ||
          Object.keys(body).some((key) => key !== 'name'))
          return reply.code(400).send({ code: 'INVALID_REQUEST' });
      }
      // Use the configured origin, never a client-provided Host header.
      const url = new URL(request.url, auth.options.baseURL as string);
      const headers = fromNodeHeaders(request.headers);
      // Never let a client spoof the IP used by the authentication rate limiter.
      headers.set('x-auth-client-ip', request.ip);
      const response = await auth.handler(
        new Request(url, {
          method: request.method,
          headers,
          ...(request.body !== undefined
            ? { body: JSON.stringify(request.body) }
            : {}),
        }),
      );
      reply.code(response.status);
      response.headers.forEach((value, key) => {
        if (key !== 'set-cookie') reply.header(key, value);
      });
      // Headers.forEach coalesces cookies; preserve each one independently.
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header('set-cookie', cookies);
      return reply.send(await response.text());
    },
  });
  if (!businessEnabled)
    app.get('/api/me', async (request, reply) => {
      if (!auth) return reply.code(503).send({ code: 'AUTH_NOT_CONFIGURED' });
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      if (!session?.user.emailVerified)
        return reply.code(401).send({ code: 'UNAUTHENTICATED' });
      // Authentication is not tenant authorization. Never return a fabricated role.
      return {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        },
      };
    });
}
