# Spécification : Synchronisation vérifiable de la documentation

**Feature Branch**: `faugera-documentation-sync-harness`
**Created**: 2026-11-07
**Status**: In Progress
**Input**: « faire de verify-change une étape effective du cycle avant sa clôture, puis renforcer docs:check pour exploiter le diff Git et le routage documentaire. Pour chaque règle required affectée, le contrôle devrait exiger soit la modification de la cible, soit une décision explicite et motivée de type REVIEWED_NO_CHANGE / NOT_APPLICABLE. »

## User Scenarios & Testing

### User Story 1 - Vérifier les décisions documentaires avant clôture (Priority: P1)

Un contributeur termine une évolution et doit prouver que chaque document requis
par le type de changement a été mis à jour ou explicitement examiné avant de
clôturer le cycle.

**Why this priority**: Sans gate, l'instruction de synchronisation reste une
convention non vérifiable et les documents dérivent du code.

**Independent Test**: Fournir un diff contenant une source associée à une règle
`required`; le contrôle échoue sans décision par cible et réussit avec des
décisions valides et justifiées.

**Acceptance Scenarios**:
1. **Given** un diff touchant une source d'une règle `required`, **When** une
   cible requise n'a ni été modifiée ni justifiée, **Then** `docs:check` échoue
   en indiquant la règle et la cible.
2. **Given** une cible requise effectivement modifiée, **When** son statut est
   `UPDATED`, **Then** le contrôle accepte cette preuve.
3. **Given** une cible requise non modifiée, **When** son statut est
   `REVIEWED_NO_CHANGE` ou `NOT_APPLICABLE` avec un motif, **Then** le contrôle
   accepte la décision.

### User Story 2 - Appliquer le gate dans le cycle normal (Priority: P1)

Un contributeur suit le cycle Spec Kit et exécute la vérification documentaire
effective avant la revue finale de convergence.

**Why this priority**: Le contrôle automatisé doit être intégré au point de
passage où l'agent et le reviewer peuvent encore corriger le changement.

**Independent Test**: Vérifier que la dernière porte du workflow exige
explicitement `verify-change` et que cette compétence documente l'exécution du
contrôle avec la base Git appropriée.

**Acceptance Scenarios**:
1. **Given** un cycle Spec Kit normal, **When** la convergence est terminée,
   **Then** `verify-change` et les contrôles docs sont demandés avant approbation
   de la clôture.
2. **Given** un résultat `docs:check` en échec ou `NOT_RUN`, **When** le gate
   final est évalué, **Then** le cycle n'est pas présenté comme vérifié.

## Edge Cases

- Un diff sans changement touchant une source routée ne doit pas imposer une
  décision documentaire sans rapport.
- Un changement de cible sans son fichier de décision doit échouer si la source
  associée est aussi affectée.
- Une cible déclarée `UPDATED` mais absente du diff est une décision invalide.
- Une décision sans motif, un statut inconnu, une règle inconnue ou une cible
  hors dépôt doivent échouer explicitement.
- L'absence de base Git valide ne doit jamais désactiver silencieusement le gate.
- Les fichiers historiques de preuves et les fichiers Spec Kit gérés ne doivent
  pas être altérés par ce contrôle.

## Requirements

### Functional Requirements

- **FR-001**: Le routage documentaire MUST déclarer les sources de dépôt
  associées aux catégories documentaires `required`.
- **FR-002**: `docs:check` MUST calculer les fichiers modifiés depuis une base
  Git explicite et identifier les règles `required` affectées.
- **FR-003**: Chaque cible de chaque règle affectée MUST avoir un statut
  `UPDATED`, `REVIEWED_NO_CHANGE` ou `NOT_APPLICABLE` dans l'artefact de
  synchronisation de la feature active.
- **FR-004**: `UPDATED` MUST correspondre à une cible présente dans le diff ;
  les autres statuts MUST inclure une justification non vide.
- **FR-005**: Une décision absente, invalide ou non justifiée MUST faire échouer
  le contrôle avec un diagnostic actionnable.
- **FR-006**: La CI MUST fournir une base Git fiable pour les événements PR et
  push, et exécuter le même contrôle.
- **FR-007**: La porte de convergence Spec Kit MUST exiger l'exécution de
  `verify-change` et l'examen du résultat documentaire avant clôture.
- **FR-008**: Les contrôles existants de liens, structure de specs, intégrité des
  fichiers gérés et synchronisation des sources d'architecture MUST rester actifs.

## Key Entities

- **Règle documentaire** : catégorie de changement, sources, cibles et politique
  décrites dans le routage.
- **Décision de synchronisation** : statut et motif par cible requise affectée,
  conservés avec les artefacts de la feature.
- **Base de comparaison** : référence Git déterminant le diff soumis au contrôle.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Les cas de test couvrent les trois statuts, les sources affectées,
  les cibles modifiées/non modifiées et les entrées invalides.
- **SC-002**: Une cible `required` affectée sans décision valide fait échouer
  `docs:check` dans 100 % des cas testés.
- **SC-003**: Une décision motivée pour chaque cible affectée permet au contrôle
  de réussir sans modifier les règles ni les fichiers historiques.
- **SC-004**: La CI passe une base Git explicite au contrôle documentaire sur
  les événements PR et push.
- **SC-005**: Le workflow Spec Kit demande la vérification documentaire avant
  que sa porte finale puisse être approuvée.

## Assumptions

- Un diff multi-feature est accepté si un unique fichier d’impact modifié couvre
  toutes les règles affectées ; plusieurs fichiers d’impact sont refusés.
- L'artefact de décision est `specs/<feature>/documentation-impact.md`, un
  historique durable propre à la feature.
- Les règles sans politique `required` ne bloquent pas la clôture.
- La CI est la source de vérité pour le contrôle du diff ; localement, la base
  peut être fournie par variable d'environnement ou résolue vers `origin/main`.
