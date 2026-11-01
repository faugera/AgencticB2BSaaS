# Tâches : Intégration de GitHub Copilot à Spec Kit

**Entrée** : documents de conception dans `specs/005-copilot-spec-kit-integration/`

**Prérequis** : `plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`

## Phase 1 : Setup et vérification

- [x] T001 Confirmer le catalogue Spec Kit 1.2.3, examiner les destinations `.github/skills/`, `.github/hooks/`, `.github/agents/`, `.github/prompts/` et `.vscode/settings.json`, et consigner la base dans `specs/005-copilot-spec-kit-integration/research.md`.

## Phase 2 : Socle de test

- [x] T002 Étendre les tests de `scripts/docs-check.test.mjs` pour échouer si Copilot est absent de la liste d’intégrations du workflow.
- [x] T003 Étendre les tests de `scripts/docs-check.test.mjs` pour exiger Copilot dans l’état installé et son manifeste versionné avec des empreintes valides.

## Phase 3 : User Story 1 - Activer l’intégration Copilot (Priority: P1)

**Objectif** : Installer l’intégration officielle sans retirer Codex/Claude ni changer le défaut.

**Test indépendant** : `specify integration status --json` liste les trois intégrations et conserve `codex` comme défaut ; le manifeste Copilot et tous ses fichiers sont valides.

- [x] T004 [US1] Mettre à jour `scripts/docs-check.mjs` pour exiger `copilot` dans le workflow, `installed_integrations` et les manifestes contrôlés, vérifier le maintien de Codex par défaut et la propagation de l’intégration sélectionnée.
- [x] T005 [US1] Installer l’intégration officielle avec `specify integration install copilot --script sh --integration-options="--skills" --force` après examen des conflits, puis vérifier `.specify/integration.json`, `.specify/integrations/copilot.manifest.json` et les empreintes des fichiers gérés.
- [x] T006 [US1] Documenter dans `docs/setup/spec-kit.md` l’installation en mode skills, la déclaration `multi_install_safe` non sûre, la nécessité d’examiner les conflits avant `--force`, et le maintien du défaut Codex.

## Phase 4 : User Story 2 - Exécuter le cycle via Copilot (Priority: P1)

**Objectif** : Utiliser effectivement le moteur Spec Kit avec le dispatch Copilot, sans confondre intégration IDE et CLI.

**Test indépendant** : Vérifier l’invocation Copilot `/speckit-<commande>` et tester que le refus à la porte empêche l’appel d’`implement`; exécuter un parcours réel si le CLI Copilot est installé et authentifié.

- [x] T007 [US2] Mettre à jour `specs/005-copilot-spec-kit-integration/quickstart.md` avec le lancement explicite `integration=copilot`, le prérequis CLI/authentification, les invocations skills et les résultats `NOT_RUN`.
- [x] T008 [US2] Tester la configuration statique d’invocation Copilot et la porte d’approbation ; dispatch réel `NOT_RUN` car l’exécutable Copilot est absent du `PATH`, cause enregistrée dans `quickstart.md`.

## Phase 5 : Vérification finale

- [x] T009 Exécuter `specify integration status --json`, `pnpm docs:test`, `pnpm docs:check`, `pnpm lint` et `git diff --check`, puis vérifier les exigences de `specs/005-copilot-spec-kit-integration/spec.md`. Résultats consignés : contrôles locaux PASS ; statut Spec Kit `error/unsafe-multi-install` documenté, sans fichier manquant/modifié dans les manifestes.
- [x] T010 Vérifier les tâches restantes et converger l’implémentation dans `specs/005-copilot-spec-kit-integration/tasks.md` sans déclarer un dispatch réel non exécuté comme réussi ; aucune tâche de convergence supplémentaire requise.

## Dépendances et ordre d’exécution

- T001 est terminé et précède l’installation.
- T002 et T003 ajoutent les régressions avant le changement du contrôleur T004.
- T004 précède T005, T006 et T009.
- T005 dépend de T004 ; T006 et T007 ciblent des fichiers distincts.
- T008 dépend de T005 et de la disponibilité du CLI/authentification ; indisponibilité = `NOT_RUN`, sans contournement.
- T009 précède T010.

## Opportunités parallèles

- T006 et T007 peuvent être réalisés en parallèle après T004, dans des fichiers distincts.
- Les contrôles statiques T009 s’exécutent après l’installation et la documentation.

## Stratégie MVP

1. Installer Copilot avec son manifeste en préservant les installations actuelles.
2. Étendre les tests et le contrôle de conformité.
3. Documenter les commandes de démarrage et le prérequis CLI.
4. Tester le dispatch réel en environnement isolé ; si le CLI est absent, conserver la preuve `NOT_RUN`.

## Phase 6 : Convergence

- [x] T011 Préserver les empreintes des skills Copilot face aux conversions de fins de ligne Git sur Windows, puis vérifier `eol=lf` pour les dix chemins manifestés (`.gitattributes`; FR-005, compatibilité Windows/Linux ; partial).
