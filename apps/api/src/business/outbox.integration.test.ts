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

async function claimInvitationFirst(invitationId: string) {
  await operator.query(
    `UPDATE authorization_private.outbox_messages
     SET available_at='1970-01-01T00:00:00Z'::timestamptz
     WHERE invitation_id=$1`,
    [invitationId],
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
    const actor = await businessTransaction(
      business,
      identityId,
      undefined,
      'fixture.actor',
      async (_client, context) => context.actorId,
    );
    if (!actor) throw new Error('Missing outbox actor');
    actorId = actor;
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
    const worker = createOutboxWorker(business, identity, config, send, {
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
    const deliveryAudit = await operator.query<{ action: string }>(
      `SELECT action FROM business.audit_logs
       WHERE target_id=$1 AND action IN ('invitation.failed','invitation.sent')
       ORDER BY created_at`,
      [id],
    );
    expect(deliveryAudit.rows.map((row) => row.action)).toEqual([
      'invitation.failed',
      'invitation.sent',
    ]);
  });

  it('combine l’activation et l’invitation en un seul message pour une nouvelle identité', async () => {
    const email = `new-${randomBytes(8).toString('hex')}@example.test`;
    const token = randomBytes(32).toString('base64url');
    await enqueue(email, token);
    const messages: { to: string; subject: string; text: string }[] = [];
    const worker = createOutboxWorker(
      business,
      identity,
      config,
      async (message) => {
        messages.push(message);
      },
      { error: () => {} },
    );

    await expect(worker.runOnce()).resolves.toBe(true);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.text).toContain('/invite#' + token);
    expect(messages[0]?.text).toContain('/auth/verify-email');
    const created = await operator.query<{ name: string; emailVerified: boolean }>(
      'SELECT name,"emailVerified" FROM identity."user" WHERE lower(email)=lower($1)',
      [email],
    );
    expect(created.rows).toEqual([
      { name: email.slice(0, email.indexOf('@')), emailVerified: false },
    ]);
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

  it('ne laisse pas un ancien message mettre en échec une nouvelle tentative', async () => {
    for (const previousState of ['pending', 'failed'] as const) {
      const email = `retry-${previousState}-${randomBytes(8).toString('hex')}@example.test`;
      const oldToken = randomBytes(32).toString('base64url');
      const invitationId = await enqueue(email, oldToken);
      if (previousState === 'failed') {
        await operator.query(
          `UPDATE authorization_private.outbox_messages
           SET state='failed',ciphertext='',iv='',tag=''
           WHERE invitation_id=$1`,
          [invitationId],
        );
        await operator.query(
          `UPDATE authorization_private.invitations SET delivery='failed'
           WHERE id=$1`,
          [invitationId],
        );
      }

      const token = randomBytes(32).toString('base64url');
      await businessTransaction(
        business,
        identityId,
        tenantId,
        'fixture.retry_invitation',
        async (client) => {
          await client.query(
            'SELECT business.update_invitation($1,$2,$3)',
            [
              invitationId,
              'retry',
              createHash('sha256').update(token, 'utf8').digest('hex'),
            ],
          );
          await enqueueInvitation(client, keyring, {
            id: invitationId,
            tenantId,
            email,
            token,
          });
        },
      );

      const newOperationKey = `invitation:${invitationId}:${createHash('sha256')
        .update(token, 'utf8')
        .digest('hex')}`;
      const newMessage = await operator.query<{ id: string }>(
        'SELECT id FROM authorization_private.outbox_messages WHERE operation_key=$1',
        [newOperationKey],
      );
      const claimed = await business.query<{ id: string }>(
        'SELECT * FROM business.claim_invitation_outbox($1,$2)',
        [20, 120],
      );
      expect(
        claimed.rows.some((row) => row.id === newMessage.rows[0]?.id),
      ).toBe(true);

      const state = await operator.query<{
        delivery: string;
        previous_state: string;
      }>(
        `SELECT i.delivery,o.state AS previous_state
         FROM authorization_private.invitations i
         JOIN authorization_private.outbox_messages o ON o.invitation_id=i.id
         WHERE i.id=$1 AND o.operation_key<>$2`,
        [invitationId, newOperationKey],
      );
      expect(state.rows).toEqual([
        { delivery: 'pending', previous_state: previousState === 'pending' ? 'expired' : 'failed' },
      ]);
    }
  });

  it('ignore l’accusé d’échec quand le jeton du message a été remplacé', async () => {
    const invitationId = await enqueue(
      `stale-failure-${randomBytes(8).toString('hex')}@example.test`,
    );
    await claimInvitationFirst(invitationId);
    const claimed = await business.query<{
      id: string;
      invitation_id: string;
      lease_id: string;
    }>('SELECT * FROM business.claim_invitation_outbox($1,$2)', [1, 120]);
    const job = claimed.rows.find(
      (row) => row.invitation_id === invitationId,
    );
    if (!job) throw new Error('Outbox fixture was not claimed');

    await operator.query(
      'UPDATE authorization_private.invitations SET token_hash=$1 WHERE id=$2',
      [
        createHash('sha256')
          .update(randomBytes(32))
          .digest('hex'),
        invitationId,
      ],
    );
    await expect(
      business.query<{ finish_invitation_outbox: boolean }>(
        'SELECT business.finish_invitation_outbox($1,$2,false,$3) finish_invitation_outbox',
        [job.id, job.lease_id, 'delivery_failed'],
      ),
    ).resolves.toMatchObject({
      rows: [{ finish_invitation_outbox: true }],
    });

    const state = await operator.query<{
      delivery: string;
      outbox_state: string;
    }>(
      `SELECT i.delivery,o.state AS outbox_state
       FROM authorization_private.invitations i
       JOIN authorization_private.outbox_messages o ON o.invitation_id=i.id
       WHERE i.id=$1 AND o.id=$2`,
      [invitationId, job.id],
    );
    expect(state.rows).toEqual([
      { delivery: 'pending', outbox_state: 'retryable' },
    ]);
    const failureAudit = await operator.query(
      `SELECT 1 FROM business.audit_logs
       WHERE target_id=$1 AND action='invitation.failed'`,
      [invitationId],
    );
    expect(failureAudit.rows).toHaveLength(0);
    await operator.query(
      `UPDATE authorization_private.outbox_messages
       SET state='expired',ciphertext='',iv='',tag='',lease_id=NULL,leased_until=NULL
       WHERE id=$1`,
      [job.id],
    );
  });

  it('réévalue l’invitation après la prise du bail', async () => {
    const id = await enqueue(
      `raced-${randomBytes(8).toString('hex')}@example.test`,
    );
    await claimInvitationFirst(id);
    const claim = await business.query<{
      id: string;
      invitation_id: string;
      lease_id: string;
    }>(
      'SELECT * FROM business.claim_invitation_outbox($1,$2)',
      [1, 120],
    );
    const job = claim.rows.find((row) => row.invitation_id === id);
    if (!job) throw new Error('Outbox fixture was not claimed');
    await operator.query(
      'UPDATE authorization_private.invitations SET revoked_at=clock_timestamp() WHERE id=$1',
      [id],
    );
    const active = await business.query<{ active: boolean }>(
      'SELECT business.invitation_outbox_active($1,$2) active',
      [job.id, job.lease_id],
    );
    expect(active.rows[0]?.active).toBe(false);
  });

  it('sérialise une révocation pendant l’envoi SMTP', async () => {
    const id = await enqueue(
      `serialized-${randomBytes(8).toString('hex')}@example.test`,
    );
    await claimInvitationFirst(id);
    let startSending = () => {};
    let releaseSending = () => {};
    const sending = new Promise<void>((resolve) => {
      startSending = resolve;
    });
    const sendGate = new Promise<void>((resolve) => {
      releaseSending = resolve;
    });
    const worker = createOutboxWorker(
      business,
      identity,
      config,
      async () => {
        startSending();
        await sendGate;
      },
      { error: () => {} },
    );
    const processing = worker.runOnce();
    await sending;

    let startRevoking = () => {};
    const revoking = new Promise<void>((resolve) => {
      startRevoking = resolve;
    });
    let revokeFinished = false;
    const revoke = businessTransaction(
      business,
      identityId,
      tenantId,
      'fixture.revoke_during_delivery',
      async (client) => {
        await client.query("SET LOCAL statement_timeout = '20s'");
        startRevoking();
        await client.query(
          'SELECT business.update_invitation($1,$2)',
          [id, 'revoke'],
        );
      },
    ).then(() => {
      revokeFinished = true;
    });
    await revoking;
    await delay(10_100);
    const revokeWasBlocked = !revokeFinished;
    releaseSending();
    await processing;
    await revoke;

    expect(revokeWasBlocked).toBe(true);
    const finalState = await operator.query<{
      state: string;
      delivery: string;
      revoked_at: Date | null;
    }>(
      `SELECT o.state,i.delivery,i.revoked_at
       FROM authorization_private.outbox_messages o
       JOIN authorization_private.invitations i ON i.id=o.invitation_id
       WHERE o.invitation_id=$1`,
      [id],
    );
    expect(finalState.rows[0]?.state).toBe('sent');
    expect(finalState.rows[0]?.delivery).toBe('sent');
    expect(finalState.rows[0]?.revoked_at).not.toBeNull();
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
