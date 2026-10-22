# Task 002 — Approved implementation plan

Status: revised for Better Auth. Identity implementation is delivered separately;
tenant/workspace provisioning, business RBAC, platform bootstrap and RLS remain to implement.

## A. Align contracts

Update SDD-00/002 for one tenant per standard user, platform-only provisioning,
standing audited super-admin access, self-hosted Better Auth identity and app-owned RBAC.
Resolve roadmap task IDs. Keep proposal/accepted statuses explicit.
Done when the documentation diff and authorization matrix agree.

## B. PostgreSQL and security boundary

Use SQL migrations plus pg unless inspection identifies a concrete need for more.
Separate migration/operator credentials from a least-privilege runtime connection.

Minimal entities:
- actor linked to the Better Auth user ID, enabled state and protected platform role;
- tenant, tenant membership (one tenant per standard actor);
- workspace, workspace membership and visibility;
- scoped invitation with hashed token, expiry, revocation and consumption;
- append-only audit records.

Use database constraints for same-tenant relationships and transaction-local
actor context. RLS must deny absent context and unauthorized tenant/workspace
access. Super-admin access is an explicit authorization policy, not a database
bypass. Document trusted API context versus a compromised database credential.

Fixed initial authorization matrix:

| Action | Platform super-admin | Tenant admin | Workspace admin | Member |
| --- | --- | --- | --- | --- |
| Create tenant | Yes | No | No | No |
| Access another tenant | Yes, audited | No | No | No |
| Manage tenant invitations | Yes, audited | Own tenant | No | No |
| Manage workspaces | Yes, audited | Own tenant | Assigned workspace | No |
| Read private workspace | Yes, audited | Own tenant | Assigned | Assigned |

Exact workspace visibility defaults and write operations must be specified in
tests. Avoid building business data CRUD merely to demonstrate permissions.

## C. Self-hosted identity and first operator

Integrate Better Auth in React/Fastify. Validate trusted origins and database-backed
sessions at the API boundary; keep business authorization separate. Keep /health
independent of identity-provider and database availability.

An operator-only bootstrap command binds the intended verified Better Auth user to the
initial platform role. Proposed command: `pnpm iam:bootstrap-admin`; this is a
future deliverable, not a currently available command. Never use a default
password, first-user-wins promotion, or email from the request body.

Use PostgreSQL plus Mailpit for development and CI. Production requires privately
configured secrets and an authenticated TLS SMTP service. No external identity
provider account or CLI OAuth flow is required. Operator identity invitations
(`pnpm auth:invite`) grant no tenant/platform role; platform bootstrap is still
future work. Use synthetic identities, with no production test-auth escape hatch.

## D. First complete browser journey

1. Intended super-admin activates its Better Auth identity and is explicitly bootstrapped.
2. Signs in, creates tenant and invites its first tenant admin.
3. Invited person verifies identity and accepts the scoped invitation.
4. Opens an authorized workspace; unauthorized routes remain denied.
5. Super-admin can select another tenant through audited privileged routes.

Tenant creation plus initial admin invitation is transactional locally; any
email notification failure requires an explicit retryable state, not a silent
claim that email was sent. Do not hold DB transactions open during email calls.
Tenant/workspace permissions stay local rather than syncing two role registries.

UI: French default, English switch, preserved locale/form state, accessible
loading/error/empty states and mobile/tablet/desktop layouts. Reuse existing
components and add only primitives needed by this journey.

## E. Verification and handoff

Deliver the SQL/API adversarial checks in SDD-002 and existing baseline gates.
Add fail-closed integration/security commands to CI with real PostgreSQL.
Prove both denials and legitimate access, bootstrap restrictions, invitation
lifecycle, revocation and privileged audit. Report HTTP/email mocks separately from
a real PostgreSQL/SMTP activation/sign-in/recovery check.

Code is delivered in a separate implementation PR after the docs base is aligned.
No automatic merge, paid provisioning, production migration or deployment.

## Setup and remaining work

See `../setup/better-auth.md` for local secrets, database migration and SMTP.
The identity slice does not complete the tenant/RBAC/platform bootstrap plan.
Production email delivery and hosting remain operator configuration.
