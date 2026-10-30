SET LOCAL ROLE business_owner;
-- Les UUID du journal sont nouveaux ; legacy_id conserve l'identifiant source sans purge.
CREATE TABLE business.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid, tenant_id uuid, actor_id uuid,
  action varchar(100) NOT NULL, target_type varchar(50), target_id text,
  ip_address inet, user_agent varchar(512),
  payload jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(payload)='object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), legacy_id bigint UNIQUE
);
CREATE INDEX audit_logs_tenant_page ON business.audit_logs(tenant_id,created_at DESC,id DESC);
CREATE INDEX audit_logs_page ON business.audit_logs(created_at DESC,id DESC);
RESET ROLE;
INSERT INTO business.audit_logs(organization_id,tenant_id,actor_id,action,target_type,target_id,payload,created_at,legacy_id)
  SELECT t.organization_id,a.tenant_id,a.actor_id,a.action,a.resource_type,a.resource_id,
    jsonb_build_object('changed_fields',a.changed_fields),a.occurred_at,a.id
  FROM authorization_private.audit a JOIN business.tenants t ON t.id=a.tenant_id
  WHERE length(a.action)<=100 AND (a.resource_type IS NULL OR length(a.resource_type)<=50);
SET LOCAL ROLE business_owner;
COMMENT ON TABLE authorization_private.audit IS 'Archive historique immuable ; aucun parcours actif ne lit ou écrit ici depuis 0015.';
ALTER TABLE business.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_read ON business.audit_logs FOR SELECT USING (
  business.is_super() OR (tenant_id IS NOT NULL
    AND tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid
    AND business.tenant_access(tenant_id) AND business.can('audit.read'))
);
-- Le runtime ne possède aucun droit INSERT ; seuls les writers internes du propriétaire y accèdent.
CREATE POLICY audit_logs_append ON business.audit_logs FOR INSERT TO business_owner WITH CHECK(true);
REVOKE ALL ON business.audit_logs FROM PUBLIC, business_runtime, identity_runtime;

CREATE FUNCTION business.append_audit(event text,kind text,target text,tenant uuid,organization uuid,details jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE ip inet;
BEGIN
  BEGIN ip := nullif(current_setting('app.request_ip',true),'')::inet;
    EXCEPTION WHEN invalid_text_representation THEN ip := NULL;
  END;
  INSERT INTO business.audit_logs(organization_id,tenant_id,actor_id,action,target_type,target_id,ip_address,user_agent,payload)
    VALUES(organization,tenant,business.actor_id(),left(event,100),left(kind,50),target,ip,
      left(regexp_replace(current_setting('app.user_agent',true),'[[:cntrl:]]','','g'),512),details);
END $$;
REVOKE ALL ON FUNCTION business.append_audit(text,text,text,uuid,uuid,jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION business.record_audit(event text,resource text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid; organization uuid;
BEGIN
  IF business.actor_id() IS NULL THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  SELECT t.organization_id INTO organization FROM authorization_private.tenant_organizations t WHERE t.tenant_id=tenant;
  PERFORM business.append_audit(event,NULL,resource,tenant,organization,'{}');
END $$;

CREATE OR REPLACE FUNCTION business.audit_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous jsonb; current_row jsonb; changed text[]; target text; tenant uuid; organization uuid;
  details jsonb; added text[]; removed text[]; capabilities text[]; prior_permissions jsonb; next_permissions jsonb;
BEGIN
  previous := CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
  current_row := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  SELECT coalesce(array_agg(field ORDER BY field),'{}') INTO changed
    FROM unnest(string_to_array(TG_ARGV[2],',')) field
    WHERE TG_OP<>'UPDATE' OR previous->field IS DISTINCT FROM current_row->field;
  IF TG_OP='UPDATE' AND cardinality(changed)=0 THEN RETURN NULL; END IF;
  SELECT string_agg(current_row->>field,':' ORDER BY ordinal) INTO target
    FROM unnest(string_to_array(TG_ARGV[1],',')) WITH ORDINALITY AS keys(field,ordinal);
  tenant := CASE WHEN TG_ARGV[0]='tenant' THEN (current_row->>'id')::uuid
    ELSE (current_row->>'tenant_id')::uuid END;
  IF TG_ARGV[0]='user' AND business.actor_id() IS NOT NULL THEN
    tenant := nullif(current_setting('app.tenant_id',true),'')::uuid;
  END IF;
  organization := CASE WHEN TG_ARGV[0]='organization' THEN (current_row->>'id')::uuid
    ELSE (current_row->>'organization_id')::uuid END;
  IF organization IS NULL AND tenant IS NOT NULL THEN
    SELECT t.organization_id INTO organization FROM authorization_private.tenant_organizations t WHERE t.tenant_id=tenant;
  END IF;
  details := jsonb_build_object('changed_fields',changed);
  IF TG_ARGV[0]='role' THEN
    -- Les identifiants de capacités sont publics ; aucune valeur de profil n'est copiée.
    prior_permissions := CASE WHEN TG_OP='INSERT' OR previous->>'archived_at' IS NOT NULL THEN '[]'::jsonb ELSE coalesce(previous->'permissions','[]') END;
    next_permissions := CASE WHEN TG_OP='DELETE' OR current_row->>'archived_at' IS NOT NULL THEN '[]'::jsonb ELSE coalesce(current_row->'permissions','[]') END;
    SELECT coalesce(array_agg(value ORDER BY value),'{}') INTO added
      FROM jsonb_array_elements_text(next_permissions) v(value) WHERE NOT prior_permissions ? value;
    SELECT coalesce(array_agg(value ORDER BY value),'{}') INTO removed
      FROM jsonb_array_elements_text(prior_permissions) v(value) WHERE NOT next_permissions ? value;
    details := details || jsonb_build_object('permissions_added',added,'permissions_removed',removed);
  ELSIF TG_ARGV[0]='role_assignment' THEN
    SELECT r.permissions INTO capabilities FROM authorization_private.role_catalog r WHERE r.id=(current_row->>'role_id')::uuid;
    details := details || jsonb_build_object('permissions_added',CASE WHEN TG_OP='INSERT' THEN capabilities ELSE '{}'::text[] END,
      'permissions_removed',CASE WHEN TG_OP='DELETE' THEN capabilities ELSE '{}'::text[] END);
  END IF;
  PERFORM business.append_audit('change.'||CASE TG_OP WHEN 'INSERT' THEN 'created' WHEN 'UPDATE' THEN 'updated' ELSE 'deleted' END,
    TG_ARGV[0],target,tenant,organization,details);
  RETURN NULL;
END $$;

CREATE FUNCTION business.audit_log_events(target_tenant uuid DEFAULT NULL,before_id uuid DEFAULT NULL)
RETURNS TABLE(id text,occurred_at timestamptz,actor_id uuid,tenant_id uuid,action text,
  resource_id text,resource_type text,changed_fields text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT business.is_super() AND (target_tenant IS NULL
    OR target_tenant IS DISTINCT FROM nullif(current_setting('app.tenant_id',true),'')::uuid
    OR NOT (business.tenant_access(target_tenant) AND business.can('audit.read'))) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT a.id::text,a.created_at,a.actor_id,a.tenant_id,a.action::text,a.target_id,a.target_type::text,
    ARRAY(SELECT jsonb_array_elements_text(coalesce(a.payload->'changed_fields','[]')))
    FROM business.audit_logs a WHERE (target_tenant IS NULL OR a.tenant_id=target_tenant)
      AND (before_id IS NULL OR (a.created_at,a.id)<(SELECT c.created_at,c.id FROM business.audit_logs c
        WHERE c.id=before_id AND (target_tenant IS NULL OR c.tenant_id=target_tenant)))
    ORDER BY a.created_at DESC,a.id DESC LIMIT 51;
END $$;
REVOKE ALL ON FUNCTION business.audit_log_events(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION business.audit_log_events(uuid,uuid) TO business_runtime;
-- L'ancien point d'entrée SQL est retiré avec sa consultation HTTP.
DROP FUNCTION business.audit_events(uuid,bigint);

DROP TRIGGER audit_change ON business.tenants;
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON business.tenants
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('tenant','id','name,slug,billing_email,vat_number,country_code,subscription_tier,subscription_status,metadata,deleted_at');
DROP TRIGGER audit_change ON business.workspaces;
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON business.workspaces
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('workspace','id','name,visibility,slug,description,archived_at');
DROP TRIGGER audit_change ON authorization_private.memberships;
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON authorization_private.memberships
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('membership','tenant_id,actor_id','role,status,job_title,department,joined_at');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON business.organizations
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('organization','id','name,slug,deleted_at');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON authorization_private.role_catalog
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('role','id','name,scope,permissions,delegable,archived_at');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON authorization_private.role_assignments
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('role_assignment','id','actor_id,role_id,organization_id,tenant_id,workspace_id');
RESET ROLE;
DROP TRIGGER audit_change ON identity."user";
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON identity."user"
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('user','id','name,email,emailVerified,image,twoFactorEnabled,deletedAt,first_name,last_name,phone_number');
