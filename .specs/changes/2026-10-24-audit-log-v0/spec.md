---
id: "2026-10-24-audit-log-v0"
status: implementing
---

## 1. Objectif & Scope

Journal persistant des changements importants et consultation super-admin FR/EN.
Réutiliser authorization_private.audit ; aucune nouvelle infrastructure de logs.
Périmètre : tenants, workspaces, identités, acteurs, appartenances, invitations,
demandes d'accès et apparence des workspaces. Tracer les mutations effectives
(création/modification/suppression), auteur connu, cible, tenant et champs modifiés.
Ne conserver aucune valeur de profil, email, mot de passe ou token dans le journal.
MFA reste facultative en V0, conformément à la décision utilisateur.
Hors scope : nouvelles opérations CRUD, suppression physique, export, rétention,
alertes, logs de connexion/refus, préférences cosmétiques personnelles.
Les écritures identité/opérateur sans contexte métier ont un auteur inconnu,
jamais attribué par hypothèse à l'utilisateur cible. Historique ancien conservé.

## 2. Standards Applicables

architecture-stack, b2b-tenancy-rbac, api-validation-errors, ui-components-state
et workflow sous `.specs/standards/` (index et doc-sync-map inspectés).

## 3. Code Existant à Réutiliser

- apps/api/migrations/0002_business.sql : table audit, record_audit et fonctions étroites.
- apps/api/src/business/store.ts : transaction et contexte serveur.
- apps/api/src/business/routes.ts : transact partagé ; nouveau module audit-routes
  pour garder la nouvelle responsabilité isolée sans refactorer le fichier existant.
- apps/web/src/application.tsx, main.tsx, admin/AdminSidebar.tsx : shell et gardes.
- apps/web/src/ui/primitives.tsx, pages/messages.ts : contrôles et traductions.
- Nouveau composant pages/AuditLog.tsx : aucune page de consultation existante.

## 4. Sécurité B2B & Multi-Tenancy

Lecture globale ou filtrée par tenant uniquement super-admin actif, contrôlée en
HTTP et SQL. Aucun grant direct sur audit. Événements append-only au runtime,
atomiques avec la mutation ; rollback supprime aussi l'événement. Triggers à
search_path fixe, champs autorisés explicitement. Aucun snapshot JSON des données.
Pagination descendante par identifiant bigint sérialisé comme texte, 50 événements.
Tests : sans session, membre, tenant-admin, SQL sans contexte, limite/cursor invalides,
filtre tenant, rollback, champs sensibles absents et interdiction UPDATE/DELETE.
Jobs/exports/agents : NOT_APPLICABLE, aucun nouveau runtime.

## 5. Delta Fonctionnel & Technique

### ADDED
Migration 0010 : métadonnées minimales, triggers ciblés, fonction SQL de lecture.
GET /api/platform/audit?tenantId=<uuid>&before=<bigint positif>.
Page /admin/audit : liste récente, portée globale/tenant, suite paginée, états
chargement/vide/erreur, reprise, dates Intl, sources historiques distinguées.
### MODIFIED
Navigation admin ; documentation du périmètre d'audit et absence de MFA obligatoire.
### REMOVED
Aucun mécanisme supprimé ; événements métier historiques conservés et distingués
des événements de mutation afin de ne pas casser les contrats existants.

### Critères d'acceptation

- GIVEN une mutation autorisée WHEN commit THEN événement change.* avec cible et champs autorisés.
- GIVEN une mutation WHEN rollback THEN aucun événement persistant.
- GIVEN un UPDATE sans modification des champs audités THEN aucun événement change.updated.
- GIVEN un compte ordinaire ou sans session WHEN lecture HTTP/SQL THEN refus sans données.
- GIVEN un super-admin WHEN lecture THEN ordre décroissant, 50 maximum et curseur stable.
- GIVEN deux tenants WHEN filtre THEN seuls les événements portant le tenant demandé.
- GIVEN des champs sensibles WHEN mutation THEN seules leurs clés explicitement permises sont stockées, jamais leurs valeurs.
- GIVEN fr/en et mobile/tablette/desktop WHEN consultation THEN page utilisable sans débordement horizontal global.

## 6. Impact Documentation Projet (Auto-Doc)

| Cible | Politique | Décision prévue |
| --- | --- | --- |
| docs/data-model.md | required | UPDATED : colonnes et index audit |
| docs/architecture/0005-private-pilot.md | required | UPDATED : périmètre et limites |
| docs/features-b2b.md | required | UPDATED : consultation super-admin |
| .specs/standards/b2b-tenancy-rbac.md | required | UPDATED : frontière lecture audit |
| docs/architecture.md | required | UPDATED : endpoint et flux |
| .specs/domains/product-map.md | required | UPDATED : fonctionnalité et preuves |
| CHANGELOG.md | review | UPDATED : capacité utilisateur |
| README.md / .env.example | required si environment | NOT_APPLICABLE : aucune variable |
| DESIGN.md / DESIGN_UI.md | review | REVIEWED_NO_CHANGE : primitives et liste existantes |

Passage draft → shaped après inspection des appelants et clarification de la page,
puis implementing avant édition applicative. Preuves PostgreSQL jetables et
navigateur réel consignées dans tasks.md ; base de développement non inspectée.
