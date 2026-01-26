-- Check PostgreSQL logs for trigger execution
-- Run this after creating a new invitation to see if the trigger fired

-- First, let's enable more verbose logging temporarily
SET log_min_messages TO NOTICE;

-- Check if there are any recent log entries (if log_statement is enabled)
-- Note: This may not work depending on PostgreSQL logging configuration

-- Better approach: Create a test invitation and watch for NOTICE messages
-- Or check the net.http_request_queue table

-- Check all HTTP requests (not just recent ones)
SELECT 
  id,
  url,
  status_code,
  created,
  LEFT(error_msg, 200) as error_preview,
  LEFT(response_body::text, 200) as response_preview
FROM net.http_request_queue
WHERE url LIKE '%send-email%'
ORDER BY created DESC
LIMIT 20;

-- Check if pg_net extension is working
SELECT * FROM net.http_request_queue LIMIT 1;
