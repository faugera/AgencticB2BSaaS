# Specification: Essential Integration Test Runs

**Feature Branch**: `codex/integration-test-efficiency`
**Created**: 2026-11-01
**Status**: In Progress
**Input**: « Réduire au maximum les tests d’intégration pour viser l’essentiel et le moins coûteux en termes de tokens. »

## User Scenarios & Testing

### User Story 1 - Éviter les intégrations répétées en CI (Priority: P1)

Une équipe lance les contrôles de sécurité et d'isolation sur chaque changement,
sans payer deux fois l'exécution d'un même scénario PostgreSQL.

**Why this priority**: Les contrôles actuels couvrent déjà l'isolation dans la suite
complète, puis la relancent dans une étape dédiée.

**Independent Test**: Vérifier la liste de fichiers exécutés par chaque commande
CI et confirmer que la suite d'isolation est exécutée une seule fois.

**Acceptance Scenarios**:
1. **Given** l'étape de sécurité, **When** elle exécute ses intégrations,
   **Then** elle ne lance pas la suite d'isolation exécutée par l'étape dédiée.
2. **Given** l'étape dédiée d'isolation, **When** elle s'exécute,
   **Then** ses scénarios SQL/HTTP restent exécutés une fois sur PostgreSQL jetable.
3. **Given** un développeur qui demande la suite complète, **When** il lance
   `pnpm test:auth`, **Then** toutes les intégrations disponibles restent incluses.

### User Story 2 - Garder les preuves de sécurité essentielles (Priority: P1)

Les contrôles distincts d'authentification, de frontières tenant, d'audit, de
persistance métier, de migration et de courrier restent exécutés et signalés sans
confondre une absence d'infrastructure avec une réussite.

**Why this priority**: Réduire le coût ne doit pas affaiblir les garanties B2B ou
transformer une vérification non exécutée en preuve positive.

**Independent Test**: Comparer les fichiers d'intégration uniques et leurs portes CI
avant/après ; seul le lancement redondant de la suite d'isolation peut disparaître.

**Acceptance Scenarios**:
1. **Given** un changement soumis à la CI, **When** la validation s'exécute,
   **Then** chaque fichier d'intégration unique requis passe au moins une fois.
2. **Given** les variables PostgreSQL jetables absentes, **When** les tests sont
   demandés localement, **Then** le résultat reste un blocage explicite ou `NOT_RUN`,
   jamais `PASS`.

## Edge Cases

- Une commande ciblée doit pouvoir lancer l'isolation seule pour un changement
  SQL/RLS sans lancer toutes les autres intégrations.
- Une commande complète doit continuer à inclure l'isolation afin de fournir une
  validation exhaustive hors du chemin CI partitionné.
- Les tests de préservation/rejeu de migration restent isolés sur leur base vide dédiée.

## Requirements

### Functional Requirements

- **FR-001** : La CI MUST exécuter chaque fichier d'intégration distinct requis au
  moins une fois, sans lancer deux fois une même suite dans le même workflow.
- **FR-002** : La porte sécurité MUST exclure uniquement la suite d'isolation lorsque
  cette dernière est lancée par une étape CI dédiée.
- **FR-003** : La commande complète d'intégration MUST conserver tous les fichiers,
  y compris isolation et préservation de migration (selon son prérequis explicite).
- **FR-004** : Les scénarios qui protègent l'identité, l'accès tenant, RLS, l'audit,
  les données métier et les parcours d'authentification MUST rester couverts.
- **FR-005** : Les commandes et limites de chaque niveau de tests MUST être décrites
  sans présenter les tests simulés comme preuve d'autorisation ou de persistance.
- **FR-006** : Les tests nécessitant PostgreSQL ou SMTP MUST rester conditionnés à une
  infrastructure jetable explicitement configurée.

## Key Entities

- **Suite complète** : ensemble des fichiers d'intégration PostgreSQL sélectionnés
  par la configuration d'authentification.
- **Suite sécurité hors isolation** : intégrations exécutées par la porte sécurité
  lorsque l'isolation est testée séparément.
- **Porte CI** : étape qui exécute une fois une suite complète ou ciblée.

## Success Criteria

### Measurable Outcomes

- **SC-001** : La suite d'isolation ne s'exécute qu'une fois dans un workflow CI.
- **SC-002** : Le nombre de scénarios d'intégration de sécurité/tenant distincts
  exécutés reste inchangé.
- **SC-003** : La CI supprime une exécution redondante de 15 scénarios d'isolation,
  soit une réduction de 50 % pour cette suite dans le workflow.
- **SC-004** : La commande complète continue à découvrir les mêmes fichiers
  d'intégration qu'avant le changement.

## Assumptions

- « Moins coûteux » désigne d'abord le coût d'exécution CI, le temps de calcul et
  l'entretien, pas une consommation de tokens du modèle : les tests locaux ne
  consomment pas de tokens IA en eux-mêmes.
- Les scénarios distincts de sécurité et d'isolation restent nécessaires, conformément
  aux garanties B2B du dépôt.
- La réduction la plus sûre consiste à supprimer une exécution redondante, sans
  supprimer d'assertion de test.
