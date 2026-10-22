import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import type { AuthConfig } from './config.js';
import type { SendAuthMail } from './mail.js';

export function createAuthPool(connectionString: string) {
  return new Pool({
    connectionString,
    options: '-c search_path=identity,pg_catalog',
    max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10_000,
  });
}

export function createAuth(config: AuthConfig, pool: Pool, send: SendAuthMail, operatorRegistration = false) {
  return betterAuth({
    appName: 'Enterprise AI OS',
    baseURL: config.baseURL,
    basePath: '/api/auth',
    secret: config.secret,
    database: pool,
    trustedOrigins: [config.baseURL],
    logger: { disabled: true },
    emailAndPassword: {
      enabled: true,
      disableSignUp: !operatorRegistration,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 1800,
      sendResetPassword: async ({ user, url }) => send({
        to: user.email,
        subject: 'Définir votre mot de passe / Set your password',
        text: `Définissez votre mot de passe avec ce lien valable 30 minutes.\nSet your password using this link, valid for 30 minutes.\n\n${url}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message. / If you did not request this, ignore this message.`,
      }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 1800,
      sendVerificationEmail: async ({ user, url }) => send({
        to: user.email,
        subject: 'Vérifier votre adresse / Verify your email',
        text: `Vérifiez votre adresse avec ce lien valable 30 minutes.\nVerify your email using this link, valid for 30 minutes.\n\n${url}`,
      }),
    },
    session: {
      expiresIn: 60 * 60 * 24,
      updateAge: 60 * 60,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true, storage: 'database', window: 60, max: 30,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 },
        '/send-verification-email': { window: 60, max: 3 },
      },
    },
    advanced: {
      useSecureCookies: config.baseURL.startsWith('https://'),
      ipAddress: { ipAddressHeaders: ['x-auth-client-ip'] },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
