-- Migration: Update reputation public threshold
-- Description: Changes the threshold for public reputation from
--              "matches_completed >= 3" to "total_events >= 10"
--              This is more comprehensive as it captures reviews,
--              match completions, and other interactions.

-- =============================================================================
-- STEP 1: Drop the dependent RLS policy first
-- =============================================================================

DROP POLICY IF EXISTS "player_reputation_read_public" ON player_reputation;

-- =============================================================================
-- STEP 2: Drop the old generated column and config column
-- =============================================================================

ALTER TABLE player_reputation DROP COLUMN IF EXISTS is_public;
ALTER TABLE player_reputation DROP COLUMN IF EXISTS min_matches_for_public;

-- =============================================================================
-- STEP 3: Add new config column and regenerate is_public
-- =============================================================================

ALTER TABLE player_reputation 
ADD COLUMN min_events_for_public INT NOT NULL DEFAULT 10;

ALTER TABLE player_reputation 
ADD COLUMN is_public BOOLEAN GENERATED ALWAYS AS (total_events >= min_events_for_public) STORED;

-- =============================================================================
-- STEP 4: Recreate the RLS policy with the new column
-- =============================================================================

CREATE POLICY "player_reputation_read_public" ON player_reputation
    FOR SELECT
    TO authenticated
    USING (is_public = true);

-- =============================================================================
-- NOTE: The recalculate_player_reputation function still works since it
-- updates total_events which is already being tracked.
-- =============================================================================
