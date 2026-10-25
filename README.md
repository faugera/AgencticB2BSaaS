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
needed. It uses SIGTERM on POSIX and an IPC disconnect on Windows, both handled
by the API's graceful shutdown path. Use `SMOKE_PORT=3100 pnpm smoke` if port 3099 is busy.
Playwright starts the built frontend preview on port 4173 and checks navigation
and overflow on desktop and mobile. Vitest tests run without Docker or secrets.

The browser suite contains 72 behavioral checks. Cosmetic pixel/font/color tests
and repeated theme/viewport matrices were removed; FR/EN, desktop/mobile, keyboard
access, permissions and business regressions remain covered. See
[test coverage and reduction](docs/testing.md). Database/security/live-auth gates
are separate and unchanged.

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
`pnpm auth:migrate` and `pnpm dev`. Open `/login` for users or `/admin/login`
for super-admins. `/admin` requires a persisted super-admin role; public registration is disabled.
For an explicitly provisioned local test administrator, an ignored
`apps/web/.env.local` may define `VITE_LOCAL_TEST_ADMIN_HANDLE`,
`VITE_LOCAL_TEST_ADMIN_EMAIL` and `VITE_LOCAL_TEST_ADMIN_PASSWORD`. The admin
sign-in page displays them only in Vite development mode on loopback hosts;
they are excluded from the production UI. Use synthetic test credentials only.
Legacy `/auth` and `/auth/reset` links remain supported.

`pnpm auth:invite <email> <display-name>` creates an identity invitation only;
it does not grant platform-admin or tenant access. `operator:identity` and
`operator:bootstrap` explicitly bind a verified identity to the initial platform
role. No default administrator/password is provided. See
[ADR-005](docs/architecture/0005-private-pilot.md) for precise RLS boundaries.

CI additionally runs `pnpm verify:security`, `pnpm verify:tenant-isolation` and
`pnpm test:auth:e2e` against disposable PostgreSQL/Mailpit. These gates fail rather
than skip when required test infrastructure is missing. See the runbook for variables.

## Documentation et Spec Kit

- [Architecture](docs/architecture.md), [modèle](docs/data-model.md),
  [capacités](docs/features-b2b.md) et [carte produit](.specs/domains/product-map.md).
- [Constitution](.specify/memory/constitution.md) et [guide Spec Kit](docs/setup/spec-kit.md).
  Codex et Claude utilisent les intégrations officielles 1.2.3. Spec/plan/tâches obligatoires
  pour tout changement ; tests proportionnés. Contrôles : pnpm docs:test et pnpm docs:check.
- Charger les [standards pertinents](.specs/standards/index.yml) et analyser le
  [routage documentaire](.specs/standards/doc-sync-map.yml). Les anciens dossiers sont
  conservés avec un [registre de réconciliation](docs/sdd/legacy-reconciliation.md).

Environment ownership remains split: root `.env.example` is for Compose;
`apps/api/.env.example` documents runtime auth/SMTP, and
`apps/api/migration.env.example` is operator-only. Never copy operator credentials
into runtime or frontend configuration. Examples are not deployment credentials.

### Demandes d'accès et profils

Un tenant-admin obtient un lien `/signup?link=…` depuis `/app/invitations`, le partage
aux candidats puis traite les demandes de son organisation sur cette même page.
La demande ne crée aucun compte : une approbation envoie une invitation existante.
Les pages `/app/members`, `/app/profile` et `/admin/profile` complètent la navigation.
`/docs` est réservé aux super-admins, y compris son API de contenu.
Les migrations 0008 et 0012 accompagnent ce parcours ; voir le registre de réconciliation
pour les preuves historiques. Aucune application à la DB courante n’est déduite.

### Design system Brume

La charte active est [DESIGN_UI.md](DESIGN_UI.md). La galerie interactive se trouve
dans `/docs`, onglet « Design system », accessible aux super-admins. Les préférences
langue/thème sont liées au compte ; l'apparence d'un workspace est personnalisable
par ses gestionnaires via une palette ou une couleur hexadécimale. La migration
0009 est requise ; voir le registre de réconciliation pour les preuves et limites.
La page marketing conserve son identité. Aucune notification ou capacité IA fictive
n'est ajoutée à l'application.

### Modèle B2B organisation/tenant

Une organisation représente un client et possède plusieurs tenants, chacun avec ses
workspaces. Un utilisateur ordinaire reste dans un seul client et reçoit explicitement
ses tenants. Catalogue global de rôles cumulables, édition super-admin et gestion
strictement descendante dans chaque portée. Seul un membership active autorise l’accès.
Mon profil complète prénom/nom et préférences, sans onboarding obligatoire ; les noms
inconnus restent null jusqu’à l’enregistrement complet. Le journal courant est
/api/audit-logs, avec accès client autorisé et événements plateforme super-admin seuls.

Avant pnpm auth:migrate (0013–0015), consulter le [runbook](docs/setup/private-pilot.md)
et éprouver une copie isolée : billing_email doit provenir d’un admin/invité admissible,
sinon la migration échoue atomiquement. Aucun ancien SQL ne doit être réécrit.
Test de reprise : AUTH_TEST_MIGRATION_PRESERVATION=true avec AUTH_TEST_DATABASE_URL et
AUTH_TEST_MIGRATION_DATABASE_URL pointant vers une base vide dédiée nommée
enterprise_auth_test_b2b_migration, puis pnpm exec vitest run --config vitest.auth.config.ts
apps/api/src/business/migration-preservation.integration.test.ts.
[Contrat et preuves](specs/002-b2b-organizations-rbac/quickstart.md).
