# Architecture actuelle — index technique

Audit statique du checkout au 2026-10-24, incluant les modifications locales
préexistantes. `IMPLEMENTED` signifie présent dans le code, sans preuve d'application
des migrations à la DB courante. Décision principale :
[ADR-005](architecture/0005-private-pilot.md) ; opérations :
[runbook pilote](setup/private-pilot.md). Cet index ne remplace pas ces documents.

Portée de publication : cette PR ne contient que le bootstrap documentaire.
Les observations `/admin` et navigation avancée décrivent des modifications locales
préexistantes exclues de la PR, pas des capacités ajoutées à sa branche de base.
Les références locales exclues sont inventoriées dans
[le rapport d'audit](architecture/sdd-bootstrap-verification.md).

## Modules et flux

| Module | Responsabilité et référence |
| --- | --- |
| Web | React/Vite, React Router, langues et état local ; `apps/web/src/main.tsx`, `apps/web/src/application.tsx` |
| API | Construction Fastify dans `apps/api/src/app.ts`, démarrage/config dans `apps/api/src/server.ts`, `apps/api/src/config.ts`, `apps/api/src/proxy.ts` |
| Identité | Better Auth, sessions PostgreSQL, email et MFA ; `apps/api/src/auth/service.ts`, `apps/api/src/auth/routes.ts`, `apps/api/src/auth/mail.ts` |
| Métier | Routes et autorisation transactionnelle ; `apps/api/src/business/routes.ts`, `apps/api/src/business/store.ts` |
| Contrats | Types seuls dans `packages/shared/src/index.ts` ; dépendance partagée des deux apps, pas d'import web→API |
| Persistance | `pg` sans ORM, SQL revu dans `apps/api/migrations`, exécution opérateur explicite par `apps/api/src/auth/migrate.ts` |

Le navigateur appelle `/api` en same-origin (proxy local dans `apps/web/vite.config.ts` ;
reverse proxy à configurer en déploiement). Better Auth établit une session vérifiée.
Chaque opération métier dérive l'identité côté serveur, ouvre une transaction,
relit acteur actif et rôle, établit une portée tenant locale à cette transaction,
exécute la requête autorisée, inscrit l'audit applicable, puis commit ou rollback.
L'envoi SMTP des invitations suit le commit ; l'état d'envoi est enregistré séparément.
Il n'y a pas de worker/outbox ni de garantie de reprise automatique des mails pending.

## Surface HTTP actuelle

Source des contrats détaillés et schémas : `apps/api/src/business/routes.ts` ;
types publics partagés : `packages/shared/src/index.ts`.

| Méthode / chemin | Fonction et contrôle principal |
| --- | --- |
| GET `/health`, `/ready` | Liveness indépendante ; readiness DB/auth et privilèges |
| GET/POST `/api/auth/*` | Adaptateur Better Auth, origines contrôlées sur POST |
| GET `/api/me` | Identité vérifiée et, si métier activé, contexte et workspaces autorisés |
| GET/POST `/api/platform/tenants` | Annuaire/création d'organisations, super-admin requis |
| GET/POST `/api/workspaces` | Liste selon RLS ; création par administrateur tenant autorisé |
| GET/PATCH `/api/workspaces/:id` | Lecture autorisée / modification par administrateur workspace |
| GET/POST `/api/workspaces/:id/members` | Liste et affectation via fonctions SQL contrôlées |
| DELETE `/api/workspaces/:id/members/:actorId` | Retrait d'accès workspace autorisé |
| GET `/api/members` ; DELETE `/api/members/:id` | Administration tenant ; protection du dernier administrateur |
| GET/POST `/api/invitations` | Consultation/création autorisée |
| POST `/api/invitations/accept`, `/api/invitations/:id` | Acceptation liée à l'email vérifié ; retry/revoke administrateur |
| POST `/api/platform/actors/:id/disable` | Désactivation d'acteur par super-admin |

`tenantId` est une demande de portée validée côté serveur. L'absence d'accès ne se
résout jamais par une permission frontend. Les erreurs métier sont centralisées
dans `apps/api/src/app.ts` ; Better Auth conserve son contrat propre.
Les détails de navigation et anciennes preuves restent dans la note locale
`docs/architecture/routes-verification.md` (hors PR), qui est un instantané,
pas un résultat de tests réexécutés pour ce bootstrap.

## Sécurité et limites

RLS ENABLE/FORCE s'applique à `business.tenants` et `business.workspaces`.
Les métadonnées `authorization_private` sont accessibles par fonctions SQL étroites,
pas par grants runtime directs. Runtimes identité/métier distincts du propriétaire
et de l'opérateur ; privilèges vérifiés au démarrage et en readiness.
Voir [modèle](data-model.md) et [matrice B2B](features-b2b.md).

L'audit couvre les succès métier privilégiés, pas tous les refus ni l'ensemble
du cycle auth. MFA reste optionnelle. Aucun runtime agents/jobs/exports trouvé.
L'état DB appliqué, la configuration production et le comportement courant ne sont
pas déduits de la seule présence du code ou des tests.

ADR-001 est historique ; ADR-003 est supersédé par ADR-004, dont les anciennes
mentions IAM pending sont supersédées par ADR-005. Les specs `docs/sdd` décrivent
aussi des objectifs futurs ; elles ne prouvent pas leur implémentation.
