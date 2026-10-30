# Feature Specification: Schéma d'architecture maintenu

**Feature Branch**: codex/architecture-diagram
**Created**: 2026-10-30
**Status**: In Progress
**Input**: Actualiser le schéma d'architecture et de données et prévoir sa maintenance.

## User Scenarios & Testing

### User Story 1 - Consulter la version du dépôt (Priority: P1)
Un lecteur comprend les composants et les principales relations du modèle B2B,
en distinguant la révision du code d'un état réellement déployé.
**Independent Test**: comparer le schéma aux migrations et aux documents sources.
**Acceptance Scenarios**:
1. **Given** la branche B2B, **When** le lecteur ouvre le schéma, **Then** il voit organisation → tenants → workspaces, RBAC et audit actif.
2. **Given** un écran étroit, **When** le lecteur consulte les vues, **Then** les libellés restent accessibles sans débordement global.

### User Story 2 - Revoir le schéma quand ses sources évoluent (Priority: P1)
Un contributeur reçoit un signal en local et en CI lorsque les sources suivies changent,
puis met à jour ou confirme le schéma après revue humaine.
**Independent Test**: modifier, ajouter et retirer une source dans un répertoire temporaire.
**Acceptance Scenarios**:
1. **Given** une source suivie modifiée, **When** le contrôle s'exécute, **Then** il échoue et indique comment effectuer la revue.
2. **Given** une revue effectuée, **When** le contributeur actualise le manifeste, **Then** le contrôle réussit.

### Edge Cases
- Une modification sans effet visuel nécessite une confirmation, pas une modification artificielle du dessin.
- Le contrôle ne détecte pas les changements sémantiques des sources non suivies et ne prouve pas l'exactitude métier.

## Requirements

### Functional Requirements
- **FR-001**: Versionner une vue autonome de l'architecture et des principales tables et relations du code courant.
- **FR-002**: Identifier les limites de la vue et ne pas prétendre inspecter une base déployée.
- **FR-003**: Signaler les changements des documents de référence et migrations en local et CI ; documenter la revue manuelle et l'actualisation.
- **FR-004**: Conserver l'accès depuis le fichier local existant vers le schéma versionné.
- **FR-005**: Les tests navigateur de la branche doivent vérifier les rôles avec le menu mobile ouvert et disposer d'un budget adapté aux captures visuelles sans retirer les assertions.
- **FR-006**: Les parcours réels SMTP utilisent une base jetable distincte des tests de sécurité, sans affaiblir le refus de modifier un opérateur non-fixture.

### Key Entities
- Sources suivies : documents d'architecture et de données, fichiers de migration SQL.
- Manifeste : empreinte des sources revues, sans preuve automatique de cohérence.

## Success Criteria

- **SC-001**: Les relations client, tenant, workspace, adhésion, rôles et audit correspondent aux migrations en branche.
- **SC-002**: Le contrôle détecte l'ajout, la suppression et la modification d'une source et réussit après confirmation.
- **SC-003**: La page s'ouvre en local et reste utilisable au clavier et aux trois tailles d'écran.
