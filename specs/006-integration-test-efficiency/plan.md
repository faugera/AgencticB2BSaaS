# Plan d'implémentation : Exécutions d'intégration essentielles

**Branch**: `codex/integration-test-efficiency` | **Date**: 2026-11-01
**Spec**: [spec.md](spec.md)

## Résumé

La CI exécute actuellement toute la suite `pnpm test:auth` depuis
`pnpm verify:security`, puis relance `isolation.integration.test.ts` dans une étape
dédiée. Conserver cette étape ciblée et exclure seulement ce fichier de la porte
sécurité évite un second lancement sans retirer ni masquer ses 15 scénarios.

## Contexte technique

- **Langage/versions** : Node 24, pnpm 11.25, TypeScript strict.
- **Dépendances** : Vitest existant ; aucune nouvelle dépendance.
- **Stockage** : PostgreSQL jetable CI ; aucun changement de schéma.
- **Tests** : Vitest, intégrations PostgreSQL et tests d'auth navigateur séparés.
- **Plateforme** : GitHub Actions Linux et postes de développement.
- **Type de projet** : monolithe modulaire web/API.
- **Objectif mesurable** : chaque fichier d'intégration unique requis s'exécute une
  fois par CI ; les 15 cas d'isolation ne sont pas rejoués dans la même CI.
- **Contraintes** : conserver `pnpm test:auth` complet et le gate dédié
  `pnpm verify:tenant-isolation`, préserver toutes les assertions de sécurité.
- **Périmètre** : commandes d'intégration, CI et documentation de couverture.

## Constitution Check

- Réutiliser Vitest et les scripts existants ; aucune dépendance nouvelle.
- Garder les tests PostgreSQL sur bases jetables uniquement.
- Les scénarios tenant/RLS/audit/auth existants restent exécutés ; seul leur
  lancement redondant est supprimé.
- Distinguer une suite ciblée d'une validation complète et signaler les limites.
- **Résultat** : conforme ; aucun besoin de migration ou changement d'autorisation.

## Recherche et décisions

Voir [research.md](research.md) pour les commandes, leur recouvrement et les
alternatives écartées.

## Conception

Ajouter `test:auth:core`, qui lance la configuration d'intégration avec une
exclusion étroite de `isolation.integration.test.ts`. Faire appeler ce script par
`verify:security`; laisser `test:auth` inchangé pour la suite complète et
`verify:tenant-isolation` inchangé pour l'étape dédiée de CI. Documenter clairement
les différences dans `docs/testing.md` et l'index des commandes dans le standard
architecture-stack.

Aucun contrat API ni modèle persistant ne change. Le contrat interne des scripts
est décrit dans [data-model.md](data-model.md). Le parcours de validation est dans
[quickstart.md](quickstart.md).

## Structure concernée

```text
package.json
.github/workflows/ci.yml
docs/testing.md
.specs/standards/architecture-stack.md
apps/api/src/ci-test-selection.test.ts
specs/006-integration-test-efficiency/
```

Le workflow CI reste partitionné : la porte sécurité exécute la suite centrale,
puis la porte tenant exécute sa suite seule. La commande complète demeure disponible
en local. Aucun test applicatif n'est supprimé.

## Validation après conception

- **Constitution** : aucune violation.
- **Portée B2B** : toutes les garanties et assertions d'isolation persistent.
- **Preuve** : un test ciblé vérifie la sélection de fichiers ; contrôle de la liste
  Vitest et lecture de la CI confirment l'absence de doublon.
- **Infrastructure** : PostgreSQL CI demeure indispensable aux preuves réelles.
