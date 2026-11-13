import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { buildApp } from '../app.js';
import { createAuth, createAuthPool } from '../auth/service.js';
import { provisionRoles } from '../auth/provision.js';
import { migrateAuth } from '../auth/migrate.js';
import type { AuthConfig } from '../auth/config.js';
import { businessTransaction, createBusinessPool } from './store.js';

vi.mock('../auth/mail.js', () => ({
  createMailer: () => ({
    send: vi.fn(async () => {
      throw new Error('Test mail service unavailable');
    }),
    close: vi.fn(),
  }),
}));

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
    activeKeyId: 'test-v1',
    keys: { 'test-v1': randomBytes(32).toString('base64url') },
  },
  smtp: {
    host: '127.0.0.1',
    port: 1025,
    secure: false,
    from: 'test@example.test',
  },
};
const operator = new Pool({ connectionString: migrationURL });
const identity = createAuthPool(databaseURL);
const business = createBusinessPool(businessURL);
const ipSuffix = randomBytes(4).toString('hex');
const testIP = `2001:db8:${ipSuffix.slice(0, 4)}:${ipSuffix.slice(4)}::1`;
let app: ReturnType<typeof buildApp>;
let account: { id: string; actor: string; cookie: string };
let organizationId: string;

describe('Idempotence HTTP avec PostgreSQL jetable', () => {
  beforeAll(async () => {
    await provisionRoles(migrationURL, databaseURL, businessURL);
    await migrateAuth(config, migrationURL);
    app = buildApp({ authConfig: config, trustedProxies: ['127.0.0.1'] });
    const auth = createAuth(config, identity, async () => {}, true);
    const email = `idempotency-${randomBytes(8).toString('hex')}@example.test`;
    const password = randomBytes(24).toString('base64url');
    const created = await auth.api.signUpEmail({
      body: { email, name: 'Idempotency fixture', password },
    });
    await operator.query(
      'UPDATE identity."user" SET "emailVerified"=true WHERE id=$1',
      [created.user.id],
    );
    const actor = await businessTransaction(
      business,
      created.user.id,
      undefined,
      'fixture.read',
      async (_client, context) => context.actorId,
    );
    if (!actor) throw new Error('Missing idempotency actor');
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      remoteAddress: testIP,
      headers: { origin: config.baseURL, 'x-auth-client-ip': testIP },
      payload: { email, password },
    });
    expect(login.statusCode).toBe(200);
    account = {
      id: created.user.id,
      actor,
      cookie: login.cookies
        .map((cookie) => cookie.name + '=' + cookie.value)
        .join('; '),
    };
    await operator.query(
      "UPDATE authorization_private.actors SET platform_role='super_admin' WHERE id=$1",
      [account.actor],
    );
    const organization = await app.inject({
      method: 'POST',
      url: '/api/organizations',
      headers: { origin: config.baseURL, cookie: account.cookie },
      payload: { name: `Idempotency org ${randomBytes(6).toString('hex')}` },
    });
    expect(organization.statusCode).toBe(201);
    organizationId = organization.json<{ id: string }>().id;
  });

  afterAll(async () => {
    await app?.close();
    if (account?.actor)
      await operator.query(
        'UPDATE authorization_private.actors SET platform_role=NULL WHERE id=$1',
        [account.actor],
      );
    await Promise.all([operator.end(), identity.end(), business.end()]);
  });

  it('ne crée qu’un tenant, une invitation et un événement pour dix rejeux concurrents', async () => {
    const me = await app.inject({ url: '/api/me', headers: { cookie: account.cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().access.tenantId).toBe('00000000-0000-0000-0000-000000000000');
    const key = randomBytes(32).toString('base64url');
    const name = 'Idempotent tenant ' + randomBytes(6).toString('hex');
    const email = `idempotent-${randomBytes(8).toString('hex')}@example.test`;
    const path = `/api/organizations/${organizationId}/tenants`;
    const payload = { name, adminEmail: email };
    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        app.inject({
          method: 'POST',
          url: path,
          headers: {
            origin: config.baseURL,
            cookie: account.cookie,
            'idempotency-key': key,
            'x-forwarded-for': `192.0.2.${index + 1}`,
          },
          payload,
        }),
      ),
    );

    expect(responses.map((response) => response.statusCode)).toEqual(
      Array(10).fill(201),
    );
    const ids = responses.map((response) => response.json<{ id: string }>().id);
    expect(new Set(ids).size).toBe(1);
    expect(
      responses.every((response) => response.json().delivery === 'pending'),
    ).toBe(true);

    const counts = await operator.query<{
      tenants: string;
      invitations: string;
      outbox: string;
    }>(
      `SELECT
        (SELECT count(*) FROM business.tenants WHERE id=$1)::text tenants,
        (SELECT count(*) FROM authorization_private.invitations WHERE email=$2)::text invitations,
        (SELECT count(*) FROM authorization_private.outbox_messages o
          JOIN authorization_private.invitations i ON i.id=o.invitation_id
          WHERE i.email=$2)::text outbox`,
      [ids[0], email],
    );
    expect(counts.rows[0]).toEqual({
      tenants: '1',
      invitations: '1',
      outbox: '1',
    });
    const encrypted = await operator.query<{ ciphertext: string }>(
      `SELECT o.ciphertext FROM authorization_private.outbox_messages o
        JOIN authorization_private.invitations i ON i.id=o.invitation_id
        WHERE i.email=$1`,
      [email],
    );
    expect(encrypted.rows[0]?.ciphertext).toBeTruthy();
    expect(encrypted.rows[0]?.ciphertext).not.toContain(email);

    const conflict = await app.inject({
      method: 'POST',
      url: path,
      headers: {
        origin: config.baseURL,
        cookie: account.cookie,
        'idempotency-key': key,
      },
      payload: { ...payload, name: name + ' altered' },
    });
    expect(conflict.statusCode).toBe(409);

    const secondOrganization = await app.inject({
      method: 'POST',
      url: '/api/organizations',
      headers: { origin: config.baseURL, cookie: account.cookie },
      payload: { name: `Idempotency org ${randomBytes(6).toString('hex')}` },
    });
    expect(secondOrganization.statusCode).toBe(201);
    const otherScope = await app.inject({
      method: 'POST',
      url: `/api/organizations/${secondOrganization.json<{ id: string }>().id}/tenants`,
      headers: {
        origin: config.baseURL,
        cookie: account.cookie,
        'idempotency-key': key,
      },
      payload,
    });
    expect(otherScope.statusCode).toBe(201);
    expect(otherScope.json<{ id: string }>().id).not.toBe(ids[0]);
  });
});
