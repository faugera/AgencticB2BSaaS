# Feature Specification: Correctifs de revue B2B

**Feature Branch**: `codex/b2b-organizations-rbac`
**Created**: 2026-10-30
**Status**: In Progress

## User Scenarios & Testing

### User Story 1 - Portées B2B sûres (Priority: P1)

Les écritures workspace, le contexte par défaut et l'historique d'audit restent bornés au client et tenant autorisés.

**Independent Test**: les migrations rejouées conservent les événements historiques sans tenant, refusent une création workspace hors tenant et choisissent un tenant actif non supprimé.

### User Story 2 - Interfaces selon capacité (Priority: P2)

Un utilisateur accède aux rôles, invitations, profil et audit dans le tenant sélectionné sans réutiliser un état d'un autre tenant.

## Requirements

- **FR-001**: Les migrations historiques restent inchangées ; les correctifs SQL sont additifs.
- **FR-002**: Les événements audit legacy sans tenant sont préservés dans le journal actif.
- **FR-003**: Les routes et écrans transmettent la portée tenant effective.
- **FR-004**: Les invitations, préférences et profil respectent les capacités et le contexte courant.
- **FR-005**: La CI vérifie les menus mobiles, les scénarios visuels et les parcours SMTP sur une base jetable distincte.
- **FR-006**: Les mises à jour concurrentes de préférences sur des champs distincts préservent les autres champs côté serveur.

## Success Criteria

- **SC-001**: Types, lint et tests ciblés passent.
- **SC-002**: Les gates PostgreSQL/IAM prouvent les frontières sur infrastructure jetable.
