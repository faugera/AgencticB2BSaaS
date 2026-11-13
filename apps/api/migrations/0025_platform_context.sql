SET LOCAL ROLE business_owner;

ALTER TABLE business.tenants ADD CONSTRAINT tenants_reserved_platform_id CHECK (id <> '00000000-0000-0000-0000-000000000000'::uuid);

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
  IF tenant = '00000000-0000-0000-0000-000000000000'::uuid AND NOT business.is_super() THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF tenant IS NULL AND business.is_super() THEN tenant := '00000000-0000-0000-0000-000000000000'::uuid; END IF;
  PERFORM set_config('app.tenant_id',coalesce(tenant::text,''),true);
  IF tenant IS NOT NULL AND tenant <> '00000000-0000-0000-0000-000000000000'::uuid AND NOT coalesce(business.tenant_access(tenant),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  org := actor.organization_id;
  IF tenant IS NOT NULL AND tenant <> '00000000-0000-0000-0000-000000000000'::uuid THEN SELECT organization_id INTO org FROM authorization_private.tenant_organizations WHERE tenant_id=tenant; END IF;
  SELECT * INTO membership FROM authorization_private.memberships WHERE actor_id=actor.id AND tenant_id=tenant AND status='active';
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.tenant_id,'name',t.name,'organization_id',t.organization_id) ORDER BY t.name,t.tenant_id),'[]') INTO tenant_list FROM authorization_private.tenant_organizations t JOIN business.organizations o ON o.id=t.organization_id WHERE t.deleted_at IS NULL AND o.deleted_at IS NULL AND (business.is_super() OR (NOT EXISTS(SELECT FROM authorization_private.memberships m WHERE m.actor_id=actor.id AND m.tenant_id=t.tenant_id AND m.status<>'active') AND (business.organization_permission(t.organization_id,'tenant.read') OR EXISTS(SELECT FROM authorization_private.memberships m WHERE m.actor_id=actor.id AND m.tenant_id=t.tenant_id AND m.status='active'))));
  SELECT coalesce(jsonb_agg(DISTINCT r.code),'[]'),coalesce(max(r.level),0) INTO role_list,actor_level FROM business.effective_roles(actor.id,tenant) r;
  SELECT coalesce(jsonb_agg(DISTINCT permission),'[]') INTO permission_list FROM business.effective_roles(actor.id,tenant) r CROSS JOIN unnest(r.permissions) permission;
  IF business.is_super() OR (org IS NOT NULL AND business.organization_admin(org)) THEN SELECT to_jsonb(permissions) INTO permission_list FROM authorization_private.role_catalog WHERE code='organization_admin'; actor_level := CASE WHEN business.is_super() THEN 4 ELSE 3 END; role_list := jsonb_build_array(CASE WHEN business.is_super() THEN 'super_admin' ELSE 'organization_admin' END); END IF;
  RETURN jsonb_build_object('actorId',actor.id,'platformRole',actor.platform_role,'tenantId',tenant,'tenantRole',membership.role,'handle',actor.handle,'organizationId',org,'organizationRole',CASE WHEN NOT business.is_super() AND business.organization_admin(org) THEN 'organization_admin' ELSE NULL END,'tenants',tenant_list,'roles',role_list,'permissions',permission_list,'level',actor_level);
END $$;

CREATE OR REPLACE FUNCTION business.append_audit(event text,kind text,target text,tenant uuid,organization uuid,details jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE ip inet;
BEGIN
  BEGIN ip := nullif(current_setting('app.request_ip',true),'')::inet;
    EXCEPTION WHEN invalid_text_representation THEN ip := NULL;
  END;
  INSERT INTO business.audit_logs(organization_id,tenant_id,actor_id,action,target_type,target_id,ip_address,user_agent,payload)
    VALUES(organization,nullif(tenant,'00000000-0000-0000-0000-000000000000'::uuid),business.actor_id(),left(event,100),left(kind,50),target,ip,
      left(regexp_replace(current_setting('app.user_agent',true),'[[:cntrl:]]','','g'),512),details);
END $$;

CREATE OR REPLACE FUNCTION business.begin_idempotency(operation text,scope text,key_hash text,request_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=business.actor_id(); tenant text:=coalesce(nullif(nullif(scope,''),'00000000-0000-0000-0000-000000000000'),nullif(nullif(current_setting('app.tenant_id',true),''),'00000000-0000-0000-0000-000000000000'),'platform');
  existing authorization_private.idempotency_records; inserted boolean; affected integer;
BEGIN
  IF actor IS NULL OR operation IS NULL OR length(operation) NOT BETWEEN 1 AND 100
    OR tenant IS NULL OR length(tenant)>100
    OR key_hash !~ '^[0-9a-f]{64}$' OR request_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'INVALID_IDEMPOTENCY' USING ERRCODE='22023';
  END IF;
  WITH removed AS (
    SELECT ctid FROM authorization_private.idempotency_records
      WHERE expires_at<=clock_timestamp() LIMIT 100 FOR UPDATE SKIP LOCKED
  )
  DELETE FROM authorization_private.idempotency_records r USING removed WHERE r.ctid=removed.ctid;
  DELETE FROM authorization_private.idempotency_records
    WHERE actor_id=actor AND action=operation AND scope_key=tenant AND key_digest=key_hash
      AND expires_at<=clock_timestamp();
  INSERT INTO authorization_private.idempotency_records(actor_id,action,scope_key,key_digest,request_digest,state,expires_at)
    VALUES(actor,operation,tenant,key_hash,request_hash,'processing',clock_timestamp()+interval '24 hours')
    ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS affected = ROW_COUNT;
  inserted := affected=1;
  SELECT * INTO existing FROM authorization_private.idempotency_records
    WHERE actor_id=actor AND action=operation AND scope_key=tenant AND key_digest=key_hash FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'IDEMPOTENCY_RESERVATION_FAILED'; END IF;
  IF existing.request_digest<>request_hash THEN
    RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='23505';
  END IF;
  IF existing.state='completed' THEN RETURN jsonb_build_object('replay',true,'response',existing.response); END IF;
  IF NOT inserted THEN RAISE EXCEPTION 'IDEMPOTENCY_IN_PROGRESS' USING ERRCODE='23505'; END IF;
  RETURN jsonb_build_object('replay',false);
END $$;

CREATE OR REPLACE FUNCTION business.complete_idempotency(operation text,scope text,key_hash text,request_hash text,result jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=business.actor_id(); tenant text:=coalesce(nullif(nullif(scope,''),'00000000-0000-0000-0000-000000000000'),nullif(nullif(current_setting('app.tenant_id',true),''),'00000000-0000-0000-0000-000000000000'),'platform');
BEGIN
  IF actor IS NULL OR tenant IS NULL OR length(tenant)>100 OR result IS NULL
    OR jsonb_typeof(result)<>'object' OR length(result::text)>16384 THEN
    RAISE EXCEPTION 'INVALID_IDEMPOTENCY_RESULT' USING ERRCODE='22023';
  END IF;
  UPDATE authorization_private.idempotency_records SET state='completed',response=result
    WHERE actor_id=actor AND action=operation AND scope_key=tenant AND key_digest=key_hash
      AND request_digest=request_hash AND state='processing' AND expires_at>clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'IDEMPOTENCY_RESERVATION_MISSING' USING ERRCODE='22023'; END IF;
END $$;


RESET ROLE;
