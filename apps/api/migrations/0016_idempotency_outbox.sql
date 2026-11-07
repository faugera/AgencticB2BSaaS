SET LOCAL ROLE business_owner;

ALTER TABLE authorization_private.invitations
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT clock_timestamp();

CREATE TABLE authorization_private.idempotency_records (
  actor_id uuid NOT NULL REFERENCES authorization_private.actors(id),
  action text NOT NULL CHECK(length(action) BETWEEN 1 AND 100),
  scope_key text NOT NULL CHECK(length(scope_key) <= 100),
  key_digest text NOT NULL CHECK(key_digest ~ '^[0-9a-f]{64}$'),
  request_digest text NOT NULL CHECK(request_digest ~ '^[0-9a-f]{64}$'),
  state text NOT NULL CHECK(state IN ('processing','completed')),
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(actor_id,action,scope_key,key_digest),
  CHECK((state='processing' AND response IS NULL) OR (state='completed' AND response IS NOT NULL))
);
CREATE INDEX idempotency_expiry ON authorization_private.idempotency_records(expires_at);

CREATE TABLE authorization_private.outbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_key text NOT NULL UNIQUE CHECK(length(operation_key) BETWEEN 1 AND 200),
  tenant_id uuid NOT NULL REFERENCES business.tenants(id),
  invitation_id uuid NOT NULL REFERENCES authorization_private.invitations(id),
  key_id text NOT NULL CHECK(length(key_id) BETWEEN 1 AND 64),
  iv text NOT NULL,
  ciphertext text NOT NULL,
  tag text NOT NULL,
  state text NOT NULL DEFAULT 'pending'
    CHECK(state IN ('pending','leased','retryable','sent','failed','expired')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_id uuid,
  leased_until timestamptz,
  expires_at timestamptz NOT NULL,
  last_error text CHECK(last_error IS NULL OR length(last_error) <= 64),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK((state='leased' AND lease_id IS NOT NULL AND leased_until IS NOT NULL)
    OR state<>'leased')
);
CREATE INDEX outbox_ready ON authorization_private.outbox_messages(available_at,created_at)
  WHERE state IN ('pending','retryable');
CREATE INDEX outbox_expiry ON authorization_private.outbox_messages(expires_at)
  WHERE state IN ('pending','leased','retryable');
CREATE INDEX invitations_page ON authorization_private.invitations(tenant_id,created_at DESC,id DESC);

CREATE FUNCTION business.begin_idempotency(operation text,scope text,key_hash text,request_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=business.actor_id(); tenant text:=coalesce(nullif(scope,''),nullif(current_setting('app.tenant_id',true),''),'platform');
  existing authorization_private.idempotency_records; inserted boolean; affected integer;
BEGIN
  IF actor IS NULL OR operation IS NULL OR length(operation) NOT BETWEEN 1 AND 100
    OR tenant IS NULL OR length(tenant)>100
    OR key_hash !~ '^[0-9a-f]{64}$' OR request_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'INVALID_IDEMPOTENCY' USING ERRCODE='22023';
  END IF;
  WITH removed AS (
    SELECT ctid FROM authorization_private.idempotency_records
      WHERE expires_at<=clock_timestamp() LIMIT 100 FOR UPDATE SKIP LOCKED
  )
  DELETE FROM authorization_private.idempotency_records r USING removed WHERE r.ctid=removed.ctid;
  DELETE FROM authorization_private.idempotency_records
    WHERE actor_id=actor AND action=operation AND scope_key=tenant AND key_digest=key_hash
      AND expires_at<=clock_timestamp();
  INSERT INTO authorization_private.idempotency_records(actor_id,action,scope_key,key_digest,request_digest,state,expires_at)
    VALUES(actor,operation,tenant,key_hash,request_hash,'processing',clock_timestamp()+interval '24 hours')
    ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS affected = ROW_COUNT;
  inserted := affected=1;
  SELECT * INTO existing FROM authorization_private.idempotency_records
    WHERE actor_id=actor AND action=operation AND scope_key=tenant AND key_digest=key_hash FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'IDEMPOTENCY_RESERVATION_FAILED'; END IF;
  IF existing.request_digest<>request_hash THEN
    RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='23505';
  END IF;
  IF existing.state='completed' THEN RETURN jsonb_build_object('replay',true,'response',existing.response); END IF;
  IF NOT inserted THEN RAISE EXCEPTION 'IDEMPOTENCY_IN_PROGRESS' USING ERRCODE='23505'; END IF;
  RETURN jsonb_build_object('replay',false);
END $$;

CREATE FUNCTION business.complete_idempotency(operation text,scope text,key_hash text,request_hash text,result jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=business.actor_id(); tenant text:=coalesce(nullif(scope,''),nullif(current_setting('app.tenant_id',true),''),'platform');
BEGIN
  IF actor IS NULL OR tenant IS NULL OR length(tenant)>100 OR result IS NULL
    OR jsonb_typeof(result)<>'object' OR length(result::text)>16384 THEN
    RAISE EXCEPTION 'INVALID_IDEMPOTENCY_RESULT' USING ERRCODE='22023';
  END IF;
  UPDATE authorization_private.idempotency_records SET state='completed',response=result
    WHERE actor_id=actor AND action=operation AND scope_key=tenant AND key_digest=key_hash
      AND request_digest=request_hash AND state='processing' AND expires_at>clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'IDEMPOTENCY_RESERVATION_MISSING' USING ERRCODE='22023'; END IF;
END $$;

CREATE FUNCTION business.enqueue_invitation_outbox(target_tenant uuid,target_invitation uuid,
  operation text,version text,nonce text,body text,auth_tag text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result uuid;
BEGIN
  IF business.actor_id() IS NULL OR NOT coalesce(business.can('invitations.manage'),false)
    OR target_tenant IS DISTINCT FROM nullif(current_setting('app.tenant_id',true),'')::uuid
    OR NOT EXISTS(SELECT FROM authorization_private.invitations i WHERE i.id=target_invitation
      AND i.tenant_id=target_tenant AND i.accepted_at IS NULL AND i.revoked_at IS NULL
      AND i.expires_at>clock_timestamp()
      AND operation='invitation:'||i.id::text||':'||i.token_hash)
    OR operation IS NULL OR length(operation) NOT BETWEEN 1 AND 200
    OR version IS NULL OR length(version) NOT BETWEEN 1 AND 64
    OR nonce IS NULL OR body IS NULL OR auth_tag IS NULL THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  INSERT INTO authorization_private.outbox_messages(operation_key,tenant_id,invitation_id,key_id,iv,ciphertext,tag,expires_at)
    VALUES(operation,target_tenant,target_invitation,version,nonce,body,auth_tag,
      (SELECT expires_at FROM authorization_private.invitations WHERE id=target_invitation))
    ON CONFLICT(operation_key) DO UPDATE SET operation_key=excluded.operation_key
      WHERE authorization_private.outbox_messages.invitation_id=excluded.invitation_id
    RETURNING id INTO result;
  IF result IS NULL THEN RAISE EXCEPTION 'OUTBOX_OPERATION_CONFLICT' USING ERRCODE='23505'; END IF;
  RETURN result;
END $$;

CREATE FUNCTION business.claim_invitation_outbox(batch_size integer,lease_seconds integer)
RETURNS TABLE(id uuid,tenant_id uuid,invitation_id uuid,key_id text,iv text,ciphertext text,tag text,lease_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF batch_size IS NULL OR lease_seconds IS NULL THEN
    RAISE EXCEPTION 'INVALID_OUTBOX_CLAIM' USING ERRCODE='22023';
  END IF;
  UPDATE authorization_private.outbox_messages o SET state='expired',
      ciphertext='',iv='',tag='',lease_id=NULL,leased_until=NULL,last_error='invitation_rotated'
    FROM authorization_private.invitations i
    WHERE i.id=o.invitation_id AND o.state IN ('pending','leased','retryable')
      AND o.operation_key<>'invitation:'||i.id::text||':'||i.token_hash;
  DELETE FROM authorization_private.idempotency_records
    WHERE ctid IN (SELECT ctid FROM authorization_private.idempotency_records
      WHERE expires_at<=clock_timestamp() LIMIT 100 FOR UPDATE SKIP LOCKED);
  UPDATE authorization_private.outbox_messages o SET state='expired',ciphertext='',iv='',tag='',lease_id=NULL,leased_until=NULL
    WHERE o.state IN ('pending','leased','retryable') AND o.expires_at<=clock_timestamp();
  UPDATE authorization_private.outbox_messages o SET state='expired',ciphertext='',iv='',tag='',lease_id=NULL,leased_until=NULL
    WHERE o.state IN ('pending','leased','retryable') AND EXISTS(
      SELECT FROM authorization_private.invitations i WHERE i.id=o.invitation_id
        AND (i.accepted_at IS NOT NULL OR i.revoked_at IS NOT NULL OR i.expires_at<=clock_timestamp()));
  UPDATE authorization_private.invitations i SET delivery='failed'
    WHERE i.delivery='pending' AND EXISTS(SELECT FROM authorization_private.outbox_messages o
      WHERE o.invitation_id=i.id AND o.state='expired'
        AND o.operation_key='invitation:'||i.id::text||':'||i.token_hash);
  UPDATE authorization_private.outbox_messages SET state='retryable',lease_id=NULL,leased_until=NULL,
      available_at=clock_timestamp()
    WHERE state='leased' AND leased_until<=clock_timestamp() AND expires_at>clock_timestamp() AND attempts<8;
  UPDATE authorization_private.outbox_messages SET state='failed',ciphertext='',iv='',tag='',
      lease_id=NULL,leased_until=NULL,last_error='lease_exhausted'
    WHERE state='leased' AND leased_until<=clock_timestamp() AND attempts>=8;
  UPDATE authorization_private.invitations i SET delivery='failed'
    WHERE i.delivery='pending' AND EXISTS(SELECT FROM authorization_private.outbox_messages o
      WHERE o.invitation_id=i.id AND o.state='failed'
        AND o.operation_key='invitation:'||i.id::text||':'||i.token_hash);
  DELETE FROM authorization_private.outbox_messages
    WHERE ctid IN (SELECT ctid FROM authorization_private.outbox_messages
      WHERE expires_at<=clock_timestamp() AND state IN ('sent','failed','expired')
      LIMIT 100 FOR UPDATE SKIP LOCKED);
  RETURN QUERY
    WITH candidates AS (
      SELECT o.id FROM authorization_private.outbox_messages o
      WHERE o.state IN ('pending','retryable') AND o.available_at<=clock_timestamp()
        AND o.expires_at>clock_timestamp()
        AND EXISTS(SELECT FROM authorization_private.invitations i WHERE i.id=o.invitation_id
          AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>clock_timestamp()
          AND o.operation_key='invitation:'||i.id::text||':'||i.token_hash)
      ORDER BY o.available_at,o.created_at,o.id
      FOR UPDATE SKIP LOCKED LIMIT least(greatest(batch_size,1),20)
    )
    UPDATE authorization_private.outbox_messages o SET state='leased',attempts=o.attempts+1,
      lease_id=gen_random_uuid(),leased_until=clock_timestamp()+make_interval(secs=>least(greatest(lease_seconds,1),120))
    FROM candidates c WHERE o.id=c.id
    RETURNING o.id,o.tenant_id,o.invitation_id,o.key_id,o.iv,o.ciphertext,o.tag,o.lease_id;
END $$;

CREATE FUNCTION business.invitation_outbox_active(target uuid,claim uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE message authorization_private.outbox_messages; invitation authorization_private.invitations;
BEGIN
  SELECT * INTO message FROM authorization_private.outbox_messages WHERE id=target FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO invitation FROM authorization_private.invitations WHERE id=message.invitation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN message.state='leased' AND message.lease_id=claim
    AND message.leased_until>clock_timestamp() AND message.expires_at>clock_timestamp()
    AND invitation.accepted_at IS NULL AND invitation.revoked_at IS NULL
    AND invitation.expires_at>clock_timestamp()
    AND message.operation_key='invitation:'||invitation.id::text||':'||invitation.token_hash;
END
$$;

CREATE FUNCTION business.finish_invitation_outbox(target uuid,claim uuid,succeeded boolean,error_code text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE message authorization_private.outbox_messages; changed_tenant uuid; organization uuid;
BEGIN
  SELECT * INTO message FROM authorization_private.outbox_messages WHERE id=target AND state='leased'
    AND lease_id=claim FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF succeeded THEN
    UPDATE authorization_private.outbox_messages SET state='sent',delivered_at=clock_timestamp(),
      ciphertext='',iv='',tag='',lease_id=NULL,leased_until=NULL,last_error=NULL WHERE id=target;
    UPDATE authorization_private.invitations SET delivery='sent'
      WHERE id=message.invitation_id AND accepted_at IS NULL AND revoked_at IS NULL
        AND expires_at>clock_timestamp() AND delivery IS DISTINCT FROM 'sent'
      RETURNING tenant_id INTO changed_tenant;
    IF FOUND THEN
      SELECT organization_id INTO organization FROM authorization_private.tenant_organizations
        WHERE tenant_id=changed_tenant;
      PERFORM business.append_audit('invitation.sent','invitation',
        message.invitation_id::text,changed_tenant,organization,'{}');
    END IF;
  ELSE
    UPDATE authorization_private.outbox_messages SET
      state=CASE WHEN attempts>=8 OR expires_at<=clock_timestamp() THEN 'failed' ELSE 'retryable' END,
      available_at=clock_timestamp()+make_interval(secs=>least(3600,power(2,least(attempts,11))::integer)),
      ciphertext=CASE WHEN attempts>=8 OR expires_at<=clock_timestamp() THEN '' ELSE ciphertext END,
      iv=CASE WHEN attempts>=8 OR expires_at<=clock_timestamp() THEN '' ELSE iv END,
      tag=CASE WHEN attempts>=8 OR expires_at<=clock_timestamp() THEN '' ELSE tag END,
      lease_id=NULL,leased_until=NULL,last_error=left(coalesce(error_code,'delivery_failed'),64)
      WHERE id=target;
    UPDATE authorization_private.invitations SET delivery='failed'
      WHERE id=message.invitation_id AND accepted_at IS NULL AND revoked_at IS NULL
        AND expires_at>clock_timestamp() AND delivery IS DISTINCT FROM 'failed'
      RETURNING tenant_id INTO changed_tenant;
    IF FOUND THEN
      SELECT organization_id INTO organization FROM authorization_private.tenant_organizations
        WHERE tenant_id=changed_tenant;
      PERFORM business.append_audit('invitation.failed','invitation',
        message.invitation_id::text,changed_tenant,organization,
        jsonb_build_object('error_code',left(coalesce(error_code,'delivery_failed'),64)));
    END IF;
  END IF;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION business.begin_idempotency(text,text,text,text),
  business.complete_idempotency(text,text,text,text,jsonb),
  business.enqueue_invitation_outbox(uuid,uuid,text,text,text,text,text),
  business.claim_invitation_outbox(integer,integer),
  business.invitation_outbox_active(uuid,uuid),
  business.finish_invitation_outbox(uuid,uuid,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION business.begin_idempotency(text,text,text,text),
  business.complete_idempotency(text,text,text,text,jsonb),
  business.enqueue_invitation_outbox(uuid,uuid,text,text,text,text,text),
  business.claim_invitation_outbox(integer,integer),
  business.invitation_outbox_active(uuid,uuid),
  business.finish_invitation_outbox(uuid,uuid,boolean,text) TO business_runtime;
RESET ROLE;
