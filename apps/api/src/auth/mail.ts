import nodemailer from 'nodemailer';
import type { AuthConfig } from './config.js';

export type SendAuthMail = (message: { to: string; subject: string; text: string }) => Promise<void>;

export function createMailer(config: AuthConfig['smtp']) {
  const transport = nodemailer.createTransport({
    host: config.host, port: config.port, secure: config.secure,
    requireTLS: !['127.0.0.1', 'localhost', '::1'].includes(config.host),
    ...(config.user ? { auth: { user: config.user, pass: config.pass ?? '' } } : {}),
    connectionTimeout: 10_000, socketTimeout: 10_000,
  });
  const send: SendAuthMail = async (message) => {
    // No link, token, credential or message body is logged.
    try { await transport.sendMail({ from: config.from, ...message }); }
    catch { throw new Error('Authentication email delivery failed'); }
  };
  return { send, close: () => transport.close() };
}
