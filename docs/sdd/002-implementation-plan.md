# Task 002 — Approved implementation plan

Status: plan approved with managed authentication. Code implementation pending.
This file records work to execute; no commands below are implemented by this PR.

## A. Align contracts

Update SDD-00/002 for one tenant per standard user, platform-only provisioning,
standing audited super-admin access, managed Clerk identity and app-owned RBAC.
Resolve roadmap task IDs. Keep proposal/accepted statuses explicit.
Done when the documentation diff and authorization matrix agree.

## B. PostgreSQL and security boundary

Use SQL migrations plus pg unless inspection identifies a concrete need for more.
Separate migration/operator credentials from a least-privilege runtime connection.

Minimal entities:
- actor and provider-subject mapping, enabled state and protected platform role;
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

## C. Managed identity and first operator

Integrate the official React/backend SDKs. Resolve issuer, application origins,
verified identity and persisted authorization at the API boundary. Keep /health
independent of identity-provider and database availability.

An operator-only bootstrap command binds the intended verified Clerk user to the
initial platform role. Proposed command: `pnpm iam:bootstrap-admin`; this is a
future deliverable, not a currently available command. Never use a default
password, first-user-wins promotion, or email from the request body.

The account owner must configure a development Clerk application and supply
keys through private environment configuration before live verification.
Do not require production keys for CI. Use isolated test identities and signed
tokens/SDK fixtures with no production test-auth escape hatch.

## D. First complete browser journey

1. Intended super-admin activates its provider identity and is bootstrapped.
2. Signs in, creates tenant and invites its first tenant admin.
3. Invited person verifies identity and accepts the scoped invitation.
4. Opens an authorized workspace; unauthorized routes remain denied.
5. Super-admin can select another tenant through audited privileged routes.

Tenant creation plus initial admin invitation is transactional locally; any
provider notification failure requires an explicit retryable state, not a silent
claim that email was sent. Do not hold DB transactions open during email calls.
Tenant/workspace permissions stay local rather than syncing two role registries.

UI: French default, English switch, preserved locale/form state, accessible
loading/error/empty states and mobile/tablet/desktop layouts. Reuse existing
components and add only primitives needed by this journey.

## E. Verification and handoff

Deliver the SQL/API adversarial checks in SDD-002 and existing baseline gates.
Add fail-closed integration/security commands to CI with real PostgreSQL.
Prove both denials and legitimate access, bootstrap restrictions, invitation
lifecycle, revocation and privileged audit. Report provider mocks separately from
a real development-instance activation/sign-in/recovery check.

Code is delivered in a separate implementation PR after the docs base is aligned.
No automatic merge, paid provisioning, production migration or deployment.

## External setup still required

A private Clerk development instance configuration. No Clerk account, API secret,
email sender or target application domain is available in this session. See
`../setup/clerk.md`. This is not a completed IAM implementation.
