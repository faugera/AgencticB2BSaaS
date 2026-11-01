# Implementation Plan: Fiabilisation du workflow Spec Kit

**Branch**: `004-spec-kit-workflow` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

## Summary

Compléter le workflow Spec Kit pour suivre le cycle imposé par la constitution,
avec approbation explicite avant implémentation et convergence après. Rendre la
feature active déterministe dans les checkouts neufs, synchroniser les deux skills
projet pour Codex et Claude, puis intégrer des contrôles ciblés dans les gates
documentaires déjà exécutés en CI. Les artefacts de la feature B2B livrée et les
fichiers officiels gérés restent intacts.

## Technical Context

**Language/Version**: JavaScript ESM, Node 24 ; YAML Spec Kit 1.2.3.

**Primary Dependencies**: Node.js standard library ; scripts de contrôle existants.
Pas de nouveau parseur YAML ou dépendance.

**Storage**: Fichiers versionnés de configuration et documentation.

**Testing**: `node --test scripts/docs-check.test.mjs scripts/architecture-sync.test.mjs`,
`pnpm docs:test`, `pnpm docs:check`, puis `pnpm lint`.

**Target Platform**: Windows local via Git Bash, Linux en CI.

**Project Type**: Dépôt multi-package avec configuration de workflow et documentation.

**Performance Goals**: Les contrôles doivent rester adaptés à une exécution de moins
de quelques secondes, sans accès réseau ou service externe.

**Constraints**: Pas de modification des fichiers déclarés dans les manifestes
officiels Spec Kit ; conserver l'état local `.specify/feature.json` ignoré par Git ;
ne pas modifier les specs livrées historiques ; aucune fusion ou aucun déploiement.

**Scale/Scope**: Un workflow, deux skills projet copiés entre intégrations, un guide,
un contrôle de conformité et des tests unitaires.

## Constitution Check

- **I. Réfléchir avant de coder** : PASS — spec, plan, tâches et preuves locales.
- **II. Simplicité et changements chirurgicaux** : PASS — réutiliser les scripts
  documentaires existants et aucune nouvelle dépendance.
- **III. Frontières B2B et données protégées** : N/A — aucun changement d'autorisation,
  de données métier ou de secrets.
- **IV. Vérification fondée sur les preuves** : PASS — fixtures négatives, CI et statuts
  de validation explicites.
- **V. Contrats lisibles et expérience accessible** : PASS — synchroniser le guide et
  les consignes, sans interface utilisateur.
- Gouvernance : PASS — ne pas modifier les fichiers officiels gérés ni les specs
  historiques ; garder la revue et la décision finale humaines.

## Conception

Le workflow reste dans `.specify/workflows/speckit/workflow.yml`. Il décrit dans
l'ordre `specify`, revue, `clarify`, revue de clarification, `plan`, revue, `tasks`,
revue des tâches, `analyze`, porte d'approbation explicite, `implement`, `converge`
puis revue finale. Toutes les portes de refus interrompent le workflow. La clarification
est appelée systématiquement : le skill conclut sans question lorsque la spec est claire.
Le moteur ne documentant pas de branchement conditionnel et le skill checklist produisant
un artefact lorsqu'il est appelé, `checklist` reste une action manuelle optionnelle après
la revue du plan, uniquement si le risque justifie une revue qualité séparée. Le commentaire
du workflow et le guide le signalent ; la checklist n'est pas une étape automatique.
L'étape d'implémentation ne peut être atteinte qu'après approbation après analyse.

Le vérificateur de `scripts/docs-check.mjs` analyse uniquement les formes YAML simples
réellement utilisées par cette définition. Il valide les identifiants/commandes ordonnés,
les portes et leur rejet, la barrière `analyze` → approbation → `implement`, l'étape
`converge` après implémentation et l'absence de commande de fusion/déploiement. Il compare
également l'octet des skills projet `tenant-boundary` et `verify-change` entre
`.agents/skills` et `.claude/skills`, et la version du workflow à `.specify/workflows/workflow-registry.json`.
Les tests emploient des fixtures valides et altérées.

Les contrôles sont ajoutés à `docs:check` et `docs:test`, déjà exécutés dans le job CI.
Le nom du job CI indique que ces contrôles couvrent aussi le workflow. La documentation
indique comment sélectionner la feature active et comment éviter l'écriture du pointeur
dans les scripts de lecture seule. La variable explicite est prioritaire au pointeur
local ; elle est préférable dans un checkout neuf et un contrôle read-only ajoute
`SPECIFY_FEATURE_NO_PERSIST=true`.

## Project Structure

### Documentation de la feature

```text
specs/004-spec-kit-workflow/
├── spec.md
├── plan.md
├── research.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md
```

### Sources et preuves

```text
.specify/workflows/speckit/workflow.yml
.specify/workflows/workflow-registry.json
.agents/skills/tenant-boundary/SKILL.md
.agents/skills/verify-change/SKILL.md
.claude/skills/tenant-boundary/SKILL.md
.claude/skills/verify-change/SKILL.md
docs/setup/spec-kit.md
scripts/docs-check.mjs
scripts/docs-check.test.mjs
.github/workflows/ci.yml
```

**Structure Decision**: Réutiliser les fichiers de configuration/documentation et le
contrôle documentaire existants ; ne créer ni service, ni package, ni nouveau runner.

## Validation Design

- Fixtures d'un workflow conforme, d'une étape absente, d'un ordre erroné, d'une porte
  sans rejet, et d'une commande de merge/deploy.
- Fixtures de skills manquants ou divergents.
- Tests sur un pointeur de feature absent, explicite et mal formé avec mode sans écriture.
- Vérification des SHA256 des manifestes officiels avant/après.
- Documentation : test unitaire, contrôle de liens/routage, lint.

## Hors périmètre et limites

- Réécrire le workflow Spec Kit générique ou modifier les skills officiels managés.
- Revenir sur une feature livrée pour cocher ses tâches historiques ou changer son statut.
- Modifier des fichiers applicatifs, exécuter des migrations, créer une PR, fusionner ou
  déployer.
- Le contrôle statique ne remplace pas l'exécution réelle du workflow par une intégration ;
  il vérifie les contrats déclaratifs qui sont versionnés dans ce dépôt.

## Complexity Tracking

Aucune violation de la constitution ni dépendance supplémentaire.
