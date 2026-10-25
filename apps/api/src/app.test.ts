import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

describe('HTTP boundary', () => {
  const apps: ReturnType<typeof buildApp>[] = [];
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('returns a small, stable health contract without infrastructure', async () => {
    const app = buildApp();
    apps.push(app);
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toEqual({ status: 'ok' });
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain(
      "default-src 'self'",
    );
    const readiness = await app.inject({ url: '/ready' });
    expect(readiness.statusCode).toBe(503);
    expect(readiness.json()).toEqual({ status: 'unavailable' });
  });

  it('does not expose speculative business routes', async () => {
    const app = buildApp();
    apps.push(app);
    const response = await app.inject({ method: 'GET', url: '/tenants' });
    expect(response.statusCode).toBe(404);
  });

  it.each([
    { contentType: 'application/json', payload: '{', status: 400 },
    { contentType: 'application/json', payload: 'x'.repeat(1_048_577), status: 413 },
    { contentType: 'application/octet-stream', payload: 'unsupported', status: 415 },
  ])('returns a safe client error ($status)', async ({ contentType, payload, status }) => {
    const app = buildApp();
    apps.push(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { 'content-type': contentType },
      payload,
    });
    expect(response.statusCode).toBe(status);
    expect(response.json()).toEqual({ code: 'INVALID_REQUEST' });
  });
});
