# Spécification : Rattrapage documentaire et portabilité du contrôle

**Feature Branch**: `codex/rattrapage-documentaire`
**Created**: 2026-11-15
**Status**: In Progress
**Input**: « Comment rattraper le retard ? » — après l'analyse de `main` au commit `94e8b9a`, le code et la documentation divergent, le contrôle documentaire échoue sous Windows et le backlog de specs ne reflète plus l'état livré.

## User Scenarios & Testing

### User Story 1 - Lire l'état réel de `main` (Priority: P1)

Un lecteur ouvre le README, la vue d'architecture, les capacités B2B ou la carte produit et comprend l'état de `main`, pas celui d'une branche de travail close.

**Why this priority** : les documents décrivent encore la branche `codex/b2b-organizations-rbac` au 25 octobre 2026 et un envoi d'invitation synchrone, alors que l'outbox, l'idempotence, la pagination et le débit partagé sont livrés sur `main`.

**Independent Test** : rechercher les mentions de branche `codex/*`, de dates antérieures à novembre 2026 présentées comme état courant et de « synchronous » dans les documents d'état, puis vérifier que chaque affirmation correspond au code.

**Acceptance Scenarios**:

1. **Given** un lecteur sur le README, **When** il lit « Current limits », **Then** il voit l'outbox, le worker et le store de débit partagé, et les limites réellement différées.
2. **Given** un lecteur sur `docs/architecture.md`, **When** il lit l'en-tête, **Then** il voit l'état de `main` et les specs actives, sans référence à une branche close.
3. **Given** un lecteur sur `docs/features-b2b.md` ou la carte produit, **When** il consulte les statuts, **Then** il distingue l'idempotence disponible côté API de son absence côté client web.

### User Story 2 - Vérifier la documentation sous Windows (Priority: P1)

Un contributeur Windows peut lancer le contrôle documentaire et obtenir un résultat réel, sans faux échec lié au chemin d'un script.

**Why this priority** : `pnpm docs:test` échoue localement sur 1 test alors que `pnpm docs:check` passe ; un contributeur ne peut pas distinguer un défaut documentaire d'un défaut de portabilité.

**Independent Test** : exécuter `pnpm docs:test` sous Windows et en CI Ubuntu ; le même nombre de tests doit passer, et l'absence de `bash` doit produire un saut explicite, jamais un succès simulé.

**Acceptance Scenarios**:

1. **Given** Git Bash disponible sous Windows, **When** `pnpm docs:test` s'exécute, **Then** les 40 tests passent.
2. **Given** `bash` absent de la machine, **When** le test de résolution de feature s'exécute, **Then** il est ignoré avec un motif visible et n'est jamais compté comme réussi.

### User Story 3 - Savoir ce qui reste ouvert (Priority: P2)

Un mainteneur consulte un tableau unique et sait, pour chaque spec, ce qui est livré, ce qui est prouvé et ce qui est bloqué.

**Why this priority** : 15 dossiers de specs et environ 50 tâches ouvertes masquent les 15 tâches réellement dues, dont certaines obsolètes.

**Independent Test** : comparer `specs/STATUS.md` aux `tasks.md` et vérifier que chaque ligne renvoie à une preuve ou à un blocage nommé.

**Acceptance Scenarios**:

1. **Given** une spec non close, **When** le mainteneur ouvre le tableau, **Then** il voit le nombre de tâches restantes et leur nature (publication, preuve, décision, implémentation).
2. **Given** une tâche obsolète, **When** elle est identifiée, **Then** elle est réécrite ou annotée, jamais cochée sans preuve.

### Edge Cases

- Une mention historique (par exemple « 72 scénarios navigateur ») reste acceptable si elle est explicitement datée comme historique.
- Le manifeste d'architecture doit être régénéré après toute modification de `docs/architecture.md`, sinon `docs:check` échoue volontairement.
- Le tableau de statut ne doit pas inventer de preuve pour la CI distante ni pour PostgreSQL jetable.

## Requirements

### Functional Requirements

- **FR-001** : Les documents d'état MUST décrire `main` au commit courant, sans présenter une branche close comme état actif.
- **FR-002** : Les limites MUST refléter le code livré : outbox chiffrée, worker avec bail, idempotence API, pagination keyset et limitation de débit partagée.
- **FR-003** : L'écart entre idempotence serveur et absence de clé côté client MUST être documenté sans le présenter comme une capacité utilisateur disponible.
- **FR-004** : `pnpm docs:test` MUST passer sous Windows lorsque `bash` est disponible et MUST sauter explicitement le test concerné sinon.
- **FR-005** : Un tableau unique MUST résumer l'état des specs avec tâches restantes, preuve et blocage.
- **FR-006** : Aucune migration appliquée, aucun contrat HTTP, aucune autorisation et aucun comportement métier ne MUST changer dans cette évolution.
- **FR-007** : Les preuves MUST distinguer PASS, FAIL et NOT_RUN, notamment pour la CI et PostgreSQL jetable.

### Key Entities

- **Document d'état** : README, vue d'architecture, capacités B2B, carte produit.
- **Contrôle documentaire** : `scripts/docs-check.mjs` et son test de non-régression.
- **Tableau de statut** : `specs/STATUS.md`.

## Success Criteria

### Measurable Outcomes

- **SC-001** : Zéro mention de branche `codex/*` présentée comme état courant dans les documents d'état.
- **SC-002** : `pnpm docs:test` passe 40/40 sous Windows avec `bash` disponible.
- **SC-003** : `pnpm docs:check` passe après régénération du manifeste d'architecture.
- **SC-004** : `specs/STATUS.md` couvre les 15 dossiers de specs existants.
- **SC-005** : `pnpm typecheck`, `pnpm lint` et `pnpm test` restent verts sans modification de code applicatif.

## Assumptions

- Aucun environnement non jetable n'est inspecté dans cette évolution ; l'historique des migrations 0016–0018 reste hors périmètre et `UNKNOWN`.
- Les arbitrages sur la vérification UI et sur le control plane sont différés ; ce lot ne les préempte pas.
- La CI distante n'est pas consultée ; son résultat reste `NOT_RUN` dans les preuves.
