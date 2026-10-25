# Capacités et permissions B2B

## Correctifs de revue PR7

Les demandes d'accès sont paginées par100 avec précédent/suivant FR/EN ; elles ne
disparaissent plus derrière les100 demandes récentes. L'approbation recharge les
invitations pour rendre le renvoi disponible en cas d'échec SMTP.
Le passage mobile/desktop libère les contrôles ; les destinations invitations et
audit conservent la portée organisationnelle, y compris après connexion/MFA.
Preuves et limites : `.specs/changes/2026-10-24-pr7-review/tasks.md`.

État du code revu le 25 octobre 2026. Statuts : IMPLEMENTED = code présent ; PARTIAL =
couverture incomplète ; PLANNED = intention documentée ; NOT_FOUND = aucun mécanisme
identifié ; UNKNOWN = impossible à déterminer. Aucun statut n'est une preuve runtime.
Carte produit : `../.specs/domains/product-map.md` ; décisions et limites :
[ADR-005](architecture/0005-private-pilot.md).

Les statuts portent sur le code fusionné dans PR7, revu le 25 octobre.
Les preuves datées et leurs limites figurent dans [le registre](sdd/legacy-reconciliation.md).

| Capacité | Statut | Preuve et limite |
| --- | --- | --- |
| Auth invitation-only, sessions, vérification et récupération | IMPLEMENTED | `apps/api/src/auth/service.ts`, `apps/api/src/auth/operator.ts`, `apps/web/src/auth/AuthPage.tsx` |
| TOTP et codes de récupération | IMPLEMENTED | Même service, `apps/web/src/pages/Security.tsx` ; activation facultative |
| Provisioning organisation par super-admin | IMPLEMENTED | `apps/api/src/business/routes.ts`, `/api/platform/tenants` |
| Invitations tenant, retry, revoke et acceptation | IMPLEMENTED | Routes métier et `apps/api/migrations/0002_business.sql`, `apps/api/migrations/0005_invitation_delivery.sql` ; SMTP synchrone |
| Workspaces privés ou visibles au tenant | IMPLEMENTED | Routes métier et politiques SQL dans `apps/api/migrations/0002_business.sql` |
| Affectation/retrait des membres | IMPLEMENTED | Fonctions SQL métier ; dernier admin actif protégé par `apps/api/migrations/0007_enabled_administrator.sql` |
| Administration UI séparée et navigation de portée | IMPLEMENTED | `apps/web/src/main.tsx`, `apps/web/src/admin/AdminSidebar.tsx`, `apps/web/src/application.tsx` |
| Désactivation acteur | IMPLEMENTED | Route plateforme et fonction disable_actor ; distincte d'une suppression logique complète |
| Audit privilégié | PARTIAL | Succès métier et bootstrap ; pas tous les refus/auth, ni export externe |
| FR/EN, responsive et accessibilité | PARTIAL | Dictionnaires, labels, feedback et media queries présents ; conformité exhaustive non prouvée |
| SSO/SCIM, passkeys, MFA imposée | PLANNED | ADR-005 et `docs/architecture/routes-verification.md` ; hors pilote |
| Facturation, agents IA et workflows durables | PLANNED | `docs/sdd/000-foundation-v1.3.md` |
| Demandes via lien /signup, docs restreintes, profil/sessions | IMPLEMENTED | access-routes.ts, Profile.tsx et migrations 0008/0012 ; aucune inscription libre |
| Suppression logique utilisateur/organisation | IMPLEMENTED | Migration 0011, marqueurs persistés, sessions révoquées, RLS active seulement ; opération SQL opérateur, sans UI/API |
| Support dédié / ABAC | NOT_FOUND | Pas de rôle ni moteur identifié |
| État du déploiement et garanties opérationnelles | UNKNOWN | Aucun contrôle production réalisé |

## Matrice d'autorisation observée

Source : `apps/api/src/business/routes.ts`, `apps/api/migrations/0002_business.sql`
et migrations suivantes. Un workspace_admin est une permission de workspace,
pas un rôle plateforme ; un acteur non activé n'a aucun accès métier.

| Action | Super-admin | Tenant-admin | Workspace-admin | Member |
| --- | --- | --- | --- | --- |
| Créer/lister les organisations plateforme | Oui | Non | Non | Non |
| Créer un workspace | Tenant explicitement sélectionné | Son tenant | Non par ce rôle seul | Non |
| Lire un workspace | Portée tenant explicite | Son tenant | Workspace autorisé | Visibilité tenant ou appartenance explicite |
| Modifier workspace / affecter ses membres | Portée autorisée | Son tenant | Son workspace | Non |
| Inviter / administrer membres tenant | Portée autorisée | Son tenant | Non par ce rôle seul | Non |
| Désactiver acteur ordinaire | Oui selon fonction SQL | Non | Non | Non |
| S'attribuer super-admin | Non ; bootstrap opérateur distinct | Non | Non | Non |

Les succès métier super-admin sont audités avant commit. Son accès permanent
multi-tenant est une décision explicite ; aucun bypass SQL n'est accordé.

## Parcours

L'opérateur invite une identité, qui vérifie son email puis définit son mot de
passe par récupération. Le bootstrap opérateur lie explicitement une identité
vérifiée au super-admin. Celui-ci crée l'organisation et invite le tenant-admin.
L'acceptation exige l'email vérifié correspondant ; elle ne promeut pas un rôle
préexistant. Le tenant-admin crée les workspaces et gère les accès ; retrait ou
désactivation est revérifié à la prochaine opération métier. Les invitations
expirées, réutilisées, révoquées ou inter-tenant sont refusées.

## Parcours et Brume livrés dans PR7

Les demandes via lien /signup ne créent ni identité ni membership. Les administrateurs
traitent leurs demandes tenant-scopées ; approbation et livraison réutilisent les invitations.
Le profil permet le nom et les autres sessions, sans modification d'email ou de rôle.
/docs et son API sont réservés aux super-admins. Les tests réels de demandes, profil et
sessions sont dans access.integration.test.ts ; preuves historiques dans le registre.

App/admin/auth partagent les primitives Brume, le shell, les préférences compte et la
couleur workspace (migration 0009). Tests réels : isolation des préférences par identité,
apparence par rôle et tenant ; UI : navigation, états et FR/EN. La galerie ne crée aucune
écriture métier fictive. Ni centre de notifications ni runtime IA n'est ajouté.

## Journal d’audit V0 — implémenté dans PR7

`/admin/audit` : consultation super-admin globale ou filtrée par organisation,
pagination de 50, FR/EN et états vide/erreur. API `/api/platform/audit` et SQL
`business.audit_events` refusent les rôles ordinaires. Migration 0010 complète
le journal privé : tenants/workspaces, identités/acteurs, appartenances, invitations,
demandes et apparence ; mutations effectives avec cible et champs, sans valeurs.
Auteur absent si aucun contexte métier authentifié ; aucune attribution inventée.
MFA non obligatoire en V0. Les 9 scénarios UI interceptés sont complétés par 4 tests PostgreSQL audit,
14 tests d’isolation et 6 vues navigateur avec le vrai backend et refus 401/403.
La migration est validée uniquement en base jetable, pas appliquée au développement.
Les blocages lifecycle et fixture profil 429 ont été corrigés par la migration 0011
et l'isolation des IP de test ; voir le delta 2026-10-24-lifecycle pour les preuves courantes.
