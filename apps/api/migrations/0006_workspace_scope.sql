SET LOCAL ROLE business_owner;
CREATE OR REPLACE FUNCTION business.workspace_people(workspace uuid) RETURNS TABLE(id uuid,name text,email text,role text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT a.id,u.name,u.email,w.role FROM authorization_private.memberships m
  JOIN authorization_private.actors a ON a.id=m.actor_id
  JOIN identity."user" u ON u.id=a.identity_id
  LEFT JOIN authorization_private.workspace_members w ON w.actor_id=a.id AND w.workspace_id=workspace
  WHERE a.enabled AND business.workspace_admin(workspace,m.tenant_id)
    AND EXISTS(SELECT FROM business.workspaces actual WHERE actual.id=workspace AND actual.tenant_id=m.tenant_id)
$$;
RESET ROLE;
