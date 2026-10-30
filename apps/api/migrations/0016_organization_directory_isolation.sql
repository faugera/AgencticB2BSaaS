SET LOCAL ROLE business_owner;
CREATE OR REPLACE FUNCTION business.organization_directory() RETURNS TABLE(id uuid,name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT o.id,o.name FROM business.organizations o
  WHERE o.deleted_at IS NULL AND business.organization_access(o.id)
  ORDER BY o.name,o.id
$$;
REVOKE ALL ON FUNCTION business.organization_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION business.organization_directory() TO business_runtime;
RESET ROLE;
