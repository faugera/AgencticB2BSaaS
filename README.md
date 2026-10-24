# AgencticB2BSaaS

Enterprise AI OS: a TypeScript modular monolith for a private B2B pilot with
invitation-only Better Auth, optional TOTP, server-authorized organizations and
private workspaces. React/Vite, Fastify, PostgreSQL; no external auth CLI.
Follow [the private pilot runbook](docs/setup/private-pilot.md) for the complete
setup, verified super-admin bootstrap, SMTP, recovery and deployment prerequisites.

## Local setup

Use Node **24 LTS** (`.node-version`) and **pnpm 11.25.0**.
Install the pinned pnpm version via your Node/package-manager setup, then:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Set POSTGRES_PASSWORD in .env to a locally generated password.
pnpm db:up
pnpm dev
```

Open http://127.0.0.1:5173 and http://127.0.0.1:3000/health.
PostgreSQL is optional for this bootstrap: neither the page nor liveness depends
on it. `pnpm db:up` needs Docker with Compose v2. PostgreSQL binds only to
loopback; use a unique local password. Authentication/business features require
private API configuration, explicit `pnpm db:provision` and `pnpm auth:migrate`.
`pnpm db:down` preserves its named data volume.

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

The pilot is single-instance, with synchronous, retryable invitation mail and
optional MFA even for super-admin. Hosting, SMTP sender, encrypted backups and
branch protection still require operator configuration. SSO/SCIM, billing, agents,
workflows and high availability are deferred. The OpenAI Agents SDK adapter will be added with the
first concrete agent use case. No API key or provider dependency is needed now.

Direct dependency versions and transitive resolution are pinned in
`pnpm-lock.yaml`. Use frozen installs locally and in CI. Dependency build scripts
are denied except esbuild, which is explicitly allowed in the workspace config.

## Authentication

Better Auth replaces the former managed-provider proposal. See
[the setup guide](docs/setup/better-auth.md) for PostgreSQL, local Mailpit email,
operator invitations and Codespaces ports. Start with `pnpm auth:services`, then
configure private API environment files, run `pnpm db:provision`,
`pnpm auth:migrate` and `pnpm dev`. Open `/login`; public registration is disabled.
Legacy `/auth` and `/auth/reset` links remain supported.

`pnpm auth:invite <email> <display-name>` creates an identity invitation only;
it does not grant platform-admin or tenant access. `operator:identity` and
`operator:bootstrap` explicitly bind a verified identity to the initial platform
role. No default administrator/password is provided. See
[ADR-005](docs/architecture/0005-private-pilot.md) for precise RLS boundaries.

CI additionally runs `pnpm verify:security`, `pnpm verify:tenant-isolation` and
`pnpm test:auth:e2e` against disposable PostgreSQL/Mailpit. These gates fail rather
than skip when required test infrastructure is missing. See the runbook for variables.

## Documentation and declarative SDD

- [Architecture and API flows](docs/architecture.md),
  [data model](docs/data-model.md), [B2B capabilities and permissions](docs/features-b2b.md).
- [Product map](.specs/domains/product-map.md) separates observed implementation,
  partial features and plans; older task specs remain in `docs/sdd/`.
- Before changes, read [the standards index](.specs/standards/index.yml) and load
  only relevant standards. Analyze [documentation routing](.specs/standards/doc-sync-map.yml)
  for every change, including small direct fixes.
- For business features, contract or security changes: `$sdd-shape` creates a
  dated delta from [the templates](.specs/changes/_template/spec.md),
  `$sdd-implement` implements and updates docs, `$sdd-verify` records evidence,
  `$sdd-archive` consolidates verified work. `$sdd-discover` maintains recurring standards.
- [The workflow contract](.specs/standards/workflow.md) defines states, recovery,
  evidence and the direct path. This is a Codex execution contract, with no added
  SDD CLI, orchestration script or automated CI enforcement.

Environment ownership remains split: root `.env.example` is for Compose;
`apps/api/.env.example` documents runtime auth/SMTP, and
`apps/api/migration.env.example` is operator-only. Never copy operator credentials
into runtime or frontend configuration. Examples are not deployment credentials.
