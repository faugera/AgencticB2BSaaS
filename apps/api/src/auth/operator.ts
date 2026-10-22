import { randomBytes } from 'node:crypto';
import type { AuthConfig } from './config.js';
import type { SendAuthMail } from './mail.js';
import { createAuth, createAuthPool } from './service.js';

export async function inviteIdentity(config: AuthConfig, send: SendAuthMail, email: string, name: string, recoverExisting = true) {
  if (!email.includes('@') || /[\r\n]/.test(email + name)) throw new Error('Invalid invitation identity');
  const pool = createAuthPool(config.databaseURL);
  try {
    let delivered = false;
    const checkedSend: SendAuthMail = async (message) => {
      await send(message);
      delivered = true;
    };
    // Provisioning-capable instance is never mounted as an HTTP auth handler.
    const auth = createAuth(config, pool, checkedSend, true);
    const existing = await pool.query<{ id: string; emailVerified: boolean }>(
      'SELECT id, "emailVerified" FROM identity."user" WHERE lower(email) = lower($1)', [email],
    );
    if (!existing.rowCount) {
      await auth.api.signUpEmail({ body: {
        email, name, password: randomBytes(48).toString('base64url'),
        callbackURL: config.baseURL + '/auth?activate=1',
      } });
    } else if (!existing.rows[0]?.emailVerified) {
      await auth.api.sendVerificationEmail({ body: { email, callbackURL: config.baseURL + '/auth?activate=1' } });
    } else {
      // Business invitations to verified identities do not need password recovery.
      if (!recoverExisting) return;
      await auth.api.requestPasswordReset({ body: { email, redirectTo: config.baseURL + '/auth/reset' } });
    }
    if (!delivered) throw new Error('Invitation email was not delivered; retry the operator invitation');
  } finally { await pool.end(); }
}
