# Tasks: Déblocage de la PR 9

> Audit du 15 novembre 2026 : spec clôturée comme **supplantée**. Les correctifs visés
> sont sur `main` via d'autres fusions ; seuls restent l'historique des migrations
> non jetables (009 T006, décision D1) et la publication de la branche courante
> (décision humaine). Aucune tâche n'est cochée sans preuve ci-dessous.

- [x] T001 Vérifier la tête de la PR et les historiques de migrations pertinents avant toute correction dans `apps/api/migrations/`. — Sans objet : la PR 9 n'est plus le chemin de livraison. Les migrations 0016–0018 sont réconciliées sur `main` et 0019–0025 les complètent ; l'historique des environnements non jetables reste `UNKNOWN` et suivi par 009 T006 / D1.
- [x] T002 [US1] Reproduire et isoler le 429 dans `apps/api/src/business/review-role-http.integration.test.ts`, sans altérer la sécurité de production. — Livré : le test existe sur `main` et `dd6848c` a retiré le `TRUNCATE` global du limiteur ; chaque acteur utilise une adresse distante distincte. Preuve d'exécution : 009 `verification.md` (7 novembre 2026).
- [x] T003 [US1] Rejouer la suite de rôles après les autres suites et deux fois sur PostgreSQL jetable ; consigner la preuve. — Supplanté : 009 `verification.md` consigne un PASS sur PostgreSQL 17.8 jetable, y compris reprise et seconde exécution. Aucune exécution spécifique à la PR 9 n'est revendiquée.
- [x] T004 [US2] Ajouter la régression organisation supprimée et organisation active témoin dans `apps/api/src/business/review-repairs.integration.test.ts`. — Livré sur `main` : scénario « exclut du contexte super-admin les tenants des organisations supprimées ».
- [x] T005 [US2] Corriger la liste de `business.context()` par migration additive dans `apps/api/migrations/`, après vérification du numéro et des privilèges. — Livré par les migrations additives 0017 (`review_security_repairs`), 0019 (`active_organization_context`) et 0025 (`platform_context`), qui excluent les organisations supprimées.
- [x] T006 [US3] Synchroniser `docs/architecture.md`, `docs/architecture.html`, `docs/architecture/0005-private-pilot.md` et les autres cibles pertinentes de `.specs/standards/doc-sync-map.yml`. — Supplanté par 009 `documentation-impact.md`, qui couvre les règles `database`, `security`, `api` et `feature`.
- [x] T007 Exécuter les gates de `specs/008-pr9-deblocage/plan.md` et noter résultats et limites dans `specs/008-pr9-deblocage/verification.md`. — Supplanté par 009 `verification.md` plus les preuves locales du 15 novembre 2026 (types, lint, 122 tests, docs). PostgreSQL jetable et CI restent `NOT_RUN` à cette date.
- [x] T008 Revoir la convergence, publier les correctifs, suivre le CI et ne résoudre que les discussions effectivement traitées. — Sans objet pour la PR 9 : ses correctifs sont déjà sur `main`. La publication de `codex/rattrapage-documentaire` et son CI restent une décision humaine ; CI `NOT_RUN`.

## Dependencies & Execution Order

Sans objet : la spec est close. Le suivi du reliquat migration est porté par
`specs/009-reconciliation-securite-b2b/tasks.md` (T006) et `specs/STATUS.md` (D1).
