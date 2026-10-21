# Task 002 — IAM and tenant/workspace isolation (proposed)

Status: specification for review. Do not implement as part of the documentation PR.

## Goal
Establish enforceable server-side tenant/workspace authorization and PostgreSQL isolation before adding tenant data or agent tools.

## Scope
1. Inspect existing Fastify API, shared types, PostgreSQL Compose and CI; make a small migration/tooling decision supported by actual needs.
2. Model Tenant, Workspace, User and Membership, with tenant admin and workspace roles. Keep Customer and Subscription out of the first migration unless required.
3. Define authenticated server-established actor/tenant/workspace context; choose a testable authentication boundary without hard-coding an enterprise provider. No trust in request-supplied tenant IDs.
4. Implement centralized authorization checks for tenant membership, workspace visibility and scoped CRUD; explicitly distinguish 401, 403 and 404 behavior to avoid enumeration.
5. PostgreSQL RLS policies for tenant-scoped records; runtime DB role must not own tables, bypass RLS or be superuser. Ensure connection-pool safety: use transaction-local tenant context, reset automatically, fail closed when absent.
6. Seed at least two fictional tenants with two workspaces each and different memberships. Never commit real credentials.
7. Integration tests using real PostgreSQL for cross-tenant reads/writes, workspace access, tenant admin policy, missing context, stale memberships, SQL joins and concurrent pooled requests.
8. Document the authorization matrix, threat assumptions, migration/rollback procedure and open IdP decisions.

## Explicitly deferred
Production IdP/SSO integration and provider selection, platform support impersonation UI, subscription billing, agents, tools, business modules, tenant admin portal and full provisioning automation. Define future invariants without implementing speculative scaffolding.

## Acceptance criteria
- Unauthorized cross-tenant reads and writes are denied at API and DB levels.
- Workspace access follows explicit visibility and membership policy.
- Tenant admin access cannot escape tenant boundary.
- Request-supplied tenant/workspace identifiers never establish authority.
- RLS cannot be bypassed through ordinary application connections or connection-pool reuse.
- Integration tests prove denial and legitimate access for both tenants.
- `pnpm verify`, relevant PostgreSQL integration tests and Playwright checks pass in CI.
- No `any`, no unnecessary packages, no unrelated UI redesign; code review includes security evidence.
- Changes delivered on dedicated branch as reviewable PR; no automatic merge.

## Delivery plan
Phase A: inspect, propose schema/permission matrix and migration strategy; request approval on material decisions.
Phase B: implement minimal vertical slice.
Phase C: adversarial tests, documentation and CI evidence.
