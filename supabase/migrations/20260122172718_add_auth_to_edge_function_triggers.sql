-- ============================================================================
-- Add x-service-key authentication to Edge Function triggers
-- ============================================================================
-- Updates trigger functions to include service role key authentication
-- when calling Edge Functions via pg_net.
--
-- This replaces the Database Webhook approach with pg_net triggers so that
-- everything is defined in code and version controlled.
--
-- Prerequisites:
-- - service_role_key must be stored in Vault (see 20260122162623_setup_cron_jobs.sql)
-- - supabase_functions_url must be stored in Vault
-- ============================================================================

-- Recreate notify_send_notification with x-service-key authentication
-- (was previously dropped in favor of Database Webhook, now restored)
CREATE OR REPLACE FUNCTION notify_send_notification()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  functions_url TEXT;
  service_key TEXT;
BEGIN
  -- Skip if notification is scheduled for the future
  IF NEW.scheduled_at IS NOT NULL AND NEW.scheduled_at > NOW() THEN
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

  -- Build the payload
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'notification',
    'record', jsonb_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'type', NEW.type,
      'target_id', NEW.target_id,
      'title', NEW.title,
      'body', NEW.body,
      'payload', NEW.payload,
      'priority', NEW.priority,
      'scheduled_at', NEW.scheduled_at,
      'expires_at', NEW.expires_at,
      'read_at', NEW.read_at,
      'created_at', NEW.created_at,
      'updated_at', NEW.updated_at
    )
  );

  -- Call the Edge Function using pg_net with x-service-key authentication
  PERFORM net.http_post(
    url := functions_url || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-service-key', service_key
    ),
    body := payload,
    timeout_milliseconds := 30000
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to trigger notification dispatch: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_send_notification() IS 
  'Trigger function that calls the send-notification Edge Function when a notification is inserted. Uses x-service-key for authentication.';

-- Create the trigger (replaces Database Webhook)
DROP TRIGGER IF EXISTS on_notification_insert ON notification;
CREATE TRIGGER on_notification_insert
  AFTER INSERT ON notification
  FOR EACH ROW
  EXECUTE FUNCTION notify_send_notification();


-- Update notify_new_invitation to use x-service-key header
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

  RAISE NOTICE 'Edge function called with request_id: %', request_id;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error calling edge function: %', SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_new_invitation() IS 
  'Calls send-email Edge Function when a new invitation is created. Uses x-service-key for authentication.';
