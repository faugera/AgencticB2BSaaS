# Plan : Réconciliation de la sécurité B2B

## Summary

Reprendre le correctif d'annuaire et les réparations locales sur le main actuel, au-dessus du retrait des tests navigateur. Les migrations additives 0016 à 0018 sont des propositions tant que l'historique des environnements non jetables est inconnu.

## Constitution Check

L'identité et les permissions sont validées côté serveur ; les migrations appliquées restent immuables, RLS et audit sont conservés. Tests destructifs exclusivement sur PostgreSQL jetable. Les changements de contrat et leurs limites sont documentés.

## Verification

Exécuter `pnpm verify`, `pnpm docs:test`, `pnpm docs:check`, `pnpm verify:security`, `pnpm verify:tenant-isolation` et le test de conservation des migrations dans une base distincte. Les tests navigateur sont retirés à la demande du propriétaire et ne sont pas requis ni exécutés.
