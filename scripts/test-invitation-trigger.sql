-- ============================================================================
-- Test script for invitation email trigger
-- ============================================================================
-- This script helps debug the invitation email trigger by:
-- 1. Checking if vault secrets are configured
-- 2. Checking if the trigger exists
-- 3. Testing the trigger function manually
-- ============================================================================

-- Check 1: Verify vault secrets exist
SELECT 
  name,
  CASE 
    WHEN decrypted_secret IS NOT NULL THEN '✓ Configured'
    ELSE '✗ Missing'
  END as status,
  CASE 
    WHEN name = 'supabase_functions_url' THEN LEFT(decrypted_secret, 50) || '...'
    WHEN name = 'service_role_key' THEN LEFT(decrypted_secret, 20) || '...'
    ELSE 'N/A'
  END as preview
FROM vault.decrypted_secrets 
WHERE name IN ('supabase_functions_url', 'service_role_key')
ORDER BY name;

-- Check 2: Verify trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  CASE 
    WHEN tgtype & 2 = 2 THEN 'BEFORE'
    WHEN tgtype & 64 = 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as timing,
  CASE 
    WHEN tgtype & 4 = 4 THEN 'INSERT'
    WHEN tgtype & 8 = 8 THEN 'DELETE'
    WHEN tgtype & 16 = 16 THEN 'UPDATE'
    ELSE 'UNKNOWN'
  END as event
FROM pg_trigger
WHERE tgname = 'on_invitation_insert';

-- Check 3: Verify function exists
SELECT 
  proname as function_name,
  prosrc as source_code_preview
FROM pg_proc
WHERE proname = 'notify_new_invitation'
LIMIT 1;

-- Check 4: Test the trigger function manually (requires a test invitation)
-- Uncomment and modify the invitation ID to test:
/*
DO $$
DECLARE
  test_invitation_id UUID := 'YOUR_INVITATION_ID_HERE';
  test_record RECORD;
BEGIN
  -- Get a test invitation
  SELECT * INTO test_record
  FROM invitation
  WHERE id = test_invitation_id
  LIMIT 1;

  IF test_record IS NULL THEN
    RAISE NOTICE 'No invitation found with ID: %', test_invitation_id;
    RETURN;
  END IF;

  RAISE NOTICE 'Testing trigger function with invitation: %', test_invitation_id;
  RAISE NOTICE 'Email: %, Organization: %', test_record.email, test_record.organization_id;

  -- This would normally be called by the trigger
  -- We can't directly test it without creating a new record, but we can check
  -- if the function compiles correctly
  RAISE NOTICE 'Function exists and should be callable';
END $$;
*/

-- Check 5: View recent invitation inserts (to see if trigger fired)
SELECT 
  id,
  email,
  organization_id,
  role,
  status,
  created_at,
  -- Check if there are any related delivery attempts
  (SELECT COUNT(*) FROM delivery_attempt WHERE invitation_id = invitation.id) as delivery_attempts
FROM invitation
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- Check 6: View recent pg_net requests (to see if HTTP calls were made)
SELECT 
  id,
  url,
  status_code,
  created,
  error_msg
FROM net.http_request_queue
WHERE created > NOW() - INTERVAL '1 hour'
  AND url LIKE '%/send-email%'
ORDER BY created DESC
LIMIT 10;
