-- =============================================================================
-- ADD CANCELLATION REASON TO MATCH_PARTICIPANT
-- Allows participants to record why a match was mutually cancelled
-- =============================================================================

-- =============================================================================
-- PHASE 1: CREATE CANCELLATION REASON ENUM
-- =============================================================================

CREATE TYPE cancellation_reason_enum AS ENUM (
  'weather',
  'court_unavailable',
  'emergency',
  'other'
);

COMMENT ON TYPE cancellation_reason_enum IS 'Reason for mutual match cancellation reported by participant';

-- =============================================================================
-- PHASE 2: ADD COLUMNS TO MATCH_PARTICIPANT
-- =============================================================================

ALTER TABLE match_participant
  ADD COLUMN IF NOT EXISTS cancellation_reason cancellation_reason_enum,
  ADD COLUMN IF NOT EXISTS cancellation_notes TEXT;

COMMENT ON COLUMN match_participant.cancellation_reason IS 'Reason for mutual cancellation (only set when match_outcome = mutual_cancel)';
COMMENT ON COLUMN match_participant.cancellation_notes IS 'Free text notes if cancellation_reason is other';

-- =============================================================================
-- PHASE 3: VERIFICATION
-- =============================================================================

DO $$
BEGIN
  -- Verify enum exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cancellation_reason_enum') THEN
    RAISE EXCEPTION 'cancellation_reason_enum was not created';
  END IF;
  
  -- Verify columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'match_participant' AND column_name = 'cancellation_reason'
  ) THEN
    RAISE EXCEPTION 'match_participant.cancellation_reason column was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'match_participant' AND column_name = 'cancellation_notes'
  ) THEN
    RAISE EXCEPTION 'match_participant.cancellation_notes column was not created';
  END IF;
  
  RAISE NOTICE 'Cancellation reason migration completed successfully';
END $$;
