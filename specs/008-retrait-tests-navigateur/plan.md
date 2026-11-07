# Plan : Retrait des tests navigateur

## Summary

Supprimer les suites Playwright, leur dépendance et les commandes et étapes CI associées. Préserver les tests API, SQL et d'isolation et adapter les documents actifs.

## Verification

Exécuter `pnpm verify`, `pnpm docs:test` et `pnpm docs:check`. Exécuter les gates SQL sur PostgreSQL jetable s'il est disponible ; sinon les consigner NOT_RUN. Contrôler statiquement la CI et la sélection des suites restantes.

## Constitution Check

Le retrait est explicitement demandé. Les frontières serveur, tests SQL, audit et migrations restent inchangés. L'absence de vérification navigateur est consignée comme limite.
