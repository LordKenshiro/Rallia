-- =============================================================================
-- FEEDBACK REMINDER NOTIFICATION SYSTEM
-- Adds scheduled notifications for post-match feedback collection
-- - 1 hour after game ends: Initial feedback request
-- - 24 hours after game ends: Reminder for those who haven't completed feedback
-- =============================================================================

-- =============================================================================
-- PART 1: ADD NEW NOTIFICATION TYPE
-- =============================================================================

-- Add feedback_reminder notification type for the 24-hour reminder
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'feedback_reminder';

-- =============================================================================
-- PART 2: ADD TRACKING COLUMNS TO MATCH_PARTICIPANT
-- =============================================================================

-- Track when notifications were sent to prevent duplicates
ALTER TABLE match_participant
  ADD COLUMN IF NOT EXISTS initial_feedback_notification_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS feedback_reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN match_participant.initial_feedback_notification_sent_at IS 
  'When the initial feedback request notification was sent (1 hour after game end)';
COMMENT ON COLUMN match_participant.feedback_reminder_sent_at IS 
  'When the feedback reminder notification was sent (24 hours after game end)';

-- Index for efficient querying of participants needing notifications
CREATE INDEX IF NOT EXISTS idx_match_participant_feedback_notifications 
  ON match_participant(initial_feedback_notification_sent_at, feedback_reminder_sent_at)
  WHERE status = 'joined';

-- =============================================================================
-- PART 3: RPC FUNCTION - GET PARTICIPANTS FOR INITIAL FEEDBACK NOTIFICATION
-- =============================================================================

-- Returns participants who need the 1-hour feedback notification
-- Uses a time window to ensure we don't miss matches between cron runs
CREATE OR REPLACE FUNCTION get_participants_for_initial_feedback_notification(
  p_cutoff_start TIMESTAMPTZ,
  p_cutoff_end TIMESTAMPTZ
)
RETURNS TABLE (
  participant_id UUID,
  player_id UUID,
  match_id UUID,
  match_date DATE,
  start_time TIME,
  end_time TIME,
  sport_name TEXT,
  format TEXT,
  timezone TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id AS participant_id,
    mp.player_id,
    m.id AS match_id,
    m.match_date,
    m.start_time,
    m.end_time,
    s.name::TEXT AS sport_name,
    m.format::TEXT,
    m.timezone::TEXT
  FROM match_participant mp
  INNER JOIN match m ON m.id = mp.match_id
  INNER JOIN sport s ON s.id = m.sport_id
  WHERE mp.status = 'joined'
    AND mp.initial_feedback_notification_sent_at IS NULL
    AND m.cancelled_at IS NULL
    AND m.closed_at IS NULL
    -- Compare in UTC (match_date + end_time is already treated as UTC when cast to TIMESTAMPTZ)
    AND (m.match_date + m.end_time)::TIMESTAMPTZ
      BETWEEN p_cutoff_start AND p_cutoff_end;
END;
$$;

COMMENT ON FUNCTION get_participants_for_initial_feedback_notification IS 
  'Returns participants whose matches ended within the specified time window and have not received the initial feedback notification';

-- =============================================================================
-- PART 4: RPC FUNCTION - GET PARTICIPANTS FOR FEEDBACK REMINDER
-- =============================================================================

-- Returns participants who need the 24-hour reminder notification
-- Only for those who haven't completed their feedback
CREATE OR REPLACE FUNCTION get_participants_for_feedback_reminder(
  p_cutoff_start TIMESTAMPTZ,
  p_cutoff_end TIMESTAMPTZ
)
RETURNS TABLE (
  participant_id UUID,
  player_id UUID,
  match_id UUID,
  match_date DATE,
  start_time TIME,
  end_time TIME,
  sport_name TEXT,
  format TEXT,
  timezone TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id AS participant_id,
    mp.player_id,
    m.id AS match_id,
    m.match_date,
    m.start_time,
    m.end_time,
    s.name::TEXT AS sport_name,
    m.format::TEXT,
    m.timezone::TEXT
  FROM match_participant mp
  INNER JOIN match m ON m.id = mp.match_id
  INNER JOIN sport s ON s.id = m.sport_id
  WHERE mp.status = 'joined'
    AND mp.feedback_completed = false
    AND mp.feedback_reminder_sent_at IS NULL
    AND mp.initial_feedback_notification_sent_at IS NOT NULL  -- Must have received initial notification
    AND m.cancelled_at IS NULL
    AND m.closed_at IS NULL
    -- Compare in UTC (match_date + end_time is already treated as UTC when cast to TIMESTAMPTZ)
    AND (m.match_date + m.end_time)::TIMESTAMPTZ
      BETWEEN p_cutoff_start AND p_cutoff_end;
END;
$$;

COMMENT ON FUNCTION get_participants_for_feedback_reminder IS 
  'Returns participants whose matches ended within the specified time window, have not completed feedback, and have not received the reminder notification';

-- =============================================================================
-- PART 5: RPC FUNCTION - GET OPPONENT INFO FOR NOTIFICATIONS
-- =============================================================================

-- Returns opponent information for a participant to build notification content
CREATE OR REPLACE FUNCTION get_opponents_for_notification(
  p_match_id UUID,
  p_player_id UUID
)
RETURNS TABLE (
  player_id UUID,
  first_name TEXT,
  display_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.player_id,
    pr.first_name::TEXT,
    pr.display_name::TEXT
  FROM match_participant mp
  INNER JOIN player p ON p.id = mp.player_id
  INNER JOIN profile pr ON pr.id = p.id
  WHERE mp.match_id = p_match_id
    AND mp.player_id != p_player_id
    AND mp.status = 'joined';
END;
$$;

COMMENT ON FUNCTION get_opponents_for_notification IS 
  'Returns opponent player information for building personalized notification content';

-- =============================================================================
-- PART 6: RPC FUNCTION - MARK NOTIFICATIONS AS SENT
-- =============================================================================

-- Batch update participants after sending initial notifications
CREATE OR REPLACE FUNCTION mark_initial_feedback_notifications_sent(
  p_participant_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE match_participant
  SET initial_feedback_notification_sent_at = NOW()
  WHERE id = ANY(p_participant_ids)
    AND initial_feedback_notification_sent_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Batch update participants after sending reminder notifications
CREATE OR REPLACE FUNCTION mark_feedback_reminders_sent(
  p_participant_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE match_participant
  SET feedback_reminder_sent_at = NOW()
  WHERE id = ANY(p_participant_ids)
    AND feedback_reminder_sent_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION mark_initial_feedback_notifications_sent IS 
  'Marks participants as having received the initial feedback notification';
COMMENT ON FUNCTION mark_feedback_reminders_sent IS 
  'Marks participants as having received the feedback reminder notification';

-- =============================================================================
-- PART 7: VERIFICATION
-- =============================================================================

DO $$
BEGIN
  -- Verify new columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'match_participant' 
    AND column_name = 'initial_feedback_notification_sent_at'
  ) THEN
    RAISE EXCEPTION 'initial_feedback_notification_sent_at column was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'match_participant' 
    AND column_name = 'feedback_reminder_sent_at'
  ) THEN
    RAISE EXCEPTION 'feedback_reminder_sent_at column was not created';
  END IF;
  
  RAISE NOTICE 'Feedback reminder notification system migration completed successfully';
END $$;
