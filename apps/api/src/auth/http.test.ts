import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';

describe('unconfigured authentication', () => {
  it('fails closed rather than fabricating an identity', async () => {
    const app = buildApp();
    try {
      const response = await app.inject({ url: '/api/me' });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ code: 'AUTH_NOT_CONFIGURED' });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['referrer-policy']).toBe('no-referrer');
      expect((await app.inject({ url: '/api/auth/get-session' })).statusCode).toBe(503);
    } finally { await app.close(); }
  });
});
