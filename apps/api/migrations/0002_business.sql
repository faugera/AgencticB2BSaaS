CREATE SCHEMA business AUTHORIZATION business_owner;
CREATE SCHEMA authorization_private AUTHORIZATION business_owner;
REVOKE ALL ON SCHEMA business, authorization_private FROM PUBLIC;
SET LOCAL ROLE business_owner;
CREATE TABLE authorization_private.actors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), identity_id text NOT NULL UNIQUE REFERENCES identity."user"(id),
  handle text UNIQUE, enabled boolean NOT NULL DEFAULT true,
  platform_role text CHECK (platform_role = 'super_admin')
);
CREATE TABLE business.tenants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(length(name) BETWEEN 1 AND 100));
CREATE TABLE authorization_private.memberships (
  actor_id uuid PRIMARY KEY REFERENCES authorization_private.actors(id),
  tenant_id uuid NOT NULL REFERENCES business.tenants(id),
  role text NOT NULL CHECK(role IN ('tenant_admin','member')), UNIQUE(tenant_id,actor_id)
);
CREATE TABLE business.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES business.tenants(id),
  name text NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
  visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','tenant')), UNIQUE(tenant_id,id)
);
CREATE INDEX ON business.workspaces(tenant_id);
CREATE TABLE authorization_private.workspace_members (
  tenant_id uuid NOT NULL, workspace_id uuid NOT NULL, actor_id uuid NOT NULL,
  role text NOT NULL CHECK(role IN ('workspace_admin','member')), PRIMARY KEY(workspace_id,actor_id),
  FOREIGN KEY(tenant_id,workspace_id) REFERENCES business.workspaces(tenant_id,id) ON DELETE CASCADE,
  FOREIGN KEY(tenant_id,actor_id) REFERENCES authorization_private.memberships(tenant_id,actor_id) ON DELETE CASCADE
);
CREATE TABLE authorization_private.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES business.tenants(id),
  email text NOT NULL, role text NOT NULL CHECK(role IN ('tenant_admin','member')),
  token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL DEFAULT now()+interval '48 hours',
  accepted_at timestamptz, revoked_at timestamptz, delivery text NOT NULL DEFAULT 'pending' CHECK(delivery IN ('pending','sent','failed'))
);
CREATE INDEX ON authorization_private.invitations(tenant_id);
CREATE TABLE authorization_private.audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid REFERENCES authorization_private.actors(id), tenant_id uuid REFERENCES business.tenants(id),
  action text NOT NULL, resource_id text
);
-- Authorization metadata is not granted to runtime at all. Narrow functions avoid
-- recursive RLS policies and expose neither password hashes nor session tokens.
CREATE FUNCTION business.actor_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT id FROM authorization_private.actors WHERE identity_id=current_setting('app.identity_id',true) AND enabled
$$;
CREATE FUNCTION business.is_super() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT EXISTS(SELECT FROM authorization_private.actors WHERE id=business.actor_id() AND platform_role='super_admin')
$$;
CREATE FUNCTION business.tenant_access(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT target::text=current_setting('app.tenant_id',true) AND (business.is_super() OR EXISTS(
    SELECT FROM authorization_private.memberships WHERE tenant_id=target AND actor_id=business.actor_id()))
$$;
CREATE FUNCTION business.tenant_admin(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT business.tenant_access(target) AND (business.is_super() OR EXISTS(
    SELECT FROM authorization_private.memberships WHERE tenant_id=target AND actor_id=business.actor_id() AND role='tenant_admin'))
$$;
CREATE FUNCTION business.workspace_access(target uuid, tenant uuid, visible text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT business.tenant_access(tenant) AND (visible='tenant' OR business.tenant_admin(tenant) OR EXISTS(
    SELECT FROM authorization_private.workspace_members WHERE workspace_id=target AND tenant_id=tenant AND actor_id=business.actor_id()))
$$;
CREATE FUNCTION business.workspace_admin(target uuid, tenant uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT business.tenant_access(tenant) AND (business.tenant_admin(tenant) OR EXISTS(
    SELECT FROM authorization_private.workspace_members WHERE workspace_id=target AND tenant_id=tenant AND actor_id=business.actor_id() AND role='workspace_admin'))
$$;
ALTER TABLE business.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_read ON business.tenants FOR SELECT USING(business.tenant_access(id) OR business.is_super());
CREATE POLICY tenant_create ON business.tenants FOR INSERT WITH CHECK(business.is_super());
ALTER TABLE business.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE business.workspaces FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_read ON business.workspaces FOR SELECT USING(business.workspace_access(id,tenant_id,visibility));
CREATE POLICY workspace_create ON business.workspaces FOR INSERT WITH CHECK(business.tenant_admin(tenant_id));
CREATE POLICY workspace_update ON business.workspaces FOR UPDATE USING(business.workspace_admin(id,tenant_id)) WITH CHECK(business.workspace_admin(id,tenant_id));

CREATE FUNCTION business.context() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor authorization_private.actors; membership authorization_private.memberships;
BEGIN
  INSERT INTO authorization_private.actors(identity_id)
    SELECT id FROM identity."user" WHERE id=current_setting('app.identity_id',true) AND "emailVerified"
    ON CONFLICT(identity_id) DO NOTHING;
  SELECT * INTO actor FROM authorization_private.actors WHERE id=business.actor_id();
  IF actor.id IS NULL THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  SELECT * INTO membership FROM authorization_private.memberships WHERE actor_id=actor.id;
  RETURN jsonb_build_object('actorId',actor.id,'platformRole',actor.platform_role,'tenantId',membership.tenant_id,'tenantRole',membership.role,'handle',actor.handle);
END $$;
CREATE FUNCTION business.record_audit(event text, resource text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF business.actor_id() IS NULL THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO authorization_private.audit(actor_id,tenant_id,action,resource_id)
  VALUES(business.actor_id(),nullif(current_setting('app.tenant_id',true),'')::uuid,left(event,100),left(resource,100));
END $$;
CREATE FUNCTION business.invite(email_address text, invited_role text, hashed_token text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid; result uuid;
BEGIN
  IF NOT business.tenant_admin(tenant) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO authorization_private.invitations(tenant_id,email,role,token_hash)
    VALUES(tenant,lower(email_address),invited_role,hashed_token) RETURNING id INTO result;
  PERFORM business.record_audit('invitation.created',result::text);
  RETURN result;
END $$;
CREATE FUNCTION business.invitations() RETURNS TABLE(id uuid,email text,role text,expires_at timestamptz,accepted_at timestamptz,revoked_at timestamptz,delivery text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT i.id,i.email,i.role,i.expires_at,i.accepted_at,i.revoked_at,i.delivery FROM authorization_private.invitations i
  WHERE business.tenant_admin(i.tenant_id) ORDER BY i.expires_at DESC
$$;
CREATE FUNCTION business.update_invitation(target uuid, operation text, new_hash text DEFAULT NULL) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE invitation authorization_private.invitations;
BEGIN
  SELECT * INTO invitation FROM authorization_private.invitations WHERE id=target FOR UPDATE;
  IF NOT FOUND OR NOT business.tenant_admin(invitation.tenant_id) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF invitation.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'INVITATION_USED' USING ERRCODE='23505'; END IF;
  IF operation='revoke' THEN UPDATE authorization_private.invitations SET revoked_at=now() WHERE id=target;
  ELSIF operation='retry' AND new_hash IS NOT NULL THEN UPDATE authorization_private.invitations SET token_hash=new_hash,expires_at=now()+interval '48 hours',revoked_at=NULL,delivery='pending' WHERE id=target;
  ELSIF operation IN ('sent','failed') THEN UPDATE authorization_private.invitations SET delivery=operation WHERE id=target;
  ELSE RAISE EXCEPTION 'INVALID_OPERATION'; END IF;
  PERFORM business.record_audit('invitation.'||operation,target::text);
  RETURN invitation.email;
END $$;
CREATE FUNCTION business.accept_invitation(hashed_token text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE invitation authorization_private.invitations; existing uuid; email_address text;
BEGIN
  SELECT lower(email) INTO email_address FROM identity."user" WHERE id=current_setting('app.identity_id',true) AND "emailVerified";
  SELECT * INTO invitation FROM authorization_private.invitations WHERE token_hash=hashed_token AND email=email_address FOR UPDATE;
  IF NOT FOUND OR invitation.expires_at<=now() OR invitation.accepted_at IS NOT NULL OR invitation.revoked_at IS NOT NULL OR business.actor_id() IS NULL THEN
    RAISE EXCEPTION 'INVITATION_INVALID' USING ERRCODE='22023'; END IF;
  -- Serialize simultaneous invitations for the same actor; one ordinary tenant only.
  PERFORM 1 FROM authorization_private.actors WHERE id=business.actor_id() FOR UPDATE;
  SELECT tenant_id INTO existing FROM authorization_private.memberships WHERE actor_id=business.actor_id();
  IF existing IS NOT NULL AND existing<>invitation.tenant_id THEN RAISE EXCEPTION 'ALREADY_ASSIGNED' USING ERRCODE='23505'; END IF;
  INSERT INTO authorization_private.memberships(actor_id,tenant_id,role) VALUES(business.actor_id(),invitation.tenant_id,invitation.role)
    ON CONFLICT(actor_id) DO NOTHING;
  UPDATE authorization_private.invitations SET accepted_at=now() WHERE id=invitation.id;
  PERFORM set_config('app.tenant_id',invitation.tenant_id::text,true);
  PERFORM business.record_audit('invitation.accepted',invitation.id::text);
  RETURN invitation.tenant_id;
END $$;
CREATE FUNCTION business.members() RETURNS TABLE(id uuid,name text,email text,role text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT a.id,u.name,u.email,m.role FROM authorization_private.memberships m
  JOIN authorization_private.actors a ON a.id=m.actor_id JOIN identity."user" u ON u.id=a.identity_id
  WHERE business.tenant_admin(m.tenant_id) AND a.enabled
$$;
CREATE FUNCTION business.assign_workspace(workspace uuid, actor uuid, assigned_role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid;
BEGIN
  IF NOT business.workspace_admin(workspace,tenant) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO authorization_private.workspace_members(tenant_id,workspace_id,actor_id,role) VALUES(tenant,workspace,actor,assigned_role)
  ON CONFLICT(workspace_id,actor_id) DO UPDATE SET role=excluded.role;
  PERFORM business.record_audit('workspace.member_assigned',workspace::text);
END $$;
CREATE FUNCTION business.remove_member(actor uuid, workspace uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid;
BEGIN
  -- Lock tenant memberships to prevent concurrent removal of the last administrator.
  PERFORM 1 FROM authorization_private.memberships WHERE tenant_id=tenant ORDER BY actor_id FOR UPDATE;
  IF workspace IS NOT NULL THEN
    IF NOT business.workspace_admin(workspace,tenant) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
    DELETE FROM authorization_private.workspace_members WHERE workspace_id=workspace AND tenant_id=tenant AND actor_id=actor;
  ELSE
    IF NOT business.tenant_admin(tenant) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
    IF EXISTS(SELECT FROM authorization_private.memberships WHERE actor_id=actor AND tenant_id=tenant AND role='tenant_admin')
      AND (SELECT count(*) FROM authorization_private.memberships WHERE tenant_id=tenant AND role='tenant_admin')<=1
      THEN RAISE EXCEPTION 'LAST_ADMIN' USING ERRCODE='23505'; END IF;
    DELETE FROM authorization_private.memberships WHERE actor_id=actor AND tenant_id=tenant;
  END IF;
  PERFORM business.record_audit('membership.removed',actor::text);
END $$;
CREATE FUNCTION business.disable_actor(actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT business.is_super() OR actor=business.actor_id() THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  UPDATE authorization_private.actors SET enabled=false WHERE id=actor AND platform_role IS NULL;
  PERFORM business.record_audit('actor.disabled',actor::text);
END $$;
-- Operator-only bootstrap: verified identity, explicit handle, idempotent, no first-user promotion.
CREATE FUNCTION business.bootstrap_super(identity text, application_handle text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('enterprise-bootstrap-super'));
  IF NOT EXISTS(SELECT FROM identity."user" WHERE id=identity AND "emailVerified") THEN RAISE EXCEPTION 'VERIFIED_IDENTITY_REQUIRED'; END IF;
  IF EXISTS(SELECT FROM authorization_private.actors WHERE platform_role='super_admin' AND identity_id<>identity) THEN RAISE EXCEPTION 'SUPER_ALREADY_EXISTS'; END IF;
  INSERT INTO authorization_private.actors(identity_id,handle,platform_role) VALUES(identity,application_handle,'super_admin')
  ON CONFLICT(identity_id) DO UPDATE SET handle=excluded.handle,platform_role='super_admin'
  RETURNING id INTO result;
  INSERT INTO authorization_private.audit(actor_id,action,resource_id) VALUES(result,'operator.bootstrap_super',result::text);
  RETURN result;
END $$;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA business FROM PUBLIC;
GRANT USAGE ON SCHEMA business TO business_runtime;
GRANT SELECT,INSERT ON business.tenants TO business_runtime;
GRANT SELECT,INSERT,UPDATE ON business.workspaces TO business_runtime;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA business TO business_runtime;
REVOKE EXECUTE ON FUNCTION business.bootstrap_super(text,text) FROM business_runtime;
RESET ROLE;
