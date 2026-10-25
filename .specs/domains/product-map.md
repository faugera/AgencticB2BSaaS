# Carte produit — état courant au 25 octobre 2026

État de la branche codex/b2b-organizations-rbac depuis main f47449c, qui inclut la PR8 fusionnée. IMPLEMENTED signifie code
présent, PARTIAL couverture incomplète, PLANNED intention, NOT_FOUND absence identifiée,
UNKNOWN état non vérifié. Aucun statut ne certifie un déploiement ou une conformité exhaustive.

## Capacités
| Capacité | Statut | Source et limite |
| --- | --- | --- |
| Identité sur invitation, vérification, récupération et sessions | IMPLEMENTED | apps/api/src/auth/service.ts ; Better Auth |
| TOTP et récupération MFA facultative, y compris super-admin | IMPLEMENTED | Même service ; aucune obligation MFA V0 |
| Tenants et invitations par administrateurs autorisés | IMPLEMENTED | apps/api/src/business/routes.ts ; plusieurs tenants explicitement attribués dans un seul client |
| Organisations clients distinctes, tenants multiples et rôles cumulables | IMPLEMENTED | Migration0014, catalogue global et pyramide contrôlée |
| Profil structuré et metadata tenant/workspace | IMPLEMENTED | Migration0013 ; pas de paiement ni nouvel onboarding |
| Workspaces privés/visibles et accès des membres | IMPLEMENTED | Routes métier, RLS et migrations 0002 à 0007 |
| Portails /app et /admin avec portée contrôlée | IMPLEMENTED | apps/web/src/main.tsx ; API/SQL seuls font autorité |
| Demandes via lien /signup, approbation et pagination | IMPLEMENTED | apps/api/src/business/access-routes.ts ; migrations 0008 et 0012 |
| Profil propre et révocation des autres sessions | IMPLEMENTED | apps/web/src/pages/Profile.tsx ; Better Auth |
| Documentation et galerie super-admin | IMPLEMENTED | apps/api/src/business/documentation.ts ; /docs |
| Brume, préférences compte et apparence workspace | IMPLEMENTED | DESIGN_UI.md ; apps/web/src/ui ; migration 0009 |
| Journal unique, consultation tenant autorisée et plateforme super-admin | IMPLEMENTED | apps/api/src/business/audit-routes.ts ; migration 0015 |
| Suppression logique utilisateur/tenant et dates | IMPLEMENTED | Migration 0011 ; SQL opérateur uniquement, aucune UI/API de suppression |
| Isolation tenant et autorisation persistée | IMPLEMENTED | apps/api/src/business/store.ts ; contexte transactionnel serveur |
| Accessibilité et responsive exhaustifs | PARTIAL | FR/EN et parcours testés ; aucune certification exhaustive |
| Exploitation : rétention/export audit, backups automatisés et HA | PARTIAL | Décisions opérateur restantes dans ADR-005 |
| SSO/SCIM, MFA imposée et appartenance à plusieurs clients | PLANNED | Hors pilote ; ADR-005 |
| Agents IA, outils, jobs durables et facturation | PLANNED | Vision fondation ; aucun runtime implémenté |
| Support dédié et moteur ABAC | NOT_FOUND | Aucun rôle ou moteur identifié |
| Migrations appliquées et état production | UNKNOWN | Pas d'inspection DB ni de déploiement pendant cette migration |

## Frontières et preuves
React/Vite → Fastify → PostgreSQL via pg ; Better Auth fournit l'identité, le métier
relit acteur/permissions et portée dans une transaction. Les contrats partagés sont des
types seuls. Le navigateur ne constitue pas une frontière d'autorisation.

Les cinq anciens chantiers sont [réconciliés](../../docs/sdd/legacy-reconciliation.md)
sans réécrire leurs checkpoints. Les preuves SQL/UI historiques ne sont pas des tests
relancés le 25 octobre pour l'adoption Spec Kit. La suite UI a été réduite à 72 cas ;
[la couverture actuelle](../../docs/testing.md) distingue mocks et intégrations réelles.
Les gardes IA sont dans la constitution, sans nouvelle capacité IA.

## Références
[Architecture](../../docs/architecture.md), [modèle](../../docs/data-model.md),
[permissions](../../docs/features-b2b.md), [exploitation](../../docs/setup/private-pilot.md),
[vision](../../docs/sdd/000-foundation-v1.3.md).
