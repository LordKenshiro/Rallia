-- Check edge function configuration
SELECT 
  name,
  LEFT(decrypted_secret, 80) as secret_preview,
  LENGTH(decrypted_secret) as secret_length
FROM vault.decrypted_secrets 
WHERE name IN ('supabase_functions_url', 'service_role_key')
ORDER BY name;

-- Test if we can reach the edge function URL
DO $$
DECLARE
  functions_url TEXT;
  service_key TEXT;
  test_request_id BIGINT;
BEGIN
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
    RAISE NOTICE '❌ supabase_functions_url is NULL';
    RETURN;
  END IF;

  RAISE NOTICE 'Testing edge function URL: %', functions_url;
  RAISE NOTICE 'Full URL will be: %/functions/v1/send-email', functions_url;

  -- Try to make a test request
  BEGIN
    SELECT INTO test_request_id net.http_post(
      url := functions_url || '/functions/v1/send-email',
      body := jsonb_build_object('test', true),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, 'test-key')
      ),
      timeout_milliseconds := 5000
    );
    
    RAISE NOTICE '✅ Test request sent! Request ID: %', test_request_id;
    RAISE NOTICE 'Check if edge function is running at: %/functions/v1/send-email', functions_url;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '❌ Error making test request: %', SQLERRM;
  END;
END $$;
