-- Setup Database Webhook for Automatic Profile Creation
-- This needs to be run with elevated permissions in Supabase Dashboard SQL Editor

-- Note: Database webhooks in Supabase are configured through the pg_net extension
-- However, the easiest way is through the Dashboard UI (Database → Webhooks)

-- For reference, here's what the webhook should look like:
/*
Webhook Configuration:
----------------------
Name: create-profile-on-signup
Table: auth.users
Events: INSERT
Type: HTTP Request
Method: POST
URL: https://ahbaeewecdeguxtxtvhr.supabase.co/functions/v1/create-profile-on-signup
Headers:
  Authorization: Bearer <YOUR_ANON_KEY>

How it works:
1. User signs up → auth.users INSERT
2. Webhook triggers → calls edge function
3. Edge function creates profile record
4. Profile exists before onboarding starts
5. UPSERT in savePersonalInfo acts as backup
*/

-- To verify the webhook is working after setup:
-- 1. Sign up a new test user
-- 2. Check the profile table:
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.created_at,
  u.email as auth_email,
  u.created_at as user_created_at
FROM profile p
INNER JOIN auth.users u ON u.id = p.id
WHERE p.email = 'your-test-email@example.com';

-- Profile should exist immediately after signup with:
-- - id: matches user id
-- - email: from auth.users
-- - full_name: NULL (filled during onboarding)
-- - created_at: set to user signup time
