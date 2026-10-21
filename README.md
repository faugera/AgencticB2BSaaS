# AgencticB2BSaaS

Enterprise AI OS foundation: a small TypeScript modular monolith. The current UI
is a presentational foundation page; the API exposes only `GET /health`.

## Local setup

Use Node **24 LTS** (`.node-version`) and **pnpm 11.25.0**.
Install the pinned pnpm version via your Node/package-manager setup, then:

```sh
pnpm install --no-frozen-lockfile
cp .env.example .env
# Set POSTGRES_PASSWORD in .env to a locally generated password.
pnpm db:up
pnpm dev
```

Open http://127.0.0.1:5173 and http://127.0.0.1:3000/health.
PostgreSQL is optional for this bootstrap: neither the page nor liveness depends
on it. `pnpm db:up` needs Docker with Compose v2. PostgreSQL binds only to
loopback; use a unique local password. No database driver, schema, migration,
or query exists yet. `pnpm db:down` preserves its named data volume.

The root `.env` configures Docker Compose only. The API reads `HOST` and `PORT`
from its process environment, with defaults `127.0.0.1:3000`. For example:
`PORT=3001 pnpm --filter @enterprise/api dev`.
Containers must explicitly set `HOST=0.0.0.0`.

## Verification

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm smoke
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

`pnpm verify` runs the first five gates. Smoke starts the compiled API, verifies
real HTTP liveness and graceful shutdown, then stops it; no existing server is
needed. Use `SMOKE_PORT=3100 pnpm smoke` if port 3099 is busy.
Playwright starts the built frontend preview on port 4173 and checks navigation
and overflow on desktop and mobile. Vitest tests run without Docker or secrets.

Production entrypoints after `pnpm build`:
`pnpm --filter @enterprise/api start` and `apps/web/dist` for static hosting.
`vite preview` is only for local verification, not production hosting.

## Layout

```text
apps/
  api/                 Fastify server, configuration, HTTP tests
  web/                 React 19 + Vite + Tailwind v4
packages/shared/       Type-only HTTP contracts
scripts/smoke.mjs      Built API smoke check
tests/e2e/             Playwright browser checks
docs/architecture/     Decisions and unresolved questions
docs/sdd/              Task specification
.agents/skills/        Portable coding-agent guidance
.github/workflows/    CI gates
```

Read [AGENTS.md](AGENTS.md) for agent navigation and
[ADR-001](docs/architecture/0001-foundation.md) for architecture and security.
Claude Code's `CLAUDE.md` points to the same instructions.

## Current limits

IAM, tenant management, agents, workflows, database access, and business portals
are intentionally deferred. The OpenAI Agents SDK adapter will be added with the
first concrete agent use case. No API key or provider dependency is needed now.

Direct dependency versions are pinned. A dependency lockfile still needs to be
generated and committed after a successful registry connection; until then,
transitive dependency resolution is not frozen and CI installs with
`--no-frozen-lockfile`. The bootstrap verification record documents this gap.
