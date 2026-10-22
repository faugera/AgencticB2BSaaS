CREATE SCHEMA IF NOT EXISTS identity;
REVOKE ALL ON SCHEMA identity FROM PUBLIC;
CREATE TABLE IF NOT EXISTS identity."user" (
  id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL, image text,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE identity."user" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" boolean DEFAULT false;
CREATE TABLE IF NOT EXISTS identity.session (
  id text PRIMARY KEY, "expiresAt" timestamptz NOT NULL, token text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL,
  "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES identity."user"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS identity.account (
  id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES identity."user"(id) ON DELETE CASCADE,
  "accessToken" text, "refreshToken" text, "idToken" text,
  "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, scope text, password text,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS identity.verification (
  id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS identity."rateLimit" (
  id text PRIMARY KEY, key text NOT NULL UNIQUE, count integer NOT NULL, "lastRequest" bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS identity."twoFactor" (
  id text PRIMARY KEY, secret text NOT NULL, "backupCodes" text NOT NULL,
  "userId" text NOT NULL REFERENCES identity."user"(id) ON DELETE CASCADE,
  verified boolean DEFAULT true, "failedVerificationCount" integer DEFAULT 0, "lockedUntil" timestamptz
);
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON identity.session("userId");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON identity.account("userId");
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON identity.verification(identifier);
CREATE INDEX IF NOT EXISTS "twoFactor_userId_idx" ON identity."twoFactor"("userId");
GRANT USAGE ON SCHEMA identity TO identity_runtime, business_owner;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity TO identity_runtime;
GRANT SELECT (id, email, name, "emailVerified") ON identity."user" TO business_owner;
GRANT REFERENCES (id) ON identity."user" TO business_owner;
