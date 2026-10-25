SET LOCAL ROLE business_owner;
CREATE TABLE authorization_private.access_links (
  tenant_id uuid PRIMARY KEY REFERENCES business.tenants(id),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid()
);
CREATE TABLE authorization_private.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES business.tenants(id),
  first_name text NOT NULL CHECK(length(trim(first_name)) BETWEEN 1 AND 100),
  last_name text NOT NULL CHECK(length(trim(last_name)) BETWEEN 1 AND 100),
  email text NOT NULL CHECK(length(email) BETWEEN 3 AND 254),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  invitation_id uuid REFERENCES authorization_private.invitations(id),
  UNIQUE(tenant_id,email)
);
CREATE FUNCTION business.access_link() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid; result uuid;
BEGIN
  IF NOT coalesce(business.tenant_admin(tenant),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO authorization_private.access_links(tenant_id) VALUES(tenant) ON CONFLICT DO NOTHING;
  SELECT token INTO result FROM authorization_private.access_links WHERE tenant_id=tenant;
  RETURN result;
END $$;
CREATE FUNCTION business.submit_access_request(link uuid, first_name text, last_name text, email_address text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  INSERT INTO authorization_private.access_requests(tenant_id,first_name,last_name,email)
    SELECT tenant_id,trim(first_name),trim(last_name),lower(trim(email_address))
    FROM authorization_private.access_links WHERE token=link
    ON CONFLICT(tenant_id,email) DO NOTHING;
END $$;
CREATE FUNCTION business.access_requests() RETURNS TABLE(id uuid,first_name text,last_name text,email text,status text,created_at timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE tenant uuid := nullif(current_setting('app.tenant_id',true),'')::uuid;
BEGIN
  IF NOT coalesce(business.tenant_admin(tenant),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT r.id,r.first_name,r.last_name,r.email,r.status,r.created_at
    FROM authorization_private.access_requests r WHERE r.tenant_id=tenant ORDER BY r.created_at DESC LIMIT 100;
END $$;
CREATE FUNCTION business.review_access_request(target uuid, operation text, invited_role text, hashed_token text)
RETURNS TABLE(email text,tenant_id uuid,invitation_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE request authorization_private.access_requests; invitation uuid;
BEGIN
  SELECT * INTO request FROM authorization_private.access_requests WHERE id=target FOR UPDATE;
  IF NOT FOUND OR NOT coalesce(business.tenant_admin(request.tenant_id),false) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF request.status<>'pending' THEN RAISE EXCEPTION 'REQUEST_REVIEWED' USING ERRCODE='23505'; END IF;
  IF operation='approve' THEN
    IF invited_role NOT IN ('member','tenant_admin') OR invited_role IS NULL THEN RAISE EXCEPTION 'INVALID_ROLE' USING ERRCODE='22023'; END IF;
    invitation := business.invite(request.email,invited_role,hashed_token);
  ELSIF operation IS DISTINCT FROM 'reject' THEN RAISE EXCEPTION 'INVALID_OPERATION' USING ERRCODE='22023'; END IF;
  UPDATE authorization_private.access_requests SET status=CASE WHEN operation='approve' THEN 'approved' ELSE 'rejected' END,
    reviewed_at=now(),invitation_id=invitation WHERE id=target;
  PERFORM business.record_audit('access_request.'||operation,target::text);
  RETURN QUERY SELECT request.email,request.tenant_id,invitation;
END $$;
REVOKE ALL ON FUNCTION business.access_link(), business.submit_access_request(uuid,text,text,text),
  business.access_requests(), business.review_access_request(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION business.access_link(), business.submit_access_request(uuid,text,text,text),
  business.access_requests(), business.review_access_request(uuid,text,text,text) TO business_runtime;
RESET ROLE;
