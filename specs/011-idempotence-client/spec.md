# Spécification : Idempotence côté client

**Feature Branch**: `codex/rattrapage-documentaire`
**Created**: 2026-11-15
**Status**: In Progress
**Input**: Le serveur accepte `Idempotency-Key` depuis la migration 0020, mais le client web n'envoie aucune clé : la capacité est payée et non exploitée.

## User Scenarios & Testing

### User Story 1 - Rejouer une mutation sans doublon (Priority: P1)

Un administrateur soumet une création de tenant, une invitation ou une revue de demande ; si la réponse réseau se perd, le client rejoue la même requête avec la même clé et obtient le résultat initial au lieu d'un doublon.

**Why this priority** : c'est le scénario exact que l'idempotence serveur protège, et le seul qu'un utilisateur ne peut pas déclencher volontairement depuis l'interface.

**Independent Test** : simuler une erreur réseau à la première requête, vérifier que la seconde porte la même clé et que l'issue est unique.

**Acceptance Scenarios**:

1. **Given** une soumission idempotente, **When** la requête part, **Then** l'en-tête `Idempotency-Key` est présent et la méthode attendue est conservée.
2. **Given** une erreur réseau sans réponse, **When** le client rejoue, **Then** il réutilise la même clé et n'effectue qu'un seul rejeu.
3. **Given** une réponse HTTP d'erreur, **When** le client la reçoit, **Then** il ne rejoue pas automatiquement et propage l'erreur.

### User Story 2 - Ne pas généraliser la clé (Priority: P1)

Les lectures et les mutations non idempotentes restent inchangées et n'envoient aucune clé.

**Why this priority** : envoyer une clé là où le serveur ne l'honore pas donnerait une fausse garantie.

**Independent Test** : inspecter les requêtes des appels non concernés et vérifier l'absence d'en-tête.

**Acceptance Scenarios**:

1. **Given** un GET, **When** il part, **Then** aucun `Idempotency-Key` n'est envoyé.
2. **Given** une mutation hors périmètre (rôle, workspace, préférences), **When** elle part, **Then** le client utilise le chemin existant sans clé.

### Edge Cases

- Deux actions utilisateur distinctes doivent produire deux clés différentes, même avec un corps identique.
- Un échec HTTP (4xx/5xx) ne doit pas être masqué par un rejeu.
- Le corps et la méthode doivent rester strictement ceux de l'appel d'origine.

## Requirements

### Functional Requirements

- **FR-001** : Les quatre mutations idempotentes serveur (création de tenant, création d'invitation, mise à jour d'invitation, revue de demande) MUST envoyer un `Idempotency-Key` généré par soumission.
- **FR-002** : Sur erreur réseau sans réponse, le client MUST rejouer au plus une fois avec la même clé.
- **FR-003** : Sur réponse HTTP non réussie, le client MUST échouer sans rejeu.
- **FR-004** : Les lectures et les mutations hors périmètre MUST rester inchangées, sans en-tête.
- **FR-005** : Les contrats de réponse et la validation Zod MUST rester identiques.
- **FR-006** : Les tests unitaires MUST prouver l'en-tête, la stabilité de la clé au rejeu, son renouvellement entre appels et l'absence de rejeu sur erreur HTTP.
- **FR-007** : La documentation MUST décrire la capacité comme disponible côté client, sans prétendre à une garantie de livraison SMTP.

### Key Entities

- **Clé d'idempotence** : UUID v4 généré par soumission, transmis en en-tête.
- **Mutation idempotente** : action serveur listée dans `apps/api/src/business/routes.ts`.
- **Rejeu réseau** : seconde tentative unique après échec de transport.

## Success Criteria

### Measurable Outcomes

- **SC-001** : Les quatre parcours envoient une clé valide (≤ 200 caractères, sans CRLF).
- **SC-002** : Un échec réseau suivi d'un succès produit exactement deux requêtes avec une clé identique.
- **SC-003** : Deux soumissions successives produisent deux clés différentes.
- **SC-004** : Aucun GET ne porte l'en-tête.
- **SC-005** : `pnpm typecheck`, `pnpm lint` et `pnpm test` restent verts avec les nouveaux tests.

## Assumptions

- Le serveur reste seul juge de l'idempotence ; le client ne fait que transmettre la clé.
- Le double-clic est déjà limité par l'état `busy` des boutons ; cette évolution couvre la perte de réponse, pas la discipline d'interface.
- Aucun changement de schéma, de migration ou d'autorisation.
