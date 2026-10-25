# Carte produit — Enterprise AI OS

## Revue PR7 — 2026-10-25

Implémentés : pagination des demandes au-delà de100 (migration0012), rafraîchissement
des invitations après approbation, sortie du menu mobile au breakpoint desktop et
destinations invitations/audit avec filtre conservé. Ces corrections ne créent ni
permission ni fonctionnalité IA supplémentaire. Preuves distinctes SQL/UI et limites
d'infrastructure : `.specs/changes/2026-10-24-pr7-review/tasks.md`.

## 1. Vision et périmètre

Fondation SaaS B2B agentique, livrée actuellement comme pilote privé d'identité
et collaboration tenant/workspace. Vision et capacités futures :
`docs/sdd/000-foundation-v1.3.md`. Ne pas confondre cette cible avec le code livré.
Audit statique du checkout local au 2026-10-24 ; tests non réexécutés pour cette carte.
Cette PR est documentaire : les évolutions locales d'administration/navigation,
la migration 0007 et les tests lifecycle ne sont pas publiés avec elle. Les statuts
observés localement ne constituent pas une annonce de livraison de ces travaux.
Références hors PR : `docs/architecture/sdd-bootstrap-verification.md`.

## 2. Organisations, tenants et workspaces

Organisation = tenant. Un acteur ordinaire appartient à au plus une organisation.
Un tenant contient plusieurs workspaces, privés par défaut ou visibles dans le
tenant. Le super-admin a un accès permanent explicitement autorisé et audité.
Relations et preuves : `docs/data-model.md`.

## 3. Rôles et permissions

`super_admin` plateforme, `tenant_admin`/`member` organisation,
`workspace_admin`/`member` workspace. L'identité seule ne confère aucun rôle.
Matrice et parcours : `docs/features-b2b.md` ; frontière :
`docs/architecture/0005-private-pilot.md`.

## 4. Domaines fonctionnels

| Domaine | Responsabilité | Référence |
| --- | --- | --- |
| Identité | Connexion, vérification, récupération et MFA | `apps/api/src/auth/service.ts` |
| Organisations | Provisioning plateforme, membership, invitation | `apps/api/src/business/routes.ts` |
| Workspaces | Visibilité et accès des membres | `apps/api/migrations/0002_business.sql` |
| Administration | Interface super-admin et portée active | `apps/web/src/application.tsx` |
| Gouvernance | Autorisation et audit | `apps/api/src/business/store.ts` |

## 5. Fonctionnalités existantes

Statuts : IMPLEMENTED (code démontré), PARTIAL (incomplet), PLANNED (spécifié),
NOT_FOUND (non identifié), UNKNOWN (indéterminable). Aucun ne certifie le déploiement.

| Fonctionnalité | Statut | Preuve |
| --- | --- | --- |
| Identité invitation-only, sessions et récupération | IMPLEMENTED | `apps/api/src/auth/service.ts`, `apps/api/src/auth/operator.ts` |
| MFA TOTP facultative | IMPLEMENTED | `apps/api/src/auth/service.ts` |
| Organisation par super-admin et invitations | IMPLEMENTED | `apps/api/src/business/routes.ts` |
| Workspaces et permissions tenant/workspace | IMPLEMENTED | `apps/api/src/business/routes.ts`, `apps/api/migrations/0002_business.sql` |
| Administration, navigation et portée URL | IMPLEMENTED | `apps/web/src/main.tsx`, `apps/web/src/application.tsx` |
| Désactivation acteur ordinaire | IMPLEMENTED | `apps/api/migrations/0002_business.sql` |
| Isolation SQL et contexte serveur | IMPLEMENTED | `apps/api/src/business/store.ts`, `apps/api/migrations/0002_business.sql` ; preuve runtime à renouveler |

## 6. Fonctionnalités partielles ou planifiées

| Fonctionnalité | Statut | Lacune / source |
| --- | --- | --- |
| Audit et opérations | PARTIAL | Succès métier audités ; retention/export/backup restent opérateur ; ADR-005 |
| UI FR/EN, responsive, accessibilité | PARTIAL | Patterns présents ; conformité exhaustive non démontrée ; `docs/features-b2b.md` |
| SSO/SCIM, MFA imposée, multi-organisation | PLANNED | `docs/architecture/0005-private-pilot.md`, hors pilote |
| Agents, outils, jobs, événements et exports | PLANNED | `docs/sdd/000-foundation-v1.3.md` ; aucun runtime trouvé |
| Facturation et abonnements | PLANNED | Même vision SDD, aucun modèle implémenté trouvé |
| Signup, docs UI et édition profil/sessions | PLANNED | `docs/architecture/routes-verification.md` |
| Suppression logique utilisateur/tenant et dates métier | IMPLEMENTED | Migration 0011 ; IDs et lignes conservés, dates imposées et accès révoqués ; SQL opérateur uniquement |
| Support dédié et ABAC | NOT_FOUND | Ni rôle ni moteur identifié |
| État courant DB/production | UNKNOWN | Pas de vérification runtime pendant l'audit |

## 7. Architecture haut niveau

Monolithe TypeScript : React/Vite → API Fastify → PostgreSQL, Better Auth pour
l'identité, `pg` et SQL pour le métier. Contrats type-only partagés. Aucun ORM,
bus d'événements ou service IA installé. Voir `docs/architecture.md`.

## 8. Dépendances entre domaines

Identité vérifiée → acteur activé → membership/portée → workspace autorisé.
Provisioning organisation dépend du rôle plateforme ; invitation dépend de l'email
vérifié et SMTP. L'audit s'inscrit dans les transactions métier. Les futurs outils,
jobs et agents devront réautoriser leur portée à l'exécution ; ils n'existent pas encore.

## Frontend completion (implementing, 2026-10-24)

- Public: `/signup?link=<opaque UUID>` persists an access request without enrollment.
- Tenant administration: `/app/members`, `/app/invitations`; the latter generates
  request links and approves/rejects own-tenant requests through existing invitations.
- Own identity: `/app/profile`, `/admin/profile`; editable name, readonly email/roles,
  session list and revocation of other sessions.
- Platform: `/docs`, content served only by a super-admin-authorized backend route.
- Evidence: unit/build/browser checks; disposable SQL/security verification pending.

## Brume — implementing (2026-10-24)

DESIGN_UI.md records the approved visual direction and user refinements: 12px body,
20px page titles, sidebar 264/56px, items 34px/text13/icons16, scrollbars6/4px.
Reusable UI, invitation/member search/filter/confirmation, account preferences and
workspace appearance are implemented in source. /docs exposes the super-admin
interactive gallery. PostgreSQL tests for migration0009 are pending; no production
or isolation certification is implied. AI components remain design roadmap only.

## Journal V0 — implementing (2026-10-24)

Base persistante et page super-admin `/admin/audit`, globale/tenant et paginée.
La migration 0010 ajoute les mutations des ressources principales et clés modifiées
sans valeurs sensibles ; les anciennes traces métier sont conservées. Authentification
V0 sans MFA obligatoire. Code/API/UI présents ; preuve réelle PostgreSQL audit 4/4 et isolation 14/14,
consultation navigateur réelle FR/EN aux trois tailles et refus 401/403.
Pas de migration de la base de développement ni de certification globale :
les preuves courantes du chantier lifecycle sont consignées dans le delta
2026-10-24-lifecycle, qui corrige également la collision 429 des fixtures.
Voir .specs/changes/2026-10-24-audit-log-v0.
