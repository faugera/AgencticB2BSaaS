# Plan d'implémentation : Synchronisation vérifiable de la documentation

**Branch**: `faugera/documentation-sync-harness` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: [Spécification](spec.md)

## Résumé

Ajouter au routage documentaire des motifs de fichiers sources, puis comparer
ces sources et leurs cibles au diff Git d'une feature. Pour chaque cible requise
affectée, `docs:check` validera une ligne de décision dans
`documentation-impact.md`. Le workflow Spec Kit demandera explicitement
`verify-change` avant sa porte de clôture ; la CI fournira le SHA de base du PR
ou du push au même contrôle.

## Contexte technique

- **Langage/versions** : Node.js 24, pnpm 11.25.0, scripts ESM JavaScript.
- **Dépendances** : Node.js intégré, Git ; aucune dépendance nouvelle.
- **Stockage** : fichiers Markdown/YAML versionnés ; aucun stockage applicatif.
- **Tests** : Node test runner via `pnpm docs:test`, CI GitHub Actions.
- **Plateforme** : postes de développement et runner Ubuntu GitHub Actions.
- **Type de projet** : monolithe modulaire ; harness documentaire.
- **Performance** : le contrôle doit rester inférieur à quelques secondes hors installation.
- **Contraintes** : YAML simple existant, aucun changement des fichiers officiels
  Spec Kit, aucune modification des migrations, preuves honnêtes si la base Git
  n'est pas disponible.
- **Périmètre** : règles `required`, décisions de synchronisation, workflow,
  compétence `verify-change`, tests et CI ; aucune génération automatique du
  contenu des docs.

## Vérification de la constitution

- Préserver les skills officiels sous contrôle de manifestes : conforme, seuls
  les artefacts projet et le workflow sont modifiés.
- Contrôler le besoin métier sans nouvelle abstraction ni dépendance : conforme,
  fonction exportée testable par entrée explicite.
- Contrôles docs seulement, sans tests DB : conforme.
- Chaque résultat manquant reste en échec, et le diff requiert une base explicite :
  conforme.
- Synchroniser les documents affectés et garder les artefacts de feature comme
  historique : conforme.

## Recherche et décisions

Voir [research.md](research.md). La base du diff est fournie via `DOCS_SYNC_BASE`
en CI et peut être fournie localement ; le contrôle échoue si elle est invalide.
L'artefact par feature est une table Markdown avec une décision par règle/cible.
Les motifs sources sont des chemins relatifs simples avec `*` et `**`.

## Conception

`scripts/docs-check.mjs` conserve ses contrôles structurels, valide le format des
motifs sources et ajoute `checkDocumentationSync(root, changedFiles)`. Son entrée
Git CLI valide une base, collecte les chemins modifiés entre cette base et HEAD,
identifie le `spec.md` unique touché, puis lit
`specs/<feature>/documentation-impact.md`. Une règle requise est affectée lorsque
l'un de ses motifs correspond à un chemin modifié. Chaque cible doit être
`UPDATED` si elle apparaît dans le diff, ou être non modifiée et avoir une décision
motivée `REVIEWED_NO_CHANGE` / `NOT_APPLICABLE`.

Les tests unitaires couvrent la détection des motifs et les décisions valides,
manquantes, contradictoires, invalides, dupliquées et non motivées. La CI utilise
un checkout complet et définit `DOCS_SYNC_BASE` à `pull_request.base.sha` ou
`push.before`. En local, le diff inclut également les fichiers staged, unstaged et
non suivis pour éviter un faux succès avant commit. Le workflow impose
`verify-change` comme prérequis explicite de la porte `review-convergence`.

Pas de contrat externe, API ou modèle persistant. Le format opérationnel est
décrit dans [data-model.md](data-model.md) ; les preuves reproductibles sont dans
[quickstart.md](quickstart.md).

## Structure du projet

```text
scripts/
  docs-check.mjs
  docs-check.test.mjs
.specs/standards/
  doc-sync-map.yml
  workflow.md
.agents/skills/verify-change/SKILL.md
.claude/skills/verify-change/SKILL.md
.specify/workflows/speckit/workflow.yml
.github/workflows/ci.yml
docs/setup/spec-kit.md
specs/007-documentation-sync-harness/
  documentation-impact.md
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  tasks.md
```

**Décision de structure** : réutiliser le script et les tests documentaires,
le routage existant, le workflow Spec Kit et les copies synchronisées du skill
projet ; ne pas créer de service ou de générateur distinct.

## Validation après conception

- **Constitution** : aucune violation.
- **Scope** : aucune DB, IAM ou UI à tester ; les tests docs et lint couvrent le
  changement de harness.
- **Risque** : la liste des motifs sources est une classification explicite ;
  les tests doivent empêcher les règles requises sans source ou chemins sûrs.
- **Base Git** : aucun fallback silencieux ; erreur explicite avec commande de
  configuration si la référence n'est pas disponible.
