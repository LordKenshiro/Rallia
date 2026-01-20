-- =============================================================================
-- UPDATE REPUTATION CONFIG VALUES
-- Updates the default_impact values to match the spec in match-closure.md
-- =============================================================================

-- Match-related events
UPDATE reputation_config SET default_impact = 12 WHERE event_type = 'match_completed';
UPDATE reputation_config SET default_impact = 3 WHERE event_type = 'match_on_time';

-- Peer review events
UPDATE reputation_config SET default_impact = 10 WHERE event_type = 'review_received_5star';
UPDATE reputation_config SET default_impact = 5 WHERE event_type = 'review_received_4star';

-- Fix feedback_submitted (DB had 2, should be 1)
UPDATE reputation_config SET default_impact = 1 WHERE event_type = 'feedback_submitted';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  v_match_completed INT;
  v_match_on_time INT;
  v_review_5star INT;
  v_review_4star INT;
  v_feedback_submitted INT;
BEGIN
  SELECT default_impact INTO v_match_completed FROM reputation_config WHERE event_type = 'match_completed';
  SELECT default_impact INTO v_match_on_time FROM reputation_config WHERE event_type = 'match_on_time';
  SELECT default_impact INTO v_review_5star FROM reputation_config WHERE event_type = 'review_received_5star';
  SELECT default_impact INTO v_review_4star FROM reputation_config WHERE event_type = 'review_received_4star';
  SELECT default_impact INTO v_feedback_submitted FROM reputation_config WHERE event_type = 'feedback_submitted';

  IF v_match_completed != 12 THEN
    RAISE EXCEPTION 'match_completed should be 12, got %', v_match_completed;
  END IF;

  IF v_match_on_time != 3 THEN
    RAISE EXCEPTION 'match_on_time should be 3, got %', v_match_on_time;
  END IF;

  IF v_review_5star != 10 THEN
    RAISE EXCEPTION 'review_received_5star should be 10, got %', v_review_5star;
  END IF;

  IF v_review_4star != 5 THEN
    RAISE EXCEPTION 'review_received_4star should be 5, got %', v_review_4star;
  END IF;

  IF v_feedback_submitted != 1 THEN
    RAISE EXCEPTION 'feedback_submitted should be 1, got %', v_feedback_submitted;
  END IF;

  RAISE NOTICE 'All reputation_config values updated successfully';
END $$;
