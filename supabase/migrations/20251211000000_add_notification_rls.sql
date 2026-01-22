-- Migration: Add RLS policies for notification table
-- The notification table already exists with the correct schema.
-- This migration adds Row Level Security policies.

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

-- Enable RLS on notification table (note: table may be named 'notification' or 'notifications')
-- Using DO block to handle both cases
DO $$
BEGIN
  -- Try singular first (matches generated types)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification') THEN
    EXECUTE 'ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY';
  END IF;
  
  -- Also try plural (matches remote_schema)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    EXECUTE 'ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Drop existing policies if any (to make migration idempotent)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notification;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notification;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notification;
DROP POLICY IF EXISTS "Service role can manage all notifications" ON notification;

-- Policy: Users can SELECT their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notification
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can UPDATE their own notifications (for marking as read)
CREATE POLICY "Users can update their own notifications"
  ON notification
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can DELETE their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON notification
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Service role can INSERT notifications (for system-generated notifications)
-- Note: service_role bypasses RLS by default, but explicit policy for clarity
CREATE POLICY "Service role can manage all notifications"
  ON notification
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ADDITIONAL INDEX FOR PERFORMANCE
-- ============================================================================

-- Add composite index for unread count queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_notification_user_unread 
  ON notification (user_id) 
  WHERE read_at IS NULL;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS notification_updated_at ON notification;
CREATE TRIGGER notification_updated_at
  BEFORE UPDATE ON notification
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

