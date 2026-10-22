# Private pilot runbook

## Start locally

Node 24, pnpm 11.25.0, Docker Compose v2. From the root:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Set a unique POSTGRES_PASSWORD privately (Compose only).
pnpm auth:services
cp apps/api/.env.example apps/api/.env
cp apps/api/migration.env.example apps/api/.env.migration
openssl rand -base64 48
```

Put the generated secret in `BETTER_AUTH_SECRET`. Set distinct passwords for
`DATABASE_URL` (`identity_runtime`) and `BUSINESS_DATABASE_URL`
(`business_runtime`) in the API's private `.env`. Set operator
`MIGRATION_DATABASE_URL` in `.env.migration` using the Compose owner password.
All three URLs target the same host/database; URL-encode special characters.
No runtime command loads `.env.migration`. Do not share or commit either file.

```sh
pnpm db:provision       # Explicit initial role/password operation
pnpm auth:migrate      # Versioned SQL, no credential rotation
pnpm dev
```

Open http://127.0.0.1:5173/login. `/health` is liveness; `/ready` is 200 only
when both configured runtime databases have safe privileges and reachable schemas.
An unconfigured development server keeps liveness but is not a usable pilot.
Mailpit is private on http://127.0.0.1:8025; it never sends real external mail.

## Establish the operator, then invite users

```sh
pnpm auth:invite person@example.test "Operator display name"
# Follow verification mail, request recovery, set a unique password.
pnpm operator:identity person@example.test
# Copy the returned verified identity id, not an email-based role rule:
pnpm operator:bootstrap <verified-identity-id> <application-handle>
```

No default account/password exists. The application handle is not a login
identifier; login uses email. The operator can create organizations and invite
their first tenant administrator through `/app`. The default `General` workspace
is private. Invitees first verify/set their identity password, then reopen the
business invitation email and accept it using that same verified address.
Tenant admins invite members and assign private workspace access. Workspace
admins manage their workspace, never tenants or organization membership.

MFA is optional under `/app/security`: add the TOTP URI to an authenticator,
store recovery codes offline and confirm a code. Do not screenshot/share secrets.
Losing all MFA factors requires an explicitly authorized identity-recovery
procedure; there is no undocumented platform-admin bypass.

## Production prerequisites

- HTTPS frontend with same-origin `/api` proxy to Fastify. Serve static Vite
  assets with an SPA history fallback, but never rewrite missing `/api` routes.
  Set exact `BETTER_AUTH_URL`; API cookies stay HttpOnly and Secure on HTTPS.
- `AUTH_ENABLED=true`, `NODE_ENV=production`, both restricted runtime URLs,
  unique high-entropy auth secret, authenticated SMTP with TLS and a verified sender.
  Never use Mailpit or `vite preview` as production services.
- `TRUSTED_PROXIES` empty unless needed; explicitly list your reverse proxy
  IPs/restricted CIDRs, strip inbound forwarded headers and enforce HTTPS there.
  Do not trust every proxy. Keep PostgreSQL and SMTP off public forwarding.
- Codespaces: forward web 5173 and Mailpit 8025 privately; use the web's exact
  forwarded HTTPS origin, not the github.dev editor URL. No localhost OAuth CLI.
- Require the `CI / verify` status check in GitHub branch protection/rulesets
  before merging. Workflow execution alone does not enforce branch protection.
  Review all dependent PRs; never automatically merge or deploy.
- Confirm any Clerk Dashboard users/other consumers before revoking obsolete
  keys/OAuth grants. Repository cleanup does not delete external resources/users.

## Verification

```sh
pnpm verify
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

Create a disposable PostgreSQL database named `enterprise_auth_test_*`. Supply
`AUTH_TEST_DATABASE_URL` (identity_runtime) and
`AUTH_TEST_MIGRATION_DATABASE_URL` (operator) privately, then:

```sh
pnpm verify:security
pnpm verify:tenant-isolation
```

Integration tests explicitly provision test roles and migrate test schemas;
they fail rather than skip without database configuration. Do not point them at
real data. Runtime role passwords are cluster-wide: use a separate test cluster
or the same test credentials across test databases to avoid rotation surprises.

Live browser checks need the same disposable database in `DATABASE_URL` and
`BUSINESS_DATABASE_URL`, plus `AUTH_ENABLED=true`, preview
`BETTER_AUTH_URL=http://127.0.0.1:4173`, an ephemeral auth secret, local SMTP and
`AUTH_TEST_MAILPIT_URL=http://127.0.0.1:8025`. Keep the operator test variable set.
`pnpm test:auth:e2e` exercises identity/MFA and B2B with real SQL and mail in both
viewports/locales. Synthetic fixtures reset only the disposable auth rate-limit
state; a pre-existing non-fixture super-admin makes fixture setup refuse changes.

## Migration, rotation and rollback

Back up before migrating. Review new SQL/checksums; run `auth:migrate` once as
operator, then start runtimes. No startup migration and no automatic down migration.
An edited applied file is an error; add a new compensating migration instead.
For runtime password rotation, drain the API, change both private URLs as needed,
run explicit `db:provision`, restart and check `/ready` plus login. Rotation of
`BETTER_AUTH_SECRET` also affects encrypted MFA material; preserve it with backups
and follow the installed Better Auth rotation procedure, not a random replacement.

For code rollback, stop writes and restore the last reviewed image/commit only
if schema compatible. Otherwise restore the pre-migration database to a **new**
database, verify it, switch URLs during maintenance and retain the failed state
for investigation. Never drop schemas or overwrite the only backup.

Example PostgreSQL operator commands (private credentials provided via `.pgpass`
or secret manager, not committed or shell history):

```sh
pg_dump --format=custom --file=pilot-before-migration.dump "$BACKUP_DATABASE_URL"
createdb --owner=<operator-role> pilot_restore_check
pg_restore --exit-on-error --dbname=pilot_restore_check pilot-before-migration.dump
```

Roles are cluster objects: provision the original operator/identity owner,
non-login `business_owner` and both runtimes on a new cluster **before** restoring.
Restore as a sufficiently privileged operator, preserving original object
ownership/grants (do not casually add `--no-owner`). Test RLS and function
ownership after restore, then run all isolation gates against an
appropriately named disposable restored copy. Encrypt backups, restrict access,
separately preserve auth/SMTP secrets, set retention and rehearse recovery before
opening the pilot. Infrastructure-specific backup automation/RTO is not deployed
by this repository.
