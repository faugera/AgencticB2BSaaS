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
