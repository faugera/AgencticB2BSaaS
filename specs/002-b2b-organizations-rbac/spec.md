# Feature Specification: Organisation cliente et autorisations B2B

**Feature Branch**: codex/b2b-organizations-rbac
**Created**: 2026-10-25
**Status**: In Progress
**Input**: Enrichissement joint et arbitrages utilisateur de cette conversation.

## User Scenarios & Testing

### User Story 1 - Un client et plusieurs tenants (Priority: P1)
Une organisation représente un client. Elle possède plusieurs tenants, chacun avec
plusieurs workspaces. Un utilisateur ordinaire appartient à une seule organisation,
mais peut recevoir des appartenances explicites à plusieurs de ses tenants.
**Independent Test**: deux organisations, deux tenants pour la première ; accès explicite
au second tenant autorisé et accès à tout tenant/workspace de l'autre client refusé.
**Acceptance Scenarios**:
1. **Given** deux clients, **When** un utilisateur manipule une portée étrangère,
   **Then** lecture, mutation et association sont refusées côté serveur et SQL.
2. **Given** deux appartenances du même client, **When** il change de tenant,
   **Then** seul le tenant actif explicite est utilisé par la transaction.
3. **Given** une adhésion invited ou suspended, **When** une session existante accède
   au tenant ou à ses workspaces, **Then** l'accès métier est refusé.

### User Story 2 - Pyramide et rôles cumulables (Priority: P1)
La hiérarchie est super_admin > organisation_admin > tenant_admin > workspace_admin > member.
Organisation-admin possède un accès transversal contrôlé et audité aux tenants et workspaces
privés de sa seule organisation. Chaque administrateur gère uniquement les niveaux inférieurs
dans sa portée ; pas de modification de soi, de ses pairs ou de ses supérieurs.
**Independent Test**: matrice des cinq niveaux, portée étrangère, auto-élévation et pairs.
**Acceptance Scenarios**:
1. **Given** un organisation-admin, **When** il administre les tenants de son client,
   **Then** les accès sont autorisés et audités, et ceux d'un autre client sont refusés.
2. **Given** un tenant-admin, **When** il tente de modifier un pair ou un supérieur,
   **Then** la demande est refusée ; le dernier administrateur actif reste protégé.
3. **Given** plusieurs rôles attribués, **When** une permission est calculée,
   **Then** les autorisations se cumulent dans leur portée ; les permissions tenant
   s'appliquent aux workspaces de ce tenant, jamais aux tenants voisins.

### User Story 3 - Catalogue global et gestion des rôles (Priority: P1)
Seul le super-admin crée/modifie les rôles personnalisés globaux composés de permissions
prédéfinies. Il choisit les rôles attribuables par les administrateurs clients. Interfaces
super-admin et tenant-admin ; ce dernier consulte et attribue seulement dans sa portée.
**Independent Test**: créer un rôle, attribuer deux rôles à une membership, retirer une
permission globale et constater l'effet à la requête suivante avec audit daté.
**Acceptance Scenarios**:
1. **Given** un rôle global attribué, **When** le super-admin confirme une modification
   après affichage de son impact, **Then** les permissions changent immédiatement et
   auteur, date, rôle et ajouts/retraits sont journalisés.
2. **Given** un administrateur client, **When** il modifie le catalogue ou attribue un rôle
   non délégable/supérieur, **Then** le serveur refuse, même si la requête est forgée.

### User Story 4 - Mon profil et métadonnées (Priority: P2)
Étendre Mon profil existant : prénom, nom, avatar, téléphone, poste et département dans
la membership du tenant actif. Pas de parcours onboarding séparé ni de rôle éditable.
Préférences langue/thème conservées, timezone/date_format ajoutés. Tenants et workspaces
reçoivent les métadonnées demandées sans moteur de facturation ni comportement d'archivage.
**Independent Test**: enregistrement normalisé, E.164, propriété inconnue refusée, changement
sur le bon tenant et sessions Better Auth conservées.
**Acceptance Scenarios**:
1. **Given** un profil, **When** il est enregistré, **Then** les champs sont validés,
   aucune propriété de rôle/statut/vérification email n'est modifiable.
2. **Given** deux tenants, **When** le poste change, **Then** seule la membership ciblée
   est modifiée ; nom/avatar/vérification/dates ne divergent pas du SDK Better Auth.

### User Story 5 - Journal unique et reprise sans perte (Priority: P1)
Le nouveau journal remplace l'ancien dans les parcours actifs. Distinguer événements
plateforme (tenant nullable, lecture super-admin seule) et événements tenant (lecture
admin actif ou supérieur autorisé dans sa portée). L'historique ancien est conservé,
les événements incompatibles restent archivés ; aucune suppression physique implicite.
**Independent Test**: refus de mutation runtime, absence de contexte, refus membre/autreclient,
lecture autorisée et changement de rôle atomique avec son audit.
**Acceptance Scenarios**:
1. **Given** une mutation autorisée, **When** commit ou rollback, **Then** son événement
   suit la même transaction ; aucune valeur sensible n'est conservée.
2. **Given** les données historiques, **When** les migrations sont appliquées/rejouées,
   **Then** IDs, dates, vérification email et suppression logique sont préservés.

### Edge Cases
Les membres d'un seul client ne peuvent cumuler des appartenances à plusieurs clients.
Un rôle global ne permet pas de contourner cette frontière. Les rôles plateforme ne sont
jamais accordés par un administrateur client. Les privilèges SDK ne valent pas autorisation.
Les données impossibles à déduire produisent un diagnostic ; pas de nom/email/date fictif.

## Requirements

### Functional Requirements
- **FR-001**: Organisation cliente distincte du tenant ; plusieurs tenants/workspaces.
- **FR-002**: Plusieurs memberships tenant explicites par acteur, une seule organisation ordinaire.
- **FR-003**: Seul active autorise l'accès membership ; invited et suspended refusent.
- **FR-004**: Organisation-admin transversal à son client, y compris workspaces privés, audité.
- **FR-005**: Gestion strictement descendante des niveaux, contrôle de portée et dernier admin actif.
- **FR-006**: Rôles globaux personnalisés et cumulables, catalogue modifiable par super-admin seul.
- **FR-007**: Délégation bornée, permissions tenant héritées uniquement dans ses workspaces.
- **FR-008**: Modification globale immédiate après impact/confirmation, retrait tracé avec auteur et date.
- **FR-009**: Interfaces de catalogue super-admin et d'attributions clients, FR/EN et responsive.
- **FR-010**: Profil existant enrichi et DTO strict Zod ou TypeBox ; shared contient seulement les types.
- **FR-011**: Mapping compatible Better Auth sans double vérité email/avatar/dates, MFA facultative.
- **FR-012**: Poste/département sur memberships ; timezone/date_format sur préférences.
- **FR-013**: Tenants : slug unique, billing_email, VAT/pays, enums abonnement et metadata.
- **FR-014**: Workspaces : slug unique par tenant, description et archived_at sans nouvel archivage.
- **FR-015**: Journal actif unique plateforme/tenant, RLS ENABLE/FORCE, append-only runtime.
- **FR-016**: Reprise atomique/diagnostic, historique conservé, slugs déterministes sans collision.
- **FR-017**: Tests réels sur PostgreSQL/Mailpit jetables, aucune lecture de secrets ni migration dev/prod.
- **FR-018**: Docs/contrats/preuves cohérents, analyse/convergence et PR sans merge automatique.

## Success Criteria

### Measurable Outcomes
- **SC-001**: Matrice de refus démontrée pour les cinq niveaux et deux clients.
- **SC-002**: Rôles cumulés, héritage, suspension et révocation effectifs sur la requête suivante.
- **SC-003**: Reprise d'une base vide et existante démontrée, sans perte d'IDs/dates/email vérifié.
- **SC-004**: Profil, gestion des rôles et audit utilisables FR/EN sur mobile/tablette/desktop.
- **SC-005**: Aucun contrôle obligatoire absent présenté comme PASS ; limites et risques explicites.

## Clarifications

Les décisions organisation, organisation-admin transversal, pyramide stricte, journal unique,
profil existant, rôles personnalisés globaux et cumulables remplacent les anciens choix
organisation=tenant et mono-tenant. Les questions déjà résolues ne sont pas reposées.

Arbitrage final : prénom/nom manquants autorisés jusqu’à la saisie dans Mon profil ;
le DTO de profil complet exige les deux valeurs non vides. Aucune valeur familiale inventée.

## Assumptions
Conserver la stack, pg sans ORM, monolithe, types partagés seuls et MFA facultative.
Les rôles catalogue portent une portée définie ; aucun rôle client n'accorde super_admin.
Les organisations historiques correspondent initialement une à une aux anciens tenants,
qui représentaient chacun un client ; aucun regroupement de clients n'est inféré.
Les valeurs d'abonnement free/active, pays FR et préférences Europe/Paris/DD/MM/YYYY sont
les valeurs explicitement demandées dans le texte joint, sans restriction commerciale.
