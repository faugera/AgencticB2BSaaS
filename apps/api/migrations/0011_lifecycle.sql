ALTER TABLE identity."user" ADD COLUMN "deletedAt" timestamptz;
REVOKE DELETE ON identity."user" FROM identity_runtime;
GRANT SELECT ("deletedAt") ON identity."user" TO business_owner;
GRANT SELECT ("userId"), DELETE ON identity.session TO business_owner;

SET LOCAL ROLE business_owner;
-- Historical tenant creation times are unknown; existing rows use migration time.
ALTER TABLE business.tenants
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN deleted_at timestamptz;

CREATE FUNCTION business.lifecycle_dates() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF TG_TABLE_SCHEMA='identity' THEN
    NEW."createdAt" := OLD."createdAt";
    NEW."updatedAt" := clock_timestamp();
    IF OLD."deletedAt" IS NOT NULL THEN NEW."deletedAt" := OLD."deletedAt"; END IF;
  ELSE
    NEW.created_at := OLD.created_at;
    NEW.updated_at := clock_timestamp();
    IF OLD.deleted_at IS NOT NULL THEN NEW.deleted_at := OLD.deleted_at; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION business.revoke_deleted_identity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NEW."deletedAt" IS NOT NULL THEN
    DELETE FROM identity.session WHERE "userId"=NEW.id;
    UPDATE authorization_private.actors SET enabled=false WHERE identity_id=NEW.id AND enabled;
  END IF;
  RETURN NULL;
END $$;

CREATE FUNCTION business.active_session_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE deleted timestamptz;
BEGIN
  -- Serialize session writes with deletion so a concurrent login cannot survive it.
  SELECT "deletedAt" INTO deleted FROM identity."user" WHERE id=NEW."userId" FOR SHARE;
  IF deleted IS NOT NULL THEN RETURN NULL; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION business.actor_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT a.id FROM authorization_private.actors a JOIN identity."user" u ON u.id=a.identity_id
    WHERE a.identity_id=current_setting('app.identity_id',true) AND a.enabled AND u."deletedAt" IS NULL
$$;

CREATE OR REPLACE FUNCTION business.context() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor authorization_private.actors; membership authorization_private.memberships;
BEGIN
  IF NOT EXISTS(SELECT FROM identity."user" WHERE id=current_setting('app.identity_id',true)
    AND "emailVerified" AND "deletedAt" IS NULL) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  INSERT INTO authorization_private.actors(identity_id)
    SELECT id FROM identity."user" WHERE id=current_setting('app.identity_id',true)
      AND "emailVerified" AND "deletedAt" IS NULL
    ON CONFLICT(identity_id) DO NOTHING;
  SELECT * INTO actor FROM authorization_private.actors WHERE id=business.actor_id();
  IF actor.id IS NULL THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  SELECT * INTO membership FROM authorization_private.memberships WHERE actor_id=actor.id;
  RETURN jsonb_build_object('actorId',actor.id,'platformRole',actor.platform_role,
    'tenantId',membership.tenant_id,'tenantRole',membership.role,'handle',actor.handle);
END $$;

CREATE FUNCTION business.tenant_membership(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT target::text=current_setting('app.tenant_id',true) AND (business.is_super() OR EXISTS(
    SELECT FROM authorization_private.memberships WHERE tenant_id=target AND actor_id=business.actor_id()))
$$;
-- Keep the read policy independent of tenant_access to avoid recursive RLS.
ALTER POLICY tenant_read ON business.tenants USING(
  deleted_at IS NULL AND (business.tenant_membership(id) OR business.is_super()));
CREATE OR REPLACE FUNCTION business.tenant_access(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT business.tenant_membership(target) AND EXISTS(
    SELECT FROM business.tenants WHERE id=target AND deleted_at IS NULL)
$$;

CREATE FUNCTION business.revoke_deleted_tenant() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    UPDATE authorization_private.invitations SET revoked_at=now()
      WHERE tenant_id=NEW.id AND accepted_at IS NULL AND revoked_at IS NULL;
    DELETE FROM authorization_private.access_links WHERE tenant_id=NEW.id;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER lifecycle_dates BEFORE UPDATE ON business.tenants
  FOR EACH ROW EXECUTE FUNCTION business.lifecycle_dates();
CREATE TRIGGER lifecycle_revoke AFTER UPDATE OF deleted_at ON business.tenants
  FOR EACH ROW EXECUTE FUNCTION business.revoke_deleted_tenant();
DROP TRIGGER audit_change ON business.tenants;
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON business.tenants
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('tenant','id','name,deleted_at');

REVOKE ALL ON FUNCTION business.lifecycle_dates(), business.revoke_deleted_identity(),
  business.active_session_identity(), business.tenant_membership(uuid), business.revoke_deleted_tenant() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION business.tenant_membership(uuid) TO business_runtime;
RESET ROLE;
CREATE TRIGGER lifecycle_dates BEFORE UPDATE ON identity."user"
  FOR EACH ROW EXECUTE FUNCTION business.lifecycle_dates();
CREATE TRIGGER lifecycle_revoke AFTER UPDATE OF "deletedAt" ON identity."user"
  FOR EACH ROW EXECUTE FUNCTION business.revoke_deleted_identity();
CREATE TRIGGER lifecycle_session BEFORE INSERT OR UPDATE ON identity.session
  FOR EACH ROW EXECUTE FUNCTION business.active_session_identity();
DROP TRIGGER audit_change ON identity."user";
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON identity."user"
  FOR EACH ROW EXECUTE FUNCTION business.audit_mutation('user','id','name,email,emailVerified,image,twoFactorEnabled,deletedAt');
