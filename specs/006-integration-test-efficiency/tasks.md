# Tâches : Exécutions d'intégration essentielles

**Input**: Documents de conception dans `specs/006-integration-test-efficiency/`

**Prérequis**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`quickstart.md`

## Phase 1 : Préparation

Le dépôt possède déjà Vitest, les scripts d'intégration et la CI. Aucun outil ni
service supplémentaire n'est requis.

## Phase 2 : Fondations

Aucune fondation bloquante à ajouter. Les bases PostgreSQL et Mailpit restent
éphémères et leurs contrôles existants ne sont pas modifiés.

## Phase 3 : User Story 1 - Éviter les intégrations répétées (Priority: P1)

**But** : exécuter une seule fois la suite d'isolation par validation CI, en gardant
son étape dédiée.

**Test indépendant** : un test de contrat vérifie que la porte sécurité exclut
uniquement l'isolation, que la porte dédiée reste présente et que la commande
complète ne filtre aucun fichier.

### Tests

- [x] T001 [US1] Ajouter un test de contrat vérifiant les scripts d'intégration et
  les commandes CI dans `apps/api/src/ci-test-selection.test.ts`

### Implémentation

- [x] T002 [US1] Ajouter `test:auth:core` qui exclut uniquement
  `apps/api/src/business/isolation.integration.test.ts`, puis le faire utiliser
  par `verify:security` sans modifier `test:auth` dans `package.json`

## Phase 4 : User Story 2 - Préserver les preuves essentielles (Priority: P1)

**But** : expliquer les niveaux de sélection sans retirer de couverture sécurité.

**Test indépendant** : comparer le contenu de la commande complète, le gate ciblé,
le workflow CI et les commandes documentées.

### Documentation et validation

- [x] T003 [US2] Décrire la suite complète, la suite sécurité ciblée et l'unique
  exécution CI de l'isolation dans `docs/testing.md` et
  `.specs/standards/architecture-stack.md`
- [x] T004 [US2] Exécuter `pnpm test -- apps/api/src/ci-test-selection.test.ts`,
  `pnpm lint`, `pnpm typecheck`, `pnpm docs:test` et `pnpm docs:check` ; PostgreSQL
  réel `NOT_RUN` faute de bases jetables configurées

## Dépendances et ordre d'exécution

- T001 précède T002 : le contrat de sélection doit échouer avant l'ajustement.
- T003 suit T002 pour décrire le comportement effectivement configuré.
- T004 valide tous les changements ; aucun test PostgreSQL destructif n'est lancé
  sans base jetable explicitement configurée.

## Possibilités de parallélisme

- T001 et T003 portent sur des fichiers distincts mais T003 décrit un comportement
  qui dépend de T002 ; ils ne sont donc pas indépendants en pratique.
- T004 dépend de toutes les modifications.
- Aucune suite complète d'intégration n'est relancée pour valider la sélection.

## Stratégie MVP

Terminer T001 et T002 pour retirer l'exécution redondante sans supprimer de
scénario. Terminer ensuite la documentation et les contrôles ciblés.

## Validation du format

Chaque tâche comporte une case, un identifiant séquentiel, une histoire utilisateur
et un chemin de fichier ou une commande.
