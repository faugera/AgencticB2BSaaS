import { createHmac } from 'node:crypto';

// Independent RFC 6238 implementation for tests; no auth SDK internals or secrets stored.
export function totp(uri: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const secret = new URL(uri).searchParams.get('secret');
  if (!secret) throw new Error('Expected TOTP URI');
  const bits = [...secret.toUpperCase()]
    .map((char) => {
      const index = alphabet.indexOf(char);
      if (index < 0) throw new Error('Invalid Base32 secret');
      return index.toString(2).padStart(5, '0');
    })
    .join('');
  const bytes = Array.from(
    { length: Math.floor(bits.length / 8) },
    (_, index) => parseInt(bits.slice(index * 8, index * 8 + 8), 2),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac('sha1', Buffer.from(bytes))
    .update(counter)
    .digest();
  const offset = digest[digest.length - 1]! & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, '0');
}
