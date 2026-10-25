# Sécurité B2B : exigences et preuves

Les curseurs de demandes d'accès (0012) sont relus dans le tenant établi côté serveur,
jamais globalement. Conserver le refus des rôles ordinaires, l'ordre date/ID stable,
le plafond100 et les tests de curseur étranger ; les boutons UI ne sont pas une preuve
d'autorisation. GET `/api/access-requests` valide `before` comme UUID.

Référence décisionnelle : `docs/architecture/0005-private-pilot.md`.
Matrice : `docs/features-b2b.md`. Statuts décrivent le code inspecté, pas une
certification de la DB déployée ni l'exécution des tests.

| Mécanisme | Statut réel | Preuve et lacune |
| --- | --- | --- |
| Session vérifiée côté serveur | IMPLEMENTED | `apps/api/src/auth/service.ts`, `apps/api/src/business/routes.ts` ; MFA facultative, y compris super-admin |
| Organisation = tenant ; une appartenance ordinaire | IMPLEMENTED | `apps/api/migrations/0002_business.sql` : PK actor de memberships |
| Rôles persistés et acteur actif | IMPLEMENTED | `apps/api/migrations/0002_business.sql`, `apps/api/src/business/store.ts` |
| Contexte transactionnel et refus par défaut | IMPLEMENTED | `businessTransaction` dans `apps/api/src/business/store.ts` ; session serveur, BEGIN, set_config local, COMMIT/ROLLBACK |
| RLS tenants/workspaces | IMPLEMENTED | `apps/api/migrations/0002_business.sql` : ENABLE/FORCE et politiques ; ne couvre pas toutes les tables |
| Métadonnées privées | IMPLEMENTED | `authorization_private`, fonctions SECURITY DEFINER à search_path fixe ; aucun grant runtime direct |
| Références composites workspace/tenant | IMPLEMENTED | `apps/api/migrations/0002_business.sql`, correction de portée `apps/api/migrations/0006_workspace_scope.sql` |
| Runtimes sans propriété/BYPASSRLS | IMPLEMENTED | `apps/api/src/auth/provision.ts`, `assertRuntimePrivileges` dans `apps/api/src/business/store.ts` ; état DB courant UNKNOWN |
| Super-admin distinct du tenant-admin | IMPLEMENTED | `requireSuper` dans `apps/api/src/business/routes.ts` ; accès permanent explicite, pas impersonation |
| Audit privilégié | PARTIAL | `businessTransaction`, `business.record_audit` dans `apps/api/migrations/0002_business.sql` ; succès métier et bootstrap, pas tous les refus/auth ni ledger externe |
| Tests négatifs HTTP/SQL | IMPLEMENTED | `apps/api/src/business/isolation.integration.test.ts`, `tests/e2e/business-live.spec.ts` ; résultats à exécuter pour chaque évolution |
| Exports, jobs, événements, agents IA | PLANNED | `docs/sdd/000-foundation-v1.3.md` ; aucun runtime identifié |
| Rôle support dédié / moteur ABAC | NOT_FOUND | Aucun mécanisme identifié dans routes, contrats et migrations inspectés |
| Suppression logique utilisateurs/tenants et dates métier | IMPLEMENTED | Migration 0011 ; révocation sessions et acteur, session concurrente sérialisée, RLS tenant actif ; SQL opérateur uniquement |

## Prescriptions

- Préserver l'isolation tenant et workspace, l'autorisation serveur et le refus
  sans permission. Un `tenantId` client demande une portée, il ne l'autorise pas.
- Passer par la transaction existante ; ne jamais réutiliser une connexion avec
  contexte persistant. Une requête frontend filtrée ne garantit aucune autorisation.
- Conserver la distinction RLS du contenu / fonctions étroites des métadonnées.
  Nouveau contenu tenant : appliquer la frontière existante et tester deux tenants,
  absence de contexte, accès refusés et références composites.
- Ne pas confondre super-admin applicatif et superuser SQL. Les opérations
  privilégiées doivent rester explicitement autorisées et traçables.
- Pour de futurs exports/jobs/agents : rétablir et revérifier acteur et portée
  côté serveur à l'exécution ; aucun contournement implicite par travail différé.
- RLS ne protège pas d'un serveur ou credential SQL compromis pouvant forger
  son contexte. Ne jamais journaliser secrets, payloads sensibles ou erreurs SQL brutes.
- Réutiliser `.agents/skills/tenant-boundary/SKILL.md` pour une évolution de sécurité
  et `.agents/skills/verify-change/SKILL.md` pour les gates applicatifs.

## Access-request boundary

An opaque organization link grants collection only, never tenant access. Public
responses must not disclose whether an email or link exists. Tenant administrators
review only their own tenant's requests through server-established context and
narrow SQL functions. Approval reuses invitations and audit; permitted business
roles are member/tenant_admin, never platform roles. `/api/platform/docs` requires
super_admin independently of frontend navigation guards.

## UI preferences and appearance

Locale/theme belong to the current actor and cannot be addressed by a client actor
ID. Workspace appearance changes require workspace_admin in the selected context.
Private metadata tables remain ungranted; color reads join the RLS workspace and
writes use narrow audited functions. Never treat theme/context UI as authorization.

## Lecture du journal V0

La lecture globale ou filtrée reste réservée au super-admin actif en HTTP et SQL
(migration 0010, audit_events). Aucun grant direct privé ni opération de réécriture.
Les événements de mutation sont atomiques, avec identifiants et clés autorisées
seulement ; les anciennes traces restent distinguées. Ne jamais inférer l’auteur
d’une modification d’identité depuis la seule identité cible. Les sources sans
contexte authentifié restent non attribuées. La MFA demeure facultative en V0.
Les IDs d’audit doivent survivre aux suppressions sans FK vers les lignes sources.
