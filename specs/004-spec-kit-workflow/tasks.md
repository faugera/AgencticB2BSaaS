# Tasks: Fiabilisation du workflow Spec Kit

## Phase 1: Setup

- [x] T001 Vérifier les commandes et les contraintes de contrôle du dépôt dans `package.json`, `.github/workflows/ci.yml` et `docs/setup/spec-kit.md`.

## Phase 2: Analyse avant implémentation

- [x] T013 Analyser `specs/004-spec-kit-workflow/spec.md`, `specs/004-spec-kit-workflow/plan.md` et `specs/004-spec-kit-workflow/tasks.md` avec `speckit-analyze`; résoudre les constats bloquants avant tout travail d'implémentation.

## Phase 3: Fondations des contrôles

- [x] T002 Ajouter dans `scripts/docs-check.mjs` un contrôle limité du workflow Spec Kit, de la version de `.specify/workflows/workflow-registry.json` et de la parité des deux skills projet, avec erreurs explicites.
- [x] T003 [P] Préparer dans `scripts/docs-check.test.mjs` les fixtures réutilisables du workflow conforme et des variantes régressives.

## Phase 4: User Story 1 - Cycle Spec Kit complet (Priority: P1)

**Goal**: Le cycle conduit les artefacts de la spécification à la convergence et bloque l'implémentation tant que l'analyse n'est pas approuvée.

**Independent Test**: Le contrôleur accepte un cycle conforme, rejette une étape manquante ou inversée, et refuse le cycle quand l'approbation avant implémentation manque.

- [x] T004 [US1] Compléter les étapes et portes de revue de `.specify/workflows/speckit/workflow.yml` et synchroniser `.specify/workflows/workflow-registry.json` selon `specs/004-spec-kit-workflow/spec.md`, sans syntaxe conditionnelle non documentée.
- [x] T005 [US1] Couvrir dans `scripts/docs-check.test.mjs` l'ordre des étapes, les portes avec rejet, la barrière d'approbation et l'absence de commandes de merge/deploy.

## Phase 5: User Story 2 - Sélection explicite de la feature (Priority: P1)

**Goal**: Un checkout neuf résout la feature désignée sans choisir silencieusement une autre spec ni écrire un pointeur en mode lecture seule.

**Independent Test**: Résoudre `specs/004-spec-kit-workflow` via `SPECIFY_FEATURE_DIRECTORY` avec `SPECIFY_FEATURE_NO_PERSIST=true`, vérifier les chemins absolus et confirmer qu'aucun pointeur n'est créé ou modifié.

- [x] T006 [US2] Documenter dans `docs/setup/spec-kit.md` la sélection, la vérification et le changement de feature, `SPECIFY_FEATURE_NO_PERSIST`, ainsi que la distinction entre statut historique d'une spec livrée et état opérationnel courant.
- [x] T007 [US2] Ajouter dans `scripts/docs-check.test.mjs` un test non destructif de résolution explicite du pointeur et vérifier le comportement du prérequis sous Git Bash.

## Phase 6: User Story 3 - Skills projet dans les deux intégrations (Priority: P2)

**Goal**: Codex et Claude disposent des mêmes consignes projet sans changement des skills officiels managés.

**Independent Test**: Vérifier l'existence et l'égalité octet par octet des deux skills projet et valider les manifestes officiels.

- [x] T008 [P] Ajouter `tenant-boundary` et `verify-change` dans `.claude/skills/` comme copies exactes des sources `.agents/skills/`.
- [x] T009 [US3] Mettre à jour le renvoi aux skills projet dans `CLAUDE.md` sans modifier les fichiers officiels Spec Kit.
- [x] T010 [US3] Faire échouer `scripts/docs-check.mjs` et ses tests si un skill projet est manquant ou différent entre `.agents/skills/` et `.claude/skills/`.

## Phase 7: User Story 4 - Contrôle de régression CI (Priority: P2)

**Goal**: La CI expose et vérifie la conformité du workflow et des skills miroir.

**Independent Test**: `pnpm docs:test` couvre les cas conformes et régressifs, et `pnpm docs:check` exécute le contrôle sur le dépôt courant.

- [x] T011 [US4] Intégrer le contrôle de workflow à `docs:check` et les cas de régression à `docs:test` via les entrées existantes de `package.json`.
- [x] T012 [US4] Nommer explicitement les contrôles de gouvernance Spec Kit dans `.github/workflows/ci.yml` et vérifier qu'ils s'exécutent avant le build.

## Phase 8: Polish et vérification

- [x] T014 Exécuter `pnpm docs:test`, `pnpm docs:check` et `pnpm lint`, puis consigner les statuts et limites dans `specs/004-spec-kit-workflow/quickstart.md`.
- [x] T015 Vérifier les manifestes officiels Spec Kit et converger l'implémentation par rapport aux artefacts de `specs/004-spec-kit-workflow/`.

## Dependencies & Execution Order

- T013 analyse les artefacts produits et précède tout travail d'implémentation.
- T001 précède les changements ; T002, T003, T004, T006 et T008 dépendent de T001 et T013.
- T002 et T003 forment la fondation ; T003 peut être écrit en parallèle de T002 après les portes T001/T013, mais ses résultats se valident après le contrôle implémenté.
- T004 dépend de T001/T013 ; T005 dépend de T003 et T004.
- T006 et T008 peuvent avancer indépendamment après T001/T013. T007 dépend de T006.
- T009 dépend de T008. T010 dépend de T002, T003 et T008.
- T011 dépend de T002/T003 ; T012 dépend de T011.
- T014 et T015 ferment le périmètre après les modifications fonctionnelles/documentaires ; T015 suit les validations de T014.

## Independent Test Criteria

| Story | Preuve indépendante |
|---|---|
| US1 | Contrôle accepte l'ordre complet ; fixtures inversées ou sans approbation échouent avant `implement`. |
| US2 | Git Bash retourne les chemins absolus de la feature explicite sans création/modification de `.specify/feature.json`. |
| US3 | Les deux fichiers projet existent et leurs SHA256 sont identiques ; les manifestes officiels n'ont pas changé. |
| US4 | Les gates documentaires CI affichent et exécutent les tests de conformité. |

## Parallel Opportunities

- T002 et T003 peuvent être préparés ensemble ; validation complète après intégration.
- T006 et T008 sont indépendants.
- T004 et les tests T003 touchent des fichiers différents ; leurs modifications peuvent être préparées en parallèle, mais les validations restent ordonnées.

## MVP

La User Story 1 est le MVP : workflow ordonné avec portes de revue et approbation obligatoire après analyse, puis convergence et absence de merge/deploy. La sélection de feature et les skills miroir sont nécessaires à une adoption complète du dépôt.
