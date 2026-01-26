-- ============================================================================
-- Test: Create an invitation and check if trigger fires
-- ============================================================================
-- This script creates a test invitation and immediately checks if the trigger
-- fired and made an HTTP request
-- ============================================================================

-- First, get a test user ID (inviter)
DO $$
DECLARE
  test_inviter_id UUID;
  test_org_id UUID;
  test_invitation_id UUID;
  http_request_count INT;
BEGIN
  -- Get a test inviter (any user will do)
  SELECT id INTO test_inviter_id
  FROM profile
  LIMIT 1;

  IF test_inviter_id IS NULL THEN
    RAISE NOTICE 'No users found in profile table';
    RETURN;
  END IF;

  -- Get a test organization
  SELECT id INTO test_org_id
  FROM organization
  LIMIT 1;

  IF test_org_id IS NULL THEN
    RAISE NOTICE 'No organizations found';
    RETURN;
  END IF;

  RAISE NOTICE 'Using inviter: %, organization: %', test_inviter_id, test_org_id;

  -- Count HTTP responses before (pg_net uses net._http_response)
  BEGIN
    SELECT COUNT(*) INTO http_request_count
    FROM net._http_response
    WHERE created > NOW() - INTERVAL '1 minute';
  EXCEPTION
    WHEN OTHERS THEN
      http_request_count := 0;
      RAISE NOTICE 'Could not count HTTP responses: %', SQLERRM;
  END;

  RAISE NOTICE 'HTTP responses before: %', http_request_count;

  -- Create a test invitation
  INSERT INTO invitation (
    email,
    role,
    organization_id,
    token,
    inviter_id,
    expires_at,
    metadata,
    source,
    status
  ) VALUES (
    'test-trigger-' || gen_random_uuid()::text || '@example.com',
    'organization_member',
    test_org_id,
    'test-token-' || gen_random_uuid()::text,
    test_inviter_id,
    NOW() + INTERVAL '7 days',
    '{"org_role": "staff"}'::jsonb,
    'manual',
    'pending'
  )
  RETURNING id INTO test_invitation_id;

  RAISE NOTICE 'Created test invitation: %', test_invitation_id;

  -- Wait a moment for the trigger to execute
  PERFORM pg_sleep(2);

  -- Count HTTP responses after
  BEGIN
    SELECT COUNT(*) INTO http_request_count
    FROM net._http_response
    WHERE created > NOW() - INTERVAL '1 minute';
  EXCEPTION
    WHEN OTHERS THEN
      http_request_count := 0;
  END;

  RAISE NOTICE 'HTTP responses after: %', http_request_count;

  IF http_request_count > 0 THEN
    RAISE NOTICE '✅ Trigger may have fired! Check the response details below.';
  ELSE
    RAISE WARNING '❌ No new HTTP responses found - trigger may not have fired';
    RAISE NOTICE 'Check PostgreSQL logs for NOTICE/WARNING messages from the trigger function';
  END IF;

  -- Clean up test invitation
  DELETE FROM invitation WHERE id = test_invitation_id;
  RAISE NOTICE 'Cleaned up test invitation';
END $$;

-- Check pg_net HTTP responses (this is the actual table pg_net uses)
SELECT 
  id,
  status_code,
  LEFT(content::text, 200) as response_preview,
  created
FROM net._http_response
WHERE created > NOW() - INTERVAL '5 minutes'
ORDER BY created DESC
LIMIT 10;
