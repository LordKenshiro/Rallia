-- Migration: Add match_set table for storing individual set scores
-- This allows displaying detailed set-by-set scores like "6-3, 2-6, 7-5"

-- ============================================
-- CREATE MATCH_SET TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS match_set (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_result_id UUID NOT NULL REFERENCES match_result(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL CHECK (set_number > 0 AND set_number <= 5),
    team1_score INTEGER NOT NULL CHECK (team1_score >= 0),
    team2_score INTEGER NOT NULL CHECK (team2_score >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each set number should be unique per match result
    UNIQUE(match_result_id, set_number)
);

-- ============================================
-- INDEXES
-- ============================================

-- Index for querying sets by match result
CREATE INDEX IF NOT EXISTS idx_match_set_result_id ON match_set(match_result_id);

-- Index for ordering sets
CREATE INDEX IF NOT EXISTS idx_match_set_result_number ON match_set(match_result_id, set_number);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE match_set ENABLE ROW LEVEL SECURITY;

-- Anyone can view match sets (same as match_result)
CREATE POLICY "Anyone can view match sets"
    ON match_set FOR SELECT
    USING (true);

-- Match participants can insert sets
CREATE POLICY "Match participants can insert match sets"
    ON match_set FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM match_result mr
            JOIN match_participant mp ON mp.match_id = mr.match_id
            WHERE mr.id = match_result_id
            AND mp.player_id = auth.uid()
        )
    );

-- Match participants can update sets
CREATE POLICY "Match participants can update match sets"
    ON match_set FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM match_result mr
            JOIN match_participant mp ON mp.match_id = mr.match_id
            WHERE mr.id = match_result_id
            AND mp.player_id = auth.uid()
        )
    );

-- Match participants can delete sets
CREATE POLICY "Match participants can delete match sets"
    ON match_set FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM match_result mr
            JOIN match_participant mp ON mp.match_id = mr.match_id
            WHERE mr.id = match_result_id
            AND mp.player_id = auth.uid()
        )
    );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE match_set IS 'Individual set scores for tennis/pickleball matches';
COMMENT ON COLUMN match_set.set_number IS 'The set number (1, 2, 3, etc.)';
COMMENT ON COLUMN match_set.team1_score IS 'Games won by team 1 in this set';
COMMENT ON COLUMN match_set.team2_score IS 'Games won by team 2 in this set';
