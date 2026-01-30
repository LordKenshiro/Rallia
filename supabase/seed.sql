-- Seed file for local development
-- Creates a profile for existing auth users and seeds 30 notifications

-- ============================================================================
-- Setup Vault secrets for Edge Functions (required for triggers to work)
-- ============================================================================
-- These secrets are used by database triggers to call Edge Functions with
-- x-service-key custom header authentication (x-service-key: <token>).
--
-- For local development:
--   - supabase_functions_url: Uses host.docker.internal so Postgres container can reach host
--   - service_role_key: The JWT service role key (not the short-form sb_secret_... key)
--
-- The JWT token can be found by running:
--   docker exec supabase_edge_runtime_<project> env | grep SUPABASE_SERVICE_ROLE_KEY
-- ============================================================================
DO $$
DECLARE
  local_service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  local_functions_url TEXT := 'http://host.docker.internal:54321';
  existing_url_id UUID;
  existing_key_id UUID;
BEGIN
  -- Check if secrets already exist
  SELECT id INTO existing_url_id FROM vault.secrets WHERE name = 'supabase_functions_url';
  SELECT id INTO existing_key_id FROM vault.secrets WHERE name = 'service_role_key';

  -- Create or update supabase_functions_url
  IF existing_url_id IS NULL THEN
    PERFORM vault.create_secret(local_functions_url, 'supabase_functions_url');
    RAISE NOTICE 'Created vault secret: supabase_functions_url';
  ELSE
    PERFORM vault.update_secret(existing_url_id, local_functions_url, 'supabase_functions_url');
    RAISE NOTICE 'Updated vault secret: supabase_functions_url';
  END IF;

  -- Create or update service_role_key
  IF existing_key_id IS NULL THEN
    PERFORM vault.create_secret(local_service_role_key, 'service_role_key');
    RAISE NOTICE 'Created vault secret: service_role_key';
  ELSE
    PERFORM vault.update_secret(existing_key_id, local_service_role_key, 'service_role_key');
    RAISE NOTICE 'Updated vault secret: service_role_key';
  END IF;
END $$;

-- Verify vault secrets are configured
SELECT 
  name,
  CASE WHEN decrypted_secret IS NOT NULL THEN '✓ Configured' ELSE '✗ Missing' END as status
FROM vault.decrypted_secrets 
WHERE name IN ('supabase_functions_url', 'service_role_key')
ORDER BY name;

-- ============================================================================
-- Profile and Notification Seeding
-- ============================================================================

-- First, create a profile for the auth user if it doesn't exist
INSERT INTO profile (id, first_name, last_name, email, onboarding_completed)
SELECT 
  id,
  COALESCE(
    raw_user_meta_data->>'first_name',
    SPLIT_PART(COALESCE(raw_user_meta_data->>'full_name', 'Test User'), ' ', 1)
  ),
  COALESCE(
    raw_user_meta_data->>'last_name',
    NULLIF(SPLIT_PART(COALESCE(raw_user_meta_data->>'full_name', ''), ' ', 2), '')
  ),
  email,
  true
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM profile WHERE profile.id = auth.users.id)
ON CONFLICT (id) DO NOTHING;

-- Now seed 30 notifications for the first profile
DO $$
DECLARE
  target_user_id uuid;
  notification_types text[] := ARRAY['match_invitation', 'reminder', 'payment', 'support', 'chat', 'system'];
  notification_type text;
  i integer;
  is_read boolean;
  created_time timestamptz;
BEGIN
  -- Get the first profile ID
  SELECT id INTO target_user_id FROM profile LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'No profile found, skipping notification seeding';
    RETURN;
  END IF;

  -- Clear existing notifications for clean seeding (optional - remove if you want to keep existing)
  DELETE FROM notification WHERE user_id = target_user_id;

  FOR i IN 1..30 LOOP
    -- Cycle through notification types
    notification_type := notification_types[1 + ((i - 1) % 6)];
    
    -- Make some notifications read (about 40%)
    is_read := (i % 5 = 0) OR (i % 7 = 0);
    
    -- Spread notifications over the last 7 days
    created_time := NOW() - ((30 - i) * INTERVAL '5 hours');

    INSERT INTO notification (
      user_id,
      type,
      title,
      body,
      read_at,
      created_at,
      updated_at
    ) VALUES (
      target_user_id,
      notification_type::notification_type_enum,
      CASE notification_type
        WHEN 'match_invitation' THEN 'New Match Invitation #' || i
        WHEN 'reminder' THEN 'Upcoming Match Reminder #' || i
        WHEN 'payment' THEN 'Payment Update #' || i
        WHEN 'support' THEN 'Support Response #' || i
        WHEN 'chat' THEN 'New Message #' || i
        WHEN 'system' THEN 'System Update #' || i
      END,
      CASE notification_type
        WHEN 'match_invitation' THEN 'You''ve been invited to play tennis at Central Park Courts on ' || TO_CHAR(created_time + INTERVAL '2 days', 'Day, Mon DD')
        WHEN 'reminder' THEN 'Don''t forget your match tomorrow at 3:00 PM with your partner!'
        WHEN 'payment' THEN 'Your payment of $25.00 for court booking has been processed successfully.'
        WHEN 'support' THEN 'Our support team has responded to your inquiry about court availability.'
        WHEN 'chat' THEN 'You have a new message from a potential playing partner.'
        WHEN 'system' THEN 'We''ve updated our app with new features. Check out what''s new!'
      END,
      CASE WHEN is_read THEN created_time + INTERVAL '30 minutes' ELSE NULL END,
      created_time,
      created_time
    );
  END LOOP;

  RAISE NOTICE 'Seeded 30 notifications for user %', target_user_id;
END $$;

-- Verify the seed
SELECT 
  type,
  COUNT(*) as count,
  SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) as read_count
FROM notification
GROUP BY type
ORDER BY type;

