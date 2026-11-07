# Architecture actuelle

Branche B2B depuis main f47449c, qui inclut la PR8 fusionnée, 25 octobre 2026. Ce document décrit le code,
pas les migrations effectivement déployées. [Spec courante](../specs/002-b2b-organizations-rbac/spec.md),
[modèle](data-model.md), [permissions](features-b2b.md), [runbook](setup/private-pilot.md).

[Schéma d'architecture et des données](architecture.html) · [maintenance du schéma](setup/architecture-diagram.md).

React/Vite → Fastify → PostgreSQL17 via pg. Monolithe modulaire, Better Auth pour
identité/sessions/email/MFA facultative ; contrats partagés type-only, aucun ORM.
Client → organisation → tenants → workspaces. Une identité ordinaire appartient à
un seul client, avec attributions explicites dans plusieurs de ses tenants.

Chaque opération métier établit depuis la session vérifiée un contexte transactionnel
local : identité, tenant demandé et réautorisé, permissions persistées, IP et user-agent
serveur. COMMIT inclut l'audit applicable ; ROLLBACK annule mutations et traces.
Les fonctions privées et RLS protègent les portées ; le navigateur n'est pas une autorité.
Les mutations ciblées acceptent `Idempotency-Key` : acteur, action, portée et empreinte
de requête déterminent le rejeu, conservé au plus 24 h. L'invitation et sa charge
AES-256-GCM chiffrée sont écrites dans la même transaction métier ; le worker PostgreSQL
réserve par bail et reprend les échecs. Avant SMTP, il verrouille les lignes de l'outbox
et de l'invitation jusqu'à l'accusé, ce qui sérialise une révocation concurrente. Cette
transaction utilise un timeout d'inactivité local de 60 s ; les statuts d'échec ne
s'appliquent qu'au message correspondant au jeton courant. L'état HTTP initial `pending`
ne confirme pas la livraison. SMTP reste au moins une fois ; un accusé ambigu peut
produire un doublon. Le worker traite au plus deux messages en parallèle par instance et
réutilise le pool d'identité de l'application ; le pool métier de cinq connexions conserve
ainsi jusqu'à trois connexions disponibles pour HTTP et le limiteur.

| Module | Responsabilité |
| --- | --- |
| apps/web/src | React Router, Brume, FR/EN, portail app/admin ; formulaires et sélection de portée |
| apps/api/src/auth | Better Auth, provisioning/migrations opérateur, invitations identité et SMTP |
| apps/api/src/business/store.ts | Transaction locale et identité, audit privilégié, vérification rôles SQL runtime |
| apps/api/src/business/routes.ts | Contexte, tenants, workspaces, invitations, idempotence et composition des modules |
| apps/api/src/business/jobs | Outbox chiffrée, réservation atomique, baux, reprises et worker borné à deux jobs |
| profile-routes.ts / rbac-routes.ts / audit-routes.ts | DTO Zod stricts, profil, catalogue/attributions et journal |
| apps/api/migrations | SQL immuable et checksummé ; 0013–0015 B2B, 0016 idempotence/outbox, 0017 pagination, 0018 limites partagées, 0019 accusé obsolète |
| packages/shared/src/index.ts | Types publics seuls |

## Contrats HTTP

| Surface | Contrôle et comportement |
| --- | --- |
| GET /health, /ready | Liveness ; readiness DB/auth/privilèges |
| GET/POST /api/auth/* | Contrats Better Auth ; origine POST et email vérifié |
| GET /api/me?tenantId | Contexte serveur, tenants accessibles et indicateur de gestion des rôles workspace ; le client tolère l'absence de `access` dans les payloads legacy |
| GET /api/tenants | Annuaire des tenants accessibles au contexte |
| GET/POST /api/organizations | Lecture client-scopée ; création super-admin |
| POST /api/organizations/:id/tenants | Super-admin ou organisation-admin du client ; adminEmail fournit billing et invitation initiale |
| GET/POST /api/platform/tenants | Compatibilité super-admin ; POST crée client + premier tenant et enfile l'email |
| GET/POST /api/roles ; PUT /api/roles/:id | Lecture avec roles.assign autorisé ; édition super-admin, impact/confirmation si modification affectante |
| GET/POST /api/role-assignments | Portée et pyramide SQL ; grant/revoke explicites |
| PATCH /api/members/:id/status | Statut invited/active/suspended ; inférieur seulement, dernier admin protégé |
| GET/PUT /api/profile?tenantId | Compte propre ; PUT prénom/nom valides, champs personnels et emploi du tenant sélectionné |
| GET/PUT /api/preferences | Compte propre, locale/theme/timezone/date_format ; aucun sélecteur identité |
| GET /api/workspaces?tenantId&before ; GET/POST /api/workspaces ; GET/PATCH /api/workspaces/:id | Pages bornées à 50, curseur date/UUID tenant-scopé, accès privé vérifié explicitement par la fonction SQL et permissions |
| GET/POST/DELETE membres workspace ; GET/DELETE membres tenant | Fonctions étroites, hiérarchie et dernier admin ; retrait tenant = suspension |
| GET/POST /api/invitations ; POST accept/retry/revoke | Email vérifié, portée, expiration48h, hash et anti-rejeu ; rôle pair interdit |
| POST /api/access-link ; GET/POST /api/access-requests ; POST /:id | Collecte publique sans identité ; revue autorisée, pagination100 et curseur UUID tenant-scopé |
| GET /api/audit-logs?tenantId&before | Journal actif unique, pagination50, curseur UUID ; plateforme super-admin, tenant permission audit.read |
| GET /api/platform/docs | Super-admin uniquement |
| POST /api/platform/actors/:id/disable | Super-admin ; dernier admin actif protégé |

L'ancienne route /api/platform/audit est retirée. Le journal privé historique reste
archivé et ses traces sont copiées avec legacy_id ; aucun deuxième journal actif.
Les réponses d'erreurs métier restent génériques ; aucun secret/valeur de profil audité.
La migration 0016 conserve les réservations d'idempotence au plus 24 h et les événements
chiffrés jusqu'à livraison/échéance. Le runtime n'accède pas directement aux tables
privées ; des fonctions dédiées limitent l'enregistrement, la réservation et l'accusé.

## Interface et limites

Profil existant enrichi, sans onboarding supplémentaire. Routes /app/roles et
/admin/roles pour catalogue/attributions ; /app/audit et /admin/audit selon portée.
Organisation-admin traverse son seul client avec lecture auditée. Les permissions
se cumulent dans leur scope ; une appartenance explicite inactive refuse l'accès.
DESIGN_UI.md gouverne Brume, FR par défaut, EN, clavier et trois tailles d'écran.

Runtimes SQL non propriétaires sans BYPASSRLS. RLS FORCE sur organisations/tenants/
workspaces/journal, tables privées sans grants directs. Un serveur ou credential
compromis pouvant forger le contexte n'est pas neutralisé par RLS.
MFA facultative V0 ; ni runtime IA, ni paiement, ni export/rétention externe,
ni haute disponibilité certifiée. Preuves historiques : [registre](sdd/legacy-reconciliation.md).
L'application des migrations 0016 à 0018 et les scénarios PostgreSQL/Mailpit de cette feature
restent à prouver sur des services jetables ; cette description ne certifie pas un déploiement.
