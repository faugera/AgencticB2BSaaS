# État des specs

Synthèse au 15 novembre 2026, `main` au commit `94e8b9a`, plus les specs 010 et 011
en cours sur `codex/rattrapage-documentaire`.
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
| 007-documentation-sync-harness | In Progress | 23/24 | 1 | Preuve CI (T023) | CI distante `NOT_RUN` |
| 007-saas-reliability | In Progress | 31/38 | 7 | 1 partiel, 4 preuves, 2 obsolètes | Décisions D1/D2 ; PostgreSQL jetable |
| 008-admin-control-plane | Draft | 3/19 | 16 | Implémentation | Arbitrage D3 (`/settings` vs `/control`) |
| 008-pr9-deblocage | Complete | 8/8 | 0 | — | Clôturée comme supplantée le 15 novembre 2026 ; reliquat migration suivi par 009/D1 |
| 008-retrait-tests-navigateur | In Progress | 4/4 | 0 | — | Statut à passer à Complete |
| 009-reconciliation-securite-b2b | In Progress | 5/6 | 1 | Décision ops (T006) | Inventaire des environnements non jetables |
| 010-rattrapage-documentaire | In Progress | 10/10 | 0 | — | Publication de la PR |
| 011-idempotence-client | In Progress | 6/6 | 0 | — | Publication de la PR |

## Décisions en attente

| Réf. | Question | Impact |
|---|---|---|
| D1 | Historique migrations 0016–0018 : gel, renumérotation ou reprise opérateur | 009 T006, 007 reconciliation |
| D2 | Vérification UI : aucune, socle minimal ou retour partiel | 008 T017, future CI |
| D3 | Règle `/settings` vs `/control` et sort de `tenantId = 0000` | 008 (16 tâches) |

## Preuves de référence

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (122 tests), `pnpm docs:test` (40 tests),
  `pnpm docs:check` : exécutés localement le 15 novembre 2026.
- PostgreSQL jetable, Mailpit, `pnpm verify:security`, `pnpm verify:tenant-isolation`,
  `pnpm build`, `pnpm smoke`, CI distante : `NOT_RUN` à cette date.

## Règles

- Un statut `Complete` exige toutes les tâches cochées et une preuve de vérification.
- Une tâche obsolète est réécrite avec la raison, jamais cochée par confort.
- Les résultats historiques (72, 124, 115 tests) restent datés et ne valent pas preuve actuelle.
