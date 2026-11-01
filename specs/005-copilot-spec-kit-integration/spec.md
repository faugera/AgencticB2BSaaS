# Feature Specification: Intégration de GitHub Copilot à Spec Kit

**Feature Branch**: `005-copilot-spec-kit-integration`

**Created**: 2026-11-01

**Status**: In Progress

**Input**: User description: « Mets en place faire exécuter ce workflow par le moteur Spec Kit via l’intégration `copilot`, après vérification réelle de sa prise en charge et test. »

## Clarifications

### Session 2026-11-01

- Q: Quelle stratégie appliquer pour ajouter Copilot au projet alors que l’intégration n’est pas déclarée sûre en installation multiple ? → A: L’ajouter à Codex et Claude avec `--force`, après vérification des conflits.

## User Scenarios & Testing

### User Story 1 - Activer l’intégration Copilot dans le dépôt (Priority: P1)

Un contributeur peut utiliser les commandes Spec Kit de ce dépôt depuis GitHub Copilot sans supprimer les intégrations Codex et Claude déjà installées.

**Why this priority**: L’intégration du CLI doit réellement produire les consignes que Copilot peut exécuter, et non seulement inscrire son nom dans le workflow.

**Independent Test**: Installer l’intégration officielle Copilot dans le mode cohérent avec le dépôt, puis vérifier son état, ses fichiers gérés et la conservation des installations existantes.

**Acceptance Scenarios**:

1. **Given** Spec Kit 1.2.3 et les intégrations Codex et Claude présentes, **When** Copilot est ajouté après examen des conflits, **Then** les trois intégrations sont installées et Codex reste le défaut.
2. **Given** Copilot installé, **When** un contributeur ouvre le dépôt dans GitHub Copilot, **Then** les commandes Spec Kit sont disponibles selon le mode Copilot sélectionné.
3. **Given** l’ajout est terminé, **When** le statut et les manifestes sont contrôlés, **Then** les fichiers gérés sont intègres et le contrôle du dépôt les vérifie.

### User Story 2 - Exécuter le cycle via Copilot (Priority: P1)

Un contributeur peut lancer le workflow Spec Kit en sélectionnant explicitement l’intégration Copilot et suivre les mêmes portes de revue que les autres intégrations.

**Why this priority**: La présence des skills ne prouve pas que le moteur peut transmettre les étapes à Copilot.

**Independent Test**: Exécuter un parcours de workflow contrôlé avec l’intégration Copilot et vérifier que l’analyse précède l’approbation, que le refus bloque l’implémentation et que l’exécution peut converger après approbation.

**Acceptance Scenarios**:

1. **Given** Copilot CLI disponible et authentifié, **When** le workflow est lancé avec `integration: copilot`, **Then** le moteur transmet les étapes Spec Kit au format d’invocation Copilot pris en charge.
2. **Given** l’analyse est terminée, **When** l’approbation est refusée, **Then** l’implémentation n’est pas appelée.
3. **Given** le cycle est approuvé, **When** l’implémentation et la convergence se terminent, **Then** les tâches restantes et limites de validation sont visibles.
4. **Given** le CLI Copilot ou l’authentification est indisponible, **When** le parcours réel ne peut pas être exécuté, **Then** le contrôle reste `NOT_RUN` et ne se présente pas comme une réussite.

### Edge Cases

- L’intégration Copilot n’est pas déclarée sûre pour une installation multiple dans Spec Kit 1.2.3 ; les conflits de fichiers doivent être examinés avant d’autoriser `--force`.
- L’installation de Copilot ne doit pas changer le défaut Codex ni retirer Claude.
- Le mode commandes et le mode skills sont mutuellement exclusifs ; le dépôt conserve un seul mode explicite et documenté.
- L’intégration IDE peut être installée sans CLI, mais le dispatch réel du workflow exige Copilot CLI.
- Un conflit ou une modification locale de fichier géré interrompt l’installation ou la validation ; aucun fichier personnalisé n’est écrasé silencieusement.

## Requirements

### Functional Requirements

- **FR-001**: Le dépôt MUST installer l’intégration officielle `copilot` du catalogue Spec Kit versionné par le projet.
- **FR-002**: L’installation MUST conserver Codex et Claude, maintenir Codex comme intégration par défaut et utiliser le mode skills du dépôt.
- **FR-003**: L’utilisation de `--force` MUST être précédée d’un examen des destinations de fichiers et des éventuels conflits avec les intégrations déjà installées.
- **FR-004**: La documentation MUST distinguer l’installation des commandes Copilot dans l’IDE de l’exigence Copilot CLI pour exécuter les étapes du moteur de workflow.
- **FR-005**: Le contrôle documentaire MUST vérifier la présence, la version et les empreintes du manifeste Copilot ainsi que la déclaration de l’intégration dans le workflow.
- **FR-006**: Un test MUST vérifier l’invocation du workflow avec `integration: copilot` et la barrière d’approbation sans appeler `implement` après un refus.
- **FR-007**: Les contrôles MUST représenter le dispatch réel comme `NOT_RUN` lorsque le CLI ou l’authentification Copilot ne sont pas disponibles.
- **FR-008**: Aucun fichier officiel géré par Spec Kit ne MUST être modifié manuellement pour simuler l’installation.

## Key Entities

- **Intégration Copilot**: Adaptateur Spec Kit `copilot` qui installe les instructions propres à GitHub Copilot et transmet les commandes du workflow à l’agent.
- **Manifeste géré**: Registre de fichiers officiels détenus par une intégration, associé à des empreintes de contenu.
- **Exécution de workflow**: Suite d’étapes Spec Kit routées vers l’intégration explicitement sélectionnée, avec portes humaines de décision.
- **Preuve de dispatch**: Résultat d’un test réel ou simulé, avec état `PASS`, `FAIL` ou `NOT_RUN` et les conditions du test.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Le statut Spec Kit rapporte Copilot, Codex et Claude installés, avec Codex conservé comme défaut.
- **SC-002**: Tous les fichiers du manifeste Copilot correspondent à leurs empreintes ; le contrôle documentaire détecte une absence ou une divergence.
- **SC-003**: Un test de dispatch confirme que le moteur choisit le mode d’invocation Copilot et n’appelle jamais l’étape `implement` après un refus.
- **SC-004**: Une exécution réelle via Copilot atteint au minimum la porte d’approbation et produit une preuve de dispatch ; sinon son statut est explicitement `NOT_RUN` avec la cause.

## Assumptions

- Spec Kit 1.2.3 est la version supportée par le dépôt et son catalogue intégré constitue la source de l’intégration Copilot.
- Le mode skills est utilisé car le dépôt a activé `ai_skills`; le mode commandes n’est pas activé dans cette évolution.
- L’authentification Copilot et l’installation de Copilot CLI sont des prérequis locaux, pas des secrets à versionner ni des dépendances de CI.
- L’autorisation utilisateur de co-installer avec `--force` est limitée à ce dépôt et n’autorise pas l’écrasement de fichiers personnalisés en cas de conflit détecté.
