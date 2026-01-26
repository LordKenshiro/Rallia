-- ============================================================================
-- Setup Vault secrets for Edge Function triggers
-- ============================================================================
-- Run this script to set up the required Vault secrets for database triggers
-- to call Edge Functions (invitation emails, notifications, etc.).
--
-- IMPORTANT: These are automatically configured in seed.sql during db reset.
-- This script is only needed if you need to manually fix/update the secrets.
--
-- For LOCAL development:
--   - supabase_functions_url: http://host.docker.internal:54321
--     (NOT 127.0.0.1 - Postgres runs in Docker and needs to reach the host)
--   - service_role_key: MUST be the full JWT token, NOT the short-form sb_secret_... key
--     Get the JWT from: docker exec supabase_edge_runtime_<project> env | grep SERVICE_ROLE
--
-- For PRODUCTION/STAGING:
--   - supabase_functions_url: Your Supabase project URL (https://xxx.supabase.co)
--   - service_role_key: Your service role JWT from Supabase dashboard
-- ============================================================================

-- Check current secrets status
SELECT 
  name,
  CASE 
    WHEN decrypted_secret IS NOT NULL THEN 'Configured'
    ELSE 'Missing - needs setup'
  END as status,
  CASE 
    WHEN name = 'supabase_functions_url' THEN LEFT(decrypted_secret, 50)
    WHEN name = 'service_role_key' THEN 
      CASE 
        WHEN decrypted_secret LIKE 'eyJ%' THEN 'JWT token (correct format)'
        WHEN decrypted_secret LIKE 'sb_%' THEN 'Short-form key (WRONG format!)'
        ELSE LEFT(decrypted_secret, 20)
      END
    ELSE 'N/A'
  END as value_info
FROM vault.decrypted_secrets 
WHERE name IN ('supabase_functions_url', 'service_role_key')
ORDER BY name;

-- ============================================================================
-- LOCAL DEVELOPMENT SETUP
-- ============================================================================
-- The standard local Supabase JWT service role key (demo mode):
-- eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
--
-- Uncomment to CREATE secrets (if they don't exist):
/*
SELECT vault.create_secret('http://host.docker.internal:54321', 'supabase_functions_url');
SELECT vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU', 'service_role_key');
*/

-- Uncomment to UPDATE existing secrets (if they exist but have wrong values):
/*
SELECT vault.update_secret(
  (SELECT id FROM vault.secrets WHERE name = 'supabase_functions_url'),
  'http://host.docker.internal:54321',
  'supabase_functions_url'
);

SELECT vault.update_secret(
  (SELECT id FROM vault.secrets WHERE name = 'service_role_key'),
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  'service_role_key'
);
*/

-- ============================================================================
-- PRODUCTION SETUP (example - replace with your actual values)
-- ============================================================================
/*
SELECT vault.update_secret(
  (SELECT id FROM vault.secrets WHERE name = 'supabase_functions_url'),
  'https://your-project-ref.supabase.co',
  'supabase_functions_url'
);

SELECT vault.update_secret(
  (SELECT id FROM vault.secrets WHERE name = 'service_role_key'),
  'your-production-service-role-jwt',
  'service_role_key'
);
*/
