-- ============================================================================
-- SQL Test Script for Cron Jobs
-- ============================================================================
-- Run this in Supabase SQL Editor or via psql to test cron job setup
-- ============================================================================

-- 1. Check if pg_cron extension is enabled
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
    THEN '✓ pg_cron extension is enabled'
    ELSE '✗ pg_cron extension is NOT enabled'
  END as extension_status;

-- 2. Check if pg_net extension is enabled
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') 
    THEN '✓ pg_net extension is enabled'
    ELSE '✗ pg_net extension is NOT enabled'
  END as extension_status;

-- 3. Check if Vault secrets are configured
SELECT 
  name,
  CASE 
    WHEN decrypted_secret IS NOT NULL THEN '✓ Configured'
    ELSE '✗ Missing'
  END as status
FROM vault.decrypted_secrets 
WHERE name IN ('supabase_functions_url', 'service_role_key')
ORDER BY name;

-- 4. List all scheduled cron jobs
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  LEFT(command, 100) as command_preview
FROM cron.job
WHERE jobname LIKE '%hourly%'
ORDER BY jobname;

-- 5. Check recent cron job executions
SELECT 
  jobid,
  jobname,
  status,
  LEFT(return_message, 100) as return_message_preview,
  start_time,
  end_time,
  end_time - start_time as duration
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;

-- 6. Check pg_net HTTP response logs (recent requests)
SELECT 
  id,
  status_code,
  LEFT(content::text, 100) as response_preview,
  created
FROM net._http_response
ORDER BY created DESC
LIMIT 10;

-- ============================================================================
-- Manual Test: Trigger close-matches function manually
-- ============================================================================
-- Uncomment to manually trigger the close-matches function:
/*
SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url' LIMIT 1) || '/functions/v1/close-matches',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-service-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
  ),
  body := jsonb_build_object('triggered_at', now()::text),
  timeout_milliseconds := 60000
) as request_id;
*/

-- ============================================================================
-- Manual Test: Trigger send-feedback-reminders function manually
-- ============================================================================
-- Uncomment to manually trigger the send-feedback-reminders function:
/*
SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url' LIMIT 1) || '/functions/v1/send-feedback-reminders',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-service-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
  ),
  body := jsonb_build_object('triggered_at', now()::text),
  timeout_milliseconds := 60000
) as request_id;
*/
