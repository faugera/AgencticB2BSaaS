# ADR-001: minimal modular monolith

Status: accepted for Task 001.

## Decision

Use Node 24 LTS, strict TypeScript, pnpm workspaces, React 19/Vite/Tailwind v4,
Fastify, and PostgreSQL 17 for local development. Deploy the web build as static
assets and the API as one Node process. No hosting provider is selected.

Keep exactly two apps and one type-only shared package. The health response is
the first real shared contract. Fastify construction is separate from its
process entrypoint to enable HTTP injection tests. No service layer, database
repository, domain package, queue, event bus, or speculative adapter is warranted.

Vitest covers the HTTP/config boundary; the smoke script exercises built output
over HTTP and process shutdown. Playwright checks the built UI on two viewports.
ESLint checks JS/TS and React hook rules; TypeScript checks all app and test configs.

## Security and tenant invariants

- API binds to loopback unless explicitly configured; trustProxy is off.
- No CORS plugin or broad cross-origin permissions. The current UI calls no API.
  Decide same-origin routing before adding authenticated browser requests.
- PostgreSQL binds to loopback, persists locally, and requires a local password.
  The Compose superuser is development-only; production needs least-privilege roles.
- Health is **liveness**, never a claim of database/provider readiness.
- No tenant records exist. Before the first tenant feature, establish tenant
  context from authenticated server-side identity, scope every operation, and
  test cross-tenant reads/writes. Client-provided tenant IDs are not authority.
- Keep credentials in runtime secret stores. Never use VITE_* for private keys,
  log request bodies or authorization headers, or include credentials in URLs.
- The skeleton is production-oriented, not certified production-ready:
  IAM, authorization, threat modeling and deployment hardening are future gates.

## Deferred decisions

1. Identity provider, session model, tenant resolution, authorization.
2. PostgreSQL migrations/query tooling and RLS versus other isolation mechanisms;
   choose with the first persisted tenant use case and adversarial tests.
3. OpenAI Agents SDK behind one lightweight provider adapter when agent execution
   is specified; choose timeouts, budgets, evaluation, and redaction at that point.
4. Production hosting, TLS/proxy trust, observability, rate limiting, readiness,
   backups and recovery objectives.
5. Domain modules when business behavior warrants them. No microservices,
   event sourcing, Temporal, or additional packages without measured need.
6. Automated dependency update cadence and vulnerability response ownership.

## Tradeoffs

Pinned direct dependencies and a committed lockfile freeze dependency resolution.
Only esbuild's required installation script is allowed. The foundation page describes principles rather
than presenting simulated tenants, fake metrics, or unfinished product actions.
Database connectivity is deferred to avoid an unused driver and connection layer.
