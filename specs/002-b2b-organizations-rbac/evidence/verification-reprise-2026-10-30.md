# Vérification de reprise — 30 octobre 2026

Périmètre testé : commit applicatif `b1ffbca35abd1bd33bc70808fa951ee15d312d7b`,
branche `codex/b2b-organizations-rbac`, base `main` à `f47449c`.

| Contrôle relancé | Résultat | Périmètre |
| --- | --- | --- |
| `pnpm verify` | PASS | Types, lint, 52 tests unitaires, builds et smoke |
| `pnpm docs:test` et `pnpm docs:check` | PASS | 9 tests documentaires, liens et structure |
| `pnpm verify:security` | PASS | 65 tests PostgreSQL/HTTP ; le test de migration dédié est exécuté séparément |
| `pnpm verify:tenant-isolation` | PASS | 15 tests d'isolation |
| Migration historique et rejeu | PASS | 1 test sur base vide dédiée, avec flag explicite |
| Scénarios navigateur B2B ciblés | PASS | 12 tests avec API simulée, français/anglais et trois tailles ; Chromium complet |
| `pnpm test:auth:e2e` | PASS | 2 parcours desktop et 2 mobile, PostgreSQL et Mailpit jetables réels |
| QA indépendante SQL/HTTP | PASS | 18 tests sur une autre base jetable, dont noms d'invitation et refus sans contexte |

Les captures fraîches du navigateur de revue sont conservées localement dans le
checkout jetable de revue ; elles ne sont pas versionnées. La revue indépendante
de l'ensemble des états est suivie séparément. Les tests UI avec API simulée ne
prouvent pas les autorisations serveur. Les preuves du 25 octobre restent datées
et ne sont pas présentées comme des exécutions du 30 octobre.

La revue visuelle complète des 378 captures a relevé une confirmation de retrait
ambiguë. Le titre précise désormais l'action, la personne, le rôle et sa portée,
avec l'email en remplacement d'un nom vide et le nom de portée lorsqu'il est connu.
Après correction, les
[6 scénarios visuels FR/EN aux trois tailles](ui-retrait-2026-10-30.log) et le
[test des trois portées et de l'annulation](ui-retrait-portees-2026-10-30.log)
sont passés. Les réponses API de ces scénarios sont simulées.
Ils ont été exécutés le 30 octobre sur les sources ensuite enregistrées dans le
commit `c2a271e36c18e86c67b730d2fab219baa8846048`. Le build et les commandes étaient :

```sh
pnpm --filter @enterprise/web build
pnpm exec playwright test tests/e2e/b2b-visual.spec.ts --config specs/002-b2b-organizations-rbac/evidence/playwright-ui.config.ts --workers=3
pnpm exec playwright test tests/e2e/b2b.spec.ts --config specs/002-b2b-organizations-rbac/evidence/playwright-ui.config.ts --grep 'role removal confirmation' --workers=1
```

Les deux reproductions initiales échouées ont été observées dans cette session,
mais leurs sorties complètes n'ont pas été archivées dans le dépôt. Cette correction
d'interface est postérieure au commit applicatif indiqué en début de document.

Une revue a ensuite relevé le cas de plusieurs portées portant le même nom. Le nom
reste lisible ; l'identifiant est ajouté lorsqu'une autre portée du même type porte
le même nom. Le [test navigateur de collision](ui-retrait-collision-2026-10-30.log)
vérifie deux espaces homonymes, l'annulation et l'identifiant envoyé à la confirmation.
Il a été exécuté sur les sources suivant `c2a271e`, avec 13 scénarios B2B réussis :

```sh
pnpm --filter @enterprise/web build
pnpm exec playwright test tests/e2e/b2b.spec.ts tests/e2e/b2b-visual.spec.ts --config specs/002-b2b-organizations-rbac/evidence/playwright-ui.config.ts --workers=3
```

Aucune base de développement ou production n'a été migrée. La MFA reste
facultative en V0 ; les vérifications locales ne certifient pas l'infrastructure.
