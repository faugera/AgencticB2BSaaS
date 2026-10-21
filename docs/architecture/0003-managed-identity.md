# ADR-003 — Managed identity and application-owned authorization

Status: Task 002 decision accepted by owner. Service category approved;
Clerk selected for the implementation plan. No provider account provisioned.

## Decision

Use Clerk for managed identity and authentication, with React/Vite and Fastify.
Keep stable application actor IDs, roles, tenants and workspace memberships in
PostgreSQL. Map identities by provider plus immutable subject, not email as ID.
Do not adopt Clerk Organizations as a second source of tenant/RBAC truth.

Use the official React and backend SDKs appropriate to the installed versions.
Validate server-side signature, issuer, expiry and authorized application origins.
Browser controls are presentation, not authorization. Require HTTPS in deployment;
use exact configured origins, stable API error codes and redacted logs.
Prefer same-origin API routing; any development proxy must preserve the intended
authentication origin. Do not add wildcard CORS or private keys to VITE_*.

Clerk sign-in alone grants no application access. The server resolves an enabled
local actor and its current persisted permissions on every protected operation.
Provider account disablement/session revocation must be included in the chosen
session-validation strategy; JWT signature validity alone does not prove that a
session is still active.

## Owner arbitrations

- Tenant = organization; workspaces belong to one tenant.
- Standard users belong to at most one tenant initially.
- Only the platform super-admin can create tenants.
- Platform super-admin is independent of tenant membership and has standing
  cross-tenant access through explicit, audited application permissions.
- The ordinary database role has no superuser/BYPASSRLS/table-owner authority.
  No request-supplied bypass flag, provider public metadata or editable profile
  field grants platform rights.
- Bootstrap the first platform account through a protected operator command
  bound to the intended verified identity. No public bootstrap HTTP endpoint.

## Tradeoffs

Managed identity reduces credential/session operational work, but introduces
provider cost, availability and migration constraints. Future SSO, MFA, invitation
and language capabilities must be checked against the chosen instance and plan;
no paid tier or price is assumed. An interface cannot guarantee portability of
passwords, provider sessions or recovery flows. A future migration needs an
explicit identity mapping and session cutover plan.

Do not build a general identity-provider framework. Keep provider-specific
verification and profile lookup near the API auth boundary, with a small
testable authenticated-identity contract.

## Account initialization

Clerk must be configured by its account owner; see
`../setup/clerk.md`. Personal account details belong in private operator input,
not repository examples. The previously shared password must never be used.
Set a new credential through the provider's verification/invitation/recovery flow.
A provider user is not an application super-admin until the protected local
bootstrap has succeeded. Require strong authentication for this privileged account
before production; choose enforceable provider settings rather than UI-only rules.

## Sources

- React SDK: https://clerk.com/docs/react/getting-started/quickstart
- Backend verification: https://clerk.com/docs/reference/backend/verify-token

The official backend docs recommend authenticateRequest for request authentication.
Any lower-level verification must explicitly constrain issuer and origins.
Recheck the chosen SDK's behavior and documentation during implementation.
