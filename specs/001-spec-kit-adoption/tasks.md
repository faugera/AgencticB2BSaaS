# Tasks: Adoption Spec Kit

## Phase 1: Setup
- [x] T001 [US1] Installer Codex et Claude 1.2.3, contrôler provenance et manifestes (FR-001).
- [x] T002 [US1] Écrire constitution, spec et plan, résoudre les modèles officiels (FR-002).

## Phase 2: User Story 1 - Contrat commun
- [x] T003 [US1] Aligner AGENTS.md, CLAUDE.md, docs/setup/spec-kit.md et deux skills projet ; conserver les anciens skills hors chargement actif (FR-002, FR-004).

## Phase 3: User Story 2 - Cohérence documentaire
- [x] T004 [US2] Réconcilier les cinq chantiers dans docs/sdd/legacy-reconciliation.md, préserver les originaux et créer une suite si nécessaire (FR-003).
- [x] T005 [US2] Corriger plan IAM, fondation, carte produit, standards, README et références actuelles (FR-004).

## Phase 4: User Story 3 - Contrôles documentaires
- [x] T006 [US3] Écrire scripts/docs-check.test.mjs, démontrer échec avant implémentation (FR-005).
- [x] T007 [US3] Implémenter scripts/docs-check.mjs, commandes package.json et contrôle CI ; réussir les fixtures et le dépôt (FR-005).

## Phase 5: Vérification et livraison
- [x] T008 Vérifier manifestes, liens, structure, tests, lint et absence de modification produit/historique ; enregistrer preuves et analyse (FR-006).
- [x] T009 Exécuter la convergence, mettre à jour les tâches et créer une PR vers main sans fusion (FR-006).

## Dependencies & Execution Order
T001/T002 avant T003 ; T004 et T005 avant validation finale ; T006 avant T007 ; T008 avant T009.
Aucune exécution concurrente nécessaire. Les critères US1/US2/US3 se vérifient indépendamment
par manifestes, registre/code et fixtures. Les résultats figurent dans verification.md.
