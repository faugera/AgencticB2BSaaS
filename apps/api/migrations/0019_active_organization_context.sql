SET LOCAL ROLE business_owner;
CREATE OR REPLACE FUNCTION business.context() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor authorization_private.actors; membership authorization_private.memberships; tenant uuid;
  org uuid; tenant_list jsonb; role_list jsonb; permission_list jsonb; actor_level integer;
BEGIN
  IF NOT EXISTS(SELECT FROM identity."user" WHERE id=current_setting('app.identity_id',true) AND "emailVerified" AND "deletedAt" IS NULL) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO authorization_private.actors(identity_id) VALUES(current_setting('app.identity_id',true)) ON CONFLICT(identity_id) DO NOTHING;
  SELECT * INTO actor FROM authorization_private.actors WHERE id=business.actor_id();
  IF actor.id IS NULL THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF actor.organization_id IS NOT NULL AND NOT EXISTS(SELECT FROM business.organizations WHERE id=actor.organization_id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  tenant := nullif(current_setting('app.tenant_id',true),'')::uuid;
  IF tenant IS NULL AND actor.platform_role IS NULL THEN
    SELECT m.tenant_id INTO tenant FROM authorization_private.memberships m
      JOIN authorization_private.tenant_organizations t ON t.tenant_id=m.tenant_id
      JOIN business.organizations o ON o.id=t.organization_id
      WHERE m.actor_id=actor.id AND m.status='active' AND t.deleted_at IS NULL AND o.deleted_at IS NULL
      ORDER BY m.tenant_id LIMIT 1;
  END IF;
  PERFORM set_config('app.tenant_id',coalesce(tenant::text,''),true);
  IF tenant IS NOT NULL AND NOT coalesce(business.tenant_access(tenant),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  org := actor.organization_id;
  IF tenant IS NOT NULL THEN SELECT organization_id INTO org FROM authorization_private.tenant_organizations WHERE tenant_id=tenant; END IF;
  SELECT * INTO membership FROM authorization_private.memberships WHERE actor_id=actor.id AND tenant_id=tenant AND status='active';
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.tenant_id,'name',t.name,'organization_id',t.organization_id) ORDER BY t.name,t.tenant_id),'[]') INTO tenant_list FROM authorization_private.tenant_organizations t JOIN business.organizations o ON o.id=t.organization_id WHERE t.deleted_at IS NULL AND o.deleted_at IS NULL AND (business.is_super() OR (NOT EXISTS(SELECT FROM authorization_private.memberships m WHERE m.actor_id=actor.id AND m.tenant_id=t.tenant_id AND m.status<>'active') AND (business.organization_permission(t.organization_id,'tenant.read') OR EXISTS(SELECT FROM authorization_private.memberships m WHERE m.actor_id=actor.id AND m.tenant_id=t.tenant_id AND m.status='active'))));
  SELECT coalesce(jsonb_agg(DISTINCT r.code),'[]'),coalesce(max(r.level),0) INTO role_list,actor_level FROM business.effective_roles(actor.id,tenant) r;
  SELECT coalesce(jsonb_agg(DISTINCT permission),'[]') INTO permission_list FROM business.effective_roles(actor.id,tenant) r CROSS JOIN unnest(r.permissions) permission;
  IF business.is_super() OR (org IS NOT NULL AND business.organization_admin(org)) THEN SELECT to_jsonb(permissions) INTO permission_list FROM authorization_private.role_catalog WHERE code='organization_admin'; actor_level := CASE WHEN business.is_super() THEN 4 ELSE 3 END; role_list := jsonb_build_array(CASE WHEN business.is_super() THEN 'super_admin' ELSE 'organization_admin' END); END IF;
  RETURN jsonb_build_object('actorId',actor.id,'platformRole',actor.platform_role,'tenantId',tenant,'tenantRole',membership.role,'handle',actor.handle,'organizationId',org,'organizationRole',CASE WHEN NOT business.is_super() AND business.organization_admin(org) THEN 'organization_admin' ELSE NULL END,'tenants',tenant_list,'roles',role_list,'permissions',permission_list,'level',actor_level);
END $$;
RESET ROLE;
