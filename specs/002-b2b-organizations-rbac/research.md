# Découverte et décisions

Base : main f47449c ; branche codex/b2b-organizations-rbac, checkout initial propre.
Deux passes exploratoires SQL/autorisation et profil/SDK effectuées en lecture seule.
Points centraux : memberships.actor_id PK, business.context et store mono-tenant,
roles enums dans routes/shared/UI, 0007 dernieradmin, 0010 audit, 0011 lifecycle,
Profile.tsx utilise SDK updateUser(name), deliver crée identité depuis email uniquement.
Docker Desktop indisponible : pipe dockerDesktopLinuxEngine absent. PostgreSQL portable
existe sous D:/Temp/agenctic-audit-pg17/pgsql ; utiliser une nouvelle instance jetable
pour les tests, jamais le datadir existant ou une base de développement.

Blocage réel : exigences firstname/lastname NOT NULL face aux invitations email seules.
Question envoyée, réponse obligatoire avant conception de cette contrainte.
Aucun fichier applicatif ou migration modifié pendant cette découverte.
