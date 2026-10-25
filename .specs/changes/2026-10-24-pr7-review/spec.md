---
id: 2026-10-24-pr7-review
status: implementing
---
## 1. Objectif & Scope
Corriger les cinq conversations PR7 restantes : resize mobile, destinations invitations/audit,
demandes au-delà de100 et rafraîchissement des invitations après approbation.
Pas de refonte, dépendance ni changement de permission.
## 2. Standards Applicables
Architecture-stack, b2b-tenancy-rbac, api-validation-errors, ui-components-state et workflow
sous `.specs/standards/` : SQL/HTTP/UI cohérents et preuves réelles.
## 3. Code Existant à Réutiliser
AppShell, Application, AccessRequests, safeDestination ; registerAccessRoutes et
business.access_requests. Nouvelle migration0012 car0008 est checksummée.
Réutiliser Button/ui-tabs et les helpers sidebar des tests ; aucun nouveau composant.
## 4. Sécurité B2B & Multi-Tenancy
Conserver tenant_admin et contexte transactionnel. Curseur UUID validé HTTP ;
ordre stable created_at/id. Un curseur d'un autre tenant ne révèle aucune ligne.
Pas de modification de jobs/exports/agents.
## 5. Delta Fonctionnel & Technique
### ADDED
Paramètre before UUID facultatif GET /api/access-requests ; réponse tableau inchangée,
100 maximum, boutons précédent/suivant conservant la portée et chargement/erreur.
### MODIFIED
Le menu mobile se ferme en entrant dans le breakpoint desktop ; contenu redevient actif.
/app/invitations devient /admin/members pour super_admin, query conservée.
/admin/audit est accepté après login. Approbation notifie Application même si mail échoue.
### REMOVED
Aucun contrat supprimé hors ancienne fonction SQL sans paramètre, remplacée par signature
avec paramètre default NULL ; les appels SQL sans argument restent valides.
### Critères
GIVEN menu ouvert à375 WHEN resize768/1280 THEN contenu accessible, retour mobile menu fermé.
GIVEN super-admin WHEN /app/invitations?tenantId=X THEN /admin/members?tenantId=X.
GIVEN audit anonyme WHEN login/MFA THEN destination et filtre conservés.
GIVEN plus de100 demandes avec dates identiques WHEN pagination THEN toutes accessibles sans doublon.
GIVEN curseur autre tenant/member WHEN lecture THEN aucune fuite/refus de rôle.
GIVEN approbation avec mail échoué WHEN succès HTTP THEN invitation visible et renvoi disponible.
Tests unitaires, PostgreSQL/HTTP et navigateur FR/EN375/768/1280, captures fraîches.
## 6. Documentation
UPDATED required : docs/data-model.md (curseur/index), docs/architecture.md (HTTP),
docs/features-b2b.md et .specs/domains/product-map.md (parcours), ADR005 et standard B2B
(curseur tenant). UPDATED review : CHANGELOG.md. DESIGN_UI.md reviewed-no-change :
Button/ui-tabs, breakpoint768 et interactions déjà définis. README/.env not-applicable,
aucune variable. Les décisions et résultats seront consignés dans tasks.md.
