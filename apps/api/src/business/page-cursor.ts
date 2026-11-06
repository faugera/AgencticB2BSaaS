import { AccessError } from './store.js';

export type PageCursor = {
  tenantId: string;
  createdAt: string;
  id: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function decodePageCursor(value: string | undefined): PageCursor | null {
  if (value === undefined) return null;
  try {
    if (!/^[A-Za-z0-9_-]{1,512}$/.test(value)) throw new Error();
    const text = Buffer.from(value, 'base64url').toString('utf8');
    if (Buffer.from(text, 'utf8').toString('base64url') !== value)
      throw new Error();
    const parsed: unknown = JSON.parse(text);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed) ||
      Object.keys(parsed).sort().join(',') !== 'createdAt,id,tenantId'
    )
      throw new Error();
    const cursor = parsed as PageCursor;
    if (
      !uuidPattern.test(cursor.tenantId) ||
      !uuidPattern.test(cursor.id) ||
      typeof cursor.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(cursor.createdAt)) ||
      new Date(cursor.createdAt).toISOString() !== cursor.createdAt
    )
      throw new Error();
    return cursor;
  } catch {
    throw new AccessError(400, 'INVALID_CURSOR');
  }
}

export function encodePageCursor(
  tenantId: string,
  createdAt: Date | string,
  id: string,
) {
  return Buffer.from(
    JSON.stringify({
      tenantId,
      createdAt: new Date(createdAt).toISOString(),
      id,
    }),
    'utf8',
  ).toString('base64url');
}
