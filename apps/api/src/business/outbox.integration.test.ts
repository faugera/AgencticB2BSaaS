import { createHash, randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { createAuth, createAuthPool } from '../auth/service.js';
import type { Auth } from '../auth/service.js';
import { provisionRoles } from '../auth/provision.js';
import { migrateAuth } from '../auth/migrate.js';
import type { AuthConfig } from '../auth/config.js';
import { businessTransaction, createBusinessPool } from './store.js';
import { enqueueInvitation } from './jobs/outbox-store.js';
import { createOutboxWorker } from './jobs/outbox-worker.js';

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
const keyring = {
  activeKeyId: 'test-v1',
  keys: { 'test-v1': randomBytes(32).toString('base64url') },
};
const config: AuthConfig = {
  baseURL: 'http://127.0.0.1:5173',
  secret: randomBytes(48).toString('base64url'),
  databaseURL,
  businessDatabaseURL: businessURL,
  outboxEncryption: keyring,
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
let actorId = '';
let identityId = '';
let tenantId = '';
let auth: Auth;

async function enqueue(
  email: string,
  token = randomBytes(32).toString('base64url'),
) {
  return businessTransaction(
    business,
    identityId,
    tenantId,
    'fixture.invitation',
    async (client) => {
      const invitation = await client.query<{ id: string }>(
        "SELECT business.invite($1,'member',$2) id",
        [
          email,
          createHash('sha256').update(token, 'utf8').digest('hex'),
        ],
      );
      const id = invitation.rows[0]?.id;
      if (!id) throw new Error('Invitation fixture was not created');
      await enqueueInvitation(client, keyring, {
        id,
        tenantId,
        email,
        token,
      });
      return id;
    },
  );
}

describe('Outbox PostgreSQL et worker', () => {
  beforeAll(async () => {
    await provisionRoles(migrationURL, databaseURL, businessURL);
    await migrateAuth(config, migrationURL);
    auth = createAuth(config, identity, async () => {}, true);
    const email = `outbox-actor-${randomBytes(8).toString('hex')}@example.test`;
    const created = await auth.api.signUpEmail({
      body: {
        email,
        name: 'Outbox fixture',
        password: randomBytes(24).toString('base64url'),
      },
    });
    identityId = created.user.id;
    await operator.query(
      'UPDATE identity."user" SET "emailVerified"=true WHERE id=$1',
      [identityId],
    );
    actorId = await businessTransaction(
      business,
      identityId,
      undefined,
      'fixture.actor',
      async (_client, context) => context.actorId,
    );
    await operator.query(
      "UPDATE authorization_private.actors SET platform_role='super_admin' WHERE id=$1",
      [actorId],
    );
    tenantId = await businessTransaction(
      business,
      identityId,
      undefined,
      'fixture.tenant',
      async (client) => {
        const organization = await client.query<{ id: string }>(
          "SELECT business.create_organization('Outbox test organization') id",
        );
        const organizationId = organization.rows[0]?.id;
        if (!organizationId) throw new Error('Organization fixture missing');
        const tenant = await client.query<{ id: string }>(
          "SELECT business.create_tenant($1,'Outbox test tenant',$2) id",
          [organizationId, email],
        );
        const id = tenant.rows[0]?.id;
        if (!id) throw new Error('Tenant fixture missing');
        return id;
      },
    );
  });

  afterAll(async () => {
    if (actorId)
      await operator.query(
        'UPDATE authorization_private.actors SET platform_role=NULL WHERE id=$1',
        [actorId],
      );
    await Promise.all([operator.end(), identity.end(), business.end()]);
  });

  it('réserve une fois, reprend un bail expiré et refuse un ancien accusé', async () => {
    await enqueue(`lease-${randomBytes(8).toString('hex')}@example.test`);
    const [first, concurrent] = await Promise.all([
      business.query('SELECT * FROM business.claim_invitation_outbox($1,$2)', [
        1,
        1,
      ]),
      business.query('SELECT * FROM business.claim_invitation_outbox($1,$2)', [
        1,
        1,
      ]),
    ]);
    expect(first.rows.length + concurrent.rows.length).toBe(1);
    const claim = first.rows[0] ?? concurrent.rows[0];
    expect(claim).toBeDefined();
    await delay(1100);
    const reclaimed = await business.query(
      'SELECT * FROM business.claim_invitation_outbox($1,$2)',
      [1, 120],
    );
    expect(reclaimed.rows).toHaveLength(1);
    expect(reclaimed.rows[0]?.lease_id).not.toBe(claim.lease_id);
    const staleAck = await business.query<{ finish_invitation_outbox: boolean }>(
      'SELECT business.finish_invitation_outbox($1,$2,true) finish_invitation_outbox',
      [claim.id, claim.lease_id],
    );
    expect(staleAck.rows[0]?.finish_invitation_outbox).toBe(false);
    await business.query(
      'SELECT business.finish_invitation_outbox($1,$2,false,$3)',
      [reclaimed.rows[0]?.id, reclaimed.rows[0]?.lease_id, 'test_retry'],
    );
    await operator.query(
      `UPDATE authorization_private.outbox_messages
       SET state='failed',ciphertext='',iv='',tag=''
       WHERE id=$1`,
      [claim.id],
    );
  });

  it('reprend un SMTP à accusé ambigu, permet un doublon puis efface la charge envoyée', async () => {
    const email = `ambiguous-${randomBytes(8).toString('hex')}@example.test`;
    const token = randomBytes(32).toString('base64url');
    const secret = randomBytes(32).toString('base64url');
    const smtpBody = `Sensitive body ${email} ${token} ${secret}`;
    const id = await enqueue(email, token);
    const recipient = await auth.api.signUpEmail({
      body: {
        email,
        name: 'Outbox recipient',
        password: randomBytes(24).toString('base64url'),
      },
    });
    await identity.query(
      'UPDATE identity."user" SET "emailVerified"=true WHERE id=$1',
      [recipient.user.id],
    );
    let attempts = 0;
    const logs: { context: object; message: string }[] = [];
    const send = vi.fn(async () => {
      attempts++;
      if (attempts === 1)
        throw new Error(
          `SMTP accepted but acknowledgement was lost: ${smtpBody}`,
        );
    });
    const worker = createOutboxWorker(business, config, send, {
      error: (context, message) => logs.push({ context, message }),
    });

    await expect(worker.runOnce()).resolves.toBe(true);
    const retry = await operator.query<{ state: string; ciphertext: string }>(
      'SELECT state,ciphertext FROM authorization_private.outbox_messages WHERE invitation_id=$1',
      [id],
    );
    expect(retry.rows[0]).toMatchObject({ state: 'retryable' });
    expect(retry.rows[0]?.ciphertext).toBeTruthy();

    await operator.query(
      'UPDATE authorization_private.outbox_messages SET available_at=clock_timestamp() WHERE invitation_id=$1',
      [id],
    );
    await expect(worker.runOnce()).resolves.toBe(true);
    expect(attempts).toBe(2);
    const sent = await operator.query<{ state: string; ciphertext: string }>(
      'SELECT state,ciphertext FROM authorization_private.outbox_messages WHERE invitation_id=$1',
      [id],
    );
    expect(sent.rows[0]).toEqual({ state: 'sent', ciphertext: '' });
    expect(logs).toHaveLength(1);
    const serializedLogs = JSON.stringify(logs);
    expect(serializedLogs).not.toContain(email);
    expect(serializedLogs).not.toContain(token);
    expect(serializedLogs).not.toContain(secret);
    expect(serializedLogs).not.toContain(smtpBody);
  });

  it('n’envoie pas une invitation révoquée ou expirée et efface ses charges', async () => {
    const revokedId = await enqueue(
      `revoked-${randomBytes(8).toString('hex')}@example.test`,
    );
    const expiredId = await enqueue(
      `expired-${randomBytes(8).toString('hex')}@example.test`,
    );
    await operator.query(
      'UPDATE authorization_private.invitations SET revoked_at=clock_timestamp() WHERE id=$1',
      [revokedId],
    );
    await operator.query(
      'UPDATE authorization_private.outbox_messages SET expires_at=clock_timestamp()-interval \'1 second\' WHERE invitation_id=$1',
      [expiredId],
    );
    const claim = await business.query(
      'SELECT * FROM business.claim_invitation_outbox($1,$2)',
      [20, 120],
    );
    expect(claim.rows).toHaveLength(0);
    const revoked = await operator.query<{ state: string; ciphertext: string }>(
      `SELECT state,ciphertext FROM authorization_private.outbox_messages
       WHERE invitation_id=$1`,
      [revokedId],
    );
    expect(revoked.rows[0]).toEqual({ state: 'expired', ciphertext: '' });
    const expired = await operator.query(
      'SELECT id FROM authorization_private.outbox_messages WHERE invitation_id=$1',
      [expiredId],
    );
    expect(expired.rows).toHaveLength(0);
  });

  it('efface et n’envoie pas un message dont le jeton a été remplacé', async () => {
    const id = await enqueue(
      `rotated-${randomBytes(8).toString('hex')}@example.test`,
    );
    await operator.query(
      'UPDATE authorization_private.invitations SET token_hash=$1 WHERE id=$2',
      [createHash('sha256').update(randomBytes(32)).digest('hex'), id],
    );
    const claim = await business.query(
      'SELECT * FROM business.claim_invitation_outbox($1,$2)',
      [20, 120],
    );
    expect(claim.rows).toHaveLength(0);
    const state = await operator.query<{ state: string; ciphertext: string }>(
      'SELECT state,ciphertext FROM authorization_private.outbox_messages WHERE invitation_id=$1',
      [id],
    );
    expect(state.rows[0]).toEqual({ state: 'expired', ciphertext: '' });
  });
});
