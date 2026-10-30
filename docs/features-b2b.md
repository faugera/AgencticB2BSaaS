# Capacités et permissions B2B

État de la branche codex/b2b-organizations-rbac, 25 octobre 2026. IMPLEMENTED signifie
code présent, pas déploiement certifié. Preuves : [spec et livraison](../specs/002-b2b-organizations-rbac/spec.md).
Les preuves PR7/PR8 restent [historiques](sdd/legacy-reconciliation.md).

| Capacité | Statut | Source et limite |
| --- | --- | --- |
| Identité invitation-only, vérification, récupération, sessions | IMPLEMENTED | Better Auth ; aucune inscription libre |
| MFA TOTP et récupération facultatives | IMPLEMENTED | V0 sans MFA obligatoire, y compris super-admin |
| Organisations clients, plusieurs tenants et workspaces | IMPLEMENTED | Migrations 0013/0014/0016, annuaire limité à la portée ; un utilisateur ordinaire dans une seule organisation |
| Appartenances multiples explicites dans le même client | IMPLEMENTED | Seul active donne accès ; invited/suspended refusés à la prochaine opération |
| Catalogue global de rôles personnalisés cumulables | IMPLEMENTED | Lecture administrative avec roles.assign, édition super-admin ; attribution déléguée par portée et niveau |
| Pyramide et dernier administrateur actif | IMPLEMENTED | Fonctions SQL contrôlent soi/pairs/supérieurs et capacité administrative restante |
| Invitations, demandes et pagination | IMPLEMENTED | SMTP après commit, retry manuel ; tenant-admin ne peut inviter un pair |
| Profil complet et préférences du compte | IMPLEMENTED | Profil existant, noms inconnus acceptés à invitation ; PUT exige prénom et nom ; poste/département tenant-scopés |
| Workspaces privés/visibles, apparence Brume | IMPLEMENTED | Permissions contrôlées SQL ; archived_at informatif |
| Journal unique et consultation par portée | IMPLEMENTED | Migration0015, /api/audit-logs ; ancien journal archivé |
| Suppression logique et dates | IMPLEMENTED | Opérateur SQL ; révocation accès, IDs conservés ; aucune nouvelle UI de suppression |
| FR/EN et responsive | PARTIAL | Parcours et captures ciblés ; pas de certification exhaustive d'accessibilité |
| SSO/SCIM, MFA imposée | PLANNED | Hors V0 |
| Runtime IA, jobs durables et paiement | PLANNED | Métadonnées abonnement sans comportement de facturation |
| Support dédié / ABAC | NOT_FOUND | Aucun moteur identifié |
| Déploiement, HA et restauration | UNKNOWN | Pas d'inspection production |

## Pyramide et portée

super_admin > organization_admin > tenant_admin > workspace_admin > member.
Un administrateur gère uniquement les niveaux inférieurs dans la portée concernée :
aucune modification de soi, de pairs, de supérieurs ni auto-élévation. Un supérieur
gère les pairs du niveau inférieur. Les rôles personnalisés ne contiennent pas de rôle
plateforme et leur niveau est dérivé de leurs permissions sensibles.

| Action | Super-admin | Organisation-admin | Tenant-admin | Workspace-admin / membre |
| --- | --- | --- | --- | --- |
| Créer organisation / modifier catalogue | Oui | Non | Non | Non |
| Créer tenant | Oui | Son client | Non | Non |
| Traverser tous workspaces privés | Tenant sélectionné | Son client, audité | Son tenant | Portée explicite ou visibilité autorisée |
| Gérer attributions inférieures | Portée explicite | Son client | Son tenant | Workspace autorisé avec permission ; membre non |
| Modifier permissions globales | Oui, impact et confirmation | Non | Non | Non |
| Lire journal | Global ou tenant | Son client | Tenant avec audit.read | Permission audit.read selon portée |
| Modifier son profil | Oui | Oui | Oui | Oui, compte propre seulement |

Les rôles se cumulent par union de permissions, sans traverser leur portée. Une
modification du catalogue prend effet dès la prochaine opération, avec auteur/date
et capacités ajoutées/retirées dans le journal. Aucune invalidation de session ne
remplace la réautorisation serveur. Les événements plateforme tenant=null restent
super-admin uniquement ; les données d'un autre client ne sont jamais exposées.

Les routes /app/roles, /admin/roles et /app/audit réutilisent Brume, FR/EN, formulaires
accessibles et confirmation. Le frontend facilite les choix ; API et SQL font autorité.
Profil : pas de nouvelle étape onboarding, pas de modification personnelle des rôles,
du tenant ou du statut. La documentation /docs demeure super-admin uniquement.
