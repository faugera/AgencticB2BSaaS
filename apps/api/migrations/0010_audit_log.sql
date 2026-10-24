SET LOCAL ROLE business_owner;
ALTER TABLE authorization_private.audit
  ADD COLUMN resource_type text,
  ADD COLUMN changed_fields text[] NOT NULL DEFAULT '{}';
-- Keep historical identifiers even if an operator later deletes the source row.
ALTER TABLE authorization_private.audit DROP CONSTRAINT audit_actor_id_fkey;
ALTER TABLE authorization_private.audit DROP CONSTRAINT audit_tenant_id_fkey;
CREATE INDEX audit_tenant_page ON authorization_private.audit(tenant_id,id DESC);

CREATE FUNCTION business.audit_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous jsonb; current_row jsonb; changed text[]; target text; tenant uuid;
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
  INSERT INTO authorization_private.audit(actor_id,tenant_id,action,resource_id,resource_type,changed_fields)
    VALUES(business.actor_id(),tenant,'change.'||CASE TG_OP WHEN 'INSERT' THEN 'created'
      WHEN 'UPDATE' THEN 'updated' ELSE 'deleted' END,target,TG_ARGV[0],changed);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION business.audit_mutation() FROM PUBLIC;

CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON business.tenants
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('tenant','id','name');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON business.workspaces
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('workspace','id','name,visibility');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON authorization_private.actors
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('actor','id','enabled,platform_role,handle');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON authorization_private.memberships
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('membership','actor_id','role');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON authorization_private.workspace_members
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('workspace_member','workspace_id,actor_id','role');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON authorization_private.invitations
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('invitation','id','role,expires_at,accepted_at,revoked_at,delivery');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON authorization_private.access_requests
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('access_request','id','status,reviewed_at,invitation_id');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON authorization_private.workspace_appearance
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('workspace_appearance','workspace_id','color');

CREATE FUNCTION business.audit_events(target_tenant uuid DEFAULT NULL, before_id bigint DEFAULT NULL)
RETURNS TABLE(id text,occurred_at timestamptz,actor_id uuid,tenant_id uuid,action text,
  resource_id text,resource_type text,changed_fields text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT coalesce(business.is_super(),false) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT a.id::text,a.occurred_at,a.actor_id,a.tenant_id,a.action,
    a.resource_id,a.resource_type,a.changed_fields FROM authorization_private.audit a
    WHERE (target_tenant IS NULL OR a.tenant_id=target_tenant)
      AND (before_id IS NULL OR a.id<before_id)
    ORDER BY a.id DESC LIMIT 51;
END $$;
REVOKE ALL ON FUNCTION business.audit_events(uuid,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION business.audit_events(uuid,bigint) TO business_runtime;
RESET ROLE;
-- Identity writes have no business context: do not invent an authenticated author.
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON identity."user"
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('user','id','name,email,emailVerified,image,twoFactorEnabled');
