-- ============================================================================
-- Manually test the invitation trigger function
-- ============================================================================
-- This script tests the trigger function directly to see if it's working
-- ============================================================================

-- First, let's check the most recent invitation
SELECT 
  id,
  email,
  organization_id,
  role,
  status,
  created_at
FROM invitation
WHERE email IS NOT NULL
ORDER BY created_at DESC
LIMIT 1;

-- Now let's manually call the trigger function with a test record
-- We'll use the most recent invitation's data
DO $$
DECLARE
  test_invitation RECORD;
  functions_url TEXT;
  service_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get the most recent invitation
  SELECT * INTO test_invitation
  FROM invitation
  WHERE email IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF test_invitation IS NULL THEN
    RAISE NOTICE 'No invitation found to test';
    RETURN;
  END IF;

  RAISE NOTICE 'Testing with invitation: %', test_invitation.id;
  RAISE NOTICE 'Email: %', test_invitation.email;

  -- Get secrets
  SELECT decrypted_secret INTO functions_url 
  FROM vault.decrypted_secrets 
  WHERE name = 'supabase_functions_url' 
  LIMIT 1;
  
  SELECT decrypted_secret INTO service_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'service_role_key' 
  LIMIT 1;

  IF functions_url IS NULL THEN
    RAISE WARNING 'supabase_functions_url is NULL';
    RETURN;
  END IF;

  IF service_key IS NULL THEN
    RAISE WARNING 'service_role_key is NULL';
    RETURN;
  END IF;

  RAISE NOTICE 'Functions URL: %', functions_url;
  RAISE NOTICE 'Service key present: %', CASE WHEN service_key IS NOT NULL THEN 'YES' ELSE 'NO' END;

  -- Try to call the edge function manually
  BEGIN
    SELECT INTO request_id net.http_post(
      url := functions_url || '/functions/v1/send-email',
      body := jsonb_build_object(
        'id', test_invitation.id,
        'email', test_invitation.email,
        'phone', test_invitation.phone,
        'role', test_invitation.role,
        'admin_role', test_invitation.admin_role,
        'token', test_invitation.token,
        'status', test_invitation.status,
        'inviter_id', test_invitation.inviter_id,
        'invited_user_id', test_invitation.invited_user_id,
        'organization_id', test_invitation.organization_id,
        'source', test_invitation.source,
        'expires_at', test_invitation.expires_at,
        'metadata', test_invitation.metadata,
        'emailType', 'invitation'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      timeout_milliseconds := 10000
    );

    RAISE NOTICE '✅ HTTP request sent successfully! Request ID: %', request_id;
    
    -- Check if it's in the queue
    PERFORM pg_sleep(1);
    
    SELECT 
      id,
      url,
      status_code,
      created,
      error_msg
    INTO STRICT request_id, functions_url, service_key, request_id, functions_url
    FROM net.http_request_queue
    WHERE id = request_id
    LIMIT 1;
    
    RAISE NOTICE 'Request found in queue with status: %', service_key;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '❌ Error calling HTTP function: %', SQLERRM;
      RAISE WARNING 'Error details: %', SQLSTATE;
  END;
END $$;

-- Check recent HTTP requests after the test
SELECT 
  id,
  url,
  status_code,
  created,
  LEFT(error_msg, 200) as error_preview
FROM net.http_request_queue
WHERE created > NOW() - INTERVAL '5 minutes'
  AND (url LIKE '%/send-email%' OR url LIKE '%/functions/v1/send-email%')
ORDER BY created DESC
LIMIT 10;
