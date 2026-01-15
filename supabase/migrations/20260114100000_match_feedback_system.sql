-- =============================================================================
-- MATCH FEEDBACK SYSTEM
-- Database schema for post-match feedback collection per match-closure.md spec
-- =============================================================================

-- =============================================================================
-- PHASE 1: CREATE NEW ENUMS
-- =============================================================================

-- Match outcome (for explicit "did match happen?" question)
CREATE TYPE match_outcome_enum AS ENUM (
  'played',           -- Match happened as planned
  'mutual_cancel',    -- Both/all parties agreed not to play
  'opponent_no_show'  -- At least one opponent didn't show
);

COMMENT ON TYPE match_outcome_enum IS 'Participant-reported match outcome for feedback';

-- Match report reason (different from existing report_reason)
CREATE TYPE match_report_reason_enum AS ENUM (
  'harassment',
  'unsportsmanlike',
  'safety',
  'misrepresented_level',
  'inappropriate'
);

COMMENT ON TYPE match_report_reason_enum IS 'Reason for reporting a player after a match';

-- Match report priority
CREATE TYPE match_report_priority_enum AS ENUM ('high', 'medium', 'low');

COMMENT ON TYPE match_report_priority_enum IS 'Priority level for moderation queue';

-- Match report status (different from existing report_status)
CREATE TYPE match_report_status_enum AS ENUM (
  'pending',
  'reviewed',
  'dismissed',
  'action_taken'
);

COMMENT ON TYPE match_report_status_enum IS 'Moderation status for match reports';

-- =============================================================================
-- PHASE 2: UPDATE EXISTING ENUMS
-- =============================================================================

-- Add feedback_submitted to reputation events
ALTER TYPE reputation_event_type ADD VALUE IF NOT EXISTS 'feedback_submitted';

-- Add feedback_request notification type
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'feedback_request';

-- =============================================================================
-- PHASE 3: ALTER match TABLE
-- =============================================================================

ALTER TABLE match
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mutually_cancelled BOOLEAN;

COMMENT ON COLUMN match.closed_at IS 'Timestamp when match was closed (48h after end_time)';
COMMENT ON COLUMN match.mutually_cancelled IS 'True if all participants reported mutual_cancel';

-- =============================================================================
-- PHASE 4: ALTER match_participant TABLE
-- =============================================================================

ALTER TABLE match_participant
  ADD COLUMN IF NOT EXISTS match_outcome match_outcome_enum,
  ADD COLUMN IF NOT EXISTS feedback_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS showed_up BOOLEAN,
  ADD COLUMN IF NOT EXISTS was_late BOOLEAN,
  ADD COLUMN IF NOT EXISTS star_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS aggregated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Add check constraint for star_rating
ALTER TABLE match_participant
  ADD CONSTRAINT check_star_rating CHECK (star_rating IS NULL OR (star_rating >= 1 AND star_rating <= 5));

COMMENT ON COLUMN match_participant.match_outcome IS 'Participant answer to "Did this match take place?"';
COMMENT ON COLUMN match_participant.feedback_completed IS 'Whether participant has submitted feedback';
COMMENT ON COLUMN match_participant.showed_up IS 'Aggregated: did this participant show up (from opponent feedback)';
COMMENT ON COLUMN match_participant.was_late IS 'Aggregated: was this participant late (from opponent feedback)';
COMMENT ON COLUMN match_participant.star_rating IS 'Aggregated average star rating from opponents (1-5)';
COMMENT ON COLUMN match_participant.aggregated_at IS 'When feedback was aggregated for this participant';
COMMENT ON COLUMN match_participant.checked_in_at IS 'Location-verified check-in timestamp';

-- =============================================================================
-- PHASE 5: CREATE match_feedback TABLE
-- =============================================================================

CREATE TABLE match_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES match(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  showed_up BOOLEAN NOT NULL,
  was_late BOOLEAN,
  star_rating SMALLINT CHECK (star_rating >= 1 AND star_rating <= 5),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT match_feedback_unique UNIQUE (match_id, reviewer_id, opponent_id)
);

COMMENT ON TABLE match_feedback IS 'Per-opponent feedback submitted after a match';

-- =============================================================================
-- PHASE 6: CREATE match_report TABLE
-- =============================================================================

CREATE TABLE match_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES match(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  reason match_report_reason_enum NOT NULL,
  details TEXT,
  priority match_report_priority_enum NOT NULL,
  status match_report_status_enum NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Moderation tracking
  reviewed_by UUID REFERENCES profile(id),
  reviewed_at TIMESTAMPTZ,

  -- One report per reporter-reported pair per match
  CONSTRAINT match_report_unique UNIQUE (match_id, reporter_id, reported_id)
);

COMMENT ON TABLE match_report IS 'Reports filed against players during match feedback';

-- =============================================================================
-- PHASE 7: CREATE INDEXES
-- =============================================================================

-- For querying feedback by match
CREATE INDEX idx_match_feedback_match_id ON match_feedback(match_id);

-- For querying feedback received by a player
CREATE INDEX idx_match_feedback_opponent_id ON match_feedback(opponent_id);

-- For querying reports by match
CREATE INDEX idx_match_report_match_id ON match_report(match_id);

-- For moderation queue (pending reports by priority)
CREATE INDEX idx_match_report_pending ON match_report(priority, created_at)
  WHERE status = 'pending';

-- For finding matches pending closure
CREATE INDEX idx_match_pending_closure ON match(end_time)
  WHERE closed_at IS NULL AND cancelled_at IS NULL;

-- For finding participants who haven't submitted feedback
CREATE INDEX idx_match_participant_pending_feedback ON match_participant(match_id)
  WHERE feedback_completed = false AND status = 'joined';

-- =============================================================================
-- PHASE 8: ROW LEVEL SECURITY
-- =============================================================================

-- match_feedback RLS
ALTER TABLE match_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY match_feedback_select ON match_feedback FOR SELECT
  USING (
    reviewer_id = auth.uid() OR
    opponent_id = auth.uid() OR
    is_match_participant(match_id, auth.uid())
  );

CREATE POLICY match_feedback_insert ON match_feedback FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid() AND
    is_match_participant(match_id, auth.uid())
  );

-- match_report RLS
ALTER TABLE match_report ENABLE ROW LEVEL SECURITY;

CREATE POLICY match_report_select ON match_report FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY match_report_insert ON match_report FOR INSERT
  WITH CHECK (
    reporter_id = auth.uid() AND
    is_match_participant(match_id, auth.uid())
  );

-- =============================================================================
-- PHASE 9: VERIFICATION
-- =============================================================================

DO $$
BEGIN
  -- Verify new enums exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_outcome_enum') THEN
    RAISE EXCEPTION 'match_outcome_enum was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_report_reason_enum') THEN
    RAISE EXCEPTION 'match_report_reason_enum was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_report_priority_enum') THEN
    RAISE EXCEPTION 'match_report_priority_enum was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_report_status_enum') THEN
    RAISE EXCEPTION 'match_report_status_enum was not created';
  END IF;
  
  -- Verify tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_feedback') THEN
    RAISE EXCEPTION 'match_feedback table was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_report') THEN
    RAISE EXCEPTION 'match_report table was not created';
  END IF;
  
  -- Verify new columns on match table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match' AND column_name = 'closed_at') THEN
    RAISE EXCEPTION 'match.closed_at column was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match' AND column_name = 'mutually_cancelled') THEN
    RAISE EXCEPTION 'match.mutually_cancelled column was not created';
  END IF;
  
  -- Verify new columns on match_participant table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_participant' AND column_name = 'match_outcome') THEN
    RAISE EXCEPTION 'match_participant.match_outcome column was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_participant' AND column_name = 'feedback_completed') THEN
    RAISE EXCEPTION 'match_participant.feedback_completed column was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_participant' AND column_name = 'checked_in_at') THEN
    RAISE EXCEPTION 'match_participant.checked_in_at column was not created';
  END IF;
  
  RAISE NOTICE 'Match feedback system migration completed successfully';
END $$;
