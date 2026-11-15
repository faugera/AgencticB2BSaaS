# État des specs

Synthèse au 15 novembre 2026, `main` au commit `94e8b9a`, plus les specs 010, 011 et
012 en cours sur `codex/rattrapage-documentaire`.
Source de vérité pour le détail : chaque `tasks.md`. Une tâche n'est cochée que si
sa preuve est datée et reproductible ; sinon elle reste ouverte ou devient `NOT_RUN`
motivé.

## Tableau

| Spec | Statut | Tâches | Reste | Nature du reste | Blocage |
|---|---|---:|---:|---|---|
| 001-spec-kit-adoption | Complete | 9/9 | 0 | — | — |
| 002-b2b-organizations-rbac | In Progress | 32/34 | 2 | Publication (T012, T017) | Décision de PR |
| 003-architecture-diagram | In Progress | 7/8 | 1 | Publication (T006) | Schéma déjà sur `main` : clôture à acter |
| 004-profile-scope-editing | In Progress | 10/10 | 0 | — | Statut à passer à Complete |
| 004-spec-kit-workflow | Draft | 15/15 | 0 | — | Statut à passer à Complete |
| 005-copilot-spec-kit-integration | In Progress | 11/11 | 0 | — | Statut à passer à Complete |
| 006-integration-test-efficiency | In Progress | 4/4 | 0 | — | Statut à passer à Complete |
| 007-agent-guide | Complete | 8/8 | 0 | — | — |
| 007-documentation-sync-harness | In Progress | 23/24 | 1 | Preuve CI (T023) | CI verte sur `d9a4904` (run `43737124731`) ; à reconfirmer sur le SHA final |
| 007-saas-reliability | In Progress | 31/38 | 7 | 1 partiel, 4 preuves, 2 obsolètes | PostgreSQL jetable |
| 008-admin-control-plane | In Progress | 9/19 | 10 | Implémentation et preuves | Codes de refus nommés (T002/T007/T008) ; PostgreSQL jetable (T018) ; publication (T019) |
| 008-pr9-deblocage | Complete | 8/8 | 0 | — | Clôturée comme supplantée le 15 novembre 2026 ; reliquat migration suivi par 009/D1 |
| 008-retrait-tests-navigateur | In Progress | 4/4 | 0 | — | Statut à passer à Complete |
| 009-reconciliation-securite-b2b | Complete | 6/6 | 0 | — | — |
| 010-rattrapage-documentaire | In Progress | 14/14 | 0 | — | Publication de la PR |
| 011-idempotence-client | In Progress | 6/6 | 0 | — | Publication de la PR |
| 012-verification-ui-dom | Complete | 7/7 | 0 | — | Publication de la PR |

## Décisions

| Réf. | Statut | Question | Issue retenue |
|---|---|---|---|
| D1 | **Tranchée le 15 nov 2026** | Historique migrations 0016–0018 : gel, renumérotation ou reprise opérateur | Gel des noms 0016–0025 + runbook de reprise dans `docs/setup/private-pilot.md`. Aucun environnement non jetable inspecté : `UNKNOWN`. |
| D2 | **Tranchée le 15 nov 2026** | Vérification UI : aucune, socle minimal ou retour partiel | Socle DOM minimal (`jsdom` + Testing Library) dans `pnpm test`, sans navigateur : navigation `/app`/`/admin`, gardes de redirection et formulaire de création de tenant. 008 T017 satisfaite ; spec 012 créée. |
| D3 | **Tranchée le 15 nov 2026** | Règle `/settings` vs `/control` et sort de `tenantId = 0000` | Conserver `/app` (tenant) et `/admin` (plateforme) ; abandonner `/settings` et `/control`. Garder `0000` comme sentinelle plateforme réservée (migration 0025). |

## Preuves de référence

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (128 tests, 21 fichiers), `pnpm build`,
  `pnpm docs:test` (40 tests), `pnpm docs:check` : exécutés localement le
  15 novembre 2026.
- PostgreSQL jetable, `pnpm verify:security`, `pnpm verify:tenant-isolation`,
  `pnpm smoke` : **PASS** en CI GitHub, run `43737124731` (15 novembre 2026),
  y compris la préservation et le rejeu des migrations.
- Mailpit jetable, navigateur réel : `NOT_RUN` ; la CI ne démarre que PostgreSQL.

## Règles

- Un statut `Complete` exige toutes les tâches cochées et une preuve de vérification.
- Une tâche obsolète est réécrite avec la raison, jamais cochée par confort.
- Les résultats historiques (72, 124, 115 tests) restent datés et ne valent pas preuve actuelle.
