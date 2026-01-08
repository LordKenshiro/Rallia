-- Migration: Notification System V2
-- Description: Adds notification preferences, expands notification types, and adds delivery tracking enhancements
-- Created: 2026-01-01

-- ============================================================================
-- PART 1: EXPAND NOTIFICATION TYPE ENUM
-- ============================================================================

-- Add new notification types for match lifecycle and other events
-- Note: ALTER TYPE ADD VALUE cannot be run inside a transaction block in some cases,
-- but Supabase migrations handle this correctly

ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'match_join_request';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'match_join_accepted';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'match_join_rejected';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'match_player_joined';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'match_cancelled';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'match_updated';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'match_starting_soon';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'match_completed';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'player_kicked';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'player_left';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'new_message';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'friend_request';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'rating_verified';

-- ============================================================================
-- PART 2: EXPAND DELIVERY STATUS ENUM
-- ============================================================================

-- Add status values for tracking skipped deliveries
ALTER TYPE delivery_status_enum ADD VALUE IF NOT EXISTS 'skipped_preference';
ALTER TYPE delivery_status_enum ADD VALUE IF NOT EXISTS 'skipped_missing_contact';

-- ============================================================================
-- PART 3: ADD PRIORITY ENUM AND COLUMN TO NOTIFICATION
-- ============================================================================

-- Create priority enum
DO $$ BEGIN
  CREATE TYPE notification_priority_enum AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add priority column to notification table
ALTER TABLE notification 
  ADD COLUMN IF NOT EXISTS priority notification_priority_enum DEFAULT 'normal';

-- Add scheduled_at for delayed/scheduled notifications
ALTER TABLE notification 
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- ============================================================================
-- PART 4: CREATE NOTIFICATION PREFERENCE TABLE
-- ============================================================================

-- Stores user preferences per notification type and channel
-- Uses sparse storage: only explicit user customizations are stored
-- Missing rows fall back to application-level defaults

CREATE TABLE IF NOT EXISTS notification_preference (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
    notification_type notification_type_enum NOT NULL,
    channel delivery_channel_enum NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique constraint: one preference per user/type/channel combination
    CONSTRAINT uq_notification_preference UNIQUE (user_id, notification_type, channel)
);

-- Index for efficient preference lookups
CREATE INDEX IF NOT EXISTS idx_notification_preference_user 
  ON notification_preference(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preference_user_type 
  ON notification_preference(user_id, notification_type);

-- ============================================================================
-- PART 5: ADD PUSH TOKEN TO PLAYER TABLE
-- ============================================================================

-- Store Expo push token for push notifications
ALTER TABLE player 
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Global push notification toggle (for quick disable of all push)
ALTER TABLE player 
  ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT TRUE;

-- Index for finding players with valid push tokens
CREATE INDEX IF NOT EXISTS idx_player_push_token 
  ON player(expo_push_token) 
  WHERE expo_push_token IS NOT NULL;

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY FOR NOTIFICATION_PREFERENCE
-- ============================================================================

ALTER TABLE notification_preference ENABLE ROW LEVEL SECURITY;

-- Users can only view their own preferences
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preference FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can create their own notification preferences"
  ON notification_preference FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own notification preferences"
  ON notification_preference FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete their own notification preferences"
  ON notification_preference FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PART 7: UPDATED_AT TRIGGER FOR NOTIFICATION_PREFERENCE
-- ============================================================================

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_notification_preference_updated_at
  BEFORE UPDATE ON notification_preference
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 8: INDEX IMPROVEMENTS FOR NOTIFICATION TABLE
-- ============================================================================

-- Index for scheduled notifications (for batch processing)
CREATE INDEX IF NOT EXISTS idx_notification_scheduled 
  ON notification(scheduled_at) 
  WHERE scheduled_at IS NOT NULL;

-- Index for priority-based processing
CREATE INDEX IF NOT EXISTS idx_notification_priority 
  ON notification(priority, created_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE notification_preference IS 
  'Stores user notification preferences per type and channel. Uses sparse storage where missing rows use application defaults.';

COMMENT ON COLUMN notification_preference.notification_type IS 
  'The type of notification this preference applies to';

COMMENT ON COLUMN notification_preference.channel IS 
  'The delivery channel (email, push, sms) this preference applies to';

COMMENT ON COLUMN notification_preference.enabled IS 
  'Whether this notification type should be delivered via this channel';

COMMENT ON COLUMN notification.priority IS 
  'Priority level affecting delivery timing: urgent=immediate all channels, high=immediate, normal=standard, low=batched';

COMMENT ON COLUMN notification.scheduled_at IS 
  'When to deliver this notification. NULL means deliver immediately.';

COMMENT ON COLUMN player.expo_push_token IS 
  'Expo Push Notification token for sending push notifications to this player';

COMMENT ON COLUMN player.push_notifications_enabled IS 
  'Global toggle for push notifications. When false, no push notifications are sent regardless of preferences.';

-- ============================================================================
-- PART 9: DATABASE TRIGGER FOR NOTIFICATION DISPATCH
-- ============================================================================

-- Function to call the send-notification Edge Function
-- This is triggered after a notification is inserted
CREATE OR REPLACE FUNCTION notify_send_notification()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  edge_function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Skip if notification is scheduled for the future
  IF NEW.scheduled_at IS NOT NULL AND NEW.scheduled_at > NOW() THEN
    RETURN NEW;
  END IF;

  -- Build the payload
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'notification',
    'record', jsonb_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'type', NEW.type,
      'target_id', NEW.target_id,
      'title', NEW.title,
      'body', NEW.body,
      'payload', NEW.payload,
      'priority', NEW.priority,
      'scheduled_at', NEW.scheduled_at,
      'expires_at', NEW.expires_at,
      'read_at', NEW.read_at,
      'created_at', NEW.created_at,
      'updated_at', NEW.updated_at
    )
  );

  -- Call the Edge Function using pg_net extension
  -- Note: pg_net must be enabled in your Supabase project
  PERFORM net.http_post(
    url := COALESCE(
      current_setting('app.supabase_functions_url', true),
      'https://' || current_setting('request.headers', true)::json->>'host' || '/functions/v1'
    ) || '/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        current_setting('app.supabase_service_role_key', true),
        current_setting('supabase.service_role_key', true),
        ''
      )
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to trigger notification dispatch: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_notification_insert ON notification;
CREATE TRIGGER on_notification_insert
  AFTER INSERT ON notification
  FOR EACH ROW
  EXECUTE FUNCTION notify_send_notification();

COMMENT ON FUNCTION notify_send_notification() IS 
  'Trigger function that calls the send-notification Edge Function when a notification is inserted';


-- Add INSERT policy for authenticated users to create notifications
-- This allows the notification factory to create notifications from client-side code
CREATE POLICY "Authenticated users can create notifications"
  ON notification
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to insert a notification (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION insert_notification(
  p_user_id UUID,
  p_type TEXT,
  p_target_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT 'Notification',
  p_body TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}',
  p_priority TEXT DEFAULT 'normal',
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS notification
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result notification;
BEGIN
  INSERT INTO notification (
    user_id, type, target_id, title, body, payload, priority, scheduled_at, expires_at
  ) VALUES (
    p_user_id, p_type::notification_type_enum, p_target_id, p_title, p_body, p_payload, p_priority::notification_priority_enum, p_scheduled_at, p_expires_at
  )
  RETURNING * INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_notification TO authenticated;
GRANT EXECUTE ON FUNCTION insert_notification TO anon;

-- Function to batch insert notifications (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION insert_notifications(
  p_notifications JSONB
)
RETURNS SETOF notification
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO notification (
    user_id, type, target_id, title, body, payload, priority, scheduled_at, expires_at
  )
  SELECT 
    (n->>'user_id')::UUID,
    (n->>'type')::notification_type_enum,
    (n->>'target_id')::UUID,
    COALESCE(n->>'title', 'Notification'),
    n->>'body',
    COALESCE((n->'payload')::JSONB, '{}'),
    COALESCE((n->>'priority')::notification_priority_enum, 'normal'),
    (n->>'scheduled_at')::TIMESTAMPTZ,
    (n->>'expires_at')::TIMESTAMPTZ
  FROM jsonb_array_elements(p_notifications) AS n
  RETURNING *;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION insert_notifications TO anon;

-- ============================================================================
-- PART 10: ADD PREFERRED LOCALE TO PROFILE
-- ============================================================================

-- Create locale enum if not exists
DO $$ BEGIN
  CREATE TYPE locale_enum AS ENUM ('en-US', 'en-CA', 'fr-CA', 'fr-FR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add preferred_locale column to profile table
ALTER TABLE profile 
  ADD COLUMN IF NOT EXISTS preferred_locale locale_enum DEFAULT 'en-US';

-- Index for efficient locale lookups
CREATE INDEX IF NOT EXISTS idx_profile_preferred_locale 
  ON profile(preferred_locale);

COMMENT ON COLUMN profile.preferred_locale IS 
  'User preferred locale for notifications and communications. Synced from client settings.';