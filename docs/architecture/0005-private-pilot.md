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
Membership removal preserves the last enabled tenant administrator; disabled
administrators do not count toward that guard. Explicit super-admin disablement
remains a separate operator action.

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
The active organization is derived from the browser URL, including back/forward
navigation, so reads and writes use the displayed organization scope.
User routes live under `/app`; super-admin routes live under `/admin` with a
dedicated `/admin/login`, MFA and password recovery. The server-established
`/api/me` role gates the admin UI; platform API operations retain their own
server-side super-admin checks. Super-admins visiting `/app` are redirected to
the equivalent admin route, preserving the requested tenant scope.

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

### Access requests and restricted guide (2026-10-24)

The pilot remains invitation-only. A public organization-specific opaque link
collects a request, not an account or membership. Only an administrator of the
selected tenant (or an explicitly scoped super-admin) can review it. Approval uses
the existing invitation/audit path; no platform role can be assigned. Public
collection checks Origin, validates input and limits submissions to three/minute.
The operational `/docs` guide requires a super-admin on both page and API.
Migration 0008 is additive; its disposable database/isolation verification is pending.

### Brume preferences boundary

Own-account UI preferences accept no identity selector. Workspace colors are private
metadata accessible only through RLS-checked workspace reads and narrow management
functions. These functions retain transaction-local identity and tenant context;
workspace membership alone cannot mutate appearance. Hex input is validated before
SQL, and raw colors never determine text, status or action colors. The gallery has
no public route and performs no synthetic business writes. New migration 0009 and
adversarial tests are present; DB execution remains unverified in this environment.

### Journal V0 et décision MFA (2026-10-24)

Décision utilisateur : aucune MFA obligatoire en V0 ; le TOTP facultatif existant
est conservé. Le journal est consultable seulement par super-admin actif, avec
contrôle HTTP et fonction SQL audit_events. Aucune lecture/table privée accordée
aux runtimes. La migration 0010 ajoute des triggers de mutations atomiques avec
la transaction, des types de cible et noms de champs sans valeurs. Les anciens
événements restent lisibles ; aucun historique antérieur n’est reconstitué.
Les écritures sans contexte métier (identité, opérateur, demande publique) ne
permettent pas d’établir un auteur authentifié : celui-ci reste null. Les IDs
historiques survivent aux suppressions futures sans FK de l’audit vers la cible.
Pas de nouvelle suppression utilisateur/tenant, pas de rétention/export/alerting.
Tests SQL/HTTP audit : 4/4 réussis sur PostgreSQL 17.11 jetable ; isolation : 14/14.
La page a également été vérifiée avec le vrai backend, sans mocks, en FR/EN aux
trois tailles et avec refus 401/403. Le gate global sécurité échoue encore sur
les tests lifecycle préexistants et une limitation 429 de la fixture profil.
