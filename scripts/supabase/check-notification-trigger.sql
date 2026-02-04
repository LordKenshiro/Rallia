-- ============================================================================
-- Why are there no delivery_attempt rows?
-- ============================================================================
-- Every processed notification should create at least 3 delivery_attempt rows
-- (one per channel: email, push, sms). If you have none, the send-notification
-- Edge Function is never successfully run. Common causes:
--
-- 1. Vault secrets missing: the trigger needs supabase_functions_url AND anon_key
--    in vault. If either is NULL, the trigger skips the HTTP call (see below).
-- 2. Seed not run: anon_key is only seeded in seed.sql, which runs on
--    "supabase db reset". If you only ran migrations, run: supabase db reset
--    (or add anon_key manually via scripts/supabase/setup-vault-secrets.sql).
-- 3. Functions URL unreachable: locally use http://host.docker.internal:54321
--    and ensure "supabase functions serve" is running when testing.
-- ============================================================================

-- 1) Check vault secrets (trigger bails out if either is NULL)
SELECT
  name,
  CASE WHEN decrypted_secret IS NOT NULL THEN 'OK' ELSE 'MISSING' END AS status
FROM vault.decrypted_secrets
WHERE name IN ('supabase_functions_url', 'anon_key')
ORDER BY name;

-- 2) Confirm trigger exists
SELECT tgname AS trigger_name, tgenabled AS enabled
FROM pg_trigger
WHERE tgrelid = 'public.notification'::regclass
  AND tgname = 'on_notification_insert';

-- 3) Count recent notifications vs delivery attempts (should see attempts if trigger works)
SELECT
  (SELECT COUNT(*) FROM notification n WHERE n.created_at > NOW() - INTERVAL '7 days') AS notifications_last_7d,
  (SELECT COUNT(*) FROM delivery_attempt da WHERE da.created_at > NOW() - INTERVAL '7 days') AS delivery_attempts_last_7d;
