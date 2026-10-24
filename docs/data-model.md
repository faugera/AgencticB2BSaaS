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
