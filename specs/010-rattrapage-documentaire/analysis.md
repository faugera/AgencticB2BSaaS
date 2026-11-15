# Analyse : Rattrapage documentaire et portabilité du contrôle

Contrôle de cohérence entre `spec.md`, `plan.md`, `tasks.md` et le diff réalisé,
le 15 novembre 2026.

## Couverture des exigences

| Exigence | Tâches | Preuve |
|---|---|---|
| FR-001 (documents décrivent `main`) | T004, T005, T006 | en-têtes datés du 15 novembre 2026, commit `94e8b9a` |
| FR-002 (limites exactes) | T003, T007 | README « Current limits », CHANGELOG 0020–0025 |
| FR-003 (idempotence API vs client) | T005, T006 | ligne dédiée dans `docs/features-b2b.md` et la carte produit |
| FR-004 (`docs:test` Windows) | T001, T002 | 40/40 sous Windows, saut explicite si `bash` absent |
| FR-005 (tableau unique) | T008 | `specs/STATUS.md`, 15 specs |
| FR-006 (aucun changement métier) | toutes | diff limité aux documents, au test de contrôle et aux specs |
| FR-007 (PASS/FAIL/NOT_RUN) | T010 | `verification.md` |

## Cohérence interne

- Le plan annonce « aucun changement de code applicatif » : le diff ne touche ni
  `apps/api`, ni `apps/web`, ni `apps/api/migrations`.
- La spec annonce 40 tests documentaires : le résultat observé est 40/40.
- La spec exclut l'historique des migrations 0016–0018 : aucune migration n'est
  modifiée ; `specs/STATUS.md` conserve le blocage D1.
- La spec exclut les arbitrages UI et control plane : `specs/STATUS.md` les liste
  comme décisions en attente, sans les préempter.

## Écarts et décisions

- `documentation-impact.md` déclare `REVIEWED_NO_CHANGE` pour
  `docs/setup/spec-kit.md` et `.specs/standards/workflow.md` : la correction est un
  détail de portabilité, pas un changement de parcours ni de porte.
- Six branches restent attachées à des worktrees hors dépôt ; elles ne sont pas
  supprimées pour ne pas détruire un travail concurrent.
- Les mentions « 72 » et « 124 » restent dans les documents comme preuves
  historiques explicitement datées ; elles ne sont pas présentées comme état courant.

## Risques résiduels

- Un poste Windows sans Git Bash saute le test de résolution au lieu de l'exécuter ;
  le saut est visible et n'est jamais compté comme succès.
- La CI distante et PostgreSQL jetable ne sont pas exercés dans ce lot.
- Les statuts `Complete` des specs 004/005/006/007-documentation/008-retrait ne sont
  pas modifiés ici : ils exigent une revue dédiée, consignée dans `STATUS.md`.

## Verdict

Cohérent et borné. Aucune violation de la constitution ni élargissement de périmètre.
