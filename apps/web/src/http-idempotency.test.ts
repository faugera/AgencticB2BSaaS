import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { api, HttpError, InvalidResponseError, mutate } from './http.js';

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });

type FetchCall = [string, RequestInit];

function stubFetch(...responses: Array<Response | Error>) {
  const mock = vi.fn();
  for (const response of responses) {
    if (response instanceof Error) mock.mockRejectedValueOnce(response);
    else mock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal('fetch', mock);
  return mock;
}

function call(mock: ReturnType<typeof stubFetch>, index = 0): FetchCall {
  const value = mock.mock.calls[index] as unknown as FetchCall | undefined;
  if (!value) throw new Error(`missing fetch call ${index}`);
  return value;
}

function headers(entry: FetchCall) {
  return entry[1].headers as Record<string, string>;
}

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('api', () => {
  it('sends no idempotency key on reads', async () => {
    const mock = stubFetch(json({ ok: true }));
    await api('/api/me', z.object({ ok: z.boolean() }));
    const entry = call(mock);
    expect(entry[1].method).toBe('GET');
    expect(headers(entry)).not.toHaveProperty('idempotency-key');
  });
});

describe('mutate', () => {
  it('sends a fresh idempotency key and the expected method', async () => {
    const mock = stubFetch(json({ id: 'invitation-1' }));
    await mutate('/api/invitations', { email: 'person@example.test' });
    const entry = call(mock);
    expect(entry[1].method).toBe('POST');
    expect(headers(entry)['content-type']).toBe('application/json');
    expect(headers(entry)['idempotency-key']).toMatch(uuidV4);
    expect((headers(entry)['idempotency-key'] ?? '').length).toBeLessThanOrEqual(200);
  });

  it('replays once with the same key when the transport fails', async () => {
    const mock = stubFetch(new TypeError('network down'), json({ id: 'invitation-1' }));
    await expect(
      mutate('/api/invitations', { email: 'person@example.test' }),
    ).resolves.toEqual({ id: 'invitation-1' });
    expect(mock).toHaveBeenCalledTimes(2);
    expect(headers(call(mock, 1))['idempotency-key']).toBe(
      headers(call(mock, 0))['idempotency-key'],
    );
  });

  it('uses a different key for each submission', async () => {
    const mock = stubFetch(json({ id: '1' }), json({ id: '2' }));
    await mutate('/api/invitations', { email: 'person@example.test' });
    await mutate('/api/invitations', { email: 'person@example.test' });
    expect(headers(call(mock, 1))['idempotency-key']).not.toBe(
      headers(call(mock, 0))['idempotency-key'],
    );
  });

  it('does not replay an HTTP error', async () => {
    const mock = stubFetch(json({ error: 'invalid' }, 400));
    await expect(
      mutate('/api/invitations', { email: 'person@example.test' }),
    ).rejects.toBeInstanceOf(HttpError);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('keeps the Zod contract for schema calls', async () => {
    const schema = z.object({ delivery: z.string() });
    stubFetch(json({ delivery: 'pending' }));
    await expect(
      mutate('/api/access-requests/id', schema, { operation: 'approve', role: 'member' }),
    ).resolves.toEqual({ delivery: 'pending' });

    stubFetch(json({ delivery: 42 }));
    await expect(
      mutate('/api/access-requests/id', schema, { operation: 'approve', role: 'member' }),
    ).rejects.toBeInstanceOf(InvalidResponseError);
  });
});
