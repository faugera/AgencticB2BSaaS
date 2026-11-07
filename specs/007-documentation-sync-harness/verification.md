# Preuves de vérification — 7 novembre 2026

## Périmètre

Feature `007-documentation-sync-harness`, branche
`faugera-documentation-sync-harness`. Le changement couvre le script de
vérification documentaire, ses tests, le routage, la CI, le workflow et le skill
projet. Aucun code applicatif, IAM ou SQL n'est modifié.

## Résultats

- `pnpm docs:test` : PASS, 36 tests, 0 échec. Inclut les décisions, cartes de
  routage mal formées, `**/`, réductions de couverture, renommages, base divergente,
  SHA nul initial, chemins Unicode, fichiers non suivis et cibles historiques supprimées.
- `DOCS_SYNC_BASE=origin/main pnpm docs:check` : PASS. Liens, structures,
  manifestes, route documentaire et empreintes d'architecture validés contre le
  diff depuis l’ancêtre commun, les chemins renommés et les décisions historiques.
- Base invalide : PASS du test négatif ; `docs:check` échoue avec un diagnostic
  explicite plutôt que de contourner le contrôle.
- `pnpm lint` : PASS.
- `git diff --check` : PASS.
- CI : le dernier check distant du commit précédent était PASS ; les corrections
  locales doivent encore être poussées et revérifiées par la CI.
- Tests PostgreSQL, auth réelle et navigateur : NOT_APPLICABLE, aucun comportement
  applicatif, auth, SQL ou UI n'a changé.

## Limites

Le contrôle associe des chemins sources à des catégories ; il ne valide pas
sémantiquement la vérité du texte documentaire. La CI fournit une base SHA et
récupère l'historique complet ; les exécutions locales exigent que la base choisie
soit disponible. Les motifs et les tables Markdown suivent un sous-ensemble
intentionnellement limité et couvert par tests.
