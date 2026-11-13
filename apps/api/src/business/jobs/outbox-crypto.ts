import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type OutboxKeyring = {
  activeKeyId: string;
  keys: Readonly<Record<string, string>>;
};

export type EncryptedOutboxPayload = {
  keyId: string;
  iv: string;
  ciphertext: string;
  tag: string;
};

function keyBytes(keyring: OutboxKeyring, keyId: string): Buffer {
  const encoded = keyring.keys[keyId];
  if (!encoded) {
    throw new Error('Outbox encryption key version is unavailable');
  }
  const key = Buffer.from(encoded, 'base64url');
  if (key.length !== 32 || key.toString('base64url') !== encoded) {
    throw new Error('Outbox encryption key is invalid');
  }
  return key;
}

export function encryptOutboxPayload(
  keyring: OutboxKeyring,
  payload: string,
): EncryptedOutboxPayload {
  const key = keyBytes(keyring, keyring.activeKeyId);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(keyring.activeKeyId, 'utf8'));
  const ciphertext = Buffer.concat([
    cipher.update(payload, 'utf8'),
    cipher.final(),
  ]);
  return {
    keyId: keyring.activeKeyId,
    iv: iv.toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
  };
}

export function decryptOutboxPayload(
  keyring: OutboxKeyring,
  encrypted: EncryptedOutboxPayload,
): string {
  const key = keyBytes(keyring, encrypted.keyId);
  const iv = Buffer.from(encrypted.iv, 'base64url');
  const tag = Buffer.from(encrypted.tag, 'base64url');
  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error('Unable to decrypt outbox payload');
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(encrypted.keyId, 'utf8'));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('Unable to decrypt outbox payload');
  }
}
