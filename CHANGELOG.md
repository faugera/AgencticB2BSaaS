# Changelog

## Correctifs PR7 — 2026-10-25

Demandes d'accès accessibles au-delà de100, invitations rafraîchies après approbation,
menu mobile utilisable après redimensionnement et destinations invitations/audit
préservées avec leur filtre d'organisation.

## Lifecycle — 2026-10-24

Migration 0011 : dates et suppression logique des utilisateurs/organisations,
conservation des identifiants et des lignes, révocation des sessions et accès.
Opération SQL opérateur uniquement. Dates historiques des anciens tenants inconnues :
référence fixée à l'application de la migration. Aucune base de développement migrée.

Les prochains changements utilisateur notables seront consignés ici après analyse
d'impact. Aucun historique de releases n'a été reconstitué ; le bootstrap documentaire
ne constitue pas une évolution fonctionnelle du produit.

## Frontend pages — implementation in progress (2026-10-24)

Added organization-link access requests, tenant-scoped review, dedicated members
and invitations, own profile/session pages and super-admin-only documentation.
Migration 0008 and real database security verification remain pending.

## Brume design system — implementation in progress (2026-10-24)

Added the approved DESIGN_UI.md charter, shared app/admin/auth primitives, compact
collapsible sidebar, textual mobile navigation, searchable invitation/member views,
accessible confirmation dialogs and an interactive super-admin component gallery.
Added own-account theme/locale and workspace color persistence contracts (0009).
Real PostgreSQL verification remains pending; no deployment performed.

## Journal d’audit V0 — implémentation en cours (2026-10-24)

Ajout d’un journal des mutations importantes et d’une consultation super-admin
FR/EN, avec filtre organisation et pagination. Réutilisation de l’audit privé ;
aucune valeur de profil ou secret enregistré. MFA toujours facultative.
Migration 0010 testée sur PostgreSQL 17.11 jetable ; consultation réelle FR/EN
et refus d’accès vérifiés. Non appliquée à la base de développement.
Les gates globaux du dépôt restent rouges (lifecycle préexistant et fixture profil).
