# Task 002 — IAM and tenant/workspace isolation

Status: scope approved by owner; the identity slice is implemented separately from the remaining tenant/RBAC/RLS work.
This remains a documentation-only PR. See `002-implementation-plan.md` for
sequencing and `../architecture/0004-better-auth.md` for authentication.

## Accepted scope

- Better Auth manages identity, sign-in, verification, recovery and sessions inside the API.
  PostgreSQL owns application roles, tenant/workspace memberships and invitations.
- Organization equals tenant. A standard user belongs to at most one tenant.
  Tenant memberships and workspace assignments remain distinct.
- Only Platform Super Admin creates tenants. Its platform identity is independent
  of tenant memberships and has permanent, explicit cross-tenant authorization.
  Every privileged cross-tenant operation is audited with actor, scope and action.
- Roles initially: platform super-admin, tenant admin, workspace admin and member.
  Tenant admins manage their tenant; workspace admins manage assigned workspaces.
  No custom role builder, generic ABAC engine, or platform impersonation UI.
- Deliver sign-in, invite-only application access, tenant creation, invitations,
  acceptance and a minimal workspace view. Identity registration alone grants no
  tenant membership or application privilege.
- Preserve the monorepo, React/Vite/Fastify/pnpm and health liveness endpoint.
  New UI supports French by default, English, desktop/mobile and keyboard use.

## Database and authorization requirements

- Versioned PostgreSQL migrations; no unused ORM or generic repository package.
- Runtime role cannot own tables, be superuser or have BYPASSRLS.
- Derive actor and scope from verified identity and persisted authorization.
  Client-supplied tenant/workspace IDs are requested resources, never authority.
- Transaction-local context with pooled-connection cleanup and fail-closed RLS.
- Composite foreign keys prevent cross-tenant workspace/member associations.
- Enforce one tenant per standard user with a database constraint.
- Workspace visibility is explicit; private workspaces require assignment,
  except authorized tenant admins and platform super-admin.
- Tenant creation and granting its first admin must not leave an unusable tenant.
- Invitations are scoped, expiring, revocable, single-use and bound to a verified
  identity/email. Store token hashes, not bearer invitation tokens.
- Check persisted privileges on requests; removal/disablement must invalidate
  application access even while an identity session remains valid.
- Audit records are append-only for ordinary application connections.
  Platform privilege is never a user-editable profile field or request flag.

## Initial super-admin

Use an operator-only, one-time bootstrap procedure. Bind the intended verified
Better Auth identity to a local platform actor; never promote the first registrant or
an arbitrary matching request email. Existing platforms must not silently gain
another super-admin on repeated bootstrap. Document intentional recovery.
Password hashing and session/recovery state are handled by Better Auth in our
identity storage. Never log or expose plaintext passwords/tokens. Do not include
real personal account data or default credentials in public fixtures.

## Verification and acceptance

- Real PostgreSQL tests: two fictional tenants, two workspaces each, legitimate
  access and adversarial reads/writes, joins, missing context, stale memberships,
  cross-tenant foreign keys, concurrent pool reuse and workspace restrictions.
- API tests: invalid/expired/wrong-issuer/wrong-origin tokens denied, 401/403/404
  policy avoids resource enumeration, forged role/scope input cannot escalate.
- Prove platform-only creation and audit of cross-tenant access.
- Test invitation expiry/revocation/replay and one-tenant conflicts.
- Test bootstrap idempotence, identity verification and denial of public promotion.
- `verify:tenant-isolation` and `verify:security` must fail on missing test DB
  configuration, not silently skip. Preserve all existing CI gates.
- Browser tests cover sign-in handoff, onboarding, permissions, fr/en and responsive
  layouts. Mocked UI tests are not evidence of end-to-end authentication.
- Activation/sign-in/recovery must also pass with real PostgreSQL and a test SMTP
  server. Production SMTP and tenant authorization require separate validation.

## Deferred

Enterprise SSO/SAML, billing, agents, tools, business modules, custom permissions,
full tenant administration portal, deployment and production hardening.

## Delivery

Dedicated implementation branch and reviewable PR. No automatic merge, deploy,
production migration, account provisioning, or credential publication.
