import { describe, expect, it } from 'vitest';
import { decodePageCursor, encodePageCursor } from './page-cursor.js';
import { AccessError } from './store.js';

const tenantId = '10000000-0000-4000-8000-000000000001';
const id = '10000000-0000-4000-8000-000000000002';
const createdAt = '2026-11-06T12:30:45.123Z';

describe('curseur de pagination', () => {
  it('encode et décode une position canonique liée au tenant', () => {
    const cursor = encodePageCursor(tenantId, createdAt, id);

    expect(decodePageCursor(cursor)).toEqual({ tenantId, createdAt, id });
    expect(decodePageCursor(undefined)).toBeNull();
  });

  it.each([
    'not a cursor',
    Buffer.from('{"id":"invalid"}').toString('base64url'),
    Buffer.from(
      JSON.stringify({
        tenantId,
        createdAt: '2026-11-06T12:30:45Z',
        id,
      }),
    ).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        tenantId,
        createdAt: 'not-a-date',
        id,
      }),
    ).toString('base64url'),
  ])('refuse un curseur mal formé ou non canonique', (cursor) => {
    expect(() => decodePageCursor(cursor)).toThrow(AccessError);
  });
});
