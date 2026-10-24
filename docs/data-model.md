# Modèle de données observé

Source : migrations SQL `apps/api/migrations/0001_identity.sql` à
`apps/api/migrations/0007_enabled_administrator.sql` (0007 préexistante non suivie
au début du bootstrap). Présence du SQL ≠ application vérifiée à la DB.
La migration 0007 reste un fichier local hors PR : le modèle versionné avec ce
bootstrap contient uniquement les migrations 0001 à 0006. La protection du dernier
administrateur actif décrite pour 0007 ne doit donc pas être supposée livrée ici.
Aucun ORM : requêtes `pg` et fonctions SQL ; migration atomique avec verrou
et checksums dans `apps/api/src/auth/migrate.ts`.

| Schéma / entité | Relations et contraintes principales |
| --- | --- |
| identity.user | PK texte, email unique, emailVerified, dates createdAt/updatedAt, twoFactorEnabled |
| identity.session | User FK avec cascade, token unique et expiration |
| identity.account | User FK avec cascade, identifiant/provider et secrets de compte |
| identity.verification | Identifiant, valeur et expiration des vérifications |
| identity.rateLimit | Clé unique, compteur et dernier appel |
| identity.twoFactor | User FK avec cascade, secret TOTP et codes de récupération |
| business.tenants | PK UUID ; nom de 1 à 100 caractères ; organisation = tenant |
| authorization_private.actors | PK UUID, identity_id unique FK user, handle unique, enabled, platform_role null ou super_admin |
| authorization_private.memberships | actor_id PK : au plus un tenant ordinaire par acteur ; FK tenant ; rôle tenant_admin/member ; unique tenant+actor |
| business.workspaces | PK UUID, FK tenant, unique tenant+id ; visibilité private/tenant, private par défaut ; nom borné |
| authorization_private.workspace_members | PK workspace+actor ; FK composites tenant+workspace et tenant+actor ; workspace_admin/member |
| authorization_private.invitations | FK tenant, email, rôle, token_hash unique, expiration 48h, états accepté/révoqué et delivery pending/sent/failed |
| authorization_private.audit | PK bigint, date, acteur/tenant FK, action et resource_id ; sans mutation runtime autorisée |
| migration_history.versions | Créée par l'opérateur de migration : nom PK, checksum, applied_at |

`0003_mfa_index.sql` ajoute l'index MFA ; `0004_workspace_administration.sql`
ajoute la lecture administrative des membres ; `0005_invitation_delivery.sql`
corrige l'accusé de livraison après acceptation concurrente ; `0006_workspace_scope.sql`
resserre la portée de lecture ; `0007_enabled_administrator.sql` protège le dernier
administrateur actif lors des retraits. Ne jamais réécrire une migration appliquée.

## Autorisation et tenancy

Les tenants/workspaces ont RLS ENABLE/FORCE ; politiques basées sur les fonctions
`tenant_access`, `tenant_admin`, `workspace_access`, `workspace_admin`. Les tables
privées n'ont pas RLS généralisée : aucun accès runtime direct, fonctions SECURITY
DEFINER autorisées avec search_path fixe. Voir [ADR-005](architecture/0005-private-pilot.md).

Les rôles SQL `identity_runtime` et `business_runtime` sont sans propriété et sans
BYPASSRLS ; `business_owner` est non-login. Le serveur établit `app.identity_id`
et `app.tenant_id` par `set_config(..., true)` dans la même transaction. La portée
client n'est jamais une preuve d'appartenance. Le runtime identité ne dispose
pas d'une autorisation métier par sa seule session.

## Écarts constatés

Les tests locaux `apps/api/src/business/lifecycle.integration.test.ts` décrivent
suppression logique et dates métier. Aucune migration correspondante n'est présente
dans l'audit : capacités non démontrées, à ne pas déclarer implémentées.
Les suppressions de memberships sont des retraits physiques d'association avec
cascade des affectations workspace, pas une suppression logique d'utilisateur/tenant.
Pas de tables identifiées pour facturation, exécutions IA ou jobs durables.
L'état réel des rôles, schémas et migrations déployés reste UNKNOWN sans inspection DB.

## Access requests (migration 0008, 2026-10-24)

`authorization_private.access_links` stores one opaque UUID link per tenant.
`authorization_private.access_requests` stores first/last name, normalized email,
status, creation/review dates and the resulting invitation ID. `(tenant_id,email)`
is unique; duplicate public submissions receive the same generic response.
Runtime access uses narrow SECURITY DEFINER functions, without private-table grants.
Approval locks the request, checks tenant administration and calls `business.invite`.
Migration 0008 has not been applied or verified against disposable PostgreSQL here.

## UI preferences and workspace appearance (0009)

`authorization_private.ui_preferences` stores locale fr/en and theme system/light/dark
for the current enabled actor. Clients cannot select an actor. `workspace_appearance`
stores nullable #RRGGBB colors with a composite tenant/workspace reference. Both
private tables have no runtime grants; narrow functions own access. Reads of colors
join the RLS-protected workspace; writes require workspace_admin and are audited.
Migration 0009 is additive and has not yet been applied to a disposable database
in this session; see the Brume verification checkpoint before release.

## Journal V0 (migration 0010)

La table privée audit ajoute resource_type et changed_fields (noms des champs,
jamais leurs valeurs). Les identifiants auteur/tenant restent conservés sans FK
vers les lignes sources afin de préserver l’historique après suppression. Index
(tenant_id,id DESC), pagination bigint sans conversion en Number. Des triggers
AFTER tracent les mutations effectives de tenants, workspaces, acteurs, identités,
appartenances, invitations, demandes et apparence. Un UPDATE sans changement des
champs autorisés ne génère pas de mutation ; rollback annule également l’audit.
Les anciennes traces métier restent présentes et distinctes. Migration validée sur PostgreSQL 17.11 jetable (4 tests audit). Non appliquée
à la base de développement ; historique existant conservé.
