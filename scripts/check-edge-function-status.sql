-- Check the status of HTTP requests made by the trigger
-- pg_net stores requests and responses separately

-- Check HTTP requests (what was sent)
SELECT 
  id,
  method,
  url,
  headers,
  LEFT(body::text, 200) as body_preview,
  created
FROM net._http_request
WHERE created > NOW() - INTERVAL '10 minutes'
  AND url LIKE '%send-email%'
ORDER BY created DESC
LIMIT 5;

-- Check HTTP responses (what was received)
SELECT 
  id,
  request_id,
  status_code,
  headers,
  LEFT(content::text, 500) as response_preview,
  error_msg,
  created
FROM net._http_response
WHERE created > NOW() - INTERVAL '10 minutes'
ORDER BY created DESC
LIMIT 5;

-- Match requests with responses
SELECT 
  r.id as request_id,
  r.url,
  r.created as request_time,
  resp.status_code,
  resp.error_msg,
  LEFT(resp.content::text, 200) as response_preview,
  resp.created as response_time
FROM net._http_request r
LEFT JOIN net._http_response resp ON resp.request_id = r.id
WHERE r.created > NOW() - INTERVAL '10 minutes'
  AND r.url LIKE '%send-email%'
ORDER BY r.created DESC
LIMIT 5;
