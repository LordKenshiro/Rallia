-- Migration: Enable Realtime for Notification Table
-- Description: Adds the notification table to the supabase_realtime publication
--              so that clients can subscribe to INSERT/UPDATE/DELETE events.
-- Created: 2026-01-02

-- ============================================================================
-- ENABLE REALTIME FOR NOTIFICATION TABLE
-- ============================================================================

-- Add notification table to the realtime publication
-- This allows Supabase Realtime to broadcast changes to subscribed clients
ALTER PUBLICATION supabase_realtime ADD TABLE notification;

-- Set replica identity to FULL so that UPDATE and DELETE events include all columns
-- This is needed for the filter `user_id=eq.${userId}` to work on all event types
ALTER TABLE notification REPLICA IDENTITY FULL;

COMMENT ON TABLE notification IS 
  'User notifications with realtime enabled for instant badge updates';

