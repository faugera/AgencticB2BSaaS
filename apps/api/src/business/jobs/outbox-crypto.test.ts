import { describe, expect, it } from 'vitest';
import {
  decryptOutboxPayload,
  encryptOutboxPayload,
  type OutboxKeyring,
} from './outbox-crypto.js';

const key = Buffer.alloc(32, 3).toString('base64url');
const keyring: OutboxKeyring = {
  activeKeyId: 'v1',
  keys: { v1: key },
};

describe('outbox payload encryption', () => {
  it('encrypts and decrypts sensitive payloads without storing them in clear text', () => {
    const secret = 'https://example.test/invite#sensitive-token';
    const encrypted = encryptOutboxPayload(keyring, secret);
    expect(JSON.stringify(encrypted)).not.toContain(secret);
    expect(decryptOutboxPayload(keyring, encrypted)).toBe(secret);
  });

  it('rejects tampered ciphertext and mismatched authentication tags', () => {
    const encrypted = encryptOutboxPayload(keyring, 'payload');
    expect(() =>
      decryptOutboxPayload(keyring, {
        ...encrypted,
        ciphertext: Buffer.from('tampered').toString('base64url'),
      }),
    ).toThrow('Unable to decrypt outbox payload');
    const tag = Buffer.from(encrypted.tag, 'base64url');
    tag.writeUInt8(tag.readUInt8(0) ^ 1, 0);
    expect(() =>
      decryptOutboxPayload(keyring, {
        ...encrypted,
        tag: tag.toString('base64url'),
      }),
    ).toThrow('Unable to decrypt outbox payload');
  });

  it('loads pending payloads with their key version during rotation', () => {
    const newKey = Buffer.alloc(32, 4).toString('base64url');
    const oldKeys: OutboxKeyring = {
      activeKeyId: 'v1',
      keys: { v1: key },
    };
    const newKeys: OutboxKeyring = {
      activeKeyId: 'v2',
      keys: {
        v1: key,
        v2: newKey,
      },
    };
    const encrypted = encryptOutboxPayload(oldKeys, 'pending message');
    expect(decryptOutboxPayload(newKeys, encrypted)).toBe('pending message');
    expect(() =>
      decryptOutboxPayload(
        { activeKeyId: 'v2', keys: { v2: newKey } },
        encrypted,
      ),
    ).toThrow('Outbox encryption key version is unavailable');
  });
});
