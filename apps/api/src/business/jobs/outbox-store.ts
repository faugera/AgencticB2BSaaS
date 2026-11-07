import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { encryptOutboxPayload, type OutboxKeyring } from './outbox-crypto.js';

export function digest(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function requestDigest(value: unknown) {
  return digest(stableJson(value));
}

export async function enqueueInvitation(
  client: PoolClient,
  keyring: OutboxKeyring,
  invitation: { id: string; tenantId: string; email: string; token: string },
) {
  const operationKey = `invitation:${invitation.id}:${digest(invitation.token)}`;
  const encrypted = encryptOutboxPayload(
    keyring,
    JSON.stringify({
      email: invitation.email,
      name: invitation.email.slice(0, invitation.email.indexOf('@')),
      token: invitation.token,
    }),
  );
  await client.query(
    'SELECT business.enqueue_invitation_outbox($1,$2,$3,$4,$5,$6,$7)',
    [
      invitation.tenantId,
      invitation.id,
      operationKey,
      encrypted.keyId,
      encrypted.iv,
      encrypted.ciphertext,
      encrypted.tag,
    ],
  );
}
