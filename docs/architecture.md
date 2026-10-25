# Architecture actuelle — index technique

## Correctifs PR7 (2026-10-25)

GET `/api/access-requests` accepte `before` (UUID facultatif), en plus de `tenantId`.
Le tableau reste limité à100 ; la page suivante utilise l'ID du dernier élément.
L'ordre SQL stable est `(created_at DESC,id DESC)` et le curseur est relu dans
l'organisation autorisée. Le frontend conserve un historique précédent/suivant et
recharge aussi les invitations après approbation, même si leur livraison échoue.
Le menu mobile se ferme à partir de768px ; le contenu cesse d'être inert.
Les super-admins ouvrant `/app/invitations` (avec ou sans slash final) rejoignent
`/admin/members`, filtre conservé. Le retour de connexion/MFA accepte `/admin/audit`.

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

## Frontend completion — 2026-10-24

`/signup?link=<uuid>` collects an access request without creating an identity or
membership. `/app/invitations` lets tenant administrators generate their link and
review their own requests; approval reuses invitation delivery. HTTP contracts:
POST `/api/access-link`, GET/POST `/api/access-requests`, POST
`/api/access-requests/:id` (approve/reject). Tenant scope is established by the
existing authenticated transaction; public collection accepts only the opaque link.
`/app/profile` and `/admin/profile` use Better Auth for name and own-session changes.
`/app/members` and `/app/invitations` preserve existing permissions.
`/docs` and GET `/api/platform/docs` require a super-admin; guide content resides
in the backend and is not included in the public JavaScript bundle.
Database authorization tests remain pending in the implementation checkpoint.

## Brume UI system (2026-10-24)

DESIGN_UI.md is the active app/admin/auth design contract. Shared controls and
shell live in apps/web/src/ui; domain compositions remain in pages. The marketing
surface retains its design. Source Sans 3 is self-hosted and Phosphor icons are
limited to sidebar navigation. /docs includes an interactive super-admin gallery.
GET/PUT /api/preferences reads/saves the current actor's locale and theme; the
browser caches preferences for pre-auth rendering. PUT
/api/workspaces/:id/appearance?tenantId=... accepts only a nullable #RRGGBB color.
Existing transaction, session, Origin and role checks apply. Workspaces now expose
nullable color. Arbitrary request properties are rejected rather than stripped.
These contracts require migration 0009; SQL runtime verification remains pending.

## Journal d’audit V0 — 2026-10-24

GET `/api/platform/audit?tenantId=<uuid>&before=<bigint>` retourne au plus 50 événements
et nextCursor (texte ou null), ordre id décroissant, cache no-store. Les contrôles
HTTP et SQL exigent un super-admin actif ; tenantId filtre une consultation déjà
autorisée. `/admin/audit` réutilise le shell Brume, FR/EN, états et pagination.
La migration 0010 complète l’audit existant par des événements change.created,
change.updated, change.deleted atomiques et limités aux champs autorisés. Les
traces métier existantes sont conservées. Les écritures identité/opérateur/publiques
sans contexte authentifié ont un auteur non renseigné ; la cible ne devient jamais
l’auteur par hypothèse. Aucun audit de secrets, valeurs de profil ou payloads.
MFA reste facultative en V0. Aucun endpoint de suppression supplémentaire ni export.
Vérification réelle : 4 tests audit et 14 tests d’isolation passent sur PostgreSQL
17.11 jetable. La consultation navigateur réelle FR/EN aux trois viewports et
les refus 401/403 sont démontrés dans .omo/evidence/audit-log-v0/live-browser/proof.json.
Les gates globaux restent rouges sur le chantier lifecycle et un test profil 429.
