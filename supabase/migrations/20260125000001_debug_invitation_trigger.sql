-- ============================================================================
-- Debug and improve invitation trigger with better error handling
-- ============================================================================
-- This migration adds better error handling and logging to help debug
-- why emails might not be sending
-- ============================================================================

-- Update notify_new_invitation function with better error handling
CREATE OR REPLACE FUNCTION public.notify_new_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
  functions_url TEXT;
  service_key TEXT;
  error_msg TEXT;
BEGIN
  -- Skip if no email (email is required for sending invitations)
  IF NEW.email IS NULL THEN
    RAISE NOTICE 'Skipping email trigger for invitation %: no email address', NEW.id;
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

  -- Check if secrets are missing
  IF functions_url IS NULL THEN
    RAISE WARNING 'Cannot send invitation email: supabase_functions_url secret not found in Vault';
    RETURN NEW;
  END IF;

  IF service_key IS NULL THEN
    RAISE WARNING 'Cannot send invitation email: service_role_key secret not found in Vault';
    RETURN NEW;
  END IF;

  -- Log the attempt
  RAISE NOTICE 'Triggering email for invitation % to % (org: %)', NEW.id, NEW.email, COALESCE(NEW.organization_id::text, 'none');

  -- Call send-email Edge Function with x-service-key authentication
  -- Include organization_id for organization member invitations
  BEGIN
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
      timeout_milliseconds := 10000
    );

    RAISE NOTICE 'Edge function called successfully with request_id: % for invitation %', request_id, NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      error_msg := SQLERRM;
      RAISE WARNING 'Error calling edge function for invitation %: %', NEW.id, error_msg;
      -- Log the full error details
      RAISE WARNING 'Functions URL: %, Service Key present: %', 
        COALESCE(functions_url, 'NULL'), 
        CASE WHEN service_key IS NOT NULL THEN 'YES' ELSE 'NO' END;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_new_invitation() IS 
  'Calls send-email Edge Function when a new invitation is created. Uses x-service-key for authentication. Includes organization_id for organization member invitations.';
