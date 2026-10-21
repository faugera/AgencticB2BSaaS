# Task 001 — Enterprise AI OS bootstrap

## Scope

Create a minimal, testable monorepo with a presentational frontend, Fastify health
endpoint, local PostgreSQL configuration, portable agent guidance, and CI.

## Acceptance

- Node 24 LTS / pnpm workspaces install and run both apps.
- React 19 + Tailwind v4 page is responsive and its navigation works.
- GET /health returns HTTP 200 JSON `{"status":"ok"}`, without database access.
- Typecheck, real ESLint rules, Vitest, production build, HTTP smoke and Playwright
  are executable and represented in CI.
- Compose PostgreSQL requires an uncommitted password and loopback binding.
- AGENTS.md maps repository/commands/invariants/security/gates/skills/DoD.
- Dedicated branch and PR are created; no automatic merge.

## Exclusions

IAM, tenant CRUD, AI execution, workflows, business portals, production
infrastructure and database persistence.

## Verification record

See `docs/architecture/bootstrap-verification.md`. A blocked check is not a pass.
