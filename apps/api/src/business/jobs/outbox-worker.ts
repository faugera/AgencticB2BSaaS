import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import type { Pool, PoolClient } from 'pg';
import type { AuthConfig } from '../../auth/config.js';
import { inviteIdentity } from '../../auth/operator.js';
import type { SendAuthMail } from '../../auth/mail.js';
import {
  decryptOutboxPayload,
  type EncryptedOutboxPayload,
} from './outbox-crypto.js';

const payloadSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1).max(100),
    token: z.string().min(40).max(100),
  })
  .strict();

type OutboxJob = {
  id: string;
  tenant_id: string;
  invitation_id: string;
  key_id: string;
  iv: string;
  ciphertext: string;
  tag: string;
  lease_id: string;
};

export function createOutboxWorker(
  pool: Pool,
  identityPool: Pool,
  config: AuthConfig,
  send: SendAuthMail,
  log: { error: (context: object, message: string) => void },
) {
  const keyring =
    config.outboxEncryption ??
    (() => {
      throw new Error('Outbox encryption is not configured');
    })();
  let stopped = false;
  let running: Promise<void> | undefined;

  async function process(job: OutboxJob) {
    let failed = false;
    let errorCode = 'delivery_failed';
    let client: PoolClient | undefined;
    let transactionOpen = false;
    let discardClient = false;
    try {
      const plaintext = decryptOutboxPayload(keyring, {
        keyId: job.key_id,
        iv: job.iv,
        ciphertext: job.ciphertext,
        tag: job.tag,
      } satisfies EncryptedOutboxPayload);
      const parsed = payloadSchema.safeParse(JSON.parse(plaintext));
      if (!parsed.success) {
        errorCode = 'invalid_payload';
        throw new Error(errorCode);
      }
      const activeBeforeProvisioning = await pool.query<{ active: boolean }>(
        'SELECT business.invitation_outbox_active($1,$2) active',
        [job.id, job.lease_id],
      );
      if (activeBeforeProvisioning.rows[0]?.active !== true) return;
      let verificationMessage: Parameters<SendAuthMail>[0] | undefined;
      await inviteIdentity(
        config,
        async (message) => {
          verificationMessage = message;
        },
        parsed.data.email,
        parsed.data.name,
        false,
        identityPool,
      );
      client = await pool.connect();
      await client.query('BEGIN');
      transactionOpen = true;
      await client.query(
        "SET LOCAL idle_in_transaction_session_timeout = '60s'",
      );
      const activeBeforeDelivery = await client.query<{ active: boolean }>(
        'SELECT business.invitation_outbox_active($1,$2) active',
        [job.id, job.lease_id],
      );
      if (activeBeforeDelivery.rows[0]?.active !== true) {
        await client.query('ROLLBACK');
        transactionOpen = false;
        return;
      }
      const invitationText = `Rejoindre votre organisation / Join your organization:\n${config.baseURL}/invite#${parsed.data.token}\n\n48 heures / 48 hours. Connectez-vous avec cette adresse vérifiée / Sign in with this verified email.`;
      await send({
        to: parsed.data.email,
        subject: 'Votre invitation / Your invitation',
        text: verificationMessage
          ? `${verificationMessage.subject}\n\n${verificationMessage.text}\n\n${invitationText}`
          : invitationText,
      });
      const acknowledged = await client.query<{
        finish_invitation_outbox: boolean;
      }>(
        'SELECT business.finish_invitation_outbox($1,$2,$3,$4) finish_invitation_outbox',
        [job.id, job.lease_id, true, null],
      );
      if (acknowledged.rows[0]?.finish_invitation_outbox !== true)
        throw new Error('Outbox lease lost before acknowledgement');
      await client.query('COMMIT');
      transactionOpen = false;
    } catch {
      failed = true;
      errorCode = errorCode === 'invalid_payload' ? errorCode : 'delivery_failed';
      log.error(
        { event: 'outbox.delivery_failed', jobId: job.id, errorCode },
        'Outbox delivery failed',
      );
    } finally {
      if (transactionOpen && client) {
        try {
          await client.query('ROLLBACK');
        } catch {
          discardClient = true;
          log.error(
            { event: 'outbox.rollback_failed', jobId: job.id },
            'Outbox transaction rollback failed',
          );
        }
      }
      client?.release(discardClient);
    }

    if (failed) {
      try {
        await pool.query(
          'SELECT business.finish_invitation_outbox($1,$2,$3,$4)',
          [job.id, job.lease_id, false, errorCode],
        );
      } catch {
        log.error(
          { event: 'outbox.acknowledgement_failed', jobId: job.id },
          'Outbox acknowledgement failed',
        );
      }
    }
  }

  async function runOnce() {
    try {
      const result = await pool.query<OutboxJob>(
        'SELECT * FROM business.claim_invitation_outbox($1,$2)',
        [2, 120],
      );
      await Promise.all(result.rows.map(process));
      return result.rows.length > 0;
    } catch {
      log.error({ event: 'outbox.claim_failed' }, 'Outbox claim failed');
      return false;
    }
  }

  async function loop() {
    while (!stopped) {
      if (!(await runOnce())) await delay(1000);
    }
  }

  return {
    runOnce,
    start() {
      if (!running) {
        stopped = false;
        running = loop();
      }
    },
    async stop() {
      stopped = true;
      await running;
      running = undefined;
    },
  };
}
