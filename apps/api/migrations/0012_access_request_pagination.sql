SET LOCAL ROLE business_owner;
CREATE INDEX access_requests_page ON authorization_private.access_requests(tenant_id,created_at DESC,id DESC);
DROP FUNCTION business.access_requests();
CREATE FUNCTION business.access_requests(before_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid,first_name text,last_name text,email text,status text,created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid;
BEGIN
  IF NOT coalesce(business.tenant_admin(tenant),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT r.id,r.first_name,r.last_name,r.email,r.status,r.created_at
    FROM authorization_private.access_requests r WHERE r.tenant_id=tenant
      AND (before_id IS NULL OR (r.created_at,r.id)<(
        SELECT cursor.created_at,cursor.id FROM authorization_private.access_requests cursor
          WHERE cursor.id=before_id AND cursor.tenant_id=tenant))
    ORDER BY r.created_at DESC,r.id DESC LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION business.access_requests(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION business.access_requests(uuid) TO business_runtime;
RESET ROLE;
