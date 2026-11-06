import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import type { Pool } from 'pg';
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
      await inviteIdentity(config, send, parsed.data.email, '', false);
      await send({
        to: parsed.data.email,
        subject: 'Votre invitation / Your invitation',
        text: `Rejoindre votre organisation / Join your organization:\n${config.baseURL}/invite#${parsed.data.token}\n\n48 heures / 48 hours. Connectez-vous avec cette adresse vérifiée / Sign in with this verified email.`,
      });
    } catch {
      failed = true;
      errorCode = errorCode === 'invalid_payload' ? errorCode : 'delivery_failed';
      log.error(
        { event: 'outbox.delivery_failed', jobId: job.id, errorCode },
        'Outbox delivery failed',
      );
    }

    try {
      await pool.query(
        'SELECT business.finish_invitation_outbox($1,$2,$3,$4)',
        [job.id, job.lease_id, !failed, failed ? errorCode : null],
      );
    } catch {
      log.error(
        { event: 'outbox.acknowledgement_failed', jobId: job.id },
        'Outbox acknowledgement failed',
      );
    }
  }

  async function runOnce() {
    try {
      const result = await pool.query<OutboxJob>(
        'SELECT * FROM business.claim_invitation_outbox($1,$2)',
        [5, 120],
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
