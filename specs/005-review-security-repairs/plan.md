# Implementation Plan: Correctifs de revue B2B

## Summary

Migration `0017` remplace les politiques/fonctions corrigibles et complète les archives audit ; `0018` garantit les mises à jour partielles et l'initialisation atomiques des préférences. La route POST initialise les préférences sans écraser une valeur existante. Les interfaces réutilisent les stores existants, sans dépendance supplémentaire.

## Constitution Check

Migrations additives, RLS et isolation vérifiées avec PostgreSQL jetable ; aucun test ne touche une base de production. Les parcours réels et simulés sont distingués dans les preuves.

## Vérification

Tests unitaires de route, puis `pnpm verify`, `pnpm test:e2e`, `pnpm verify:tenant-isolation`, `pnpm verify:security` et `pnpm test:auth:e2e` sur services jetables.
Reprendre les corrections de CI déjà validées sur la PR 10 : ouvrir le menu mobile dans
le test, adapter le budget des captures et isoler la base des parcours SMTP.
Figer LF des migrations 0016 à 0018 pour conserver les checksums entre plateformes.
