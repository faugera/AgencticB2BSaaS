# Spécification : Édition sûre du profil par tenant

**Feature Branch**: `004-profile-scope-editing`
**Created**: 2026-11-01
**Status**: In Progress
**Input**: « analyser l'ensemble des features de ce boilerplate B2B, implémente ce qu'il faut pour pouvoir éditer les profils, vérifie les routes, regarde s'il faut un middleware & co. L'idée c'est d'avoir une base complète »

## User Scenarios & Testing

### User Story 1 - Modifier son profil (Priority: P1)
Une personne connectée peut corriger ses informations personnelles et les
informations professionnelles associées au tenant courant, sans pouvoir modifier
son identité, son rôle, son statut ou les informations d'une autre personne.

**Why this priority**: Le profil modifiable est une capacité de base d'un SaaS B2B.

**Independent Test**: Modifier les champs autorisés, puis vérifier leur persistance,
la conservation de l'email vérifié et des sessions, et le refus de propriétés réservées.

**Acceptance Scenarios**:
1. **Given** un profil valide, **When** la personne enregistre ses champs,
   **Then** les changements sont visibles et une confirmation est annoncée.
2. **Given** une demande contenant un rôle, un statut ou un identifiant d'acteur,
   **When** elle est envoyée, **Then** elle est refusée sans mutation.

### User Story 2 - Changer de tenant sur le profil (Priority: P1)
Une personne autorisée à plusieurs tenants peut consulter et modifier les
informations professionnelles du tenant sélectionné sans réutiliser les valeurs
du tenant précédemment affiché.

**Why this priority**: Les métadonnées professionnelles sont tenant-scopées ; leur
réutilisation silencieuse peut écraser des données légitimes d'un autre tenant.

**Independent Test**: Charger deux tenants avec des valeurs distinctes, passer de
l'un à l'autre et vérifier qu'aucune donnée de l'ancien profil n'est affichée ou
envoyée pendant le chargement du nouveau.

**Acceptance Scenarios**:
1. **Given** un profil affiché pour le tenant A, **When** la portée devient le tenant B,
   **Then** l'ancien formulaire disparaît jusqu'au chargement des données B.
2. **Given** les données B chargées, **When** la personne enregistre une modification,
   **Then** seule la membership B est modifiée.
3. **Given** un tenant non autorisé, **When** son identifiant est demandé,
   **Then** l'API refuse l'accès indépendamment de l'état de l'interface.
4. **Given** le focus clavier dans le formulaire A, **When** la portée devient le tenant B,
   **Then** le focus rejoint une annonce de chargement prévisible et le nouveau formulaire
   reste accessible au clavier.

## Cas limites

- Une réponse tardive de l'ancien tenant ne remplace jamais le profil courant.
- Une erreur de chargement ne laisse pas un formulaire ancien enregistrable.
- Sans tenant actif, les champs personnels restent modifiables ; les champs
  professionnels ne sont pas attribués à une membership.
- Une mise à jour conserve les préférences et sessions d'authentification.

## Requirements

### Exigences fonctionnelles

- **FR-001** : Une personne connectée peut lire et modifier uniquement son profil.
- **FR-002** : Les informations personnelles et tenant-scopées restent séparées.
- **FR-003** : Les rôles, statuts, vérifications et identifiants d'acteur ne sont pas modifiables par le profil.
- **FR-004** : Le changement de tenant invalide le formulaire affiché jusqu'au chargement du profil correspondant.
- **FR-005** : Une réponse asynchrone d'une ancienne portée ne peut pas modifier l'affichage courant.
- **FR-006** : Chaque opération relit côté serveur l'identité, l'acteur actif et la portée autorisée.
- **FR-007** : Les erreurs d'accès et de validation ne divulguent pas de détails internes et n'enregistrent aucune mutation.
- **FR-008** : Le changement de portée ne laisse pas le focus clavier sur un contrôle supprimé et annonce l'état de chargement.

### Entités principales

- **Profil de compte** : informations personnelles, email vérifié et dates du compte.
- **Membership tenant** : informations professionnelles propres à une personne et à un tenant.
- **Portée active** : tenant demandé et validé par les droits serveur.

## Success Criteria

### Résultats mesurables

- **SC-001** : Après chaque changement de tenant, aucune valeur ni soumission du tenant précédent n'est visible pendant le chargement.
- **SC-002** : Les changements de profil atteignent le compte ou la membership attendue et ne modifient aucune portée voisine.
- **SC-003** : Toutes les tentatives de modifier des champs réservés ou d'accéder à un tenant non autorisé sont refusées sans mutation.
- **SC-004** : Les parcours principaux restent utilisables au clavier et en français comme en anglais.
- **SC-005** : Lors du changement de portée avec le focus dans le formulaire, le focus rejoint une annonce visible et le formulaire chargé est ensuite atteignable au clavier.

## Hypothèses

- Les routes de lecture et d'écriture du profil, le formulaire, les préférences et la gestion des sessions existent déjà et sont réutilisés.
- L'API métier établit l'identité vérifiée, l'autorisation et le tenant dans la transaction existante ; aucun middleware parallèle n'est ajouté.
- Les noms, l'email, le statut, la vérification d'email et les dates restent gouvernés par la source d'identité existante.
- Le périmètre n'ajoute ni changement d'email, ni édition d'un autre compte, ni suppression de compte.
