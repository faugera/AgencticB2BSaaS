SET LOCAL ROLE business_owner;
CREATE TABLE business.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
  slug text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
ALTER TABLE business.tenants ADD COLUMN organization_id uuid REFERENCES business.organizations(id);
ALTER TABLE authorization_private.actors ADD COLUMN organization_id uuid REFERENCES business.organizations(id);
ALTER TABLE authorization_private.invitations ADD COLUMN invited_by uuid REFERENCES authorization_private.actors(id);
-- Mapping privé : les policies tenant ne doivent jamais relire leur propre table RLS.
CREATE TABLE authorization_private.tenant_organizations (
  tenant_id uuid PRIMARY KEY REFERENCES business.tenants(id), organization_id uuid NOT NULL REFERENCES business.organizations(id),
  name text NOT NULL, deleted_at timestamptz
);
CREATE TABLE authorization_private.workspace_scopes (
  workspace_id uuid PRIMARY KEY REFERENCES business.workspaces(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  tenant_id uuid NOT NULL REFERENCES business.tenants(id)
);
RESET ROLE;
-- Le rôle opérateur effectue la reprise des lignes anciennes sous FORCE RLS.
INSERT INTO business.organizations(id,name,slug,created_at,updated_at,deleted_at)
  SELECT id,name,'organization-'||replace(id::text,'-',''),created_at,updated_at,deleted_at FROM business.tenants;
ALTER TABLE business.tenants DISABLE TRIGGER lifecycle_dates;
UPDATE business.tenants SET organization_id=id;
ALTER TABLE business.tenants ENABLE TRIGGER lifecycle_dates;
INSERT INTO authorization_private.tenant_organizations SELECT id,organization_id,name,deleted_at FROM business.tenants;
INSERT INTO authorization_private.workspace_scopes SELECT id,tenant_id FROM business.workspaces;
UPDATE authorization_private.actors a SET organization_id=t.organization_id
  FROM authorization_private.memberships m JOIN authorization_private.tenant_organizations t ON t.tenant_id=m.tenant_id
  WHERE m.actor_id=a.id AND a.platform_role IS NULL;
SET LOCAL ROLE business_owner;
ALTER TABLE business.tenants ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE business.tenants ADD UNIQUE(organization_id,id);
-- La clé unique composite existante reste la cible des FK workspace_members.
ALTER TABLE authorization_private.memberships DROP CONSTRAINT memberships_pkey;
ALTER TABLE authorization_private.memberships ADD PRIMARY KEY(tenant_id,actor_id);

CREATE TABLE authorization_private.role_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
  name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
  scope text NOT NULL CHECK(scope IN ('organization','tenant','workspace')),
  permissions text[] NOT NULL, level integer NOT NULL CHECK(level BETWEEN 0 AND 3),
  delegable boolean NOT NULL DEFAULT false, builtin boolean NOT NULL DEFAULT false,
  archived_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(code<>'super_admin')
);
INSERT INTO authorization_private.role_catalog(code,name,scope,permissions,level,delegable,builtin) VALUES
 ('organization_admin','Administrateur organisation','organization',ARRAY['organization.manage','tenant.read','tenant.manage','workspace.read','workspace.create','workspace.update','workspace.members.manage','members.read','members.manage','invitations.manage','audit.read','roles.assign'],3,false,true),
 ('tenant_admin','Administrateur tenant','tenant',ARRAY['tenant.read','tenant.manage','workspace.read','workspace.create','workspace.update','workspace.members.manage','members.read','members.manage','invitations.manage','audit.read','roles.assign'],2,true,true),
 ('workspace_admin','Administrateur workspace','workspace',ARRAY['workspace.read','workspace.update','workspace.members.manage','roles.assign'],1,true,true),
 ('member','Membre','tenant',ARRAY['tenant.read','workspace.read'],0,true,true);
CREATE TABLE authorization_private.role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES authorization_private.actors(id),
  role_id uuid NOT NULL REFERENCES authorization_private.role_catalog(id), organization_id uuid NOT NULL REFERENCES business.organizations(id),
  tenant_id uuid, workspace_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(organization_id,tenant_id) REFERENCES business.tenants(organization_id,id),
  FOREIGN KEY(tenant_id,workspace_id) REFERENCES business.workspaces(tenant_id,id),
  CHECK(workspace_id IS NULL OR tenant_id IS NOT NULL),
  UNIQUE NULLS NOT DISTINCT(actor_id,role_id,organization_id,tenant_id,workspace_id)
);
CREATE INDEX ON authorization_private.role_assignments(actor_id,tenant_id);

CREATE FUNCTION business.sync_tenant_organization() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'ORGANIZATION_IMMUTABLE' USING ERRCODE='22023';
  END IF;
  INSERT INTO authorization_private.tenant_organizations VALUES(NEW.id,NEW.organization_id,NEW.name,NEW.deleted_at)
    ON CONFLICT(tenant_id) DO UPDATE SET name=excluded.name,deleted_at=excluded.deleted_at;
  RETURN NEW;
END $$;
CREATE TRIGGER tenant_organization AFTER INSERT OR UPDATE OF organization_id,name,deleted_at ON business.tenants
  FOR EACH ROW EXECUTE FUNCTION business.sync_tenant_organization();
CREATE FUNCTION business.sync_workspace_scope() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN RAISE EXCEPTION 'TENANT_IMMUTABLE' USING ERRCODE='22023'; END IF;
  INSERT INTO authorization_private.workspace_scopes VALUES(NEW.id,NEW.tenant_id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER workspace_scope BEFORE INSERT OR UPDATE OF tenant_id ON business.workspaces
  FOR EACH ROW EXECUTE FUNCTION business.sync_workspace_scope();

CREATE FUNCTION business.bind_actor_organization() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE org uuid; bound uuid; platform text; role_scope text;
BEGIN
  IF TG_TABLE_NAME='memberships' THEN
    SELECT organization_id INTO org FROM authorization_private.tenant_organizations WHERE tenant_id=NEW.tenant_id;
  ELSE
    org := NEW.organization_id;
    SELECT scope INTO role_scope FROM authorization_private.role_catalog WHERE id=NEW.role_id;
    IF (role_scope='organization' AND (NEW.tenant_id IS NOT NULL OR NEW.workspace_id IS NOT NULL))
      OR (role_scope='tenant' AND (NEW.tenant_id IS NULL OR NEW.workspace_id IS NOT NULL))
      OR (role_scope='workspace' AND NEW.workspace_id IS NULL) THEN
      RAISE EXCEPTION 'INVALID_ROLE_SCOPE' USING ERRCODE='22023';
    END IF;
    IF NEW.tenant_id IS NOT NULL AND NOT EXISTS(SELECT FROM authorization_private.memberships WHERE tenant_id=NEW.tenant_id AND actor_id=NEW.actor_id) THEN
      RAISE EXCEPTION 'MEMBERSHIP_REQUIRED' USING ERRCODE='23503';
    END IF;
  END IF;
  SELECT organization_id,platform_role INTO bound,platform FROM authorization_private.actors WHERE id=NEW.actor_id FOR UPDATE;
  IF platform IS NOT NULL OR org IS NULL OR (bound IS NOT NULL AND bound<>org) THEN
    RAISE EXCEPTION 'ORGANIZATION_CONFLICT' USING ERRCODE='23505';
  END IF;
  UPDATE authorization_private.actors SET organization_id=org WHERE id=NEW.actor_id AND organization_id IS NULL;
  RETURN NEW;
END $$;
CREATE TRIGGER membership_organization BEFORE INSERT OR UPDATE OF tenant_id,actor_id ON authorization_private.memberships
  FOR EACH ROW EXECUTE FUNCTION business.bind_actor_organization();
CREATE TRIGGER assignment_organization BEFORE INSERT OR UPDATE ON authorization_private.role_assignments
  FOR EACH ROW EXECUTE FUNCTION business.bind_actor_organization();

CREATE FUNCTION business.organization_admin(org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT business.is_super() OR EXISTS(SELECT FROM authorization_private.role_assignments a
    JOIN authorization_private.role_catalog r ON r.id=a.role_id JOIN authorization_private.actors actor ON actor.id=a.actor_id
    WHERE a.actor_id=business.actor_id() AND a.organization_id=org AND actor.organization_id=org
      AND a.tenant_id IS NULL AND r.scope='organization' AND r.archived_at IS NULL AND r.builtin AND r.code='organization_admin')
$$;
CREATE FUNCTION business.organization_permission(org uuid,permission text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT business.is_super() OR EXISTS(SELECT FROM authorization_private.role_assignments assignment
    JOIN authorization_private.role_catalog role ON role.id=assignment.role_id JOIN authorization_private.actors actor ON actor.id=assignment.actor_id
    WHERE actor.id=business.actor_id() AND actor.organization_id=org AND assignment.organization_id=org
      AND assignment.tenant_id IS NULL AND role.scope='organization' AND role.archived_at IS NULL AND permission=ANY(role.permissions))
$$;
CREATE OR REPLACE FUNCTION business.tenant_membership(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT target::text=current_setting('app.tenant_id',true) AND (business.is_super() OR (
    NOT EXISTS(SELECT FROM authorization_private.memberships WHERE actor_id=business.actor_id() AND tenant_id=target AND status<>'active') AND (
    EXISTS(SELECT FROM authorization_private.tenant_organizations t WHERE t.tenant_id=target AND business.organization_permission(t.organization_id,'tenant.read'))
    OR EXISTS(SELECT FROM authorization_private.memberships m JOIN authorization_private.actors a ON a.id=m.actor_id
      JOIN authorization_private.tenant_organizations t ON t.tenant_id=m.tenant_id
      WHERE m.tenant_id=target AND m.actor_id=business.actor_id() AND m.status='active' AND a.organization_id=t.organization_id))))
$$;
ALTER POLICY tenant_read ON business.tenants USING(deleted_at IS NULL AND (business.tenant_membership(id) OR business.is_super()));
CREATE OR REPLACE FUNCTION business.tenant_access(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT business.tenant_membership(target) AND EXISTS(SELECT FROM business.tenants t JOIN business.organizations o ON o.id=t.organization_id
    WHERE t.id=target AND t.deleted_at IS NULL AND o.deleted_at IS NULL)
$$;

-- Les rôles legacy sont une source builtin bornée ; les attributions custom restent cumulatives.
CREATE FUNCTION business.effective_roles(target_actor uuid, tenant uuid, workspace uuid DEFAULT NULL)
RETURNS SETOF authorization_private.role_catalog LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT r.* FROM authorization_private.role_catalog r WHERE r.archived_at IS NULL AND (
    EXISTS(SELECT FROM authorization_private.role_assignments a WHERE a.role_id=r.id AND a.actor_id=target_actor
      AND a.organization_id=coalesce((SELECT organization_id FROM authorization_private.tenant_organizations WHERE tenant_id=tenant),
        (SELECT organization_id FROM authorization_private.actors WHERE id=target_actor))
      AND (a.tenant_id IS NULL OR a.tenant_id=tenant) AND (a.workspace_id IS NULL OR a.workspace_id=workspace))
    OR EXISTS(SELECT FROM authorization_private.memberships m WHERE m.actor_id=target_actor AND m.tenant_id=tenant AND m.status='active' AND m.role=r.code)
    OR EXISTS(SELECT FROM authorization_private.workspace_members w JOIN authorization_private.memberships m USING(tenant_id,actor_id)
      WHERE w.actor_id=target_actor AND w.tenant_id=tenant AND w.workspace_id=workspace AND m.status='active' AND w.role=r.code AND r.scope='workspace'))
$$;
CREATE FUNCTION business.can(permission text, workspace uuid DEFAULT NULL) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT permission=ANY(ARRAY['organization.manage','tenant.read','tenant.manage','workspace.read','workspace.create','workspace.update','workspace.members.manage','members.read','members.manage','invitations.manage','audit.read','roles.assign'])
    AND business.tenant_access(nullif(current_setting('app.tenant_id',true),'')::uuid)
    AND (workspace IS NULL OR EXISTS(SELECT FROM authorization_private.workspace_scopes w
      WHERE w.workspace_id=workspace AND w.tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid)) AND (
    business.is_super() OR EXISTS(SELECT FROM business.effective_roles(business.actor_id(),nullif(current_setting('app.tenant_id',true),'')::uuid,workspace) r WHERE permission=ANY(r.permissions)))
$$;
CREATE OR REPLACE FUNCTION business.tenant_admin(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT business.tenant_access(target) AND business.can('tenant.manage')
$$;
CREATE OR REPLACE FUNCTION business.workspace_access(target uuid, tenant uuid, visible text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT business.tenant_access(tenant) AND (business.is_super() OR EXISTS(SELECT FROM business.effective_roles(business.actor_id(),tenant,target) r WHERE 'workspace.read'=ANY(r.permissions)))
    AND (visible='tenant' OR business.can('tenant.manage')
      OR EXISTS(SELECT FROM authorization_private.workspace_members WHERE workspace_id=target AND tenant_id=tenant AND actor_id=business.actor_id())
      OR EXISTS(SELECT FROM authorization_private.role_assignments a JOIN authorization_private.role_catalog r ON r.id=a.role_id
        WHERE a.actor_id=business.actor_id() AND (a.tenant_id IS NULL OR a.tenant_id=tenant) AND (a.workspace_id IS NULL OR a.workspace_id=target)
          AND r.archived_at IS NULL AND 'workspace.read'=ANY(r.permissions)))
$$;
CREATE OR REPLACE FUNCTION business.workspace_admin(target uuid, tenant uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT business.tenant_access(tenant) AND business.can('workspace.update',target)
    AND EXISTS(SELECT FROM business.workspaces WHERE id=target AND tenant_id=tenant)
$$;
-- Le prédicat UPDATE ne relit pas workspaces : pas de récursion RLS.
ALTER POLICY workspace_create ON business.workspaces WITH CHECK(business.can('workspace.create'));
ALTER POLICY workspace_update ON business.workspaces USING(business.tenant_access(tenant_id) AND business.can('workspace.update',id))
  WITH CHECK(business.tenant_access(tenant_id) AND business.can('workspace.update',id));

ALTER TABLE business.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.organizations FORCE ROW LEVEL SECURITY;
CREATE FUNCTION business.organization_access(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT business.is_super() OR EXISTS(SELECT FROM authorization_private.actors a WHERE a.id=business.actor_id() AND a.organization_id=target)
$$;
CREATE POLICY organization_read ON business.organizations FOR SELECT USING(deleted_at IS NULL AND
  business.organization_access(id));
CREATE POLICY organization_create ON business.organizations FOR INSERT WITH CHECK(business.is_super());
CREATE TRIGGER lifecycle_dates BEFORE UPDATE ON business.organizations FOR EACH ROW EXECUTE FUNCTION business.lifecycle_dates();
CREATE FUNCTION business.revoke_deleted_organization() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    UPDATE authorization_private.invitations SET revoked_at=now() WHERE accepted_at IS NULL AND revoked_at IS NULL
      AND tenant_id IN (SELECT tenant_id FROM authorization_private.tenant_organizations WHERE organization_id=NEW.id);
    DELETE FROM authorization_private.access_links WHERE tenant_id IN
      (SELECT tenant_id FROM authorization_private.tenant_organizations WHERE organization_id=NEW.id);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER lifecycle_revoke AFTER UPDATE OF deleted_at ON business.organizations
  FOR EACH ROW EXECUTE FUNCTION business.revoke_deleted_organization();
GRANT SELECT ON business.organizations TO business_runtime;

CREATE OR REPLACE FUNCTION business.context() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor authorization_private.actors; membership authorization_private.memberships; tenant uuid;
  org uuid; tenant_list jsonb; role_list jsonb; permission_list jsonb; actor_level integer;
BEGIN
  IF NOT EXISTS(SELECT FROM identity."user" WHERE id=current_setting('app.identity_id',true) AND "emailVerified" AND "deletedAt" IS NULL) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  INSERT INTO authorization_private.actors(identity_id) VALUES(current_setting('app.identity_id',true)) ON CONFLICT(identity_id) DO NOTHING;
  SELECT * INTO actor FROM authorization_private.actors WHERE id=business.actor_id();
  IF actor.id IS NULL THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF actor.organization_id IS NOT NULL AND NOT EXISTS(SELECT FROM business.organizations WHERE id=actor.organization_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  tenant := nullif(current_setting('app.tenant_id',true),'')::uuid;
  IF tenant IS NULL AND actor.platform_role IS NULL THEN
    SELECT m.tenant_id INTO tenant FROM authorization_private.memberships m WHERE m.actor_id=actor.id AND m.status='active' ORDER BY m.tenant_id LIMIT 1;
  END IF;
  PERFORM set_config('app.tenant_id',coalesce(tenant::text,''),true);
  IF tenant IS NOT NULL AND NOT coalesce(business.tenant_access(tenant),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  org := actor.organization_id;
  IF tenant IS NOT NULL THEN SELECT organization_id INTO org FROM authorization_private.tenant_organizations WHERE tenant_id=tenant; END IF;
  SELECT * INTO membership FROM authorization_private.memberships WHERE actor_id=actor.id AND tenant_id=tenant AND status='active';
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.tenant_id,'name',t.name,'organization_id',t.organization_id) ORDER BY t.name,t.tenant_id),'[]') INTO tenant_list
    FROM authorization_private.tenant_organizations t WHERE t.deleted_at IS NULL AND (business.is_super() OR (
      NOT EXISTS(SELECT FROM authorization_private.memberships m WHERE m.actor_id=actor.id AND m.tenant_id=t.tenant_id AND m.status<>'active') AND (
      business.organization_permission(t.organization_id,'tenant.read') OR EXISTS(SELECT FROM authorization_private.memberships m WHERE m.actor_id=actor.id AND m.tenant_id=t.tenant_id AND m.status='active'))));
  SELECT coalesce(jsonb_agg(DISTINCT r.code),'[]'),coalesce(max(r.level),0) INTO role_list,actor_level FROM business.effective_roles(actor.id,tenant) r;
  SELECT coalesce(jsonb_agg(DISTINCT permission),'[]') INTO permission_list FROM business.effective_roles(actor.id,tenant) r CROSS JOIN unnest(r.permissions) permission;
  IF business.is_super() OR (org IS NOT NULL AND business.organization_admin(org)) THEN
    SELECT to_jsonb(permissions) INTO permission_list FROM authorization_private.role_catalog WHERE code='organization_admin';
    actor_level := CASE WHEN business.is_super() THEN 4 ELSE 3 END;
    role_list := jsonb_build_array(CASE WHEN business.is_super() THEN 'super_admin' ELSE 'organization_admin' END);
  END IF;
  RETURN jsonb_build_object('actorId',actor.id,'platformRole',actor.platform_role,'tenantId',tenant,
    'tenantRole',membership.role,'handle',actor.handle,'organizationId',org,
    'organizationRole',CASE WHEN NOT business.is_super() AND business.organization_admin(org) THEN 'organization_admin' ELSE NULL END,
    'tenants',tenant_list,'roles',role_list,'permissions',permission_list,'level',actor_level);
END $$;

CREATE FUNCTION business.organization_directory() RETURNS TABLE(id uuid,name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT o.id,o.name FROM business.organizations o ORDER BY o.name,o.id
$$;
CREATE FUNCTION business.create_organization(label text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result uuid := gen_random_uuid();
BEGIN
  IF NOT coalesce(business.is_super(),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO business.organizations(id,name,slug) VALUES(result,trim(label),'organization-'||replace(result::text,'-',''));
  RETURN result;
END $$;
CREATE FUNCTION business.create_tenant(org uuid,label text,billing text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result uuid := gen_random_uuid();
BEGIN
  IF NOT coalesce(business.organization_permission(org,'organization.manage'),false) OR NOT EXISTS(SELECT FROM business.organizations WHERE id=org AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  PERFORM set_config('app.tenant_id',result::text,true);
  INSERT INTO business.tenants(id,organization_id,name,billing_email) VALUES(result,org,trim(label),billing);
  RETURN result;
END $$;
ALTER POLICY tenant_create ON business.tenants WITH CHECK(business.organization_permission(organization_id,'organization.manage'));

CREATE FUNCTION business.role_catalog() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'code',r.code,'name',r.name,'scope',r.scope,
    'permissions',r.permissions,'level',r.level,'delegable',r.delegable,'builtin',r.builtin,
    'archivedAt',r.archived_at,'updatedAt',r.updated_at,'impactCount',(SELECT count(*) FROM authorization_private.role_assignments a
      WHERE a.role_id=r.id AND (business.is_super() OR a.organization_id=(SELECT organization_id FROM authorization_private.actors WHERE id=business.actor_id())))) ORDER BY r.level DESC,r.name),'[]')
    FROM authorization_private.role_catalog r WHERE business.actor_id() IS NOT NULL
$$;
CREATE FUNCTION business.organization_admin_count(org uuid) RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT count(DISTINCT actor.id) FROM authorization_private.actors actor
    JOIN authorization_private.role_assignments assignment ON assignment.actor_id=actor.id
    JOIN authorization_private.role_catalog role ON role.id=assignment.role_id
    WHERE actor.enabled AND actor.organization_id=org AND assignment.organization_id=org AND assignment.tenant_id IS NULL
      AND role.scope='organization' AND role.archived_at IS NULL AND 'organization.manage'=ANY(role.permissions)
$$;
CREATE FUNCTION business.save_role(target uuid,label text,scope text,permissions text[],delegable boolean,archived boolean,confirmed boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE existing authorization_private.role_catalog; result uuid := coalesce(target,gen_random_uuid()); derived integer; affected_tenant uuid; affected_org uuid;
BEGIN
  IF NOT coalesce(business.is_super(),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF scope NOT IN ('organization','tenant','workspace') OR permissions IS NULL OR EXISTS(SELECT FROM unnest(permissions) p WHERE p IS NULL OR p<>ALL(ARRAY['organization.manage','tenant.read','tenant.manage','workspace.read','workspace.create','workspace.update','workspace.members.manage','members.read','members.manage','invitations.manage','audit.read','roles.assign']))
    OR (scope<>'organization' AND 'organization.manage'=ANY(permissions))
    OR (scope='workspace' AND permissions && ARRAY['tenant.read','tenant.manage','workspace.create','members.read','members.manage','invitations.manage','audit.read']) THEN
    RAISE EXCEPTION 'INVALID_ROLE' USING ERRCODE='22023'; END IF;
  derived := CASE WHEN 'organization.manage'=ANY(permissions) THEN 3
    WHEN permissions && ARRAY['tenant.manage','members.manage','invitations.manage','workspace.create'] THEN 2
    WHEN permissions && ARRAY['workspace.update','workspace.members.manage','roles.assign'] THEN 1 ELSE 0 END;
  IF target IS NOT NULL THEN
    SELECT * INTO existing FROM authorization_private.role_catalog WHERE id=target FOR UPDATE;
    IF NOT FOUND OR existing.builtin THEN RAISE EXCEPTION 'PROTECTED_ROLE' USING ERRCODE='42501'; END IF;
    IF NOT confirmed AND EXISTS(SELECT FROM authorization_private.role_assignments WHERE role_id=target) THEN RAISE EXCEPTION 'CONFIRMATION_REQUIRED' USING ERRCODE='22023'; END IF;
    IF existing.scope<>scope AND EXISTS(SELECT FROM authorization_private.role_assignments WHERE role_id=target) THEN RAISE EXCEPTION 'ROLE_SCOPE_IN_USE' USING ERRCODE='22023'; END IF;
    FOR affected_org IN SELECT DISTINCT organization_id FROM authorization_private.role_assignments WHERE role_id=target ORDER BY organization_id LOOP
      PERFORM pg_advisory_xact_lock(hashtext('organization-rights:'||affected_org::text));
    END LOOP;
    FOR affected_tenant IN SELECT DISTINCT tenant_id FROM authorization_private.role_assignments WHERE role_id=target AND tenant_id IS NOT NULL ORDER BY tenant_id LOOP
      PERFORM pg_advisory_xact_lock(hashtext('tenant-admin:'||affected_tenant::text));
    END LOOP;
    UPDATE authorization_private.role_catalog r SET name=trim(label),scope=save_role.scope,permissions=save_role.permissions,
      level=derived,delegable=save_role.delegable,archived_at=CASE WHEN archived THEN coalesce(r.archived_at,now()) ELSE NULL END,updated_at=clock_timestamp() WHERE r.id=target;
    IF 'tenant.manage'=ANY(existing.permissions) AND (archived OR NOT 'tenant.manage'=ANY(permissions)) AND EXISTS(
      SELECT FROM authorization_private.role_assignments assignment
      JOIN authorization_private.memberships member ON member.tenant_id=assignment.tenant_id AND member.actor_id=assignment.actor_id
      JOIN authorization_private.actors actor ON actor.id=member.actor_id
      WHERE assignment.role_id=target AND member.status='active' AND actor.enabled AND NOT EXISTS(
        SELECT FROM authorization_private.memberships m JOIN authorization_private.actors a ON a.id=m.actor_id
        WHERE m.tenant_id=assignment.tenant_id AND m.status='active' AND a.enabled AND business.tenant_admin_actor(a.id,m.tenant_id))) THEN
      RAISE EXCEPTION 'LAST_ADMIN' USING ERRCODE='23505';
    END IF;
    IF existing.scope='organization' AND 'organization.manage'=ANY(existing.permissions) AND (archived OR NOT 'organization.manage'=ANY(permissions))
      AND EXISTS(SELECT FROM authorization_private.role_assignments assignment JOIN authorization_private.actors actor ON actor.id=assignment.actor_id
        WHERE assignment.role_id=target AND actor.enabled AND business.organization_admin_count(assignment.organization_id)=0) THEN
      RAISE EXCEPTION 'LAST_ADMIN' USING ERRCODE='23505';
    END IF;
  ELSE
    INSERT INTO authorization_private.role_catalog(id,code,name,scope,permissions,level,delegable,archived_at)
      VALUES(result,'custom_'||replace(result::text,'-',''),trim(label),scope,permissions,derived,delegable,CASE WHEN archived THEN now() ELSE NULL END);
  END IF;
  RETURN result;
END $$;

CREATE FUNCTION business.actor_level(target_actor uuid,tenant uuid,workspace uuid DEFAULT NULL) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT CASE WHEN EXISTS(SELECT FROM authorization_private.actors WHERE id=target_actor AND platform_role='super_admin') THEN 4
    ELSE coalesce((SELECT max(r.level) FROM authorization_private.role_catalog r WHERE r.archived_at IS NULL AND (
      EXISTS(SELECT FROM authorization_private.role_assignments assignment WHERE assignment.actor_id=target_actor AND assignment.role_id=r.id
        AND assignment.organization_id=(SELECT organization_id FROM authorization_private.actors WHERE id=target_actor)
        AND (assignment.tenant_id IS NULL OR assignment.tenant_id=tenant) AND (assignment.workspace_id IS NULL OR assignment.workspace_id=workspace))
      OR EXISTS(SELECT FROM authorization_private.memberships m WHERE m.actor_id=target_actor AND m.tenant_id=tenant AND m.role=r.code)
      OR EXISTS(SELECT FROM authorization_private.workspace_members w WHERE w.actor_id=target_actor AND w.tenant_id=tenant AND w.workspace_id=workspace AND w.role=r.code AND r.scope='workspace'))),0) END
$$;
CREATE FUNCTION business.can_manage_actor(target uuid,tenant uuid,workspace uuid DEFAULT NULL) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT target<>business.actor_id() AND business.tenant_access(tenant)
    AND EXISTS(SELECT FROM authorization_private.actors a JOIN authorization_private.tenant_organizations t ON t.organization_id=a.organization_id
      WHERE a.id=target AND t.tenant_id=tenant)
    AND business.actor_level(business.actor_id(),tenant,workspace)>business.actor_level(target,tenant,workspace)
$$;
CREATE FUNCTION business.workspace_level(workspace uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT CASE WHEN business.tenant_access(nullif(current_setting('app.tenant_id',true),'')::uuid)
    AND EXISTS(SELECT FROM authorization_private.workspace_scopes WHERE workspace_id=workspace AND tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid)
    THEN business.actor_level(business.actor_id(),nullif(current_setting('app.tenant_id',true),'')::uuid,workspace) ELSE 0 END
$$;
CREATE FUNCTION business.tenant_admin_actor(target uuid,tenant uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT EXISTS(SELECT FROM authorization_private.memberships m JOIN authorization_private.actors a ON a.id=m.actor_id
    WHERE m.actor_id=target AND m.tenant_id=tenant AND m.status='active' AND a.enabled
      AND EXISTS(SELECT FROM business.effective_roles(target,tenant) r WHERE 'tenant.manage'=ANY(r.permissions)))
$$;
CREATE FUNCTION business.guard_last_admin(target uuid,tenant uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('tenant-admin:'||tenant::text));
  IF EXISTS(SELECT FROM authorization_private.memberships m JOIN authorization_private.actors a ON a.id=m.actor_id
    WHERE m.actor_id=target AND m.tenant_id=tenant AND m.status='active' AND a.enabled AND business.tenant_admin_actor(a.id,tenant))
    AND NOT EXISTS(SELECT FROM authorization_private.memberships m JOIN authorization_private.actors a ON a.id=m.actor_id
      WHERE m.actor_id<>target AND m.tenant_id=tenant AND m.status='active' AND a.enabled AND business.tenant_admin_actor(a.id,tenant)) THEN
    RAISE EXCEPTION 'LAST_ADMIN' USING ERRCODE='23505';
  END IF;
END $$;

CREATE FUNCTION business.assign_role(target_actor uuid,role uuid,organization uuid,tenant uuid,workspace uuid,operation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE selected authorization_private.role_catalog; target_level integer; actor_org uuid; was_tenant_admin boolean := false;
BEGIN
  SELECT * INTO selected FROM authorization_private.role_catalog WHERE id=role FOR SHARE;
  IF NOT FOUND OR selected.archived_at IS NOT NULL OR operation IS NULL OR operation NOT IN ('grant','revoke') THEN RAISE EXCEPTION 'INVALID_ROLE' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('organization-rights:'||organization::text));
  SELECT organization_id INTO actor_org FROM authorization_private.actors WHERE id=target_actor FOR UPDATE;
  IF target_actor=business.actor_id() OR (actor_org IS NOT NULL AND actor_org<>organization) OR EXISTS(SELECT FROM authorization_private.actors WHERE id=target_actor AND platform_role IS NOT NULL) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF (selected.scope='organization' AND (tenant IS NOT NULL OR workspace IS NOT NULL))
    OR (selected.scope='tenant' AND (tenant IS NULL OR workspace IS NOT NULL)) OR (selected.scope='workspace' AND workspace IS NULL)
    OR (tenant IS NOT NULL AND NOT EXISTS(SELECT FROM authorization_private.tenant_organizations WHERE tenant_id=tenant AND organization_id=organization)) THEN
    RAISE EXCEPTION 'INVALID_ROLE_SCOPE' USING ERRCODE='22023'; END IF;
  target_level := business.actor_level(target_actor,tenant,workspace);
  IF NOT business.is_super() AND (NOT selected.delegable OR tenant IS NULL OR NOT business.can('roles.assign',workspace)
      OR NOT business.can_manage_actor(target_actor,tenant,workspace) OR selected.level>=business.actor_level(business.actor_id(),tenant,workspace)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF business.is_super() AND target_level>=4 THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF operation='grant' THEN
    INSERT INTO authorization_private.role_assignments(actor_id,role_id,organization_id,tenant_id,workspace_id)
      VALUES(target_actor,role,organization,tenant,workspace) ON CONFLICT DO NOTHING;
  ELSE
    IF tenant IS NOT NULL AND selected.level>=2 THEN
      PERFORM pg_advisory_xact_lock(hashtext('tenant-admin:'||tenant::text));
      was_tenant_admin := business.tenant_admin_actor(target_actor,tenant);
    END IF;
    DELETE FROM authorization_private.role_assignments a WHERE a.actor_id=target_actor AND a.role_id=role AND a.organization_id=organization
      AND a.tenant_id IS NOT DISTINCT FROM tenant AND a.workspace_id IS NOT DISTINCT FROM workspace;
    IF selected.scope='organization' AND 'organization.manage'=ANY(selected.permissions) AND business.organization_admin_count(organization)=0 THEN
      RAISE EXCEPTION 'LAST_ADMIN' USING ERRCODE='23505'; END IF;
    IF selected.code='tenant_admin' THEN UPDATE authorization_private.memberships SET role='member' WHERE actor_id=target_actor AND tenant_id=tenant;
    ELSIF selected.code='workspace_admin' THEN UPDATE authorization_private.workspace_members SET role='member' WHERE actor_id=target_actor AND workspace_id=workspace AND tenant_id=tenant; END IF;
    IF was_tenant_admin AND NOT business.tenant_admin_actor(target_actor,tenant) AND NOT EXISTS(
      SELECT FROM authorization_private.memberships m WHERE m.tenant_id=tenant AND business.tenant_admin_actor(m.actor_id,tenant)) THEN
      RAISE EXCEPTION 'LAST_ADMIN' USING ERRCODE='23505'; END IF;
  END IF;
END $$;

CREATE FUNCTION business.set_membership_status(actor uuid,status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid;
BEGIN
  IF status NOT IN ('active','invited','suspended') THEN RAISE EXCEPTION 'INVALID_STATUS' USING ERRCODE='22023'; END IF;
  IF NOT coalesce(business.can('members.manage') AND business.can_manage_actor(actor,tenant),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF status<>'active' THEN PERFORM business.guard_last_admin(actor,tenant); END IF;
  UPDATE authorization_private.memberships m SET status=set_membership_status.status WHERE m.actor_id=actor AND m.tenant_id=tenant;
END $$;

CREATE FUNCTION business.role_people(target_tenant uuid DEFAULT NULL,target_workspace uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := coalesce(target_tenant,nullif(current_setting('app.tenant_id',true),'')::uuid); result jsonb;
BEGIN
  IF NOT coalesce(business.tenant_access(tenant) AND (business.can('members.read') OR (target_workspace IS NOT NULL AND business.can('roles.assign',target_workspace))),false)
    OR (target_workspace IS NOT NULL AND NOT EXISTS(SELECT FROM authorization_private.workspace_scopes WHERE workspace_id=target_workspace AND tenant_id=tenant)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',u.name,'email',u.email,'status',coalesce(m.status,'active'),
    'roles',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'code',r.code,'name',r.name,'scope',r.scope,'level',r.level,'delegable',r.delegable,
      'permissions',r.permissions,'organizationId',a.organization_id,'tenantId',binding.tenant_id,'workspaceId',binding.workspace_id)),'[]')
      FROM authorization_private.role_catalog r JOIN LATERAL (
        SELECT assignment.tenant_id,assignment.workspace_id FROM authorization_private.role_assignments assignment
          WHERE assignment.actor_id=a.id AND assignment.role_id=r.id AND (assignment.tenant_id=tenant OR assignment.tenant_id IS NULL)
            AND (target_workspace IS NULL OR assignment.workspace_id IS NULL OR assignment.workspace_id=target_workspace)
        UNION SELECT tenant,NULL::uuid WHERE m.role=r.code AND r.scope='tenant'
        UNION SELECT w.tenant_id,w.workspace_id FROM authorization_private.workspace_members w
          WHERE w.actor_id=a.id AND w.tenant_id=tenant AND w.role=r.code AND r.scope='workspace' AND (target_workspace IS NULL OR w.workspace_id=target_workspace)
      ) binding ON true WHERE r.archived_at IS NULL)) ORDER BY u.name,a.id),'[]') INTO result
    FROM authorization_private.actors a JOIN identity."user" u ON u.id=a.identity_id
      LEFT JOIN authorization_private.memberships m ON m.actor_id=a.id AND m.tenant_id=tenant
    WHERE a.enabled AND a.organization_id=(SELECT organization_id FROM authorization_private.tenant_organizations WHERE tenant_id=tenant)
      AND (m.actor_id IS NOT NULL OR EXISTS(SELECT FROM authorization_private.role_assignments assignment WHERE assignment.actor_id=a.id AND assignment.tenant_id IS NULL));
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION business.members() RETURNS TABLE(id uuid,name text,email text,role text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT a.id,u.name,u.email,m.role FROM authorization_private.memberships m JOIN authorization_private.actors a ON a.id=m.actor_id
    JOIN identity."user" u ON u.id=a.identity_id WHERE m.tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND business.can('members.read') AND a.enabled
$$;
CREATE OR REPLACE FUNCTION business.invite(email_address text,invited_role text,hashed_token text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid; result uuid; level integer;
BEGIN
  SELECT r.level INTO level FROM authorization_private.role_catalog r WHERE r.code=invited_role AND r.code IN ('tenant_admin','member');
  IF NOT coalesce(business.can('invitations.manage'),false) OR level IS NULL OR level>=business.actor_level(business.actor_id(),tenant)
    OR EXISTS(SELECT FROM identity."user" u JOIN authorization_private.actors a ON a.identity_id=u.id
      WHERE lower(u.email)=lower(email_address) AND (a.id=business.actor_id() OR business.actor_level(a.id,tenant)>=business.actor_level(business.actor_id(),tenant))) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO authorization_private.invitations(tenant_id,email,role,token_hash,invited_by)
    VALUES(tenant,lower(email_address),invited_role,hashed_token,business.actor_id()) RETURNING id INTO result;
  PERFORM business.record_audit('invitation.created',result::text);
  RETURN result;
END $$;
CREATE OR REPLACE FUNCTION business.invitations() RETURNS TABLE(id uuid,email text,role text,expires_at timestamptz,accepted_at timestamptz,revoked_at timestamptz,delivery text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT i.id,i.email,i.role,i.expires_at,i.accepted_at,i.revoked_at,i.delivery FROM authorization_private.invitations i
    WHERE i.tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND business.can('invitations.manage') ORDER BY i.expires_at DESC
$$;
CREATE OR REPLACE FUNCTION business.update_invitation(target uuid,operation text,new_hash text DEFAULT NULL) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE invitation authorization_private.invitations; tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid; invited_level integer;
BEGIN
  SELECT * INTO invitation FROM authorization_private.invitations WHERE id=target FOR UPDATE;
  IF NOT FOUND OR invitation.tenant_id<>tenant OR NOT coalesce(business.can('invitations.manage'),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  SELECT level INTO invited_level FROM authorization_private.role_catalog WHERE code=invitation.role;
  IF operation IN ('retry','revoke') AND (invited_level>=business.actor_level(business.actor_id(),tenant)
    OR EXISTS(SELECT FROM identity."user" u JOIN authorization_private.actors a ON a.identity_id=u.id WHERE lower(u.email)=invitation.email
      AND (a.id=business.actor_id() OR business.actor_level(a.id,tenant)>=business.actor_level(business.actor_id(),tenant)))) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF invitation.accepted_at IS NOT NULL AND operation IN ('retry','revoke') THEN RAISE EXCEPTION 'INVITATION_USED' USING ERRCODE='23505'; END IF;
  IF operation='revoke' THEN UPDATE authorization_private.invitations SET revoked_at=now() WHERE id=target;
  ELSIF operation='retry' AND new_hash IS NOT NULL THEN UPDATE authorization_private.invitations SET token_hash=new_hash,expires_at=now()+interval '48 hours',revoked_at=NULL,delivery='pending' WHERE id=target;
  ELSIF operation IN ('sent','failed') THEN UPDATE authorization_private.invitations SET delivery=operation WHERE id=target;
  ELSE RAISE EXCEPTION 'INVALID_OPERATION' USING ERRCODE='22023'; END IF;
  PERFORM business.record_audit('invitation.'||operation,target::text);
  RETURN invitation.email;
END $$;
CREATE OR REPLACE FUNCTION business.accept_invitation(hashed_token text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE invitation authorization_private.invitations; email_address text; org uuid; bound uuid;
BEGIN
  SELECT lower(email) INTO email_address FROM identity."user" WHERE id=current_setting('app.identity_id',true) AND "emailVerified" AND "deletedAt" IS NULL;
  SELECT * INTO invitation FROM authorization_private.invitations WHERE token_hash=hashed_token AND email=email_address FOR UPDATE;
  IF NOT FOUND OR invitation.expires_at<=now() OR invitation.accepted_at IS NOT NULL OR invitation.revoked_at IS NOT NULL OR business.actor_id() IS NULL THEN
    RAISE EXCEPTION 'INVITATION_INVALID' USING ERRCODE='22023'; END IF;
  SELECT organization_id INTO bound FROM authorization_private.actors WHERE id=business.actor_id() FOR UPDATE;
  SELECT organization_id INTO org FROM authorization_private.tenant_organizations WHERE tenant_id=invitation.tenant_id;
  IF bound IS NOT NULL AND bound<>org THEN RAISE EXCEPTION 'ALREADY_ASSIGNED' USING ERRCODE='23505'; END IF;
  IF EXISTS(SELECT FROM authorization_private.memberships WHERE actor_id=business.actor_id() AND tenant_id=invitation.tenant_id AND status<>'active') THEN
    RAISE EXCEPTION 'INVITATION_INVALID' USING ERRCODE='22023'; END IF;
  INSERT INTO authorization_private.memberships(actor_id,tenant_id,role,status,joined_at,invited_by)
    VALUES(business.actor_id(),invitation.tenant_id,invitation.role,'active',now(),invitation.invited_by) ON CONFLICT(tenant_id,actor_id) DO NOTHING;
  UPDATE authorization_private.invitations SET accepted_at=now() WHERE id=invitation.id;
  PERFORM set_config('app.tenant_id',invitation.tenant_id::text,true);
  IF NOT business.tenant_access(invitation.tenant_id) THEN RAISE EXCEPTION 'INVITATION_INVALID' USING ERRCODE='22023'; END IF;
  PERFORM business.record_audit('invitation.accepted',invitation.id::text);
  RETURN invitation.tenant_id;
END $$;
CREATE OR REPLACE FUNCTION business.access_link() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid; result uuid;
BEGIN
  IF NOT coalesce(business.can('invitations.manage'),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO authorization_private.access_links(tenant_id) VALUES(tenant) ON CONFLICT DO NOTHING;
  SELECT token INTO result FROM authorization_private.access_links WHERE tenant_id=tenant;
  RETURN result;
END $$;
CREATE OR REPLACE FUNCTION business.access_requests(before_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid,first_name text,last_name text,email text,status text,created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid;
BEGIN
  IF NOT coalesce(business.can('invitations.manage'),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT r.id,r.first_name,r.last_name,r.email,r.status,r.created_at FROM authorization_private.access_requests r WHERE r.tenant_id=tenant
    AND (before_id IS NULL OR (r.created_at,r.id)<(SELECT cursor.created_at,cursor.id FROM authorization_private.access_requests cursor WHERE cursor.id=before_id AND cursor.tenant_id=tenant))
    ORDER BY r.created_at DESC,r.id DESC LIMIT 100;
END $$;
CREATE OR REPLACE FUNCTION business.review_access_request(target uuid,operation text,invited_role text,hashed_token text)
RETURNS TABLE(email text,tenant_id uuid,invitation_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE request authorization_private.access_requests; invitation uuid;
BEGIN
  SELECT * INTO request FROM authorization_private.access_requests WHERE id=target FOR UPDATE;
  IF NOT FOUND OR request.tenant_id IS DISTINCT FROM nullif(current_setting('app.tenant_id',true),'')::uuid
    OR NOT coalesce(business.can('invitations.manage'),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF request.status<>'pending' THEN RAISE EXCEPTION 'REQUEST_REVIEWED' USING ERRCODE='23505'; END IF;
  IF operation='approve' THEN
    IF invited_role NOT IN ('member','tenant_admin') OR invited_role IS NULL THEN RAISE EXCEPTION 'INVALID_ROLE' USING ERRCODE='22023'; END IF;
    invitation := business.invite(request.email,invited_role,hashed_token);
  ELSIF operation IS DISTINCT FROM 'reject' THEN RAISE EXCEPTION 'INVALID_OPERATION' USING ERRCODE='22023'; END IF;
  UPDATE authorization_private.access_requests SET status=CASE WHEN operation='approve' THEN 'approved' ELSE 'rejected' END,
    reviewed_at=now(),invitation_id=invitation WHERE id=target;
  PERFORM business.record_audit('access_request.'||operation,target::text);
  RETURN QUERY SELECT request.email,request.tenant_id,invitation;
END $$;
CREATE OR REPLACE FUNCTION business.assign_workspace(workspace uuid,actor uuid,assigned_role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid; level integer;
BEGIN
  level := CASE assigned_role WHEN 'workspace_admin' THEN 1 WHEN 'member' THEN 0 ELSE NULL END;
  IF level IS NULL OR NOT coalesce(business.can('workspace.members.manage',workspace) AND business.can_manage_actor(actor,tenant,workspace),false)
    OR level>=business.actor_level(business.actor_id(),tenant,workspace) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO authorization_private.workspace_members(tenant_id,workspace_id,actor_id,role) VALUES(tenant,workspace,actor,assigned_role)
    ON CONFLICT(workspace_id,actor_id) DO UPDATE SET role=excluded.role;
  PERFORM business.record_audit('workspace.member_assigned',workspace::text);
END $$;
CREATE OR REPLACE FUNCTION business.remove_member(actor uuid,workspace uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid;
BEGIN
  IF NOT coalesce(business.can_manage_actor(actor,tenant,workspace) AND business.can(CASE WHEN workspace IS NULL THEN 'members.manage' ELSE 'workspace.members.manage' END,workspace),false) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF workspace IS NULL THEN
    PERFORM business.guard_last_admin(actor,tenant);
    DELETE FROM authorization_private.role_assignments WHERE actor_id=actor AND tenant_id=tenant;
    -- Conserver la membership et ses métadonnées ; suspended révoque aussi les sessions déjà ouvertes.
    UPDATE authorization_private.memberships SET status='suspended' WHERE actor_id=actor AND tenant_id=tenant;
  ELSE
    DELETE FROM authorization_private.role_assignments WHERE actor_id=actor AND workspace_id=workspace AND tenant_id=tenant;
    DELETE FROM authorization_private.workspace_members WHERE actor_id=actor AND workspace_id=workspace AND tenant_id=tenant;
  END IF;
  PERFORM business.record_audit('membership.removed',actor::text);
END $$;
CREATE OR REPLACE FUNCTION business.disable_actor(actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid; org uuid; organization_admin_before bigint;
BEGIN
  IF NOT business.is_super() OR actor=business.actor_id() OR EXISTS(SELECT FROM authorization_private.actors WHERE id=actor AND platform_role IS NOT NULL) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  SELECT organization_id INTO org FROM authorization_private.actors WHERE id=actor;
  IF org IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('organization-rights:'||org::text));
    organization_admin_before := business.organization_admin_count(org);
  END IF;
  FOR tenant IN SELECT tenant_id FROM authorization_private.memberships WHERE actor_id=actor ORDER BY tenant_id LOOP
    PERFORM business.guard_last_admin(actor,tenant);
  END LOOP;
  UPDATE authorization_private.actors SET enabled=false WHERE id=actor;
  IF organization_admin_before>0 AND business.organization_admin_count(org)=0 THEN RAISE EXCEPTION 'LAST_ADMIN' USING ERRCODE='23505'; END IF;
  PERFORM business.record_audit('actor.disabled',actor::text);
END $$;
REVOKE ALL ON FUNCTION business.sync_tenant_organization(),business.sync_workspace_scope(),business.bind_actor_organization(),business.organization_access(uuid),
  business.revoke_deleted_organization(),
  business.organization_admin(uuid),business.organization_permission(uuid,text),business.effective_roles(uuid,uuid,uuid),business.can(text,uuid),business.actor_level(uuid,uuid,uuid),
  business.organization_admin_count(uuid),
  business.can_manage_actor(uuid,uuid,uuid),business.workspace_level(uuid),business.tenant_admin_actor(uuid,uuid),business.guard_last_admin(uuid,uuid),business.organization_directory(),business.create_organization(text),
  business.create_tenant(uuid,text,text),business.role_catalog(),business.save_role(uuid,text,text,text[],boolean,boolean,boolean),
  business.assign_role(uuid,uuid,uuid,uuid,uuid,text),business.set_membership_status(uuid,text),business.role_people(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION business.organization_access(uuid),business.organization_admin(uuid),business.can(text,uuid),business.organization_directory(),
  business.create_organization(text),business.create_tenant(uuid,text,text),business.role_catalog(),business.save_role(uuid,text,text,text[],boolean,boolean,boolean),
  business.assign_role(uuid,uuid,uuid,uuid,uuid,text),business.set_membership_status(uuid,text),business.role_people(uuid,uuid),business.workspace_level(uuid) TO business_runtime;
RESET ROLE;
