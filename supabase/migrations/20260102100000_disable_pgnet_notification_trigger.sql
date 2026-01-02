-- ============================================================================
-- Disable pg_net notification trigger in favor of Database Webhooks
-- ============================================================================
-- The original trigger in 20260101133823_notification_system_v2.sql used pg_net
-- to call the edge function, but it relied on PostgreSQL settings that aren't
-- available in Supabase Cloud environments.
--
-- We now use Supabase Database Webhooks (configured via Dashboard) which:
-- - Automatically handles URL routing per environment
-- - Manages authentication
-- - Works consistently in local, staging, and production
--
-- This migration removes the old trigger to prevent duplicate calls.
-- ============================================================================

-- Drop the pg_net based trigger (Database Webhook will handle this now)
DROP TRIGGER IF EXISTS on_notification_insert ON notification;

-- Drop the function since it's no longer used
DROP FUNCTION IF EXISTS notify_send_notification();

