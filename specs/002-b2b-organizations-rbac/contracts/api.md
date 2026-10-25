# Contrats API de la V0 enrichie

Conserver /api/me et ses champs legacy ; ajouter organisation, tenants accessibles,
rôles et permissions effectives dans le contexte. tenantId sélectionne une portée
explicitement autorisée, jamais un tenant arbitraire. Les guards UI lisent ces capacités. Chaque workspace expose can_assign_roles et role_level
pour la gestion dans sa portée exacte, sans élargir les permissions tenant.

- GET/POST /api/organizations : annuaire autorisé, création super-admin ; organisation-admin
  lit/gère sa seule organisation. POST /api/organizations/:id/tenants crée un tenant.
- GET /api/roles : catalogue autorisé, permissions, scope, niveau, impact et timestamp.
- POST /api/roles et PUT /api/roles/:id : super-admin ; body name,scope,permissions,
  delegable,archived,confirmed ; contrôle d’impact/confirmation pour les modifications.
- GET /api/role-assignments?tenantId=...&workspaceId=... : personnes et rôles dans la portée autorisée.
- POST /api/role-assignments : actorId,roleId,organizationId,tenantId?,workspaceId?,
  operation grant/revoke ; contrôle de niveau, délégation et portée à chaque requête.
- PATCH /api/members/:id/status?tenantId=... : status invited/active/suspended,
  supérieur seulement, pas de dernieradmin supprimé ; effet immédiat.
- GET/PUT /api/profile?tenantId=... : profil propre first_name,last_name,avatar_url,
  phone_number et job_title/department de la membership active. PUT complet nécessite
  first_name/last_name trim1..100 ; job120/dept100/phoneE164 ; propriétés inconnues refusées.
  Vérification email, rôles, statuts et IDs non modifiables par ce DTO.
- GET/PUT /api/preferences : préserver locale/theme ; timezone et date_format optionnels
  à l’écriture pour les anciens consommateurs, complétés par les valeurs existantes.
- GET /api/audit-logs?tenantId=...&before=... : journal unique, page50, curseur stable,
  événements plateforme super-admin seul, événements tenant selon permission audit.read et portée.

Utiliser les primitifs UI et les modules métier actuels, sans nouvelle page onboarding.
Aucun endpoint de purge, archivage workspace ou facturation. Pas de secret dans les réponses.
