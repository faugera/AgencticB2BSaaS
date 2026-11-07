# Validation rapide — Agent guide

## Prérequis

- Node 24 LTS et pnpm 11.25.0 installés.
- Dépendances du dépôt disponibles.

## Vérification documentaire

Depuis la racine du dépôt :

```sh
pnpm docs:test
pnpm docs:check
```

Les deux commandes doivent réussir. `docs:check` contrôle notamment les liens et
les chemins documentaires maintenus ; il ne valide pas la justesse métier du guide.
Comparer aussi les commandes du guide aux scripts de `package.json` et les faits
d’architecture aux documents référencés.

## Portée de la preuve

Aucun test applicatif, test SQL, contrôle d’isolation ou parcours navigateur n’est
nécessaire pour une modification de documentation uniquement.

## Résultats de cette évolution

- Vérification du 2026-11-07 sur la révision de base `e2130c3`, périmètre : documentation
  modifiée et artefacts `specs/007-agent-guide/` ; changements de travail non commités.
- `pnpm docs:test` : PASS, 22 tests.
- `pnpm docs:check` : PASS, liens, chemins, structures, statuts et manifestes valides.
- `git diff --check` : PASS, aucune erreur d’espacement ou de patch.
- Tests applicatifs, SQL et navigateur : NOT_APPLICABLE, aucun code, schéma ou parcours UI
  n’a été modifié.
- Audit Markdown des 29 références : 11 constats sérieux restent dans des skills Spec Kit
  générés et des documents SDD archivés, laissés inchangés conformément aux règles du dépôt.
  Le rapport liste les constats et les corrections appliquées. La comparaison avec l’audit
  précédent est descriptive uniquement : les périmètres et filtres de sévérité diffèrent.

Ces contrôles ne certifient ni l’accessibilité exhaustive ni le déploiement ou la sécurité
d’une infrastructure.
