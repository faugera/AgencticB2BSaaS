# Tasks: Déblocage de la PR 9

- [ ] T001 Vérifier la tête de la PR et les historiques de migrations pertinents avant toute correction dans `apps/api/migrations/`.
- [ ] T002 [US1] Reproduire et isoler le 429 dans `apps/api/src/business/review-role-http.integration.test.ts`, sans altérer la sécurité de production.
- [ ] T003 [US1] Rejouer la suite de rôles après les autres suites et deux fois sur PostgreSQL jetable ; consigner la preuve.
- [ ] T004 [US2] Ajouter la régression organisation supprimée et organisation active témoin dans `apps/api/src/business/review-repairs.integration.test.ts`.
- [ ] T005 [US2] Corriger la liste de `business.context()` par migration additive dans `apps/api/migrations/`, après vérification du numéro et des privilèges.
- [ ] T006 [US3] Synchroniser `docs/architecture.md`, `docs/architecture.html`, `docs/architecture/0005-private-pilot.md` et les autres cibles pertinentes de `.specs/standards/doc-sync-map.yml`.
- [ ] T007 Exécuter les gates de `specs/008-pr9-deblocage/plan.md` et noter résultats et limites dans `specs/008-pr9-deblocage/verification.md`.
- [ ] T008 Revoir la convergence, publier les correctifs, suivre le CI et ne résoudre que les discussions effectivement traitées.

## Dependencies & Execution Order

T001 précède T002 et T005 ; T004 précède T005 ; T002–T006 précèdent T007, puis T008.
