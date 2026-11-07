import { createHmac } from 'node:crypto';
import type { FastifyRateLimitStore } from '@fastify/rate-limit';
import type { Pool } from 'pg';

export class RateLimitStoreUnavailableError extends Error {
  readonly code = 'RATE_LIMIT_STORE_UNAVAILABLE';
  readonly statusCode = 503;

  constructor() {
    super('Shared rate limit store unavailable');
  }
}

export function createRateLimitStore(pool: Pool, secret: string) {
  return class PostgresRateLimitStore implements FastifyRateLimitStore {
    incr(
      key: string,
      callback: (
        error: Error | null,
        result?: { current: number; ttl: number },
      ) => void,
      timeWindow: number,
      max: number,
    ) {
      const digest = createHmac('sha256', secret)
        .update('business-rate-limit:v1\0', 'utf8')
        .update(key, 'utf8')
        .digest('hex');
      void pool
        .query<{ request_count: number; ttl_milliseconds: string }>(
          'SELECT * FROM business.consume_rate_limit($1,$2,$3)',
          [digest, max, Math.ceil(timeWindow)],
        )
        .then((result) => {
          const row = result.rows[0];
          if (!row) throw new RateLimitStoreUnavailableError();
          callback(null, {
            current: row.request_count,
            ttl: Number(row.ttl_milliseconds),
          });
        })
        .catch(() => callback(new RateLimitStoreUnavailableError()));
    }

    child() {
      return new PostgresRateLimitStore();
    }
  };
}
