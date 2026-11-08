import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../app.js';
import { createAuth, createAuthPool } from '../auth/service.js';
import { provisionRoles } from '../auth/provision.js';
import { migrateAuth } from '../auth/migrate.js';
import type { AuthConfig } from '../auth/config.js';
import { businessTransaction, createBusinessPool } from './store.js';

vi.mock('../auth/mail.js', () => ({ createMailer: () => ({ send: vi.fn(async () => undefined), close: vi.fn() }) }));
const databaseURL = process.env.AUTH_TEST_DATABASE_URL;
const migrationURL = process.env.AUTH_TEST_MIGRATION_DATABASE_URL;
if (!databaseURL || !migrationURL || !new URL(databaseURL).pathname.startsWith('/enterprise_auth_test'))
  throw new Error('Explicit disposable PostgreSQL database required');
const businessURL = databaseURL.replace('identity_runtime:', 'business_runtime:');
const config: AuthConfig = { baseURL: 'http://127.0.0.1:5173', secret: randomBytes(48).toString('base64url'), databaseURL, businessDatabaseURL: businessURL, smtp: { host: '127.0.0.1', port: 1025, secure: false, from: 'test@example.test' } };
const operator = new Pool({ connectionString: migrationURL });
const identity = createAuthPool(databaseURL);
const business = createBusinessPool(businessURL);
let app: ReturnType<typeof buildApp>;
let cookie = '';
let initCookie = '';
let identityId = '';

const put = (payload: object) => app.inject({ method: 'PUT', url: '/api/preferences', headers: { origin: config.baseURL, cookie }, payload });
const get = () => app.inject({ url: '/api/preferences', headers: { cookie } });

describe('Préférences partielles persistées', () => {
  beforeAll(async () => {
    await provisionRoles(migrationURL, databaseURL, businessURL);
    await migrateAuth(config, migrationURL);
    app = buildApp({ authConfig: config });
    const auth = createAuth(config, identity, async () => {}, true);
    const email = `preferences-${randomBytes(8).toString('hex')}@example.test`;
    const password = randomBytes(24).toString('base64url');
    const created = await auth.api.signUpEmail({ body: { email, name: 'Fixture préférences', password } });
    identityId = created.user.id;
    await operator.query('UPDATE identity."user" SET "emailVerified"=true WHERE id=$1', [identityId]);
    const login = await app.inject({ method: 'POST', url: '/api/auth/sign-in/email', headers: { origin: config.baseURL }, payload: { email, password } });
    expect(login.statusCode).toBe(200);
    cookie = login.cookies.map((item) => item.name + '=' + item.value).join('; ');
    const initEmail = `preferences-init-${randomBytes(8).toString('hex')}@example.test`;
    const initUser = await auth.api.signUpEmail({ body: { email: initEmail, name: 'Fixture initialisation', password } });
    await operator.query('UPDATE identity."user" SET "emailVerified"=true WHERE id=$1', [initUser.user.id]);
    const initLogin = await app.inject({ method: 'POST', url: '/api/auth/sign-in/email', headers: { origin: config.baseURL }, payload: { email: initEmail, password } });
    expect(initLogin.statusCode).toBe(200);
    initCookie = initLogin.cookies.map((item) => item.name + '=' + item.value).join('; ');
  });
  afterAll(async () => { await app?.close(); await Promise.all([operator.end(), identity.end(), business.end()]); });

  it('initialise les préférences locales une seule fois malgré des onglets concurrents', async () => {
    const initialize = (payload: object) => app.inject({ method: 'POST', url: '/api/preferences', headers: { origin: config.baseURL, cookie: initCookie }, payload });
    expect((await app.inject({ method: 'POST', url: '/api/preferences', headers: { origin: config.baseURL }, payload: { locale: 'en', theme: 'dark' } })).statusCode).toBe(401);
    expect((await initialize({ locale: 'en', theme: 'dark', actorId: 'other' })).statusCode).toBe(400);
    const initial = await app.inject({ url: '/api/preferences', headers: { cookie: initCookie } });
    expect(initial.json()).toBeNull();
    const responses = await Promise.all([initialize({ locale: 'en', theme: 'dark' }), initialize({ locale: 'fr', theme: 'light' })]);
    expect(responses.map((response) => response.statusCode)).toEqual([200, 200]);
    expect(responses[0]?.json()).toEqual(responses[1]?.json());
    const preferences = responses[0]?.json();
    expect([['en', 'dark'], ['fr', 'light']]).toContainEqual([preferences.locale, preferences.theme]);
    expect(preferences).toMatchObject({ timezone: 'Europe/Paris', date_format: 'DD/MM/YYYY' });
    const changed = await app.inject({ method: 'PUT', url: '/api/preferences', headers: { origin: config.baseURL, cookie: initCookie }, payload: { theme: 'system' } });
    expect(changed.statusCode).toBe(200);
    expect((await initialize({ locale: 'fr', theme: 'light' })).json()).toEqual({ ...preferences, theme: 'system' });
  });

  it('fusionne les créations et modifications simultanées de champs disjoints', async () => {
    const created = await Promise.all([put({ locale: 'en' }), put({ theme: 'dark' })]);
    expect(created.map((response) => response.statusCode)).toEqual([200, 200]);
    expect((await get()).json()).toEqual({ locale: 'en', theme: 'dark', timezone: 'Europe/Paris', date_format: 'DD/MM/YYYY' });
    const updated = await Promise.all([put({ timezone: 'UTC' }), put({ date_format: 'YYYY-MM-DD' })]);
    expect(updated.map((response) => response.statusCode)).toEqual([200, 200]);
    expect((await get()).json()).toEqual({ locale: 'en', theme: 'dark', timezone: 'UTC', date_format: 'YYYY-MM-DD' });
    expect((await put({ locale: 'fr', theme: 'light' })).json()).toEqual({ locale: 'fr', theme: 'light', timezone: 'UTC', date_format: 'YYYY-MM-DD' });
  });

  it('préserve les champs disjoints quand deux transactions se disputent la même ligne', async () => {
    let unlock = () => {};
    let firstWritten = () => {};
    let secondStarted = () => {};
    const release = new Promise<void>((resolve) => { unlock = resolve; });
    const firstReady = new Promise<void>((resolve) => { firstWritten = resolve; });
    const secondReady = new Promise<void>((resolve) => { secondStarted = resolve; });
    const first = businessTransaction(business, identityId, undefined, 'preferences.updated', async (client) => {
      await client.query('SELECT business.save_ui_preferences($1,NULL,NULL,NULL)', ['en']);
      firstWritten();
      await release;
    });
    await firstReady;
    const second = businessTransaction(business, identityId, undefined, 'preferences.updated', async (client) => {
      secondStarted();
      await client.query('SELECT business.save_ui_preferences(NULL,$1,NULL,NULL)', ['dark']);
    });
    await secondReady;
    unlock();
    await Promise.all([first, second]);
    expect((await get()).json()).toEqual({ locale: 'en', theme: 'dark', timezone: 'UTC', date_format: 'YYYY-MM-DD' });
  });

  it('refuse les entrées malformées et ne modifie pas les préférences', async () => {
    const before = (await get()).json();
    for (const payload of [{}, { locale: null }, { theme: false }, { timezone: 123 }, { timezone: 'Invalid/Zone' }, { date_format: 'invalid' }, { locale: 'en', actorId: 'other' }]) {
      expect((await put(payload)).statusCode).toBe(400);
    }
    expect((await get()).json()).toEqual(before);
    await expect(businessTransaction(business, identityId, undefined, 'preferences.updated', async (client) =>
      client.query('SELECT business.save_ui_preferences(NULL,NULL,NULL,NULL)'))).rejects.toThrow();
    await expect(business.query('SELECT * FROM authorization_private.ui_preferences')).rejects.toThrow();
  });
});
