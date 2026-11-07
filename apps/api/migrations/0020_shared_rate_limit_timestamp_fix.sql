SET LOCAL ROLE business_owner;

CREATE OR REPLACE FUNCTION business.consume_rate_limit(
  key_hash text,
  max_requests integer,
  window_milliseconds integer
)
RETURNS TABLE(request_count integer, ttl_milliseconds bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE window_started_at timestamptz := clock_timestamp();
BEGIN
  IF key_hash IS NULL OR key_hash !~ '^[0-9a-f]{64}$'
    OR max_requests IS NULL OR max_requests NOT BETWEEN 1 AND 10000
    OR window_milliseconds IS NULL OR window_milliseconds NOT BETWEEN 1 AND 86400000 THEN
    RAISE EXCEPTION 'INVALID_RATE_LIMIT' USING ERRCODE='22023';
  END IF;

  DELETE FROM authorization_private.business_rate_limits
    WHERE ctid IN (
      SELECT ctid FROM authorization_private.business_rate_limits
      WHERE window_ends_at <= window_started_at
      LIMIT 100 FOR UPDATE SKIP LOCKED
    );

  RETURN QUERY
    INSERT INTO authorization_private.business_rate_limits AS limits(
      key_digest, request_count, window_ends_at
    )
    VALUES (
      key_hash,
      1,
      window_started_at + make_interval(secs => window_milliseconds::double precision / 1000)
    )
    ON CONFLICT(key_digest) DO UPDATE SET
      request_count = CASE
        WHEN limits.window_ends_at <= window_started_at THEN 1
        ELSE limits.request_count + 1
      END,
      window_ends_at = CASE
        WHEN limits.window_ends_at <= window_started_at
          THEN window_started_at + make_interval(secs => window_milliseconds::double precision / 1000)
        ELSE limits.window_ends_at
      END
    RETURNING limits.request_count,
      greatest(0, ceil(extract(epoch FROM (limits.window_ends_at - clock_timestamp())) * 1000))::bigint;
END $$;

RESET ROLE;
