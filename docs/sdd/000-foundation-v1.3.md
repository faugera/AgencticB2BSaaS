# SDD-00 v1.3 — Enterprise AI OS foundation

Status: proposed; architecture contract, not implementation authorization.
Baseline: Task 001 merged; Node 24, pnpm 11.25.0, React 19/Vite/Tailwind v4, Fastify, PostgreSQL 17 (local), strict TypeScript. Preserve existing modules and scripts; no Bun migration.

## Objective and constraints
Reusable, secure, multi-tenant and multi-workspace B2B agentic SaaS, modular TypeScript monolith. YAGNI, reuse, minimal diffs, few dependencies, explicit security boundaries. Existing `apps/web`, `apps/api`, `packages/shared` are the baseline, not a mandate to scaffold empty packages.

## Domain and security
- Organization = Tenant: isolation boundary; Workspace: tenant-scoped collaboration; User: identity; Membership: tenant/workspace association. A standard user belongs to at most one tenant initially; a tenant can contain multiple workspaces. Customer and Subscription remain deferred.
- Workspace visibility configurable per workspace; tenant admin access across their tenant's workspaces subject to audited authorization policy.
- Only Platform Super Admin creates tenants. No public tenant self-provisioning.
- Platform Super Admin is independent of tenant memberships and has persistent cross-tenant authorization, explicitly enforced and audited. This is not temporary impersonation or a database superuser; ordinary tenant sessions cannot acquire that authority. Supersedes the earlier temporary-support-only proposal, per owner arbitration.
- Managed authentication with Clerk for Task 002; application RBAC and memberships remain in PostgreSQL. SSO/SAML and enterprise provisioning remain deferred. See ADR-003.
- Establish actor, tenant and workspace context server-side; never trust tenant IDs supplied by clients. Authorize at API/service boundaries and in database.
- PostgreSQL RLS with least-privilege runtime roles, transaction-scoped tenant context, fail-closed policies and adversarial read/write tests. No superuser for application queries. Prevent cross-tenant access through jobs, cache, files, search, tools and agent context.

## Agentic runtime (deferred until concrete use case)
- OpenAI Agents SDK TypeScript behind a small adapter; never allow model-generated instructions to bypass authorization.
- Typed Tool Registry: input/output schemas, tenant/workspace scope, permission, risk, timeout, idempotency, audit, optional HITL.
- Context engine: provenance, data minimization, explicit trust boundaries, prompt-injection resilience.
- Durable jobs and transactional outbox; retries, idempotency, cancellation, recovery and dead-letter handling where justified. Temporal only after demonstrated need.
- HITL approval bound to exact operation, parameters, actor, scope and resource version; reauthorize on execution.
- Observability with redacted logs/traces, execution budgets, evaluations and deterministic authorization tests.

## UI contract
- Premium, calm, minimal interface inspired by Linear/Pigment; progressive disclosure, minimal explanatory prose, no decorative icons.
- Shared primitives when reuse is real; domain components stay near their modules. Contextual tooltips on important controls.
- Workspace-specific pastel gradient only as subtle fading background at top of workspace pages. Never replace semantic status colors. Neutral Platform Admin.
- Accessible keyboard navigation, contrast, responsive layouts and WCAG 2.2 AA target. See `DESIGN.md`.

## Responsive design and internationalization (mandatory)
- Every application surface, including tenant workspaces and platform administration, must support mobile, tablet and desktop without horizontal page overflow or loss of critical actions. Mobile-first layouts, adaptive navigation, touch targets and responsive tables/charts are required; use progressive disclosure rather than squeezing dense desktop UI.
- Supported UI locales at launch: French (`fr`, default) and English (`en`). Default to French when no saved preference exists; users can explicitly switch language. Persist a user's preference when identity/settings storage exists, otherwise use local preference. Do not infer authorization or tenant from locale.
- All user-facing copy, navigation, forms, validation, errors, empty states, tooltips, notifications and accessibility labels must be translatable. Use message keys and locale dictionaries, not hard-coded UI strings. Keep API error codes stable and localize presentation at the client.
- Format dates, numbers, currencies and plural forms with locale-aware standards (`Intl`); avoid concatenating translated fragments. Translation structure must allow additional languages without changing feature logic.
- Locale switching must not lose form state or navigation context. Ensure HTML `lang` reflects the active locale.
- Add tests for both locales, fallback behavior and responsive critical journeys; no new i18n dependency until justified by the first implementation slice.

## Engineering and delivery
- Strict TypeScript, no explicit `any`, typed lint safety checks as codebase matures. Maintain CI: frozen install, typecheck, lint, unit/integration, builds, HTTP smoke, Playwright, PostgreSQL.
- Portable `AGENTS.md` map, concise docs and on-demand `.agents/skills`. No duplicate rule manuals. Reviewable branches/PRs; never auto-merge.
- Local fictitious deterministic multi-tenant seeds; ignored local data; reproducible build artifacts, migrations, restore drills and secret hygiene before production.
- Security, resilience, privacy lifecycle, rate limiting and deployment hardening are release gates, not properties of the bootstrap.

## Contract roadmap
Delivery task IDs match files: Task 001 bootstrap (`001-bootstrap.md`); Task 002 IAM plus tenant/workspace isolation (`002-iam-tenant-isolation.md`).
Future capability themes are unnumbered until specified: agent runtime, tools, context, durable workflows, HITL, subscriptions/metering, shared UI, local development, migrations/backup, observability, privacy, CI/CD, strict typing, coding harness and evaluations.

## Decision status
Accepted: modular monolith, React/Fastify/pnpm existing stack, PostgreSQL, tenant isolation by RLS plus service authorization, shared UI policy, OpenAI Agents SDK as future adapter.
Task 002 identity decision: Clerk managed authentication (ADR-003); production instance configuration and enterprise SSO remain to be configured/decided.
Open ADRs: production hosting; deployment/promotion strategy; SLA/RPO/RTO. Do not assume a cloud provider.
No Convex adoption or dual database. No premature Kafka/Kubernetes/microservices/Temporal.

## Implementation sequencing
Wave 0 completed: Task 001 bootstrap.
Wave 1 proposed: Task 002 IAM, tenant/workspace model, authorization, database isolation and adversarial tests.
Wave 2: design system and tenant-aware product foundations.
Wave 3: first real business workflow and agent/tool/HITL slice.
Wave 4: hardening, observability, metering, deployment and resilience.

## Acceptance for this document PR
Documentation only; no runtime/dependency/schema changes. Review SDD-002 before authorizing implementation. Existing ADR-001 remains the historical Task 001 decision; this document governs intended evolution.
