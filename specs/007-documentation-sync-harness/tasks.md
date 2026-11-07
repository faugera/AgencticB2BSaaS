# Tâches : Synchronisation vérifiable de la documentation

**Input**: Documents de conception dans `specs/007-documentation-sync-harness/`

**Prérequis**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`quickstart.md`

## Phase 1 : Préparation

Aucune dépendance ni infrastructure supplémentaire.

## Phase 2 : Fondations

Aucun préalable bloquant ; les tests utiliseront des fixtures temporaires.

## Phase 3 : User Story 1 - Vérifier les décisions documentaires (Priority: P1)

**But** : faire échouer le contrôle lorsque le diff affecte une cible requise sans
décision documentaire valable.

**Test indépendant** : fournir une liste de chemins modifiés et une fixture de
routage ; vérifier les statuts valides, manquants et contradictoires.

### Tests

- [x] T001 [US1] Ajouter les tests unitaires de détection des règles et décisions
  valides/invalides dans `scripts/docs-check.test.mjs`
- [x] T002 [US1] Ajouter les tests de validation des motifs de source et du
  fichier de décision dans `scripts/docs-check.test.mjs`

### Implémentation

- [x] T003 [US1] Déclarer les motifs de sources relatifs pour chaque règle
  `required` dans `.specs/standards/doc-sync-map.yml`
- [x] T004 [US1] Implémenter l'analyse des motifs et décisions par cible dans
  `scripts/docs-check.mjs`
- [x] T005 [US1] Ajouter la résolution stricte de `DOCS_SYNC_BASE`, du diff Git
  et de la feature active au point d'entrée de `scripts/docs-check.mjs`
- [x] T006 [US1] Ajouter le fichier de décision documentaire et les résultats
  propres à cette feature dans
  `specs/007-documentation-sync-harness/documentation-impact.md`

## Phase 4 : User Story 2 - Appliquer le gate avant clôture (Priority: P1)

**But** : faire exécuter le skill de vérification documentaire avant la revue de
convergence et imposer les mêmes preuves en CI.

**Test indépendant** : vérifier par tests et inspection que le workflow exige le
skill, que ses copies sont identiques et que les événements PR/push fournissent
une base au diff.

### Tests et implémentation

- [x] T007 [US2] Tester la présence du gate `verify-change` ordonné entre
  `converge` et la revue finale dans `scripts/docs-check.test.mjs`
- [x] T008 [US2] Ajouter le gate `verify-change` avant la revue finale dans
  `.specify/workflows/speckit/workflow.yml` et l'expliquer dans
  `.specs/standards/workflow.md` et `docs/setup/spec-kit.md`
- [x] T009 [US2] Mettre à jour la compétence `verify-change` sur le contrôle du
  diff et le format de décision dans `.agents/skills/verify-change/SKILL.md`,
  puis synchroniser `.claude/skills/verify-change/SKILL.md`
- [x] T010 [US2] Configurer le checkout complet et la base SHA pour les événements
  PR/push dans `.github/workflows/ci.yml`

## Phase 5 : Validation

- [x] T011 Exécuter `pnpm docs:test`, `pnpm docs:check` avec une base Git valide,
  `pnpm lint` et `git diff --check`, puis vérifier les exigences de cette spec

## Dépendances et ordre d'exécution

- T001 et T002 précèdent T004/T005 : les contrats doivent échouer avant
  l'implémentation.
- T003 alimente T004 ; T004 et T005 précèdent T006.
- T007 précède T008 ; T009 et T010 sont indépendants des changements US1 après
  T007, mais la validation T011 dépend de toutes les tâches.
- US1 et US2 sont indépendamment testables ; T011 est le gate final commun.

## Possibilités de parallélisme

- T001/T002 peuvent être préparées sur des sections séparées, mais modifient le
  même fichier et doivent être intégrées séquentiellement.
- T008, T009 et T010 touchent des fichiers distincts et peuvent être exécutées
  en parallèle après T007.

## Stratégie MVP

Terminer T001 à T006 pour rendre le routage des règles `required` vérifiable par
diff. Ajouter ensuite le gate Spec Kit et la CI (T007 à T010), puis exécuter les
preuves ciblées (T011).

## Validation du format

Chaque tâche possède une case, un identifiant unique, une étiquette d'histoire
lorsqu'elle appartient à une histoire et des chemins précis.
