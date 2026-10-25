SET LOCAL ROLE business_owner;
CREATE OR REPLACE FUNCTION business.remove_member(actor uuid, workspace uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid;
BEGIN
  PERFORM 1 FROM authorization_private.memberships WHERE tenant_id=tenant ORDER BY actor_id FOR UPDATE;
  IF workspace IS NOT NULL THEN
    IF NOT business.workspace_admin(workspace,tenant) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
    DELETE FROM authorization_private.workspace_members WHERE workspace_id=workspace AND tenant_id=tenant AND actor_id=actor;
  ELSE
    IF NOT business.tenant_admin(tenant) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
    IF EXISTS(SELECT FROM authorization_private.memberships m JOIN authorization_private.actors a ON a.id=m.actor_id
        WHERE m.actor_id=actor AND m.tenant_id=tenant AND m.role='tenant_admin' AND a.enabled)
      AND (SELECT count(*) FROM authorization_private.memberships m JOIN authorization_private.actors a ON a.id=m.actor_id
        WHERE m.tenant_id=tenant AND m.role='tenant_admin' AND a.enabled)<=1
      THEN RAISE EXCEPTION 'LAST_ADMIN' USING ERRCODE='23505'; END IF;
    DELETE FROM authorization_private.memberships WHERE actor_id=actor AND tenant_id=tenant;
  END IF;
  PERFORM business.record_audit('membership.removed',actor::text);
END $$;
RESET ROLE;
