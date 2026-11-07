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
  const schema =
    schemaOrBody instanceof ZodType
      ? schemaOrBody
      : undefined;
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
  const result = await fetch(path, {
    method: method ?? (body ? 'POST' : 'GET'),
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!result.ok) throw new HttpError(result.status);
  const payload: unknown = await result.json();
  if (!schema) return payload;
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new InvalidResponseError();
  return parsed.data;
}
