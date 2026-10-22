SET LOCAL ROLE business_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA business REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE OR REPLACE FUNCTION business.update_invitation(target uuid, operation text, new_hash text DEFAULT NULL) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE invitation authorization_private.invitations;
BEGIN
  SELECT * INTO invitation FROM authorization_private.invitations WHERE id=target FOR UPDATE;
  IF NOT FOUND OR NOT business.tenant_admin(invitation.tenant_id) THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  -- An invitee may accept while SMTP delivery is being acknowledged. Recording
  -- delivery must remain possible, but accepted invitations cannot be reused.
  IF invitation.accepted_at IS NOT NULL AND operation IN ('retry','revoke') THEN RAISE EXCEPTION 'INVITATION_USED' USING ERRCODE='23505'; END IF;
  IF operation='revoke' THEN UPDATE authorization_private.invitations SET revoked_at=now() WHERE id=target;
  ELSIF operation='retry' AND new_hash IS NOT NULL THEN UPDATE authorization_private.invitations SET token_hash=new_hash,expires_at=now()+interval '48 hours',revoked_at=NULL,delivery='pending' WHERE id=target;
  ELSIF operation IN ('sent','failed') THEN UPDATE authorization_private.invitations SET delivery=operation WHERE id=target;
  ELSE RAISE EXCEPTION 'INVALID_OPERATION'; END IF;
  PERFORM business.record_audit('invitation.'||operation,target::text);
  RETURN invitation.email;
END $$;
RESET ROLE;
