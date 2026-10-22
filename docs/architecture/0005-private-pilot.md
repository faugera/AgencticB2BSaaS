# ADR-005 — Private B2B pilot boundaries

Status: accepted implementation of the owner's pilot plan. Supersedes pending
IAM/tenant/MFA statements in ADR-004 and the earlier Task 002 plan.

## Decisions

- React Router library mode, React/Vite, Fastify, PostgreSQL, pnpm. No Next.js,
  external identity CLI, organization plugin, ORM, microservices or queue.
- Better Auth owns identity, verified-email login, server sessions, optional TOTP
  and single-use recovery codes. MFA remains optional **including super-admin**.
  This is an explicit pilot risk, not a platform-enforced production policy.
- Business roles are persisted locally: `super_admin`, `tenant_admin`,
  `workspace_admin`, `member`. Unique actor membership enforces one ordinary
  organization. Workspaces are private unless an administrator changes visibility.
- An operator explicitly binds one verified identity and an application handle
  using `operator:bootstrap`. No first-user/email promotion; repeated bootstrap
  cannot choose a different super-admin or silently reactivate a disabled actor.
- Super-admin standing access is intentional. Tenant content needs explicit
  tenant scope, passes RLS, and every successful super-admin business read/write
  appends audit before commit. Ordinary users cannot select another tenant.

## SQL trust boundary

`identity_runtime` has identity DML only. `business_runtime` owns nothing, has
neither superuser/BYPASSRLS nor membership in `business_owner`, and cannot read
identity secrets or private authorization tables. Startup and readiness check
these privileges. Operator credentials never belong in runtime configuration.

`business.tenants` and `business.workspaces` have ENABLE + FORCE RLS. No context
means no rows. Context is derived from a verified session, persisted enabled
actor/membership, then assigned with transaction-local `set_config` on the same
pooled connection. Composite foreign keys prevent workspace assignments crossing
tenant boundaries. Authorization is reread on each business operation; disabled
actors and removed memberships lose access on the next request, not session expiry.

Actors, memberships, invitations and audit live in `authorization_private` with
**no runtime schema/table grants**. Narrow SECURITY DEFINER functions with fixed
`pg_catalog` search paths and fully qualified relations authorize each operation.
Their non-login owner has no BYPASSRLS; private metadata does not use recursive
RLS policies. This intentional distinction must not be mistaken for blanket RLS
on every table. New tenant content must use the public business RLS boundary.
No runtime UPDATE/DELETE/TRUNCATE on audit; operator database access remains a
trusted recovery boundary, not a tamper-proof external ledger.

RLS protects accidental missing predicates and contextual access, **not** a
compromised application/SQL credential that can forge session context. Parameterized
SQL, fixed functions, least privilege and protection of the server remain required.

## Invitations and recovery

Business invitations are independent from identity enrollment. Store only a
SHA-256 token digest; 48-hour expiry, verified-email binding, row locks, replay
and membership conflict rejection. Acceptance does not upgrade an existing role.
Identity invitation grants no business privilege. SMTP occurs after commit;
delivery state and administrator retry expose failures without keeping SQL locks
while waiting on email. Retry rotates the invitation token. No outbox/retry worker
in the single-instance pilot; a process interruption can leave `pending` delivery.

Browser invitation secrets use URL fragments and memory only. Reloading during
login/MFA requires reopening the invitation email. Reset tokens are removed from
the address bar. `/auth` and `/auth/reset` remain compatible. Locale persists;
credentials and tokens never enter localStorage. Same-origin reverse proxy required.

## Migrations and dependencies

Ordered SQL in `apps/api/migrations`, checksummed in an operator-only history.
Apply atomically under an advisory transaction lock; rollback releases locks and
connections. Never edit an applied migration. Role provisioning/password rotation
are separate explicit commands. The first migration can adopt the preceding
identity-only schema; existing real provider identities still require a reviewed
mapping/reset migration, not automatic linking by email.

Fastify/Vite/Vitest security fixes are pinned. An esbuild override to 0.28.1
addresses GHSA-g7r4-m6w7-qqqr; builds/tests must validate this compatibility until
upstream dependency ranges can replace the override.

## Remaining operational decisions

Hosting/proxy addresses, production SMTP sender, backup retention/storage,
restore RTO/RPO, audit retention/export and incident ownership need an operator.
Pilot business HTTP limiting is per-process; auth limiting is PostgreSQL-backed.
Before horizontal scaling add a shared business limiter and reliable mail outbox.
SSO/SCIM, enforced tenant MFA, multi-organization membership, billing, agents,
workflows and high availability remain outside this pilot. No deployment or
external-provider deletion is authorized by this implementation.
