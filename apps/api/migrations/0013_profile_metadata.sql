ALTER TABLE identity."user"
  ADD COLUMN first_name varchar(100) CHECK(first_name IS NULL OR length(first_name) BETWEEN 1 AND 100),
  ADD COLUMN last_name varchar(100) CHECK(last_name IS NULL OR length(last_name) BETWEEN 1 AND 100),
  ADD COLUMN phone_number varchar(32) CHECK(phone_number ~ '^\+[1-9][0-9]{1,14}$');
-- L'heuristique premier mot/reste laisse les mononymes incomplets ; Mon profil corrige les noms composés.
ALTER TABLE identity."user" DISABLE TRIGGER lifecycle_dates;
UPDATE identity."user" SET
  first_name=nullif(split_part(btrim(regexp_replace(name,'\s+',' ','g')),' ',1),''),
  last_name=nullif(regexp_replace(btrim(regexp_replace(name,'\s+',' ','g')),'^[^ ]+ ?',''),'');
ALTER TABLE identity."user" ENABLE TRIGGER lifecycle_dates;
GRANT SELECT (first_name,last_name,phone_number,image,"createdAt","updatedAt") ON identity."user" TO business_owner;
GRANT UPDATE (first_name,last_name,phone_number,name,image) ON identity."user" TO business_owner;

ALTER TABLE business.tenants
  ADD COLUMN slug varchar(63),
  ADD COLUMN billing_email text,
  ADD COLUMN vat_number text,
  ADD COLUMN country_code char(2) NOT NULL DEFAULT 'FR' CHECK(country_code ~ '^[A-Z]{2}$'),
  ADD COLUMN subscription_tier text NOT NULL DEFAULT 'free' CHECK(subscription_tier IN ('free','pro','enterprise')),
  ADD COLUMN subscription_status text NOT NULL DEFAULT 'active' CHECK(subscription_status IN ('active','trialing','past_due','canceled')),
  ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(metadata)='object');
ALTER TABLE business.workspaces ADD COLUMN slug varchar(63), ADD COLUMN description text, ADD COLUMN archived_at timestamptz;
ALTER TABLE authorization_private.memberships
  ADD COLUMN job_title varchar(120) CHECK(length(job_title)<=120),
  ADD COLUMN department varchar(100) CHECK(length(department)<=100),
  ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK(status IN ('invited','active','suspended')),
  ADD COLUMN invited_by uuid REFERENCES authorization_private.actors(id) ON DELETE SET NULL,
  ADD COLUMN joined_at timestamptz;
ALTER TABLE authorization_private.ui_preferences
  ADD COLUMN timezone text NOT NULL DEFAULT 'Europe/Paris',
  ADD COLUMN date_format text NOT NULL DEFAULT 'DD/MM/YYYY' CHECK(date_format IN ('DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'));

CREATE FUNCTION business.metadata_slug(label text, identifier uuid, fallback text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
  SELECT coalesce(nullif(left(trim(both '-' from regexp_replace(lower(label),'[^a-z0-9]+','-','g')),30),''),fallback)||'-'||replace(identifier::text,'-','')
$$;
ALTER TABLE business.tenants DISABLE TRIGGER lifecycle_dates;
UPDATE business.tenants t SET slug=business.metadata_slug(t.name,t.id,'tenant'), billing_email=coalesce(
  (SELECT u.email FROM authorization_private.memberships m JOIN authorization_private.actors a ON a.id=m.actor_id
    JOIN identity."user" u ON u.id=a.identity_id WHERE m.tenant_id=t.id AND m.role='tenant_admin'
    AND m.status='active' AND a.enabled AND u."deletedAt" IS NULL AND btrim(u.email)<>'' ORDER BY a.id LIMIT 1),
  (SELECT i.email FROM authorization_private.invitations i WHERE i.tenant_id=t.id AND i.role='tenant_admin'
    AND i.revoked_at IS NULL AND i.accepted_at IS NULL AND btrim(i.email)<>'' ORDER BY i.expires_at,i.id LIMIT 1));
ALTER TABLE business.tenants ENABLE TRIGGER lifecycle_dates;
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(id::text,', ' ORDER BY id) INTO missing FROM business.tenants WHERE billing_email IS NULL;
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'BILLING_EMAIL_BACKFILL_REQUIRED tenants: %',missing; END IF;
END $$;
UPDATE business.workspaces SET slug=business.metadata_slug(name,id,'workspace');
ALTER TABLE business.tenants ALTER COLUMN slug SET NOT NULL, ALTER COLUMN billing_email SET NOT NULL,
  ADD CONSTRAINT tenants_slug_key UNIQUE(slug), ADD CONSTRAINT tenants_billing_email_valid CHECK(billing_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');
ALTER TABLE business.workspaces ALTER COLUMN slug SET NOT NULL, ADD CONSTRAINT workspaces_tenant_slug_key UNIQUE(tenant_id,slug);

CREATE FUNCTION business.sync_profile_name() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='INSERT' OR (NEW.name IS DISTINCT FROM OLD.name AND NEW.first_name IS NOT DISTINCT FROM OLD.first_name AND NEW.last_name IS NOT DISTINCT FROM OLD.last_name) THEN
    NEW.first_name:=nullif(split_part(btrim(regexp_replace(NEW.name,'\s+',' ','g')),' ',1),'');
    NEW.last_name:=nullif(regexp_replace(btrim(regexp_replace(NEW.name,'\s+',' ','g')),'^[^ ]+ ?',''),'');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profile_name BEFORE INSERT OR UPDATE OF name ON identity."user" FOR EACH ROW EXECUTE FUNCTION business.sync_profile_name();

SET LOCAL ROLE business_owner;
CREATE FUNCTION business.fill_metadata_slug() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NEW.slug IS NULL THEN NEW.slug:=business.metadata_slug(NEW.name,NEW.id,CASE WHEN TG_TABLE_NAME='tenants' THEN 'tenant' ELSE 'workspace' END); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER metadata_slug BEFORE INSERT ON business.tenants FOR EACH ROW EXECUTE FUNCTION business.fill_metadata_slug();
CREATE TRIGGER metadata_slug BEFORE INSERT ON business.workspaces FOR EACH ROW EXECUTE FUNCTION business.fill_metadata_slug();

CREATE FUNCTION business.profile() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=business.actor_id(); tenant uuid:=nullif(current_setting('app.tenant_id',true),'')::uuid; result jsonb;
BEGIN
  IF actor IS NULL OR (tenant IS NOT NULL AND NOT coalesce(business.tenant_access(tenant),false)) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  SELECT jsonb_build_object('first_name',u.first_name,'last_name',u.last_name,'avatar_url',u.image,
    'phone_number',u.phone_number,'email',u.email,'is_email_verified',u."emailVerified",
    'created_at',u."createdAt",'updated_at',u."updatedAt",'job_title',m.job_title,'department',m.department)
    INTO result FROM authorization_private.actors a JOIN identity."user" u ON u.id=a.identity_id
    LEFT JOIN authorization_private.memberships m ON m.actor_id=a.id AND m.tenant_id=tenant AND m.status='active'
    WHERE a.id=actor AND u.id=current_setting('app.identity_id',true);
  RETURN result;
END $$;
CREATE FUNCTION business.save_profile(first_name text,last_name text,avatar_url text,phone_number text,job_title text,department text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=business.actor_id(); tenant uuid:=nullif(current_setting('app.tenant_id',true),'')::uuid;
BEGIN
  IF actor IS NULL OR (tenant IS NOT NULL AND NOT coalesce(business.tenant_access(tenant),false)) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF first_name IS NULL OR last_name IS NULL OR length(btrim(first_name)) NOT BETWEEN 1 AND 100 OR length(btrim(last_name)) NOT BETWEEN 1 AND 100
    OR (avatar_url IS NOT NULL AND avatar_url !~ '^https?://[^[:space:]/?#]+[^[:space:]]*$')
    OR (phone_number IS NOT NULL AND phone_number !~ '^\+[1-9][0-9]{1,14}$')
    OR length(btrim(job_title))>120 OR length(btrim(department))>100 THEN RAISE EXCEPTION 'INVALID_PROFILE' USING ERRCODE='22023'; END IF;
  IF (job_title IS NOT NULL OR department IS NOT NULL) AND NOT EXISTS(
    SELECT FROM authorization_private.memberships m WHERE m.actor_id=actor AND m.tenant_id=tenant AND m.status='active') THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  UPDATE identity."user" u SET first_name=btrim(save_profile.first_name),last_name=btrim(save_profile.last_name),
    name=btrim(save_profile.first_name)||' '||btrim(save_profile.last_name),image=avatar_url,phone_number=save_profile.phone_number
    WHERE u.id=current_setting('app.identity_id',true) AND EXISTS(SELECT FROM authorization_private.actors a WHERE a.id=actor AND a.identity_id=u.id);
  UPDATE authorization_private.memberships m SET job_title=btrim(save_profile.job_title),department=btrim(save_profile.department)
    WHERE m.actor_id=actor AND m.tenant_id=tenant AND m.status='active';
  RETURN business.profile();
END $$;
CREATE OR REPLACE FUNCTION business.ui_preferences() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT jsonb_build_object('locale',locale,'theme',theme,'timezone',timezone,'date_format',date_format)
    FROM authorization_private.ui_preferences WHERE actor_id=business.actor_id()
$$;
CREATE FUNCTION business.save_ui_preferences(new_locale text,new_theme text,new_timezone text,new_date_format text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF business.actor_id() IS NULL THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF new_timezone IS NOT NULL AND NOT EXISTS(SELECT FROM pg_catalog.pg_timezone_names WHERE name=new_timezone) THEN RAISE EXCEPTION 'INVALID_TIMEZONE' USING ERRCODE='22023'; END IF;
  INSERT INTO authorization_private.ui_preferences(actor_id,locale,theme,timezone,date_format)
    VALUES(business.actor_id(),new_locale,new_theme,coalesce(new_timezone,'Europe/Paris'),coalesce(new_date_format,'DD/MM/YYYY'))
    ON CONFLICT(actor_id) DO UPDATE SET locale=excluded.locale,theme=excluded.theme,
      timezone=coalesce(new_timezone,authorization_private.ui_preferences.timezone),date_format=coalesce(new_date_format,authorization_private.ui_preferences.date_format);
END $$;
CREATE OR REPLACE FUNCTION business.save_ui_preferences(new_locale text,new_theme text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT business.save_ui_preferences(new_locale,new_theme,NULL,NULL)
$$;
REVOKE ALL ON FUNCTION business.profile(),business.save_profile(text,text,text,text,text,text),business.save_ui_preferences(text,text,text,text),business.fill_metadata_slug() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION business.profile(),business.save_profile(text,text,text,text,text,text),business.save_ui_preferences(text,text,text,text) TO business_runtime;
RESET ROLE;
REVOKE ALL ON FUNCTION business.metadata_slug(text,uuid,text),business.sync_profile_name() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION business.metadata_slug(text,uuid,text) TO business_owner;

