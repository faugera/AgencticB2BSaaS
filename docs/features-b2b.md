# Capacités et permissions B2B

Audit statique au 2026-10-24. Statuts : IMPLEMENTED = code présent ; PARTIAL =
couverture incomplète ; PLANNED = intention documentée ; NOT_FOUND = aucun mécanisme
identifié ; UNKNOWN = impossible à déterminer. Aucun statut n'est une preuve runtime.
Carte produit : `../.specs/domains/product-map.md` ; décisions et limites :
[ADR-005](architecture/0005-private-pilot.md).

Les statuts ci-dessous portent sur le checkout audité. Les évolutions locales
`/admin`, navigation de portée et protection du dernier administrateur actif
(migration 0007) restent hors de cette PR documentaire. Leur présence locale
ne prouve pas leur livraison dans la branche de base ; voir l'inventaire des
références exclues dans `docs/architecture/sdd-bootstrap-verification.md`.

| Capacité | Statut | Preuve et limite |
| --- | --- | --- |
| Auth invitation-only, sessions, vérification et récupération | IMPLEMENTED | `apps/api/src/auth/service.ts`, `apps/api/src/auth/operator.ts`, `apps/web/src/auth/AuthPage.tsx` |
| TOTP et codes de récupération | IMPLEMENTED | Même service, `Security` dans `apps/web/src/application.tsx` ; activation facultative |
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
| Signup public, docs UI, profil/sessions UI | PLANNED | `docs/architecture/routes-verification.md` ; routes non implémentées |
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

## Frontend pages — 2026-10-24 implementation

Added organization-link access requests (`/signup`), own profile/session management
(`/app/profile`, `/admin/profile`), dedicated member/invitation pages and a
super-admin-only `/docs` guide. Tenant admins review access requests from their
invitations page. Code and mocked-browser coverage are present; migration 0008 and
real PostgreSQL authorization/session tests remain pending, so this is not a
production-readiness claim.

## Brume design system — implementing

App/admin/auth share a compact accessible component layer, role-aware collapsible
sidebar, textual mobile navigation, organization invitation tables/forms and a
super-admin component gallery. Own-account locale/theme and workspace-manager color
customization have API/SQL implementations (0009); database validation is pending.
This Brume lot adds no notification center, AI runtime or unused widget catalogue.
The audit viewer is introduced separately by the V0 audit delta below.

## Journal d’audit V0 — implementing

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
