SET LOCAL ROLE business_owner;
CREATE TABLE authorization_private.ui_preferences (
  actor_id uuid PRIMARY KEY REFERENCES authorization_private.actors(id),
  locale text NOT NULL CHECK(locale IN ('fr','en')),
  theme text NOT NULL CHECK(theme IN ('system','light','dark'))
);
CREATE TABLE authorization_private.workspace_appearance (
  tenant_id uuid NOT NULL, workspace_id uuid PRIMARY KEY,
  color text CHECK(color ~ '^#[0-9a-fA-F]{6}$'),
  FOREIGN KEY(tenant_id,workspace_id) REFERENCES business.workspaces(tenant_id,id)
);
CREATE FUNCTION business.ui_preferences() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT jsonb_build_object('locale',locale,'theme',theme) FROM authorization_private.ui_preferences WHERE actor_id=business.actor_id()
$$;
CREATE FUNCTION business.save_ui_preferences(new_locale text,new_theme text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF business.actor_id() IS NULL THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO authorization_private.ui_preferences(actor_id,locale,theme) VALUES(business.actor_id(),new_locale,new_theme)
    ON CONFLICT(actor_id) DO UPDATE SET locale=EXCLUDED.locale,theme=EXCLUDED.theme;
END $$;
CREATE FUNCTION business.workspace_color(target uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT a.color FROM authorization_private.workspace_appearance a JOIN business.workspaces w ON w.id=a.workspace_id AND w.tenant_id=a.tenant_id WHERE w.id=target
$$;
CREATE FUNCTION business.save_workspace_color(target uuid,new_color text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE workspace business.workspaces;
BEGIN
  SELECT * INTO workspace FROM business.workspaces WHERE id=target;
  IF NOT FOUND OR NOT coalesce(business.workspace_admin(target,workspace.tenant_id),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO authorization_private.workspace_appearance(tenant_id,workspace_id,color) VALUES(workspace.tenant_id,target,new_color)
    ON CONFLICT(workspace_id) DO UPDATE SET color=EXCLUDED.color;
  PERFORM business.record_audit('workspace.appearance',target::text);
END $$;
REVOKE ALL ON FUNCTION business.ui_preferences(),business.save_ui_preferences(text,text),business.workspace_color(uuid),business.save_workspace_color(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION business.ui_preferences(),business.save_ui_preferences(text,text),business.workspace_color(uuid),business.save_workspace_color(uuid,text) TO business_runtime;
RESET ROLE;
