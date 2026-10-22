# Repository map

- `apps/web`: React/Vite UI; `apps/api`: Fastify API.
- `packages/shared`: type-only public contracts.
- `docs/architecture`: decisions, security boundaries, open questions.
- `docs/sdd`: scope and acceptance criteria.
- `.agents/skills/*/SKILL.md`: discover task-specific instructions here.

## Commands

Node 24 LTS + pnpm 11.25.0. `pnpm install`, `pnpm dev`.
Gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`,
`pnpm smoke` (starts the built API), `pnpm test:e2e` (after build).
Local PostgreSQL: `pnpm db:up` / `pnpm db:down`. See README for setup.

## Invariants and security

Keep the modular monolith and minimal dependencies. Shared contracts contain no
business logic. Add boundaries only for concrete needs. Never expose secrets to
the browser, commit credentials, log sensitive payloads, or trust client tenant IDs.
Future tenant data requires server-established tenant context and database
isolation tests before release. See `docs/architecture/0001-foundation.md`.

## Definition of Done

Implement only the agreed scope. Run relevant gates and report failures honestly.
Update affected contracts/docs/tests. Review the diff for secrets and unnecessary
dependencies. Use a dedicated branch and reviewable PR; never merge automatically.

## Specification navigation
- Foundation and delivery sequence: `docs/sdd/000-foundation-v1.3.md`.
- Next proposed implementation scope (not yet authorized): `docs/sdd/002-iam-tenant-isolation.md`.
- Proposed coding-agent contract: `docs/architecture/0002-codex-harness.md`.
- Proposed shared design contract: `DESIGN.md`.
- Accepted Task 002 IAM arbitrations and managed identity: `docs/architecture/0003-managed-identity.md`.
- Task 002 delivery plan: `docs/sdd/002-implementation-plan.md`.
Proposed contracts do not become binding merely by being linked here; their
repository-wide activation requires approval of this documentation PR.
Read only the documents relevant to the current task; preserve pnpm and the existing stack.

## UX delivery invariants
All new UI must be responsive on mobile, tablet and desktop, with no page-level
horizontal overflow. French (`fr`) is the default locale and English (`en`)
must be supported. Use translation keys for user-facing text, accessible labels
and errors; locale-aware `Intl` formatting. Use `DESIGN.md` as the proposed visual direction and verify
critical paths in both locales and representative viewports.

## Codex execution
Inspect before editing; optimize for the requested outcome and minimal diff.
Autonomously run safe local verification. Seek approval before destructive or
structural out-of-scope changes. For long tasks, retain concise checkpoints.
Use parallel work only when independent. Report actual tests, skipped checks
and residual risks. Do not merge or deploy automatically.
