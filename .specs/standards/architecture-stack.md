# Architecture et stack

Références factuelles : `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`,
`apps/api/package.json`, `apps/web/package.json`, `packages/shared/package.json`,
`compose.yaml`, `.github/workflows/ci.yml`.

- Node 24 LTS, pnpm 11.25.0, TypeScript strict, monolithe modulaire.
- `apps/web` : React 19, Vite 7, Tailwind 4, React Router 7 en mode bibliothèque.
- `apps/api` : Fastify 5, Better Auth 1.7.12, Nodemailer, accès PostgreSQL par `pg`.
- PostgreSQL 17 local et Mailpit via Compose. Aucun ORM ni queue identifié.
- `packages/shared/src/index.ts` : contrats de types uniquement, sans logique métier.
- `apps/api/src/app.ts` construit l'app ; `apps/api/src/server.ts` gère le processus.
- `apps/api/src/auth` et `apps/api/src/business` portent les modules existants.
  Réutiliser leurs fonctions ; ne pas ajouter de couche repository/service générique.
- SQL versionné dans `apps/api/migrations` ; opérateur explicite dans
  `apps/api/src/auth/migrate.ts`, provisioning distinct dans `apps/api/src/auth/provision.ts`.

## Commandes disponibles

| Usage | Commande exacte | Conditions |
| --- | --- | --- |
| Installation | `pnpm install --frozen-lockfile` | Uniquement si nécessaire et autorisé |
| Développement | `pnpm dev` | Config API privée pour auth/métier |
| Types / lint / unitaires | `pnpm typecheck`, `pnpm lint`, `pnpm test` | Vitest hors intégration DB |
| Build / smoke | `pnpm build`, `pnpm smoke` | Smoke nécessite le build |
| Vérification globale | `pnpm verify` | Types, lint, unitaires, build, smoke ; pas E2E/DB |
| E2E | `pnpm test:e2e` | Build et Chromium disponibles |
| Auth DB | `pnpm test:auth` | PostgreSQL jetable explicite |
| Sécurité | `pnpm verify:security` | Script sécurité, audit dépendances, auth DB ; accès réseau |
| Isolation | `pnpm verify:tenant-isolation` | PostgreSQL jetable explicite |
| Auth navigateur | `pnpm test:auth:e2e` | Build, PostgreSQL et Mailpit configurés |

`vitest.config.ts`, `vitest.auth.config.ts` et `playwright.config.ts` définissent
les périmètres. Les variables et commandes opérateur sont dans
`docs/setup/private-pilot.md` et `docs/setup/better-auth.md` ; ne jamais migrer une DB
pour une simple validation documentaire. Le contrôle documentaire est pnpm docs:check (structure et chemins, pas sémantique).
Les intégrations officielles Spec Kit 1.2.3 servent Codex et Claude ; voir docs/setup/spec-kit.md.
Aucune commande de déploiement global.
