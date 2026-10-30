# Feature Specification: Isolation de l'annuaire des organisations

**Feature Branch**: `codex/b2b-organizations-rbac`
**Created**: 2026-10-30
**Status**: In Progress
**Input**: Corriger la fuite inter-organisation signalée par la revue privée de la PR 9.

## User Scenarios & Testing

### User Story 1 - Annuaire limité à la portée (Priority: P1)

Un membre consulte l'annuaire utilisé par l'interface sans obtenir le nom ou l'identifiant d'un autre client.

**Independent Test**: avec deux organisations actives et une supprimée logiquement, un membre du premier client ne reçoit que son organisation ; un super-admin reçoit les deux organisations actives.

**Acceptance Scenarios**:

1. **Given** un membre rattaché à un client, **When** il appelle l'annuaire, **Then** seules les organisations auxquelles il a accès sont retournées.
2. **Given** une organisation supprimée logiquement, **When** un super-admin consulte l'annuaire, **Then** elle n'est pas retournée.

### Edge Cases

- Une session sans contexte d'acteur ne reçoit aucune organisation, conformément aux protections SQL existantes.

## Requirements

### Functional Requirements

- **FR-001**: `business.organization_directory()` ne doit retourner que les organisations accessibles par l'acteur courant.
- **FR-002**: Les organisations avec `deleted_at` non nul ne doivent jamais apparaître dans l'annuaire.
- **FR-003**: La correction doit être une migration additive ; les migrations appliquées restent inchangées.
- **FR-004**: Une preuve SQL d'isolation sur deux clients doit couvrir le comportement.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Le test d'intégration prouve qu'un membre ne reçoit pas l'organisation étrangère ni l'organisation supprimée.
- **SC-002**: Le même test prouve qu'un super-admin reçoit toutes les organisations actives et aucune supprimée.

## Assumptions

- La route `GET /api/organizations` reste le contrat d'annuaire existant ; seule sa source SQL est restreinte.
