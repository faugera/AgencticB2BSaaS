import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { buildApp } from '../app.js';
import { createAuth, createAuthPool } from '../auth/service.js';
import { provisionRoles } from '../auth/provision.js';
import { migrateAuth } from '../auth/migrate.js';
import type { AuthConfig } from '../auth/config.js';
import { businessTransaction, createBusinessPool } from './store.js';
import { decodePageCursor } from './page-cursor.js';

vi.mock('../auth/mail.js', () => ({
  createMailer: () => ({ send: vi.fn(async () => undefined), close: vi.fn() }),
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
    activeKeyId: 'pagination-v1',
    keys: { 'pagination-v1': randomBytes(32).toString('base64url') },
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
const additionalWorkspaceCount = 110;
const initialWorkspaceCount = 1;
let app: ReturnType<typeof buildApp>;
let account: { identityId: string; actorId: string; cookie: string };
let otherAccount: { identityId: string; cookie: string };
const tenantIds: string[] = [];

const login = async (email: string, password: string) => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { origin: config.baseURL },
    payload: { email, password },
  });
  expect(response.statusCode).toBe(200);
  return response.cookies
    .map((cookie) => cookie.name + '=' + cookie.value)
    .join('; ');
};

describe('Pagination PostgreSQL et portée tenant', () => {
  beforeAll(async () => {
    await provisionRoles(migrationURL, databaseURL, businessURL);
    await migrateAuth(config, migrationURL);
    app = buildApp({ authConfig: config });
    const auth = createAuth(config, identity, async () => undefined, true);
    const email = `pagination-${randomBytes(8).toString('hex')}@example.test`;
    const password = randomBytes(24).toString('base64url');
    const created = await auth.api.signUpEmail({
      body: { email, name: 'Pagination fixture', password },
    });
    await operator.query(
      'UPDATE identity."user" SET "emailVerified"=true WHERE id=$1',
      [created.user.id],
    );
    const actorId = await businessTransaction(
      business,
      created.user.id,
      undefined,
      'fixture.read',
      async (...[, context]) => context.actorId,
    );
    if (!actorId) throw new Error('Missing pagination actor');
    account = {
      identityId: created.user.id,
      actorId,
      cookie: await login(email, password),
    };
    await operator.query(
      "UPDATE authorization_private.actors SET platform_role='super_admin' WHERE id=$1",
      [actorId],
    );

    const organization = await app.inject({
      method: 'POST',
      url: '/api/organizations',
      headers: { origin: config.baseURL, cookie: account.cookie },
      payload: { name: `Pagination org ${randomBytes(6).toString('hex')}` },
    });
    expect(organization.statusCode).toBe(201);
    const organizationId = organization.json<{ id: string }>().id;
    for (const index of [1, 2]) {
      const tenant = await app.inject({
        method: 'POST',
        url: `/api/organizations/${organizationId}/tenants`,
        headers: { origin: config.baseURL, cookie: account.cookie },
        payload: {
          name: `Pagination tenant ${index}`,
          adminEmail: `pagination-admin-${index}-${randomBytes(6).toString('hex')}@example.test`,
        },
      });
      expect(tenant.statusCode).toBe(201);
      tenantIds.push(tenant.json<{ id: string }>().id);
    }

    const otherEmail = `pagination-other-${randomBytes(8).toString('hex')}@example.test`;
    const otherPassword = randomBytes(24).toString('base64url');
    const other = await auth.api.signUpEmail({
      body: { email: otherEmail, name: 'Other tenant fixture', password: otherPassword },
    });
    await operator.query(
      'UPDATE identity."user" SET "emailVerified"=true WHERE id=$1',
      [other.user.id],
    );
    await businessTransaction(
      business,
      other.user.id,
      undefined,
      'fixture.read',
      async () => undefined,
    );
    otherAccount = {
      identityId: other.user.id,
      cookie: await login(otherEmail, otherPassword),
    };

    await operator.query(
      `INSERT INTO business.workspaces(tenant_id,name,visibility)
       SELECT $1,'Pagination fixture ' || n,'private'
       FROM generate_series(1,$2::integer) AS n`,
      [tenantIds[0], additionalWorkspaceCount],
    );
  });

  afterAll(async () => {
    await app?.close();
    if (account?.actorId)
      await operator.query(
        'UPDATE authorization_private.actors SET platform_role=NULL WHERE id=$1',
        [account.actorId],
      );
    await Promise.all([operator.end(), identity.end(), business.end()]);
  });

  it('parcourt trois pages sans doublon et tolère une suppression entre pages', async () => {
    const firstResponse = await app.inject({
      url: `/api/workspaces?tenantId=${tenantIds[0]}`,
      headers: { cookie: account.cookie },
    });
    expect(firstResponse.statusCode).toBe(200);
    const first = firstResponse.json<{
      items: { id: string }[];
      nextCursor: string | null;
    }>();
    expect(first.items).toHaveLength(50);
    expect(first.nextCursor).toBeTruthy();

    const cursor = decodePageCursor(first.nextCursor!);
    const rowAfterCursor = await operator.query<{ id: string }>(
      `SELECT id FROM business.workspaces
       WHERE tenant_id=$1 AND (created_at,id)<($2::timestamptz,$3::uuid)
       ORDER BY created_at DESC,id DESC LIMIT 1`,
      [tenantIds[0], cursor!.createdAt, cursor!.id],
    );
    const deletedId = rowAfterCursor.rows[0]?.id;
    expect(deletedId).toBeTruthy();
    await operator.query('DELETE FROM business.workspaces WHERE id=$1', [
      deletedId,
    ]);

    const next = async (before: string) =>
      app.inject({
        url: `/api/workspaces?tenantId=${tenantIds[0]}&before=${encodeURIComponent(before)}`,
        headers: { cookie: account.cookie },
      });
    const secondResponse = await next(first.nextCursor!);
    expect(secondResponse.statusCode).toBe(200);
    const second = secondResponse.json<{
      items: { id: string }[];
      nextCursor: string | null;
    }>();
    expect(second.items).toHaveLength(50);
    expect(second.nextCursor).toBeTruthy();
    const thirdResponse = await next(second.nextCursor!);
    expect(thirdResponse.statusCode).toBe(200);
    const third = thirdResponse.json<{
      items: { id: string }[];
      nextCursor: string | null;
    }>();
    expect(third.items.length).toBeGreaterThan(0);
    expect(third.items.length).toBeLessThanOrEqual(50);
    expect(third.nextCursor).toBeNull();

    const allIds = [
      ...first.items,
      ...second.items,
      ...third.items,
    ].map((item) => item.id);
    expect(allIds).toHaveLength(
      initialWorkspaceCount + additionalWorkspaceCount - 1,
    );
    expect(new Set(allIds).size).toBe(allIds.length);
    expect(allIds).not.toContain(deletedId);
  });

  it('refuse les curseurs invalides, inter-tenant et les tailles hors bornes', async () => {
    const first = await app.inject({
      url: `/api/workspaces?tenantId=${tenantIds[0]}`,
      headers: { cookie: account.cookie },
    });
    const cursor = first.json<{ nextCursor: string }>().nextCursor;
    const malformed = await app.inject({
      url: `/api/workspaces?tenantId=${tenantIds[0]}&before=malformed`,
      headers: { cookie: account.cookie },
    });
    expect(malformed.statusCode).toBe(400);

    const otherTenant = await app.inject({
      url: `/api/workspaces?tenantId=${tenantIds[1]}&before=${encodeURIComponent(cursor)}`,
      headers: { cookie: account.cookie },
    });
    expect(otherTenant.statusCode).toBe(400);
    expect(otherTenant.json()).toEqual({ code: 'INVALID_CURSOR' });

    const unauthorized = await app.inject({
      url: `/api/workspaces?tenantId=${tenantIds[1]}&before=${encodeURIComponent(cursor)}`,
      headers: { cookie: otherAccount.cookie },
    });
    expect(unauthorized.statusCode).toBe(403);

    await expect(
      businessTransaction(
        business,
        account.identityId,
        tenantIds[0],
        'fixture.read',
        (client) =>
          client.query(
            'SELECT * FROM business.workspaces_page($1,$2,$3)',
            [null, null, 101],
          ),
      ),
    ).rejects.toMatchObject({ code: '22023' });
  });
});
