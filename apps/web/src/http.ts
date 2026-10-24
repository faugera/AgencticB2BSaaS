export class HttpError extends Error {
  constructor(public status: number) {
    super('Request failed');
  }
}
export async function api<T>(path: string, body?: object, method = body ? 'POST' : 'GET'): Promise<T> {
  const result = await fetch(path, {
    method, credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!result.ok) throw new HttpError(result.status);
  return result.json() as Promise<T>;
}
