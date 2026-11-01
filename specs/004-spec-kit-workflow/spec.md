# Feature Specification: Fiabilisation du workflow Spec Kit

**Feature Branch**: `004-spec-kit-workflow`

**Created**: 2026-10-31

**Status**: Draft

**Input**: User description: « Mets en place les préconisations et pose moi des questions s'il faut décider sur les éléments. »

## User Scenarios & Testing

### User Story 1 - Enchaîner le cycle Spec Kit complet (Priority: P1)

Un contributeur veut suivre le cycle Spec Kit du cadrage à la convergence sans oublier
les contrôles obligatoires. Le workflow guide les étapes dans l'ordre et distingue une
clarification facultative d'une approbation humaine.

**Why this priority**: Un workflow incomplet peut autoriser l'implémentation avant
l'analyse des artefacts ou terminer sans vérifier le travail restant.

**Independent Test**: Examiner la configuration du workflow et vérifier qu'elle décrit
les étapes, conditions et portes d'approbation dans l'ordre attendu.

**Acceptance Scenarios**:

1. **Given** une feature en cours de cadrage, **When** le cycle est lancé, **Then**
   spécification, clarification, plan, tâches et analyse sont effectués dans cet ordre ;
   la checklist reste une action manuelle facultative après la revue du plan.
2. **Given** une analyse terminée, **When** l'utilisateur approuve explicitement
   l'implémentation, **Then** le workflow autorise l'implémentation puis la convergence.
3. **Given** l'utilisateur rejette ou n'approuve pas l'implémentation, **When** la porte
   de validation est atteinte, **Then** aucun travail d'implémentation n'est lancé.
4. **Given** une convergence terminée, **When** le cycle est clos, **Then** il ne fusionne
   ni ne déploie automatiquement et rend visibles les tâches restantes et les limites.

### User Story 2 - Démarrer une feature sans ambiguïté (Priority: P1)

Un contributeur ouvre un checkout neuf ou change de feature et doit sélectionner
explicitement la bonne feature, sans que la branche Git ou un pointeur périmé choisisse
silencieusement une autre spec.

**Why this priority**: Le pointeur de feature est local et ignoré par Git ; une résolution
incorrecte peut diriger toutes les commandes Spec Kit vers les mauvais artefacts.

**Independent Test**: Vérifier les instructions de reprise et exécuter le prérequis
Spec Kit avec une feature explicitement sélectionnée, sans écrire le pointeur local.

**Acceptance Scenarios**:

1. **Given** un checkout sans `.specify/feature.json`, **When** une feature est indiquée
   par `SPECIFY_FEATURE_DIRECTORY`, **Then** les prérequis retournent ses chemins absolus.
2. **Given** un contrôle annoncé en lecture seule, **When** le contexte de feature est
   résolu, **Then** le pointeur local ignoré n'est ni créé ni remplacé.
3. **Given** un nouveau contributeur, **When** il lit le guide, **Then** il sait comment
   choisir, vérifier et changer explicitement la feature active.

### User Story 3 - Appliquer les garde-fous du dépôt dans les deux intégrations (Priority: P2)

Les contributeurs Codex et Claude appliquent les mêmes consignes projet pour les
frontières tenant et la vérification des changements, sans modifier les skills officiels
gérés par Spec Kit.

**Why this priority**: Une intégration privée de ces consignes peut omettre des contrôles
de sécurité ou de preuve pourtant obligatoires pour le dépôt.

**Independent Test**: Comparer la disponibilité et le contenu des deux skills projet dans
les deux répertoires d'intégration et vérifier que les copies restent identiques.

**Acceptance Scenarios**:

1. **Given** une tâche backend, SQL ou IAM, **When** un contributeur utilise Codex ou
   Claude, **Then** le skill `tenant-boundary` est disponible.
2. **Given** une tâche de validation, **When** un contributeur utilise l'une ou l'autre
   intégration, **Then** `verify-change` décrit les mêmes gates et statuts de preuve.
3. **Given** une mise à jour des skills officiels, **When** le dépôt est contrôlé,
   **Then** les manifestes officiels restent intègres et les skills projet ne sont pas
   confondus avec les fichiers gérés.

### User Story 4 - Détecter les régressions du workflow (Priority: P2)

Un mainteneur veut que la CI détecte une suppression, un réordonnancement ou une
incohérence des étapes obligatoires du workflow avant qu'un cycle incorrect soit livré.

**Why this priority**: La documentation seule ne garantit pas que la configuration
exécutable et les skills restent conformes.

**Independent Test**: Exécuter un contrôle automatisé sur le workflow valide et sur des
fixtures mutées qui omettent ou réordonnent une étape obligatoire.

**Acceptance Scenarios**:

1. **Given** le workflow complet et correctement ordonné, **When** le contrôle tourne,
   **Then** il réussit.
2. **Given** un workflow auquel `analyze` ou la porte d'approbation manque, **When** le
   contrôle tourne, **Then** il échoue avec l'étape fautive identifiée.
3. **Given** les consignes miroir des deux intégrations, **When** leur cohérence est
   contrôlée, **Then** toute divergence des skills projet est signalée.

## Edge Cases

- Une clarification non nécessaire ne bloque pas le cycle ; une décision non résolue ne
  peut pas être traitée comme une approbation.
- Le rejet à une porte d'approbation interrompt le cycle avant toute écriture applicative.
- Une feature archivée ou déjà livrée n'est pas réécrite pour satisfaire ce changement.
- Les fichiers officiels gérés par Spec Kit ne sont ni modifiés ni personnalisés.
- Un pointeur local absent, mal formé ou périmé doit produire une erreur explicite plutôt
  qu'un choix implicite de feature.
- L'indisponibilité des dépendances ou d'un environnement d'intégration reste un échec ou
  `NOT_RUN`, jamais une preuve de réussite.

## Requirements

### Functional Requirements

- **FR-001**: Le workflow MUST contenir dans l'ordre les étapes specify, clarify, plan,
  tasks, analyze, approbation explicite, implémentation, puis converge. La checklist
  MUST rester une action manuelle facultative après la revue du plan ; aucune syntaxe
  conditionnelle non documentée ne sera ajoutée au workflow.
- **FR-002**: Le workflow MUST faire analyser les artefacts et obtenir l'approbation
  explicite de l'utilisateur avant toute implémentation.
- **FR-003**: Un refus à l'approbation MUST interrompre le workflow avant l'implémentation.
- **FR-004**: Le workflow MUST conserver des portes de revue pour la spec et le plan, et
  rendre visibles les tâches non terminées et les contrôles non exécutés.
- **FR-005**: Le workflow MUST s'arrêter après la convergence et MUST NOT fusionner une
  pull request ni déployer.
- **FR-006**: La documentation MUST expliquer la sélection explicite d'une feature dans
  un checkout neuf, la vérification des prérequis et le changement de feature.
- **FR-007**: Les contrôles utilisés en lecture seule MUST résoudre la feature sans créer
  ni modifier `.specify/feature.json`.
- **FR-008**: `tenant-boundary` et `verify-change` MUST être accessibles à Codex et Claude
  et décrire des exigences projet cohérentes.
- **FR-009**: Les skills officiels Spec Kit MUST rester inchangés et leurs manifestes
  d'intégrité MUST continuer à correspondre.
- **FR-010**: Un contrôle automatisé MUST vérifier en CI l'ordre et la présence des
  étapes obligatoires, les portes d'approbation, la parité des skills projet et la
  cohérence de version entre le workflow et son registre.
- **FR-011**: Les docs MUST distinguer le statut historique d'une feature de son état
  opérationnel courant ; aucune spec livrée ne sera rouverte ou réécrite par ce changement.
- **FR-012**: Les résultats de validation MUST distinguer `PASS`, `FAIL`, `NOT_RUN` et
  `NOT_APPLICABLE` sans déclarer un contrôle non exécuté comme réussi.

### Key Entities

- **Cycle Spec Kit**: Suite ordonnée d'étapes et de portes de décision pour une feature.
- **Feature active**: Répertoire Spec Kit sélectionné explicitement pour les commandes
  du checkout courant.
- **Skill projet**: Consigne versionnée propre au dépôt, distincte des skills officiels
  gérés par Spec Kit.
- **Preuve de validation**: Résultat daté, lié à un périmètre et à une commande, avec
  statut et limites explicites.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Le contrôle automatisé rejette toutes les fixtures qui omettent ou
  réordonnent une étape obligatoire ou qui retirent l'approbation avant implémentation.
- **SC-002**: Les deux intégrations exposent les deux skills projet et leurs contenus
  respectent une parité vérifiable.
- **SC-003**: Un checkout sans pointeur local peut résoudre les chemins de la feature
  désignée sans écrire de fichier local lorsqu'il est en mode lecture seule.
- **SC-004**: La CI exécute le contrôle de workflow et de parité avec un résultat visible.
- **SC-005**: Le cycle documenté s'arrête après convergence, sans action de fusion ni
  déploiement.

## Assumptions

- Les fichiers officiels sont ceux déclarés dans les manifestes d'intégration ; les
  skills projet additionnels peuvent être distribués dans les répertoires d'intégration.
- La sélection de feature est une configuration par checkout, non partagée entre branches.
- La demande d'approbation explicite porte sur le démarrage de l'implémentation ; le
  lancement du workflow ne vaut pas approbation implicite de cette étape.
- `specs/002-b2b-organizations-rbac` reste un artefact historique conformément à la
  constitution. Ses tâches ouvertes ne sont pas modifiées ni présentées comme clôturées
  par ce changement.
- Les validations spécifiques à cette feature s'exécutent localement et dans la CI ; elles
  ne nécessitent ni secrets ni base PostgreSQL.
