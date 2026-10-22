import { describe, expect, it } from 'vitest';
import { readAuthConfig } from './config.js';

const valid = {
  AUTH_ENABLED: 'true',
  BETTER_AUTH_URL: 'http://127.0.0.1:5173',
  BETTER_AUTH_SECRET: 'unit-test-only-secret-with-at-least-32-characters',
  DATABASE_URL: 'postgres://identity_runtime:test@127.0.0.1/db',
  BUSINESS_DATABASE_URL: 'postgres://business_runtime:test@127.0.0.1/db',
  SMTP_HOST: '127.0.0.1',
  MAIL_FROM: 'test@example.test',
};
describe('authentication configuration', () => {
  it('does not require auth infrastructure for unconfigured development liveness', () => {
    expect(readAuthConfig({})).toBeUndefined();
  });
  it('requires auth in production and rejects ambiguous enable flags', () => {
    expect(() => readAuthConfig({ NODE_ENV: 'production' })).toThrow();
    expect(() => readAuthConfig({ AUTH_ENABLED: 'yes' })).toThrow();
  });
  it('accepts exact loopback origins and explicit HTTPS origins', () => {
    expect(readAuthConfig(valid)?.baseURL).toBe('http://127.0.0.1:5173');
    expect(
      readAuthConfig({
        ...valid,
        NODE_ENV: 'production',
        BETTER_AUTH_URL: 'https://app.example.test',
      })?.baseURL,
    ).toBe('https://app.example.test');
  });
  it.each([
    'https://example.test/path',
    'http://example.test',
    'https://user:pass@example.test',
    'https://example.test/?token=value',
  ])('rejects unsafe origin %s', (BETTER_AUTH_URL) => {
    expect(() => readAuthConfig({ ...valid, BETTER_AUTH_URL })).toThrow();
  });
  it('rejects short secrets, missing mail and malformed database configuration', () => {
    expect(() =>
      readAuthConfig({ ...valid, BETTER_AUTH_SECRET: 'short' }),
    ).toThrow();
    expect(() => readAuthConfig({ ...valid, SMTP_HOST: '' })).toThrow();
    expect(() =>
      readAuthConfig({ ...valid, DATABASE_URL: 'https://example.test' }),
    ).toThrow();
    expect(() => readAuthConfig({ ...valid, SMTP_PORT: 'invalid' })).toThrow();
    expect(() => readAuthConfig({ ...valid, SMTP_USER: 'user' })).toThrow();
  });
});
