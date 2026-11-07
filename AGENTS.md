# Guide des agents

## Objectif et périmètre

AgencticB2BSaaS est un socle réutilisable pour créer des applications SaaS B2B :
monolithe modulaire, authentification, autorisation multi-tenant, sécurité, interface
et chaîne de vérification. Le code actuel constitue un pilote privé : comptes sur
invitation, MFA facultative, organisations clientes, tenants, workspaces, rôles
persistés et audit. Ce dépôt n’est ni une plateforme SaaS multi-instance certifiée
ni un runtime d’agents IA : paiement, SSO/SCIM, haute disponibilité et exécution IA
restent différés. Ne déduire aucun statut de production des seules sources du dépôt.

## Stack et architecture

- **Outils** : Node.js 24 LTS, pnpm 11.25.0, TypeScript strict.
- **Web** (`apps/web`) : React 19, Vite 7, React Router 7 et Tailwind CSS 4.
- **API** (`apps/api`) : Fastify 5, Better Auth et PostgreSQL 17 via `pg` ; pas d’ORM.
- **Contrats partagés** (`packages/shared`) : types TypeScript uniquement, sans logique métier.
- **Modules** : `apps/api/src/auth` porte l’identité et les sessions ; `apps/api/src/business`
  porte les opérations métier. `apps/web/src` contient l’application et ses composants.
- **Données** : SQL versionné dans `apps/api/migrations`. Les migrations déjà appliquées
  sont immuables ; provisioning des rôles et migrations sont des opérations opérateur
  distinctes. Les changements métier établissent leur autorisation côté serveur et
  conservent le contexte transactionnel tenant, RLS et audit.

Le détail des frontières et responsabilités est dans la [vue architecture](docs/architecture.md)
et le [standard architecture-stack](.specs/standards/architecture-stack.md).

## Commandes principales

Utiliser Node 24 et pnpm 11.25.0. Depuis la racine :

| Besoin | Commande | Conditions et portée |
|---|---|---|
| Installer | `pnpm install --frozen-lockfile` | Dépendances figées par le lockfile |
| Démarrer web et API | `pnpm dev` | Configuration locale ; les fonctions métier exigent les services privés |
| Démarrer / arrêter PostgreSQL | `pnpm db:up` / `pnpm db:down` | Docker Compose ; l’arrêt conserve le volume nommé |
| Vérifier le socle | `pnpm verify` | Types, lint, tests unitaires, build et smoke ; sans E2E ni base SQL |
| Tester le navigateur | `pnpm test:e2e` | Après `pnpm build`, Chromium installé |
| Vérifier la documentation | `pnpm docs:test` puis `pnpm docs:check` | Tests du vérificateur puis liens, structure et synchronisation |
| Vérifier sécurité et isolation | `pnpm verify:security` puis `pnpm verify:tenant-isolation` | PostgreSQL jetable et configuration dédiée ; accès réseau pour audit dépendances |
| Tester les parcours auth réels | `pnpm test:auth:e2e` | Après `pnpm build`, Chromium installé, PostgreSQL et Mailpit jetables configurés |
| Provisionner / migrer | `pnpm db:provision` puis `pnpm auth:migrate` | Opérateur uniquement ; suivre le runbook, jamais pour une vérification documentaire |

Les contrôles nécessitant des services qui ne sont pas explicitement configurés sont
`NOT_RUN`, jamais `PASS`. Les variables, la séparation des rôles SQL et les prérequis
de tests sont dans le [runbook pilote privé](docs/setup/private-pilot.md).

## Règles de contribution

### À faire

- Lire la [constitution](.specify/memory/constitution.md) et suivre le [workflow Spec Kit](docs/setup/spec-kit.md)
  pour toute évolution, documentation comprise : spec, plan, tâches, analyse, approbation,
  implémentation puis convergence.
- Inspecter l’existant, les appelants, les tests et l’état Git avant modification ;
  garder les changements ciblés et préserver le travail concurrent.
- Charger uniquement les [standards applicables](.specs/standards/index.yml) et analyser
  le [routage documentaire](.specs/standards/doc-sync-map.yml). Le standard B2B s’applique
  aux changements backend, données, base et IAM.
- Garder l’autorisation côté serveur, basée sur l’identité vérifiée et les permissions
  persistées. Préserver tenant, RLS, audit et suppression logique.
- Relier chaque contrôle à sa preuve et rapporter résultat, limites et infrastructure absente.
- Livrer sur une branche dédiée `codex/` avec une PR vers `main` ; laisser la fusion
  et le déploiement à une décision humaine.
- Rédiger les contenus du projet en français ; conserver en anglais les identifiants
  et fichiers générés officiels.

### À ne pas faire

- Ne jamais faire confiance au navigateur ou au modèle IA comme autorité d’autorisation ;
  ne pas exposer secrets, jetons ou données sensibles dans le client, les journaux ou les preuves.
- Ne pas modifier une migration SQL déjà appliquée, ni exécuter des tests destructifs
  sur une base de développement ou de production.
- Ne pas présenter une capacité planifiée, une preuve historique ou un contrôle non exécuté
  comme fonctionnalité actuelle ou garantie de production.
- Ne pas modifier les fichiers Spec Kit officiels gérés, réactiver les anciens workflows
  `sdd-*`, fusionner une PR ou déployer automatiquement.
- Ne pas élargir le périmètre sans approbation ; demander uniquement les arbitrages bloquants.

## Workflow Spec Kit

Utiliser les skills officiels dans l’ordre : `speckit-specify`, revue et approbation de la
spec, `speckit-clarify` si nécessaire puis revue des clarifications, `speckit-plan` puis
revue du plan, `speckit-checklist` si utile, `speckit-tasks` puis revue des tâches,
`speckit-analyze` puis revue de l’analyse et approbation explicite avant
`speckit-implement`, enfin `speckit-converge` puis revue de convergence. Les specs actives
sont dans `specs/`. Les anciens dossiers `.specs/changes` sont des archives ; ne pas les
réécrire pour une nouvelle évolution. Les skills projet `tenant-boundary` et
`verify-change` complètent le workflow. Voir le [parcours obligatoire détaillé](docs/setup/spec-kit.md).

## Références utiles

- [README et démarrage local](README.md)
- [Constitution commune](.specify/memory/constitution.md) et [guide Spec Kit](docs/setup/spec-kit.md)
- [Architecture](docs/architecture.md), [frontières du pilote](docs/architecture/0005-private-pilot.md)
  et [modèle de données](docs/data-model.md)
- [Capacités et permissions B2B](docs/features-b2b.md) et [carte produit](.specs/domains/product-map.md)
- [Runbook d’exploitation](docs/setup/private-pilot.md) et [couverture des tests](docs/testing.md)
- [Design system Brume](DESIGN_UI.md)
- [Standards](.specs/standards/index.yml) et [synchronisation documentaire](.specs/standards/doc-sync-map.yml)
- `CLAUDE.md` renvoie aux mêmes instructions ; les intégrations officielles Codex et Claude
  partagent la constitution.
