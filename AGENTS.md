# Contrat du dépôt

Lire la [constitution](.specify/memory/constitution.md) pour les principes et
[le workflow Spec Kit](docs/setup/spec-kit.md) avant toute évolution, même documentaire.
Inspecter avant édition ; modifications minimales, travail concurrent préservé.

## Navigation
- apps/web : React/Vite ; apps/api : Fastify ; packages/shared : types seuls.
- apps/api/migrations : SQL revu, immuable après application ; provisioning séparé.
- [Architecture](docs/architecture.md), [modèle](docs/data-model.md),
  [capacités](docs/features-b2b.md), [carte produit](.specs/domains/product-map.md).
- [Index des standards](.specs/standards/index.yml) : charger seulement les pertinents ;
  B2B obligatoire pour backend, DB et IAM. [Routage docs](.specs/standards/doc-sync-map.yml).
- [Brume](DESIGN_UI.md), [frontières pilote](docs/architecture/0005-private-pilot.md),
  [exploitation](docs/setup/private-pilot.md), [tests](docs/testing.md).
- specs : changements Spec Kit ; .specs/changes : historique figé,
  [réconciliation](docs/sdd/legacy-reconciliation.md). docs/sdd : vision et ancien IAM.

## Commandes
Node 24 LTS, pnpm 11.25.0. Installation : pnpm install --frozen-lockfile.
Développement : pnpm dev ; PostgreSQL local : pnpm db:up / pnpm db:down.
Gates : pnpm verify (types, lint, unitaires, build, smoke), pnpm test:e2e après build.
Docs : pnpm docs:test et pnpm docs:check. SQL/IAM : pnpm verify:security,
pnpm verify:tenant-isolation et pnpm test:auth:e2e avec PostgreSQL/Mailpit jetables
explicitement configurés. L'absence d'infrastructure est NOT_RUN, jamais PASS.

## Exécution
Les intégrations officielles Codex et Claude lisent la même constitution.
Utiliser speckit-specify, clarify si nécessaire, plan, checklist si utile, tasks,
analyze, implement et converge ; spec/plan/tasks obligatoires pour chaque changement.
Les skills projet tenant-boundary et verify-change complètent les gates.
Ne pas réactiver les anciens sdd-* ; ne pas modifier les fichiers officiels gérés.
Enchaîner dans le périmètre approuvé ; demander les seuls arbitrages bloquants.
Conserver contexte tenant serveur, RLS, audit et suppression logique ; MFA facultative V0.
Livraison par branche codex/ et PR vers main ; jamais de fusion ou déploiement automatique.
Rapporter contrôles exécutés, limites et risques. Écrire les contenus projet en français.
