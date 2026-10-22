import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { buildApp } from '../app.js';
import type { AuthConfig } from './config.js';
import { createAuth, createAuthPool } from './service.js';
import { migrateAuth } from './migrate.js';
import { provisionRoles } from './provision.js';
import { inviteIdentity } from './operator.js';
import type { SendAuthMail } from './mail.js';
import { totp } from '../../../../tests/helpers/totp.js';
import { getMigrations } from 'better-auth/db/migration';

const databaseURL = process.env.AUTH_TEST_DATABASE_URL;
const migrationURL = process.env.AUTH_TEST_MIGRATION_DATABASE_URL;
if (!databaseURL || !migrationURL)
  throw new Error(
    'Both AUTH_TEST_DATABASE_URL and AUTH_TEST_MIGRATION_DATABASE_URL are required; auth integration tests never skip',
  );
if (!new URL(databaseURL).pathname.startsWith('/enterprise_auth_test'))
  throw new Error('Use a dedicated enterprise_auth_test database');
const config: AuthConfig = {
  baseURL: 'http://127.0.0.1:5173',
  secret: randomBytes(48).toString('base64url'),
  databaseURL,
  smtp: {
    host: '127.0.0.1',
    port: 1025,
    secure: false,
    from: 'test@example.test',
  },
};
const mail: { to: string; subject: string; text: string }[] = [];
const send: SendAuthMail = async (message) => {
  mail.push(message);
};
const pool = createAuthPool(databaseURL);
let app: ReturnType<typeof buildApp>;
const email = `invited-${randomBytes(8).toString('hex')}@example.test`;
const headers = { origin: config.baseURL, 'content-type': 'application/json' };
const password = randomBytes(24).toString('base64url');
const ipSuffix = randomBytes(4).toString('hex');
const testIP = `2001:db8:${ipSuffix.slice(0, 4)}:${ipSuffix.slice(4)}::1`;
function lastLink() {
  const link = mail.at(-1)?.text.match(/https?:\/\/\S+/)?.[0];
  if (!link) throw new Error('Expected authentication mail with a link');
  return new URL(link);
}
async function post(url: string, payload: object, cookie?: string) {
  return app.inject({
    method: 'POST',
    url,
    remoteAddress: testIP,
    headers: { ...headers, ...(cookie ? { cookie } : {}) },
    payload,
  });
}

describe('real PostgreSQL identity lifecycle', () => {
  beforeAll(async () => {
    await provisionRoles(
      migrationURL,
      databaseURL,
      databaseURL.replace('identity_runtime:', 'business_runtime:'),
    );
    await migrateAuth(config, migrationURL);
    await migrateAuth(config, migrationURL); // Initial migration must be repeatable.
    app = buildApp({ authInstance: createAuth(config, pool, send) });
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('uses a non-owner, non-superuser runtime without business schema privileges', async () => {
    const role = await pool.query<{
      rolsuper: boolean;
      rolbypassrls: boolean;
      rolcreatedb: boolean;
    }>(
      'SELECT rolsuper, rolbypassrls, rolcreatedb FROM pg_roles WHERE rolname=current_user',
    );
    expect(role.rows[0]).toEqual({
      rolsuper: false,
      rolbypassrls: false,
      rolcreatedb: false,
    });
    await expect(
      pool.query('CREATE TABLE identity.forbidden (id text)'),
    ).rejects.toThrow();
    const ownership = await pool.query<{ owns: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='identity' AND tableowner=current_user) AS owns",
    );
    expect(ownership.rows[0]?.owns).toBe(false);
  });

  it('matches the installed Better Auth schema without automatic runtime DDL', async () => {
    const migrations = await getMigrations(
      createAuth(config, pool, send).options,
    );
    expect(migrations.toBeCreated).toHaveLength(0);
    expect(migrations.toBeAdded).toHaveLength(0);
    expect(migrations.unsafeChanges).toHaveLength(0);
    expect(migrations.schemaProblems).toHaveLength(0);
  });

  it('rejects changed migration checksums and releases the transaction lock after failure', async () => {
    const operator = new Pool({connectionString:migrationURL});
    const previous=await operator.query<{checksum:string}>("SELECT checksum FROM migration_history.versions WHERE name='0001_identity.sql'");
    try {
      await operator.query("UPDATE migration_history.versions SET checksum='tampered' WHERE name='0001_identity.sql'");
      await expect(migrateAuth(config,migrationURL)).rejects.toThrow('checksum');
    } finally {
      await operator.query("UPDATE migration_history.versions SET checksum=$1 WHERE name='0001_identity.sql'",[previous.rows[0]!.checksum]);
      await operator.end();
    }
    await migrateAuth(config,migrationURL);
  });

  it('keeps MFA optional and supports TOTP challenges and single-use recovery codes', async () => {
    const email = `mfa-${randomBytes(8).toString('hex')}@example.test`;
    const account = await createAuth(config, pool, send, true).api.signUpEmail({
      body: { email, name: 'MFA test', password },
    });
    const admin = new Pool({ connectionString: migrationURL });
    try {
      await admin.query(
        'UPDATE identity."user" SET "emailVerified"=true WHERE id=$1',
        [account.user.id],
      );
    } finally {
      await admin.end();
    }
    const mfaIP = testIP.replace('2001:db8:', '2001:dba:');
    const request = (path: string, body: object, cookie = '') =>
      app.inject({
        method: 'POST',
        url: '/api/auth/' + path,
        remoteAddress: mfaIP,
        headers: { ...headers, cookie },
        payload: body,
      });
    const cookies = (response: Awaited<ReturnType<typeof request>>) =>
      response.cookies
        .filter((cookie) => cookie.value)
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join('; ');
    const login = await request('sign-in/email', { email, password });
    expect(login.statusCode).toBe(200);
    const setup = await request(
      'two-factor/enable',
      { password },
      cookies(login),
    );
    expect(setup.statusCode).toBe(200);
    const { totpURI, backupCodes } = setup.json() as {
      totpURI: string;
      backupCodes: string[];
    };
    const enabled = await request(
      'two-factor/verify-totp',
      { code: totp(totpURI) },
      cookies(login),
    );
    expect(enabled.statusCode).toBe(200);
    await request('sign-out', {}, cookies(enabled) || cookies(login));
    const challenge = await request('sign-in/email', { email, password });
    expect(challenge.json().twoFactorRedirect).toBe(true);
    expect(
      (
        await app.inject({
          url: '/api/me',
          headers: { cookie: cookies(challenge) },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await request(
          'two-factor/verify-totp',
          { code: 'invalid' },
          cookies(challenge),
        )
      ).statusCode,
    ).toBeGreaterThanOrEqual(400);
    const verified = await request(
      'two-factor/verify-totp',
      { code: totp(totpURI) },
      cookies(challenge),
    );
    expect(verified.statusCode).toBe(200);
    expect(
      (
        await app.inject({
          url: '/api/me',
          headers: { cookie: cookies(verified) },
        })
      ).statusCode,
    ).toBe(200);
    await request('sign-out', {}, cookies(verified));
    const second = await request('sign-in/email', { email, password });
    const recovery = await request(
      'two-factor/verify-backup-code',
      { code: backupCodes[0] },
      cookies(second),
    );
    expect(recovery.statusCode).toBe(200);
    await request('sign-out', {}, cookies(recovery));
    const third = await request('sign-in/email', { email, password });
    expect(
      (
        await request(
          'two-factor/verify-backup-code',
          { code: backupCodes[0] },
          cookies(third),
        )
      ).statusCode,
    ).toBeGreaterThanOrEqual(400);
  });

  it('denies public registration and arbitrary client roles', async () => {
    const response = await post('/api/auth/sign-up/email', {
      email,
      name: 'Attacker',
      password,
      role: 'admin',
    });
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(
      (
        await pool.query('SELECT id FROM identity."user" WHERE email=$1', [
          email,
        ])
      ).rowCount,
    ).toBe(0);
    expect((await app.inject({ url: '/api/me' })).statusCode).toBe(401);
  });

  it('supports invitation, verification, password reset, session and revocation', async () => {
    await inviteIdentity(config, send, email, 'Invited person');
    expect(mail.at(-1)?.to).toBe(email);
    const verification = lastLink();
    expect(verification.pathname).toBe('/api/auth/verify-email');
    const verified = await app.inject({
      url: verification.pathname + verification.search,
    });
    expect(verified.statusCode).toBe(302);

    const recovery = await post('/api/auth/request-password-reset', {
      email,
      redirectTo: config.baseURL + '/auth/reset',
    });
    expect(recovery.statusCode).toBe(200);
    const resetLink = lastLink();
    const redirect = await app.inject({
      url: resetLink.pathname + resetLink.search,
    });
    expect(redirect.statusCode).toBe(302);
    const resetToken = new URL(
      String(redirect.headers.location),
    ).searchParams.get('token');
    expect(resetToken).toBeTruthy();
    expect(
      (
        await post('/api/auth/reset-password', {
          token: resetToken,
          newPassword: password,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await post('/api/auth/reset-password', {
          token: resetToken,
          newPassword: password,
        })
      ).statusCode,
    ).toBeGreaterThanOrEqual(400);

    const login = await post('/api/auth/sign-in/email', { email, password });
    expect(login.statusCode).toBe(200);
    expect(login.cookies.length).toBeGreaterThan(0);
    expect(login.cookies.every((cookie) => cookie.httpOnly)).toBe(true);
    const cookie = login.cookies
      .map((entry) => `${entry.name}=${entry.value}`)
      .join('; ');
    const me = await app.inject({ url: '/api/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe(email);
    expect(me.json().user.role).toBeUndefined();
    expect(me.headers['cache-control']).toBe('no-store');

    // Resetting a password must revoke already-established sessions as well.
    expect(
      (
        await post('/api/auth/request-password-reset', {
          email,
          redirectTo: config.baseURL + '/auth/reset',
        })
      ).statusCode,
    ).toBe(200);
    const secondReset = lastLink();
    const secondRedirect = await app.inject({
      url: secondReset.pathname + secondReset.search,
    });
    const secondToken = new URL(
      String(secondRedirect.headers.location),
    ).searchParams.get('token');
    expect(
      (
        await post('/api/auth/reset-password', {
          token: secondToken,
          newPassword: password,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ url: '/api/me', headers: { cookie } })).statusCode,
    ).toBe(401);
    const freshLogin = await post('/api/auth/sign-in/email', {
      email,
      password,
    });
    expect(freshLogin.statusCode).toBe(200);
    const freshCookie = freshLogin.cookies
      .map((entry) => `${entry.name}=${entry.value}`)
      .join('; ');

    const forged = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-out',
      headers: {
        ...headers,
        origin: 'https://attacker.example',
        cookie: freshCookie,
      },
      payload: {},
    });
    expect(forged.statusCode).toBe(403);
    expect(
      (await app.inject({ url: '/api/me', headers: { cookie: freshCookie } }))
        .statusCode,
    ).toBe(200);
    expect((await post('/api/auth/sign-out', {}, freshCookie)).statusCode).toBe(
      200,
    );
    expect(
      (await app.inject({ url: '/api/me', headers: { cookie: freshCookie } }))
        .statusCode,
    ).toBe(401);
  });

  it('denies unverified identities and does not expose account existence through recovery', async () => {
    const operator = createAuth(config, pool, send, true);
    const unverified = `unverified-${randomBytes(8).toString('hex')}@example.test`;
    await operator.api.signUpEmail({
      body: { email: unverified, name: 'Unverified', password },
    });
    expect(
      (await post('/api/auth/sign-in/email', { email: unverified, password }))
        .statusCode,
    ).toBe(403);
    const unknown = await post('/api/auth/request-password-reset', {
      email: 'unknown@example.test',
      redirectTo: config.baseURL + '/auth/reset',
    });
    expect(unknown.statusCode).toBe(200);
    const admin = new Pool({ connectionString: migrationURL });
    try {
      await admin.query(
        'UPDATE identity."user" SET "emailVerified"=true WHERE email=$1',
        [unverified],
      );
    } finally {
      await admin.end();
    }
  });

  it('rate limits sign-in attempts despite forged client IP headers', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        remoteAddress: testIP.replace('2001:db8:', '2001:db9:'),
        headers: {
          ...headers,
          'x-auth-client-ip': `198.51.100.${attempt}`,
          'x-forwarded-for': `198.51.100.${attempt}`,
        },
        payload: { email: 'unknown-rate-test@example.test', password },
      });
      statuses.push(response.statusCode);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses.at(-1)).toBe(429);
  });

  it('does not claim successful invitation delivery when SMTP fails, and allows retry', async () => {
    const retryEmail = `retry-${randomBytes(8).toString('hex')}@example.test`;
    await expect(
      inviteIdentity(
        config,
        async () => {
          throw new Error('SMTP unavailable');
        },
        retryEmail,
        'Retry user',
      ),
    ).rejects.toThrow();
    await inviteIdentity(config, send, retryEmail, 'Retry user');
    expect(mail.at(-1)?.to).toBe(retryEmail);
  });
});
