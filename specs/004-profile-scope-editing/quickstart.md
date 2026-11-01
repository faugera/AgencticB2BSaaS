# Vérification rapide

## Parcours navigateur

Prérequis : dépendances du dépôt disponibles.

```sh
pnpm test:e2e -- tests/e2e/frontend-pages.spec.ts
```

Résultat attendu : les parcours profil FR/EN restent utilisables ; un changement de
tenant retire les anciennes valeurs, annonce le chargement, puis affiche uniquement
le profil correspondant.

## Tests API et contrôles généraux

```sh
pnpm test -- apps/api/src/business/profile-routes.test.ts apps/api/src/business/profile-dto.test.ts
pnpm test:auth -- apps/api/src/business/b2b-http.integration.test.ts
pnpm verify
```

Les tests HTTP réels du profil et de l'isolation utilisent PostgreSQL jetable et des
variables `AUTH_TEST_*` explicitement configurées. Sans cette infrastructure, le
contrôle reste `NOT_RUN` ; aucune base de développement ou de production ne doit être
utilisée.
