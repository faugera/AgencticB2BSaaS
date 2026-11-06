import { createHash, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { buildApp } from '../app.js';
import { createAuthPool } from '../auth/service.js';
import { provisionRoles } from '../auth/provision.js';
import { migrateAuth } from '../auth/migrate.js';
import type { AuthConfig } from '../auth/config.js';
import { createBusinessPool } from './store.js';

const databaseURL = process.env.AUTH_TEST_DATABASE_URL;
const migrationURL = process.env.AUTH_TEST_MIGRATION_DATABASE_URL;
if (
  !databaseURL ||
  !migrationURL ||
  !new URL(databaseURL).pathname.startsWith('/enterprise_auth_test')
)
  throw new Error('Explicit disposable PostgreSQL database required');

const businessURL = databaseURL.replace(
  'identity_runtime:',
  'business_runtime:',
);
const config: AuthConfig = {
  baseURL: 'http://127.0.0.1:5173',
  secret: randomBytes(48).toString('base64url'),
  databaseURL,
  businessDatabaseURL: businessURL,
  outboxEncryption: {
    activeKeyId: 'rate-test-v1',
    keys: { 'rate-test-v1': randomBytes(32).toString('base64url') },
  },
  smtp: {
    host: '127.0.0.1',
    port: 1025,
    secure: false,
    from: 'test@example.test',
  },
};
const operator = new Pool({ connectionString: migrationURL });
const business = createBusinessPool(businessURL);
const identity = createAuthPool(databaseURL);
const apps: ReturnType<typeof buildApp>[] = [];
const request = {
  method: 'POST',
  url: '/api/access-requests',
  remoteAddress: '198.51.100.191',
  headers: { origin: config.baseURL },
  payload: {
    link: '21c7d7a8-c64c-4bd0-9c70-35ae1b2b1d6b',
    firstName: 'Rate',
    lastName: 'Limit',
    email: 'rate-limit@example.test',
  },
};

async function createApp() {
  const app = buildApp({ authConfig: config });
  apps.push(app);
  await app.ready();
  return app;
}

describe('Limitation partagée PostgreSQL', () => {
  beforeAll(async () => {
    await provisionRoles(migrationURL, databaseURL, businessURL);
    await migrateAuth(config, migrationURL);
    await Promise.all([createApp(), createApp(), createApp()]);
  });

  afterAll(async () => {
    await Promise.all(apps.map((app) => app.close()));
    await Promise.all([operator.end(), identity.end(), business.end()]);
  });

  it('partage la fenêtre entre trois instances et conserve le compteur après redémarrage', async () => {
    const responses = await Promise.all(
      apps.map((app) => app.inject(request)),
    );
    expect(responses.map((response) => response.statusCode)).toEqual([
      403, 403, 403,
    ]);

    const exceeded = await apps[0]!.inject(request);
    expect(exceeded.statusCode).toBe(429);
    expect(Number(exceeded.headers['retry-after'])).toBeGreaterThan(0);

    await apps[2]!.close();
    apps.splice(2, 1);
    const restarted = await createApp();
    const afterRestart = await restarted.inject(request);
    expect(afterRestart.statusCode).toBe(429);
  });

  it('refuse la requête si la fonction PostgreSQL partagée est indisponible', async () => {
    await operator.query(
      'REVOKE EXECUTE ON FUNCTION business.consume_rate_limit(text,integer,integer) FROM business_runtime',
    );
    try {
      const response = await apps[0]!.inject({
        ...request,
        remoteAddress: '198.51.100.192',
      });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ code: 'RATE_LIMIT_UNAVAILABLE' });
    } finally {
      await operator.query(
        'GRANT EXECUTE ON FUNCTION business.consume_rate_limit(text,integer,integer) TO business_runtime',
      );
    }
  });

  it('expire la fenêtre et ne conserve que l’empreinte opaque de la clé', async () => {
    const keyHash = createHash('sha256')
      .update(randomBytes(32))
      .digest('hex');
    const first = await business.query<{ request_count: number }>(
      'SELECT * FROM business.consume_rate_limit($1,$2,$3)',
      [keyHash, 1, 25],
    );
    expect(first.rows[0]?.request_count).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const next = await business.query<{ request_count: number }>(
      'SELECT * FROM business.consume_rate_limit($1,$2,$3)',
      [keyHash, 1, 25],
    );
    expect(next.rows[0]?.request_count).toBe(1);
    const stored = await operator.query<{ key_digest: string }>(
      'SELECT key_digest FROM authorization_private.business_rate_limits WHERE key_digest=$1',
      [keyHash],
    );
    expect(stored.rows).toEqual([{ key_digest: keyHash }]);
  });
});
