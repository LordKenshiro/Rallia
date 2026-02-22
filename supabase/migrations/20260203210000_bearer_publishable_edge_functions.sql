-- ============================================================================
-- Migrate Edge Function triggers and cron to Bearer auth with publishable key
-- ============================================================================
-- Updates all database triggers and cron jobs that call Edge Functions to use
-- standard Authorization: Bearer header with the anon (publishable) key from
-- vault. Edge functions validate Bearer against SUPABASE_ANON_KEY.
--
-- Prerequisite: vault secret 'anon_key' must be set (e.g. via seed for local,
-- or Supabase Dashboard / API for production).
-- ============================================================================

-- =============================================================================
-- 1. Update notify_new_invitation function
-- =============================================================================
CREATE OR REPLACE FUNCTION public.notify_new_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
  functions_url TEXT;
  anon_key TEXT;
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
  
  SELECT decrypted_secret INTO anon_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'anon_key' 
  LIMIT 1;

  -- Check if secrets are missing
  IF functions_url IS NULL THEN
    RAISE WARNING 'Cannot send invitation email: supabase_functions_url secret not found in Vault';
    RETURN NEW;
  END IF;

  IF anon_key IS NULL THEN
    RAISE WARNING 'Cannot send invitation email: anon_key secret not found in Vault';
    RETURN NEW;
  END IF;

  -- Log the attempt
  RAISE NOTICE 'Triggering email for invitation % to % (org: %)', NEW.id, NEW.email, COALESCE(NEW.organization_id::text, 'none');

  -- Call send-email Edge Function with Bearer auth (publishable key)
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
        'Authorization', 'Bearer ' || anon_key
      ),
      timeout_milliseconds := 10000
    );

    RAISE NOTICE 'Edge function called successfully with request_id: % for invitation %', request_id, NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      error_msg := SQLERRM;
      RAISE WARNING 'Error calling edge function for invitation %: %', NEW.id, error_msg;
      RAISE WARNING 'Functions URL: %, Anon key present: %', 
        COALESCE(functions_url, 'NULL'), 
        CASE WHEN anon_key IS NOT NULL THEN 'YES' ELSE 'NO' END;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_new_invitation() IS 
  'Calls send-email Edge Function when a new invitation is created. Uses Bearer auth with publishable (anon) key.';

-- =============================================================================
-- 2. Update notify_send_notification function
-- =============================================================================
CREATE OR REPLACE FUNCTION public.notify_send_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
  functions_url TEXT;
  anon_key TEXT;
BEGIN
  -- Get the functions URL from vault
  SELECT decrypted_secret INTO functions_url 
  FROM vault.decrypted_secrets 
  WHERE name = 'supabase_functions_url' 
  LIMIT 1;
  
  -- Get the anon (publishable) key from vault
  SELECT decrypted_secret INTO anon_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'anon_key' 
  LIMIT 1;
  
  -- Check if secrets are available
  IF functions_url IS NULL OR anon_key IS NULL THEN
    RAISE WARNING 'Cannot dispatch notification: Vault secrets not configured (functions_url: %, anon_key: %)',
      CASE WHEN functions_url IS NULL THEN 'missing' ELSE 'ok' END,
      CASE WHEN anon_key IS NULL THEN 'missing' ELSE 'ok' END;
    RETURN NEW;
  END IF;

  -- Call the Edge Function using pg_net with Bearer auth (publishable key)
  SELECT INTO request_id net.http_post(
    url := functions_url || '/functions/v1/send-notification',
    body := jsonb_build_object('type', 'INSERT', 'table', 'notification', 'record', row_to_json(NEW)::jsonb),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    timeout_milliseconds := 5000
  );
  
  RAISE NOTICE 'Triggered notification dispatch for % with request_id %', NEW.id, request_id;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to trigger notification dispatch: %', SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_send_notification() IS 
  'Trigger function that calls the send-notification Edge Function when a notification is inserted. Uses Bearer auth with publishable (anon) key.';

-- =============================================================================
-- 3. Update cron job: close-matches-hourly
-- =============================================================================
SELECT cron.unschedule('close-matches-hourly');

SELECT cron.schedule(
  'close-matches-hourly',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url' LIMIT 1) || '/functions/v1/close-matches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- =============================================================================
-- 4. Update cron job: send-feedback-reminders-hourly
-- =============================================================================
SELECT cron.unschedule('send-feedback-reminders-hourly');

SELECT cron.schedule(
  'send-feedback-reminders-hourly',
  '30 * * * *',  -- Every hour at minute 30
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url' LIMIT 1) || '/functions/v1/send-feedback-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migrated Edge Function triggers and cron to Bearer auth with publishable (anon) key';
END $$;
