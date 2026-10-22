# Better Auth setup

This guide applies to the separate Better Auth integration PR; the cleanup-only
PR records the decision but does not yet install these commands.

No external identity-provider account or CLI login is required. Use Node 24,
pnpm 11.25.0 and Docker Compose v2. Never reuse passwords shared in a chat.

## 1. Install and start local services

From the repository root:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Set a unique POSTGRES_PASSWORD privately in .env.
pnpm auth:services
```

This starts PostgreSQL on loopback port 5432, SMTP on 1025 and Mailpit on 8025.
Mailpit captures test mail and does not deliver to real inboxes. Never expose its
UI publicly; verification/recovery links are credentials.

## 2. Configure the API privately

```sh
cp apps/api/.env.example apps/api/.env
cp apps/api/migration.env.example apps/api/.env.migration
openssl rand -base64 48
```

Put the generated secret in BETTER_AUTH_SECRET; do not post or commit it.
In apps/api/.env, set DATABASE_URL with user identity_runtime and a unique
runtime password. In apps/api/.env.migration, set MIGRATION_DATABASE_URL with
user enterprise and the POSTGRES_PASSWORD chosen for Compose. URL-encode special
characters in connection passwords. Both URLs must target the same host/database.

Keep migration credentials out of the API runtime environment. Only the migrate
command loads .env.migration; normal dev/start loads .env only. Examples are
tracked, real environment files are ignored. No frontend secret is needed.

BETTER_AUTH_URL is the exact public frontend origin, default
http://127.0.0.1:5173. The frontend proxies /api to port 3000; production needs
the equivalent same-origin reverse proxy. Do not use an API-only origin here.
Production requires HTTPS, AUTH_ENABLED=true, a high-entropy secret, and an
authenticated TLS SMTP service instead of Mailpit. Keep a backup/restore plan.

## 3. Migrate and start

```sh
pnpm auth:migrate
pnpm dev
```

Migration is explicit and repeatable. It creates the identity schema/tables and
a restricted runtime role, refusing unsafe schema drift. It does not create a
tenant, admin, sample account or business tables. No migration runs at startup.

## 4. Invite the first identity

```sh
pnpm auth:invite person@example.test "Invited person"
```

Use the intended person's private details instead of committing real defaults.
Only operators with environment/terminal access can run this command. It sends
a verification email with a random unknown initial password. In development:

1. Open http://127.0.0.1:8025 and follow the verification email.
2. On the recovery screen enter the same email and request a password link.
3. Open the second email, choose a new password (12+ characters), then sign in.
4. Sign out to revoke the session.

Reinviting an unverified identity resends verification; a verified identity gets
a reset link. Identity invitation is not tenant membership or super-admin
provisioning. Platform-role bootstrap remains a separate, audited Task 002
operation; no email or first signup is auto-promoted.

## Codespaces

Forward frontend port 5173 and Mailpit port 8025 as **private** ports. Set
BETTER_AUTH_URL in apps/api/.env to the exact HTTPS forwarded address for 5173,
then restart the API. Do not use the editor's github.dev URL as the app origin.
Do not forward database, SMTP or API publicly. The browser uses the frontend's
/api proxy, so no authentication CLI localhost callback is needed.

If Vite binds only to loopback in your environment, start the frontend explicitly
with `pnpm --filter @enterprise/web dev --host 0.0.0.0`; keep the forwarded port
private. Language switching preserves form state; no public signup is exposed.

## Verification

```sh
pnpm verify
pnpm test:e2e
```

For auth integration tests, create a disposable database whose name starts with
enterprise_auth_test. Provide AUTH_TEST_DATABASE_URL (identity_runtime credentials)
and AUTH_TEST_MIGRATION_DATABASE_URL (operator credentials), then run
`pnpm test:auth`. These tests never skip if DB configuration is missing.

Live browser tests additionally need AUTH_ENABLED=true, BETTER_AUTH_URL matching
the preview origin http://127.0.0.1:4173, BETTER_AUTH_SECRET, DATABASE_URL pointing
to that test database, SMTP_HOST/SMTP_PORT/MAIL_FROM and AUTH_TEST_MAILPIT_URL.
Run `AUTH_LIVE_TEST=true pnpm exec playwright test tests/e2e/auth-live.spec.ts`.
They use synthetic emails and Mailpit, not a real SMTP sender. CI supplies these
temporary settings and exercises both desktop and mobile.

## Retiring the old provider and rollback

No Clerk SDK or users were committed to main when inspected. This change removes
the competing npm lockfile and obsolete setup instructions. pnpm-lock.yaml remains
the only dependency lockfile. Any unpushed Codespace changes must be reviewed
separately before pulling; do not overwrite them with reset/clean.

Before cutover, check the Clerk Dashboard for real users or other consumers. If
real accounts exist, stop and plan subject mapping, verified-email linking and
credential reset; passwords/sessions are not automatically portable. Do not drop
those accounts. Revoke unused development keys and the CLI OAuth grant only
after confirming no other project needs them; account deletion is a separate
owner action. Do not commit CLI state, callback URLs or environment files.

For rollback, stop the auth-enabled API, retain/backup identity data and revert
the code through a reviewed commit. Do not drop the identity schema or rotate
secrets automatically: existing sessions/recovery links depend on them.
