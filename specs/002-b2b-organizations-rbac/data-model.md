# Modèle cible et frontières

- business.organizations : client (UUID, nom, slug, dates et suppression logique).
- business.tenants : organization_id requis ; slug unique, billing_email, vat_number,
  country_code, subscription_tier/status et metadata ; RLS, anciennes PK conservées.
- actors : organisation cliente ordinaire nullable liée à l’identité, super_admin distinct.
- memberships : clé composite tenant/actor ; job_title, department, status, invited_by,
  joined_at nullable. Aucun accès membership non active, ni appartenance à deux clients.
- workspaces : slug unique par tenant, description et archived_at informatif ; FK composites.
- role_catalog : UUID, code/nom, scope, permissions prédéfinies, niveau, delegable,
  archived_at et updated_at ; builtins protégés et custom définis par super-admin.
- role_assignments : acteur + rôle + organisation, tenant et workspace selon scope ;
  unicité et références composites empêchent les affectations hors client.
- identity.user : first_name/last_name nullable et phone_number E.164 ; name SDK
  synchronisé lorsqu’un profil complet est enregistré. Avatar/email/dates utilisent
  la vérité SDK image/emailVerified/createdAt/updatedAt ; aliases explicites.
- ui_preferences : timezone Europe/Paris, date_format DD/MM/YYYY ; locale/theme conservés.
- audit_logs : UUID, portée plateforme/tenant, IDs auteur/org/tenant conservés, cible texte,
  action, IP/UA serveur, payload contrôlé et created_at. Ancienne source archivée.

Chaque fonction SECURITY DEFINER a un search_path fixe et des relations qualifiées.
Pas d’accès privé direct des runtimes ; organisations, tenants, workspaces et nouvel audit
sont soumis à leur RLS, avec contexte établi par le serveur dans la transaction.
