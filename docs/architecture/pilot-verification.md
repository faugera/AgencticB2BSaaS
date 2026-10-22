# Private pilot verification evidence

Local environment: 2026-10-22, Node 24, pnpm 11.25.0, PostgreSQL 17.8,
Mailpit, Chromium desktop/iPhone viewport. All accounts and passwords are generated
synthetic fixtures, confined to `enterprise_auth_test_*` databases. No real
operator account, external-provider deletion, deployment or merge was performed.

Gates exercised:

- Frozen dependency installation; strict typing, ESLint, 33 unit cases, both
  production builds and real HTTP smoke/graceful shutdown.
- `verify:security`: credential-pattern/lockfile checks, dependency audit and
  22 real PostgreSQL auth/authorization cases. No known dependency advisories
  after Fastify/Vite/Vitest fixes and the documented esbuild override.
- `verify:tenant-isolation`: two tenants, two private workspaces each, missing
  context/predicates, joins, forged scope, cross-tenant foreign keys, concurrent
  pooled connections, error cleanup, privilege checks and immediate revocation.
- Bootstrap/identity verification, fixed role boundaries, invitation binding,
  expiry/replay/conflicts, append-only audit, audited super-admin reads, competing
  administrator removals and migration-checksum failure/retry.
- Better Auth schema drift check, disabled public signup, unknown-account
  recovery, password-reset replay/session revocation, unverified login, spoofed-IP
  rate limiting, SMTP failure/retry and optional TOTP/single-use recovery codes.
- 18 browser cases across desktop/mobile: fr/en, preserved form state, generic
  network/429 errors, password reveal, keyboard focus, logged-in recovery,
  safe login redirection, legacy links, 404 and dark-mode overflow checks.
- Four real browser/SQL/SMTP scenarios: verified enrollment/password recovery,
  login + optional MFA, tenant creation, business-invitation acceptance and private
  workspace administration. French/English and both viewports.

A custom-format `pg_dump` of the disposable pilot database was restored with
ownership/grants into a separate disposable database. Authentication and tenant
isolation gates passed on the restored copy. This is a recovery rehearsal, not
provisioning of encrypted off-site backups or a guaranteed production RTO/RPO.

GitHub CI repeats these gates on every PR. See the PR's actual Actions result;
local results do not substitute for a required branch-protection check. The
runbook lists operator prerequisites before opening the private pilot. Tests
do not establish enterprise compliance, exhaustive penetration testing or HA.
