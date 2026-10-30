# Modèle de données courant

Les migrations 0001–0012 sont historiques et immuables. Les migrations 0013–0016
implémentent le [contrat B2B](../specs/002-b2b-organizations-rbac/spec.md).
Leur présence ne prouve aucune application en production. pg sans ORM ; migrateur
atomique, verrou transactionnel et checksums opérateur.

| Entité | Relations et contraintes |
| --- | --- |
| identity.user | PK texte conservée ; email et emailVerified canoniques Better Auth ; name/image canoniques ; first_name/last_name nullables jusqu'au profil complet ; phone_number E.164 ; dates historiques et deletedAt conservés |
| identity.session/account/verification/twoFactor/rateLimit | Identité Better Auth et secrets privés ; pas de droits métier implicites |
| business.organizations | Client ; PK UUID ; nom et suppression logique |
| business.tenants | FK organization ; plusieurs tenants par client ; slug stable globalement unique ; billing_email obligatoire, VAT, country FR, subscription_tier/status et metadata objet ; dates et suppression logique |
| authorization_private.actors | identity_id unique ; une organisation ordinaire au maximum ; enabled ; platform_role super_admin ou null |
| authorization_private.memberships | PK actor_id+tenant_id ; même organisation que l'acteur ; status invited/active/suspended ; seul active autorise ; invited_by FK SET NULL, joined_at nullable, job_title et department |
| business.workspaces | FK tenant, clé tenant+id ; slug unique par tenant, description, archived_at informatif ; visibilité private/tenant |
| authorization_private.workspace_members | Références composites tenant+workspace et tenant+acteur ; rôles fixes compatibles |
| authorization_private.role_catalog | Catalogue global ; scopes organization/tenant/workspace ; permissions bornées, niveau dérivé, delegable ; builtins protégés, archivage |
| authorization_private.role_assignments | Rôles cumulables avec portée explicite ; aucune attribution plateforme par ce catalogue |
| authorization_private.invitations | Hash de jeton, email vérifié à acceptation, rôle, tenant, expiration et livraison ; invited_by conservé si connu |
| authorization_private.ui_preferences | Acteur courant ; locale fr/en, theme system/light/dark, timezone Europe/Paris et date_format DD/MM/YYYY par défaut |
| authorization_private.workspace_appearance | Couleur nullable #RRGGBB, référence composite au workspace |
| authorization_private.access_links/access_requests | Lien opaque de collecte ; demandes uniques tenant+email ; aucune identité créée à la collecte |
| business.audit_logs | Journal actif unique append-only runtime ; PK UUID, date, auteur/cible snapshots, target_id texte, tenant nullable pour plateforme, champs autorisés et différences de capacités |
| authorization_private.audit | Archive conservée sans nouvelles écritures ; reprise vers journal avec legacy_id |
| migration_history.versions | Nom/checksum/applied_at opérateur uniquement |

## Autorisation

RLS ENABLE/FORCE sur organisations, tenants, workspaces et journal. L'annuaire d'organisations
ne retourne que la portée de l'acteur (toutes les organisations actives pour super-admin) et exclut
les suppressions logiques. Métadonnées privées
sans grants runtime directs ; fonctions SECURITY DEFINER à search_path fixe. Runtimes
non propriétaires, non superuser, sans BYPASSRLS. Le serveur établit identité, tenant,
IP et user-agent dans la même transaction avec set_config local. Le tenant demandé
par le navigateur est revérifié depuis les appartenances et permissions persistées.

Seul active ouvre un tenant ; une appartenance explicite inactive refuse aussi l'accès
organisation-admin, tandis que son accès transversal sans appartenance reste autorisé.
Les permissions tenant ne traversent jamais un autre tenant. Les références composites
interdisent l'affectation d'un workspace d'un autre client/tenant.

## Reprise et exploitation

Une organisation est créée par ancien tenant, sans fusion arbitraire de clients.
Les IDs, dates, email vérifié et marqueurs de suppression restent conservés. Un prénom
ou nom impossible à établir reste null ; joined_at historique inconnu reste null.
Le billing provient d'un admin actif déterministe, sinon d'une invitation admissible ;
absence de source = diagnostic et rollback, jamais adresse inventée. Slugs générés
une fois avec unicité ; rejeu sans doublons via historique checksummé.

Suppression logique conserve les lignes/IDs et révoque l'accès ; retrait de membership
suspend l'association. archived_at de workspace ne change pas l'autorisation.
L'ancien journal reste archivé ; les secrets et valeurs de profil ne sont pas audités.
L'ordre du nouveau journal est date/UUID décroissant avec curseur UUID et 50 événements.
Les demandes d'accès conservent leur pagination date/UUID par 100, curseur tenant-scopé.

Preuves actuelles : [dossier de livraison](../specs/002-b2b-organizations-rbac/quickstart.md).
Les anciennes preuves restent dans le [registre historique](sdd/legacy-reconciliation.md).
Ni facturation exécutée, ni runtime IA, ni certification de production.
