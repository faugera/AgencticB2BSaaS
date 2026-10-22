export type AuthConfig = {
  baseURL: string;
  secret: string;
  databaseURL: string;
  smtp: { host: string; port: number; secure: boolean; user?: string; pass?: string; from: string };
};

export function readAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig | undefined {
  if (env.AUTH_ENABLED !== undefined && !['true', 'false'].includes(env.AUTH_ENABLED)) {
    throw new Error('AUTH_ENABLED must be true or false');
  }
  if (env.AUTH_ENABLED !== 'true') {
    if (env.NODE_ENV === 'production') throw new Error('Production requires AUTH_ENABLED=true');
    return undefined;
  }
  const required = (key: string) => {
    const value = env[key]?.trim();
    if (!value) throw new Error(`Missing ${key}`);
    return value;
  };
  const url = new URL(required('BETTER_AUTH_URL'));
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('BETTER_AUTH_URL must be an exact HTTP(S) origin');
  }
  if (env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('Production authentication requires HTTPS');
  }
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('HTTP authentication is permitted only on loopback');
  }
  const secret = required('BETTER_AUTH_SECRET');
  if (secret.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
  const databaseURL = required('DATABASE_URL');
  if (!['postgres:', 'postgresql:'].includes(new URL(databaseURL).protocol)) throw new Error('DATABASE_URL must use PostgreSQL');
  const port = Number(env.SMTP_PORT ?? '1025');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP_PORT');
  if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD)) throw new Error('SMTP_USER and SMTP_PASSWORD must be configured together');
  return {
    baseURL: url.origin, secret, databaseURL,
    smtp: {
      host: required('SMTP_HOST'), port, secure: port === 465,
      ...(env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? '' } : {}),
      from: required('MAIL_FROM'),
    },
  };
}
