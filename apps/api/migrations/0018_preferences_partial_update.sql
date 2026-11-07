SET LOCAL ROLE business_owner;
CREATE OR REPLACE FUNCTION business.save_ui_preferences(new_locale text,new_theme text,new_timezone text,new_date_format text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF business.actor_id() IS NULL THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF new_locale IS NULL AND new_theme IS NULL AND new_timezone IS NULL AND new_date_format IS NULL THEN RAISE EXCEPTION 'INVALID_PREFERENCES' USING ERRCODE='22023'; END IF;
  IF new_timezone IS NOT NULL AND (length(new_timezone)>100 OR NOT EXISTS(SELECT FROM pg_catalog.pg_timezone_names WHERE name=new_timezone)) THEN RAISE EXCEPTION 'INVALID_TIMEZONE' USING ERRCODE='22023'; END IF;
  INSERT INTO authorization_private.ui_preferences(actor_id,locale,theme,timezone,date_format)
    VALUES(business.actor_id(),coalesce(new_locale,'fr'),coalesce(new_theme,'system'),coalesce(new_timezone,'Europe/Paris'),coalesce(new_date_format,'DD/MM/YYYY'))
    ON CONFLICT(actor_id) DO UPDATE SET
      locale=coalesce(new_locale,authorization_private.ui_preferences.locale),
      theme=coalesce(new_theme,authorization_private.ui_preferences.theme),
      timezone=coalesce(new_timezone,authorization_private.ui_preferences.timezone),
      date_format=coalesce(new_date_format,authorization_private.ui_preferences.date_format);
END $$;
CREATE FUNCTION business.initialize_ui_preferences(new_locale text,new_theme text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF business.actor_id() IS NULL THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO authorization_private.ui_preferences(actor_id,locale,theme)
    VALUES(business.actor_id(),new_locale,new_theme) ON CONFLICT(actor_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION business.initialize_ui_preferences(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION business.initialize_ui_preferences(text,text) TO business_runtime;
RESET ROLE;
