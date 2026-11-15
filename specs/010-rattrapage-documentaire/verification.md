# Vérification : Rattrapage documentaire et portabilité du contrôle

Résultats locaux du 15 novembre 2026, branche `codex/rattrapage-documentaire` issue
de `main` (`94e8b9a`).

## Contrôles exécutés

| Contrôle | Résultat | Détail |
|---|---|---|
| `pnpm docs:test` | **PASS** | 40 tests, 40 réussis, 0 échec, 0 ignoré (Windows, Git Bash) |
| `pnpm docs:check` | **PASS** | structure, liens, manifestes et décisions du diff valides |
| `pnpm typecheck` | **PASS** | racine et trois workspaces |
| `pnpm lint` | **PASS** | zéro warning |
| `pnpm test` | **PASS** | 21 fichiers, 128 tests (dont 6 tests DOM en jsdom) |
| `node scripts/architecture-sync.mjs --reviewed` | **PASS** | manifeste régénéré après revue du delta |

## Contrôles non exécutés

| Contrôle | Résultat | Motif |
|---|---|---|
| `pnpm build` | **PASS** | build complet exécuté pendant le lot 012, après les tests DOM |
| `pnpm smoke` | NOT_RUN | idem |
| `pnpm verify:security` | NOT_RUN | PostgreSQL jetable non configuré |
| `pnpm verify:tenant-isolation` | NOT_RUN | PostgreSQL jetable non configuré |
| Parcours PostgreSQL/Mailpit | NOT_RUN | infrastructure non configurée |
| CI distante | NOT_RUN | non consultée |

## Portée du diff

- Documents : `README.md`, `CHANGELOG.md`, `docs/architecture.md`,
  `docs/features-b2b.md`, `.specs/domains/product-map.md`,
  `docs/architecture-sources.json`.
- Contrôle : `scripts/docs-check.test.mjs` (sélection d'un `bash` POSIX, chemin
  converti, saut explicite).
- Pilotage : `specs/STATUS.md`, `specs/010-rattrapage-documentaire/`, annotations de
  `specs/007-saas-reliability/tasks.md` et `specs/008-pr9-deblocage/tasks.md`.
- Aucun fichier de `apps/api`, `apps/web`, `packages/shared` ni aucune migration.

## Décisions D1, D3 et D2 (15 novembre 2026)

- **D1** : noms de migration 0016–0025 gelés ; procédure de reprise ajoutée à
  `docs/setup/private-pilot.md` (diagnostic, correspondance, vérification des
  empreintes, renommage transactionnel, garde-fous). Aucune migration appliquée
  n'est modifiée ; aucun environnement non jetable n'est inspecté : `UNKNOWN`.
- **D3** : surfaces `/app` (tenant) et `/admin` (plateforme) conservées ; `/settings`
  et `/control` abandonnés ; sentinelle `0000` conservée (migration 0025). Spec 008
  alignée, tâches T001/T003/T004/T009/T011 justifiées ; les codes de refus nommés
  restent ouverts.
- **D2** : socle DOM minimal retenu (`jsdom` + Testing Library), sans Playwright.
  Six tests remplacent l'ancienne couverture navigateur sur la navigation, les
  redirections de garde et la création de tenant ; la CI les exécute via `pnpm test`,
  sans nouvelle étape. Rendu CSS, responsive, clavier réel et authentification
  navigateur restent non couverts et ne sont pas revendiqués.
- Après ces ajouts : `pnpm docs:check` et `pnpm docs:test` (40/40) **PASS**.
  `pnpm test` : 21 fichiers, 128 tests. PostgreSQL jetable, navigateur et CI
  restent `NOT_RUN`.

## Nettoyage des branches

- 7 branches locales supprimées après vérification (`ahead:0`) ; la branche
  `codex/b2b-organizations-rbac` est conservée sous le tag
  `archive/b2b-rbac-2026-11` avant suppression.
- 6 branches restent attachées à des worktrees hors dépôt ; elles sont laissées en
  l'état pour ne pas détruire un travail concurrent.

## Limites

- Le saut du test de résolution lorsque `bash` est absent reste un contournement
  volontaire : la CI Ubuntu exécute réellement le script.
- Les statuts de specs non modifiés dans ce lot sont listés dans `specs/STATUS.md`
  et attendent une revue dédiée.
