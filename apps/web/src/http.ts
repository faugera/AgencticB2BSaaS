import { ZodType } from 'zod';

export class HttpError extends Error {
  constructor(public status: number) {
    super('Request failed');
  }
}
export class InvalidResponseError extends Error {
  constructor() {
    super('Response does not match the expected contract');
  }
}

type RequestArgs = {
  schema?: ZodType<unknown> | undefined;
  body?: object | undefined;
  method?: string | undefined;
};

function splitArgs<T>(
  schemaOrBody?: ZodType<T> | object,
  bodyOrMethod?: object | string,
  explicitMethod?: string,
): { schema?: ZodType<T> | undefined; body?: object | undefined; method?: string | undefined } {
  const schema = schemaOrBody instanceof ZodType ? schemaOrBody : undefined;
  const body = schema
    ? typeof bodyOrMethod === 'object'
      ? bodyOrMethod
      : undefined
    : (schemaOrBody as object | undefined);
  const method = schema
    ? explicitMethod
    : typeof bodyOrMethod === 'string'
      ? bodyOrMethod
      : undefined;
  return { schema, body, method };
}

async function send(path: string, args: RequestArgs, key?: string) {
  const headers: Record<string, string> = {};
  if (args.body) headers['content-type'] = 'application/json';
  if (key) headers['idempotency-key'] = key;
  return fetch(path, {
    method: args.method ?? (args.body ? 'POST' : 'GET'),
    credentials: 'same-origin',
    headers,
    ...(args.body ? { body: JSON.stringify(args.body) } : {}),
  });
}

async function read<T>(result: Response, schema: ZodType<T>): Promise<T>;
async function read(result: Response): Promise<unknown>;
async function read<T>(result: Response, schema?: ZodType<T>): Promise<T | unknown> {
  if (!result.ok) throw new HttpError(result.status);
  const payload: unknown = await result.json();
  if (!schema) return payload;
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new InvalidResponseError();
  return parsed.data;
}

export async function api<T>(
  path: string,
  schema: ZodType<T>,
  body?: object,
  method?: string,
): Promise<T>;
export async function api(
  path: string,
  body?: object,
  method?: string,
): Promise<unknown>;
export async function api<T>(
  path: string,
  schemaOrBody?: ZodType<T> | object,
  bodyOrMethod?: object | string,
  explicitMethod?: string,
): Promise<T | unknown> {
  const { schema, body, method } = splitArgs(schemaOrBody, bodyOrMethod, explicitMethod);
  const response = await send(path, { body, method });
  return (schema ? read(response, schema) : read(response)) as Promise<T>;
}

/**
 * Idempotent mutation: sends a fresh key per user submission and replays once
 * with the same key when the transport fails before any response is received.
 * HTTP errors are never retried.
 */
export async function mutate<T>(
  path: string,
  schema: ZodType<T>,
  body?: object,
  method?: string,
): Promise<T>;
export async function mutate(
  path: string,
  body?: object,
  method?: string,
): Promise<unknown>;
export async function mutate<T>(
  path: string,
  schemaOrBody?: ZodType<T> | object,
  bodyOrMethod?: object | string,
  explicitMethod?: string,
): Promise<T | unknown> {
  const { schema, body, method } = splitArgs(schemaOrBody, bodyOrMethod, explicitMethod);
  const key = crypto.randomUUID();
  const args = { body, method };
  let result: Response;
  try {
    result = await send(path, args, key);
  } catch {
    result = await send(path, args, key);
  }
  return (schema ? read(result, schema) : read(result)) as Promise<T | unknown>;
}
