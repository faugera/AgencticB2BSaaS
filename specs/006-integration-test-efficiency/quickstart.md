# Vérification rapide

## Sélection des tests

Après installation des dépendances, vérifier le contrat de sélection sans
connexion PostgreSQL :

```sh
pnpm test -- apps/api/src/ci-test-selection.test.ts
```

La porte sécurité ciblée est :

```sh
pnpm test:auth:core
```

Elle exclut seulement `isolation.integration.test.ts`. Elle requiert quand même les
variables PostgreSQL jetables prévues par la configuration d'authentification.

La suite d'isolation reste exécutable séparément :

```sh
pnpm verify:tenant-isolation
```

Et la validation complète demeure disponible :

```sh
pnpm test:auth
```

Résultat attendu : les scénarios d'isolation apparaissent une fois dans le workflow
CI (porte ciblée) ; la commande complète locale les conserve. Ne pas utiliser une
base de développement ou de production.

## Contrôles documentaires

```sh
pnpm docs:test
pnpm docs:check
```
