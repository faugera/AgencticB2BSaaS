---
id: 2026-10-24-lifecycle
status: implementing
---

## 1. Objectif & Scope
Conserver IDs, dates de création/modification/suppression des utilisateurs et organisations.
Suppression logique autorisée par l'utilisateur : conserver les lignes, révoquer les accès.
Migration additive 0011 ; aucune nouvelle UI/API de suppression. Opération SQL réservée
à l'opérateur. Pas de restauration automatique. Pour les anciens tenants, created_at
prend la date de migration faute d'historique fiable.

## 2. Standards Applicables
- `.specs/standards/architecture-stack.md` : migrations versionnées, pg sans ORM.
- `.specs/standards/b2b-tenancy-rbac.md` : autorisation serveur et RLS.
- `.specs/standards/workflow.md` : preuves et synchronisation documentaire.

## 3. Code Existant à Réutiliser
`apps/api/src/business/lifecycle.integration.test.ts` reproduit six échecs.
`apps/api/src/auth/migrate.ts` applique les migrations checksummées.
`apps/api/migrations/0002_business.sql` contient context/tenant_access et RLS.
`apps/api/migrations/0010_audit_log.sql` trace les mutations sans valeurs sensibles.
Une nouvelle migration est nécessaire : les migrations appliquées restent intactes.

## 4. Sécurité B2B & Multi-Tenancy
L'identité supprimée ne peut créer de session ni obtenir de contexte métier.
Le tenant supprimé disparaît des lectures RLS, y compris super-admin, et ses invitations
en attente sont révoquées. Les liens publics ne collectent plus de demandes.
Runtime sans DELETE sur identity.user ; suppression des sessions par trigger étroit.
Pas de changement aux jobs/exports/agents absents du périmètre.

## 5. Delta Fonctionnel & Technique
### ADDED
deletedAt identité ; created_at/updated_at/deleted_at tenants ; triggers de dates et révocation.
### MODIFIED
Contexte métier, politiques tenant et création de sessions refusent les lignes supprimées.
Audit inclut les marqueurs de suppression, sans valeurs.
### REMOVED
Droit DELETE identity.user du runtime ; aucun retrait de ligne ou contrat HTTP.
### Critères d'acceptation
GIVEN une identité ou organisation active WHEN modification THEN ID/création préservés et updated auto.
GIVEN utilisateur connecté WHEN deletedAt défini THEN sessions révoquées et connexions refusées.
GIVEN création de session concurrente WHEN suppression validée THEN aucune session persistée.
GIVEN tenant et invitation WHEN deleted_at défini THEN accès/invitation refusés et autre tenant intact.
Vérification : tests lifecycle réels, isolation, auth et audit existants sur DB jetable.

## 6. Impact Documentation Projet (Auto-Doc)
UPDATED required : docs/data-model.md (colonnes et dates historiques),
docs/architecture/0005-private-pilot.md, docs/features-b2b.md,
.specs/standards/b2b-tenancy-rbac.md (garanties de révocation),
.specs/domains/product-map.md (statut lifecycle).
UPDATED review : CHANGELOG.md (capacité réelle).
REVIEWED_NO_CHANGE : docs/architecture.md (aucun flux HTTP nouveau).
NOT_APPLICABLE : README.md/.env.example (aucune variable ajoutée), UI/design (aucun changement).
