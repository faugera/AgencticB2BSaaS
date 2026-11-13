SET LOCAL ROLE business_owner;

ALTER TABLE business.workspaces
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX workspaces_page
  ON business.workspaces(tenant_id,created_at DESC,id DESC);
CREATE INDEX memberships_page
  ON authorization_private.memberships(tenant_id,actor_id);

CREATE FUNCTION business.workspaces_page(
  cursor_created_at timestamptz,
  cursor_id uuid,
  page_size integer
)
RETURNS TABLE(
  id uuid,
  tenant_id uuid,
  name text,
  visibility text,
  can_manage boolean,
  can_assign_roles boolean,
  role_level integer,
  color text,
  created_at text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid;
BEGIN
  IF tenant IS NULL OR NOT business.tenant_access(tenant)
    OR page_size IS NULL OR page_size NOT BETWEEN 1 AND 100
    OR (cursor_created_at IS NULL) <> (cursor_id IS NULL) THEN
    RAISE EXCEPTION 'INVALID_PAGE' USING ERRCODE='22023';
  END IF;
  RETURN QUERY
    SELECT w.id,w.tenant_id,w.name,w.visibility,
      business.workspace_admin(w.id,w.tenant_id),
      business.can('roles.assign',w.id),
      business.workspace_level(w.id),
      business.workspace_color(w.id),
      to_char(w.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    FROM business.workspaces w
    WHERE w.tenant_id=tenant
      AND business.workspace_access(w.id,w.tenant_id,w.visibility)
      AND (cursor_created_at IS NULL OR (w.created_at,w.id)<(cursor_created_at,cursor_id))
    ORDER BY w.created_at DESC,w.id DESC
    LIMIT page_size;
END $$;

CREATE FUNCTION business.members_page(
  cursor_created_at timestamptz,
  cursor_id uuid,
  page_size integer
)
RETURNS TABLE(id uuid,name text,email text,role text,created_at text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid;
BEGIN
  IF NOT coalesce(business.can('members.read'),false)
    OR page_size IS NULL OR page_size NOT BETWEEN 1 AND 100
    OR (cursor_created_at IS NULL) <> (cursor_id IS NULL) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  RETURN QUERY
    SELECT a.id,u.name,u.email,m.role,
      to_char(u."createdAt" AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    FROM authorization_private.memberships m
      JOIN authorization_private.actors a ON a.id=m.actor_id
      JOIN identity."user" u ON u.id=a.identity_id
    WHERE m.tenant_id=tenant AND a.enabled
      AND (cursor_created_at IS NULL OR (u."createdAt",a.id)<(cursor_created_at,cursor_id))
    ORDER BY u."createdAt" DESC,a.id DESC
    LIMIT page_size;
END $$;

CREATE FUNCTION business.invitations_page(
  cursor_created_at timestamptz,
  cursor_id uuid,
  page_size integer
)
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  delivery text,
  created_at text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid;
BEGIN
  IF NOT coalesce(business.can('invitations.manage'),false)
    OR page_size IS NULL OR page_size NOT BETWEEN 1 AND 100
    OR (cursor_created_at IS NULL) <> (cursor_id IS NULL) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  RETURN QUERY
    SELECT i.id,i.email,i.role,i.expires_at,i.accepted_at,i.revoked_at,i.delivery,
      to_char(i.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    FROM authorization_private.invitations i
    WHERE i.tenant_id=tenant
      AND (cursor_created_at IS NULL OR (i.created_at,i.id)<(cursor_created_at,cursor_id))
    ORDER BY i.created_at DESC,i.id DESC
    LIMIT page_size;
END $$;

REVOKE ALL ON FUNCTION business.workspaces_page(timestamptz,uuid,integer),
  business.members_page(timestamptz,uuid,integer),
  business.invitations_page(timestamptz,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION business.workspaces_page(timestamptz,uuid,integer),
  business.members_page(timestamptz,uuid,integer),
  business.invitations_page(timestamptz,uuid,integer) TO business_runtime;

RESET ROLE;
