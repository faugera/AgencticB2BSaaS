# Tasks: Isolation de l'annuaire des organisations

## Phase 1: Correctif et preuve

- [x] T001 Décrire le défaut, ses limites et la preuve négative dans `specs/004-organization-directory-isolation/`.
- [x] T002 Écrire la régression SQL deux clients et suppression logique dans `apps/api/src/business/organizations.integration.test.ts`.
- [x] T003 Ajouter `apps/api/migrations/0016_organization_directory_isolation.sql` sans modifier les migrations appliquées.
- [x] T004 Synchroniser les documents de sécurité, modèle et contrat HTTP affectés.
- [ ] T005 Exécuter les contrôles ciblés et les gates IAM disponibles, puis consigner leurs limites.

## Dependencies & Execution Order

T002 précède T003 afin que la régression décrive le comportement attendu. T004 suit le contrat établi. T005 ne conclut qu'après les tâches précédentes.
