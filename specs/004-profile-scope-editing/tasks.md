# Tâches : Édition sûre du profil par tenant

**Input**: Documents de conception dans `specs/004-profile-scope-editing/`

**Prérequis**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md`

## Phase 1 : Préparation

**But** : réutiliser l'application et ses contrôles existants.

Aucune initialisation, dépendance ou infrastructure n'est requise. L'API profil,
la transaction tenant-scopée, les préférences et la gestion des sessions existent.

## Phase 2 : Fondations

**But** : confirmer que les droits restent établis par le serveur.

Aucun middleware ou changement de schéma n'est ajouté. Les vérifications existantes
des routes, de la transaction métier et de l'intégration PostgreSQL restent la preuve
de l'autorisation.

## Phase 3 : User Story 1 - Modifier son profil (Priority: P1)

**But** : conserver les champs éditables et leurs règles cohérentes entre formulaire et API.

**Test indépendant** : les champs autorisés sont persistés sur le compte ou la membership
courante ; les propriétés réservées et les URLs trop longues sont refusées.

### Tests

- [x] T001 [US1] Ajouter un cas de test refusant un `avatar_url` de plus de 2048 caractères dans `apps/api/src/business/profile-dto.test.ts`

### Implémentation

- [x] T002 [US1] Limiter `avatar_url` à 2048 caractères dans `apps/api/src/business/profile-dto.ts`
- [x] T003 [US1] Aligner la longueur de poste sur 120 caractères et celle d'avatar sur 2048 caractères dans `apps/web/src/pages/ProfileDetailsForm.tsx`

## Phase 4 : User Story 2 - Changer de tenant sur le profil (Priority: P1)

**But** : invalider l'état de formulaire et les annonces de l'ancienne portée lors d'un changement de tenant.

**Test indépendant** : changer de tenant pendant un chargement ou une soumission et
vérifier que l'ancien profil ne s'affiche plus, n'est pas envoyé, ne produit pas de
confirmation dans la nouvelle portée, et que le focus reste prévisible.

### Tests

- [x] T004 [US2] Ajouter un scénario Playwright de changement de tenant, réponses retardées et focus clavier dans `tests/e2e/frontend-pages.spec.ts`

### Implémentation

- [x] T005 [US2] Lier le profil et les écritures à la query active, masquer les anciennes données et préserver le focus lors du chargement dans `apps/web/src/pages/ProfileDetailsForm.tsx`
- [x] T006 [US2] Maintenir une annonce de chargement/enregistrement/résultat localisée dans `apps/web/src/pages/b2b-messages.ts`

## Phase 5 : Vérification et synchronisation

**But** : produire les preuves ciblées et contrôler les artefacts.

- [x] T007 Exécuter les tests DTO et routes profil ciblés dans `apps/api/src/business/profile-dto.test.ts` et `apps/api/src/business/profile-routes.test.ts`
- [x] T008 Vérifier `AUTH_TEST_DATABASE_URL` et `AUTH_TEST_MIGRATION_DATABASE_URL` ; l'intégration `apps/api/src/business/b2b-http.integration.test.ts` est `NOT_RUN` (variables PostgreSQL jetables absentes)
- [x] T009 Exécuter `pnpm test:e2e -- tests/e2e/frontend-pages.spec.ts --headed`
- [x] T010 Exécuter `pnpm verify`, `pnpm docs:test` et `pnpm docs:check`

## Dépendances et ordre d'exécution

- T001 précède T002 ; T003 est indépendant de T001/T002 mais appartient au même contrat de champs.
- T004 précède T005 ; les changements UI ne commencent qu'après l'examen accessibilité.
- T007 à T010 suivent les changements API et UI ; le contrôle PostgreSQL requiert une base jetable explicitement configurée.
- Aucune histoire n'exige de nouvelle migration ni de permission.

## Possibilités de parallélisme

- T001 et T003 portent sur des fichiers différents, mais T003 attend la revue accessibilité ; ils peuvent ensuite être préparés indépendamment.
- T004 et T005 touchent des fichiers différents, mais T005 suit la définition du texte d'annonce retenu.
- Les tests et l'implémentation ne sont pas parallèles dans une histoire afin de conserver l'ordre test d'abord.

## Stratégie MVP

La User Story 2 est le correctif prioritaire, avec son scénario de changement de tenant.
La User Story 1 conserve les routes de profil en place et aligne les limites de validation.
Les deux histoires sont vérifiées ensemble avant les contrôles généraux.

## Validation du format

Chaque tâche dispose d'une case, d'un identifiant séquentiel, d'un libellé d'histoire
quand il s'agit d'une histoire utilisateur, et d'un chemin de fichier ou d'une commande.
