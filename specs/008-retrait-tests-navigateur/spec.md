# Spécification : Retrait des tests navigateur

**Feature Branch**: `codex/retrait-tests-navigateur`
**Status**: In Progress

## User Scenarios & Testing

Le propriétaire ne souhaite plus de tests automatisés pilotant un navigateur, ni localement ni en CI. Les tests unitaires, HTTP, PostgreSQL et d'isolation restent disponibles.

## Requirements

- **FR-001** : Retirer les suites et l'outillage Playwright ainsi que leurs commandes et étapes CI.
- **FR-002** : Conserver les tests unitaires, HTTP, PostgreSQL, d'isolation et de préservation des migrations.
- **FR-003** : Synchroniser les commandes et limites de vérification documentées ; conserver les preuves historiques comme telles.

## Success Criteria

- **SC-001** : Aucun test navigateur automatisé ne figure dans la suite active ou la CI.
- **SC-002** : Les contrôles restants passent ou sont explicitement NOT_RUN selon leur infrastructure.
