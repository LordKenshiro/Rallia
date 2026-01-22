-- ============================================================================
-- Setup pg_cron jobs for Edge Function scheduling
-- ============================================================================
-- Schedules hourly calls to:
-- - close-matches (processes matches 48+ hours after end time)
-- - send-feedback-reminders (sends feedback notifications to participants)
--
-- Prerequisites (must be configured in Vault per environment):
-- - supabase_functions_url: Base URL for Edge Functions
--   - Local: http://host.docker.internal:54321
--   - Staging: https://ahbaeewecdeguxtxtvhr.supabase.co
--   - Production: https://bvfszzxkrsbojwpfromf.supabase.co
-- - service_role_key: Service role key for authentication
-- ============================================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Remove existing jobs if they exist (for idempotency)
SELECT cron.unschedule('close-matches-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'close-matches-hourly'
);
SELECT cron.unschedule('send-feedback-reminders-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-feedback-reminders-hourly'
);

-- Schedule close-matches job (every hour at minute 0)
SELECT cron.schedule(
  'close-matches-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url' LIMIT 1) || '/functions/v1/close-matches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-service-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := jsonb_build_object('triggered_at', now()::text),
    timeout_milliseconds := 60000
  );
  $$
);

-- Schedule send-feedback-reminders job (every hour at minute 5, staggered)
SELECT cron.schedule(
  'send-feedback-reminders-hourly',
  '5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url' LIMIT 1) || '/functions/v1/send-feedback-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-service-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := jsonb_build_object('triggered_at', now()::text),
    timeout_milliseconds := 60000
  );
  $$
);
