SET LOCAL ROLE business_owner;

CREATE OR REPLACE FUNCTION business.finish_invitation_outbox(
  target uuid,
  claim uuid,
  succeeded boolean,
  error_code text DEFAULT NULL
)
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
    UPDATE authorization_private.invitations AS invitation SET delivery='failed'
      WHERE invitation.id=message.invitation_id AND invitation.accepted_at IS NULL
        AND invitation.revoked_at IS NULL AND invitation.expires_at>clock_timestamp()
        AND invitation.delivery IS DISTINCT FROM 'failed'
        AND message.operation_key='invitation:'||invitation.id::text||':'||invitation.token_hash
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

RESET ROLE;
