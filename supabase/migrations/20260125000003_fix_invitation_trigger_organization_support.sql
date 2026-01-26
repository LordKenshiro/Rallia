-- ============================================================================
-- Fix invitation trigger to include organization_id and change to AFTER INSERT
-- ============================================================================
-- This migration fixes the invitation email trigger to:
-- 1. Include organization_id in the payload (needed for organization invitations)
-- 2. Change trigger timing from BEFORE INSERT to AFTER INSERT (ensures record is fully created)
-- 3. Ensure the trigger is on the correct table (invitation, not invitations)
-- ============================================================================

-- Update notify_new_invitation function to include organization_id
CREATE OR REPLACE FUNCTION public.notify_new_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
  functions_url TEXT;
  service_key TEXT;
BEGIN
  -- Skip if no email (email is required for sending invitations)
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get secrets from Vault
  SELECT decrypted_secret INTO functions_url 
  FROM vault.decrypted_secrets 
  WHERE name = 'supabase_functions_url' 
  LIMIT 1;
  
  SELECT decrypted_secret INTO service_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'service_role_key' 
  LIMIT 1;

  -- Call send-email Edge Function with x-service-key authentication
  -- Include organization_id for organization member invitations
  SELECT INTO request_id net.http_post(
    url := functions_url || '/functions/v1/send-email',
    body := jsonb_build_object(
      'id', NEW.id,
      'email', NEW.email,
      'phone', NEW.phone,
      'role', NEW.role,
      'admin_role', NEW.admin_role,
      'token', NEW.token,
      'status', NEW.status,
      'inviter_id', NEW.inviter_id,
      'invited_user_id', NEW.invited_user_id,
      'organization_id', NEW.organization_id,
      'source', NEW.source,
      'expires_at', NEW.expires_at,
      'metadata', NEW.metadata,
      'emailType', 'invitation'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-service-key', service_key
    ),
    timeout_milliseconds := 5000
  );

  RAISE NOTICE 'Edge function called with request_id: % for invitation %', request_id, NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error calling edge function: %', SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_new_invitation() IS 
  'Calls send-email Edge Function when a new invitation is created. Uses x-service-key for authentication. Includes organization_id for organization member invitations.';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_invitation_insert ON public.invitation;

-- Create trigger on invitation table (singular)
-- Use AFTER INSERT to ensure the record is fully created before sending email
CREATE TRIGGER on_invitation_insert
  AFTER INSERT ON public.invitation
  FOR EACH ROW
  WHEN (NEW.email IS NOT NULL)
  EXECUTE FUNCTION public.notify_new_invitation();

COMMENT ON TRIGGER on_invitation_insert ON public.invitation IS 
  'Triggers email sending when a new invitation with an email is inserted. Runs AFTER INSERT to ensure record is fully created.';
