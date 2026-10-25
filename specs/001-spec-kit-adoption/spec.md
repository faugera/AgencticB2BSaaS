# Feature Specification: Adoption Spec Kit et cohérence documentaire

**Feature Branch**: codex/spec-kit-adoption
**Created**: 2026-10-25
**Status**: Complete
**Input**: Plan utilisateur approuvé : migration officielle, historique préservé et CI légère.

## User Scenarios & Testing

### User Story 1 - Un contrat commun aux assistants (Priority: P1)
Un contributeur Codex ou Claude utilise les mêmes principes et le workflow officiel.
**Independent Test**: vérifier les deux intégrations et leur lecture de la constitution.
**Acceptance Scenarios**:
1. **Given** le dépôt existant, **When** les intégrations sont installées, **Then** les
   skills officiels sont présents sans modification des fichiers gérés.
2. **Given** une correction documentaire, **When** l'agent démarre, **Then** spec, plan et
   tâches sont exigés, avec tests proportionnés et autonomie dans le périmètre approuvé.

### User Story 2 - Documents cohérents et historique honnête (Priority: P1)
Le contributeur distingue l'état courant et les limites des anciens checkpoints.
**Independent Test**: réconcilier les cinq anciens chantiers et les commandes avec le code.
**Acceptance Scenarios**:
1. **Given** les anciens statuts, **When** les preuves sont inspectées, **Then** un registre
   séparé conserve les dossiers originaux et décrit les lacunes restantes.
2. **Given** un document actuel, **When** il décrit bootstrap, Brume, audit ou lifecycle,
   **Then** ses commandes et capacités correspondent au code fusionné dans PR7.

### User Story 3 - Détecter les erreurs documentaires simples (Priority: P2)
Un contributeur reçoit localement et en CI un diagnostic reproductible.
**Independent Test**: exécuter le contrôle et des fixtures valides/invalides.
**Acceptance Scenarios**:
1. **Given** un lien cassé ou un statut inconnu, **When** le contrôle s'exécute,
   **Then** il échoue avec chemin et cause ; les liens externes ne sont pas téléchargés.
2. **Given** une preuve historique, **When** le contrôle s'exécute, **Then** il ne lui impose
   pas le nouveau format et ne la réécrit pas.

### Edge Cases
- Aucun ancien statut n'est promu sur la seule base d'une fusion Git.
- Une preuve manquante produit une suite explicite, pas une réussite inventée.
- Les modèles officiels ne sont pas des specs projet à valider.
- Le pointeur de feature est local ; aucun chemin utilisateur absolu n'est partagé.

## Requirements

### Functional Requirements
- **FR-001**: Installer Codex/Claude officiels de Spec Kit 1.2.3, provenance vérifiée.
- **FR-002**: Définir constitution commune, navigation concise et workflow systématique.
- **FR-003**: Préserver les anciennes specs/preuves et réconcilier chaque chantier séparément.
- **FR-004**: Corriger docs/standards, conserver deux skills projet et retirer les cinq anciens du routage actif.
- **FR-005**: Contrôler localement/en CI liens, chemins déclarés, structures et statuts, avec tests positifs/négatifs.
- **FR-006**: Démontrer analyse et convergence de cette migration, livrer une PR sans merge.

## Success Criteria

### Measurable Outcomes
- **SC-001**: Deux intégrations présentes, zéro fichier géré modifié ou manquant.
- **SC-002**: Cinq anciens chantiers référencés, aucun fichier historique modifié.
- **SC-003**: Contrôle et tests passent et détectent les erreurs injectées en fixtures.
- **SC-004**: Chaque FR correspond à une tâche et une preuve ; aucun changement produit ou SQL.

## Assumptions
PR7 fusionnée à 10b4e7c ; aucun déploiement ni état DB déduit de cette fusion.
Documents projet en français ; identifiants et fichiers officiels en anglais.
Specs terminées historiques ; aucune seconde orchestration SDD active.
