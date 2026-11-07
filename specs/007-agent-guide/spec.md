# Specification: Agent guide

**Feature Branch**: `007-agent-guide`

**Created**: 2026-11-07

**Status**: Complete

**Input**: User request: « Analyse la codebase et améliore le agent.md pour avoir à minima les commandes, résumé et objectif du projet, do et don't, stack technique et architecture + référence à speckit et autres fichiers importants. »

## User Scenarios & Testing

### User Story 1 - Comprendre le projet rapidement (Priority: P1)

Une personne qui découvre le dépôt utilise son guide d’agent pour comprendre son objectif, son périmètre courant, sa stack et son architecture.

**Why this priority**: Ce guide est le premier point d’orientation des agents et contributeurs.

**Independent Test**: Vérifier que le guide résume correctement le projet et indique où consulter les détails maintenus.

**Acceptance Scenarios**:

1. **Given** un contributeur qui découvre le dépôt, **When** il lit le guide, **Then** il distingue l’objectif du template, le périmètre livré et les capacités différées.
2. **Given** un agent qui doit localiser un module, **When** il consulte la section architecture, **Then** il trouve les responsabilités des applications et des contrats partagés.

### User Story 2 - Exécuter les contrôles appropriés (Priority: P1)

Une personne qui travaille sur le dépôt trouve les commandes principales et les conditions nécessaires à leur exécution.

**Why this priority**: Des commandes exactes et des limites explicites évitent les contrôles mal interprétés.

**Independent Test**: Comparer chaque commande du guide aux scripts déclarés et aux documents d’exploitation.

**Acceptance Scenarios**:

1. **Given** une modification documentaire ou applicative, **When** l’agent cherche les contrôles pertinents, **Then** le guide fournit les commandes et renvoie vers les prérequis détaillés.
2. **Given** une vérification qui dépend d’une infrastructure jetable, **When** elle n’est pas disponible, **Then** le guide interdit de déclarer ce contrôle réussi.

### User Story 3 - Respecter les règles de contribution (Priority: P1)

Un agent applique les règles d’architecture, de sécurité, de documentation et de workflow sans dupliquer les documents spécialisés.

**Why this priority**: Les règles communes protègent les frontières tenant et rendent les changements cohérents.

**Independent Test**: Vérifier que les règles « faire / ne pas faire » et les liens vers les sources de vérité couvrent le cycle de changement.

**Acceptance Scenarios**:

1. **Given** un changement de code ou de documentation, **When** l’agent commence le travail, **Then** il suit la constitution et le workflow Spec Kit.
2. **Given** un changement de backend, données, IAM ou interface, **When** l’agent prépare le travail, **Then** il charge les standards et guides spécialisés applicables.

### Edge Cases

- Une commande ou une référence peut changer : le guide doit pointer vers la source maintenue plutôt que recopier des instructions opérationnelles complètes.
- Un contrôle peut dépendre de services absents : son statut reste non exécuté, jamais réussi par défaut.
- Des capacités documentées peuvent être planifiées ou inconnues : le guide doit les distinguer de l’état réellement vérifié.

## Requirements

### Functional Requirements

- **FR-001**: Le guide MUST résumer en français l’objectif du dépôt et séparer le socle présent des capacités différées.
- **FR-002**: Le guide MUST décrire la stack et les principaux modules à partir de la configuration et de la documentation courantes.
- **FR-003**: Le guide MUST fournir les commandes essentielles de développement, vérification, documentation et sécurité avec leurs prérequis notables.
- **FR-004**: Le guide MUST exprimer des règles concises de contribution et des « do / don’t » alignés sur la constitution.
- **FR-005**: Le guide MUST diriger vers Spec Kit, la constitution, les standards et les documents spécialisés pertinents sans recopier leur contenu.
- **FR-006**: Les références locales MUST résoudre vers les fichiers existants, et toute affirmation sur le statut ou la sécurité MUST rester limitée aux preuves disponibles.
- **FR-007**: Les problèmes d’accessibilité sévères relevés dans les références maintenues MUST recevoir une correction minimale et sûre ; les fichiers Spec Kit officiels générés et les documents SDD archivés MUST rester inchangés, sauf le registre de réconciliation explicitement maintenu.

## Key Entities

- **Guide d’agent**: Carte de navigation et de contribution au dépôt, sans remplacer la constitution ni les documents spécialisés.
- **Sources de vérité**: Configuration, constitution, standards et documentation détaillée qui définissent l’état courant.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Le guide couvre les six sujets demandés : objectif, résumé, règles, stack, architecture et références Spec Kit/documents.
- **SC-002**: Toutes les commandes présentées correspondent à un script ou à une procédure existante, et leurs prérequis critiques sont indiqués.
- **SC-003**: Tous les liens locaux du guide pointent vers des fichiers existants.
- **SC-004**: Le guide distingue les contrôles automatisés, les contrôles nécessitant une infrastructure et les limites de preuve.
- **SC-005**: Le rapport d’audit couvre les 29 fichiers approuvés et distingue les corrections appliquées des constats laissés intacts pour préserver les fichiers générés ou archivés.

## Assumptions

- `AGENTS.md` est le fichier visé par « agent.md » et reste une carte concise, pas une nouvelle documentation exhaustive.
- La constitution et `docs/setup/spec-kit.md` demeurent les autorités pour les règles et le cycle de changement.
- Les commandes déjà définies dans `package.json` et les conditions du runbook restent la référence opérationnelle.
