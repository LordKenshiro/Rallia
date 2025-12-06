-- Rating Source and Verification System Migration
-- Created: 2024-12-05
-- Description: Adds rating source types, peer verification support, and extends player_review for skill ratings

-- ============================================
-- PART 1: CREATE NEW ENUM FOR RATING SOURCE
-- ============================================

-- Create rating_source_type enum
CREATE TYPE rating_source_type AS ENUM (
    'self_reported',    -- User manually entered their rating (not verified)
    'api_verified',     -- Fetched from USTA/DUPR API (auto-verified, trusted)
    'peer_verified',    -- Verified through peer ratings after matches
    'admin_verified'    -- Admin manually verified (video proof, tournament results, etc.)
);

COMMENT ON TYPE rating_source_type IS 'How a rating was obtained and verified';

-- ============================================
-- PART 2: EXTEND player_review TABLE
-- ============================================

-- Add columns to support peer skill ratings
ALTER TABLE player_review 
    ADD COLUMN sport_id UUID REFERENCES sport(id) ON DELETE SET NULL,
    ADD COLUMN skill_rating_value NUMERIC,
    ADD COLUMN skill_rating_score_id UUID REFERENCES rating_score(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_player_review_reviewed_sport ON player_review(reviewed_id, sport_id);
CREATE INDEX idx_player_review_skill_rating ON player_review(reviewed_id, skill_rating_value) WHERE skill_rating_value IS NOT NULL;

-- Add comments
COMMENT ON COLUMN player_review.rating IS 'General review score (1-5 stars) for player behavior/experience';
COMMENT ON COLUMN player_review.sport_id IS 'Sport for which the skill rating applies';
COMMENT ON COLUMN player_review.skill_rating_value IS 'Peer-assessed skill rating value (e.g., NTRP 4.5, DUPR 3.8)';
COMMENT ON COLUMN player_review.skill_rating_score_id IS 'Reference to the specific rating_score for the skill rating';

-- ============================================
-- PART 3: UPDATE player_rating_score TABLE
-- ============================================

-- Add new columns
ALTER TABLE player_rating_score
    ADD COLUMN source_type rating_source_type DEFAULT 'self_reported',
    ADD COLUMN verification_method TEXT,
    ADD COLUMN peer_rating_count INTEGER DEFAULT 0,
    ADD COLUMN peer_rating_average NUMERIC,
    ADD COLUMN is_primary BOOLEAN DEFAULT TRUE;

-- Drop old unique constraint
ALTER TABLE player_rating_score DROP CONSTRAINT IF EXISTS player_rating_score_player_id_rating_score_id_key;

-- Add new unique constraint (allows multiple ratings with different sources)
ALTER TABLE player_rating_score 
    ADD CONSTRAINT player_rating_score_unique_source 
    UNIQUE(player_id, rating_score_id, source_type);

-- Add indexes for performance
CREATE INDEX idx_player_rating_score_source_type ON player_rating_score(source_type);
CREATE INDEX idx_player_rating_score_verified ON player_rating_score(is_verified, is_primary);
CREATE INDEX idx_player_rating_score_primary ON player_rating_score(player_id, is_primary) WHERE is_primary = TRUE;

-- Add comments
COMMENT ON COLUMN player_rating_score.source_type IS 'How the rating was obtained (self_reported, api_verified, peer_verified, admin_verified)';
COMMENT ON COLUMN player_rating_score.verification_method IS 'Specific method used for verification (e.g., usta_api, dupr_api, peer_average, video_review)';
COMMENT ON COLUMN player_rating_score.peer_rating_count IS 'Number of peer ratings received (used for peer_verified source)';
COMMENT ON COLUMN player_rating_score.peer_rating_average IS 'Average of peer ratings (used for peer_verified source)';
COMMENT ON COLUMN player_rating_score.is_primary IS 'Whether this is the primary rating to display for the player';

-- ============================================
-- PART 4: MIGRATE EXISTING DATA
-- ============================================

-- Update all existing ratings to be self_reported
UPDATE player_rating_score 
SET source_type = 'self_reported',
    is_primary = TRUE
WHERE source_type IS NULL;

-- ============================================
-- PART 5: CREATE TRIGGER FOR API-VERIFIED AUTO-VERIFICATION
-- ============================================

-- Function to auto-verify api_verified ratings
CREATE OR REPLACE FUNCTION auto_verify_api_ratings()
RETURNS TRIGGER AS $$
BEGIN
    -- If source_type is api_verified, automatically set is_verified to TRUE
    IF NEW.source_type = 'api_verified' THEN
        NEW.is_verified := TRUE;
        NEW.verified_at := NOW();
        
        -- Set verification method if not already set
        IF NEW.verification_method IS NULL THEN
            NEW.verification_method := 'api_import';
        END IF;
        
        -- Demote other ratings to non-primary for this player's sport
        UPDATE player_rating_score prs
        SET is_primary = FALSE
        FROM rating_score rs
        JOIN rating r ON rs.rating_id = r.id
        WHERE prs.player_id = NEW.player_id
          AND prs.id != NEW.id
          AND rs.id = prs.rating_score_id
          AND r.sport_id = (
              SELECT r2.sport_id 
              FROM rating_score rs2 
              JOIN rating r2 ON rs2.rating_id = r2.id 
              WHERE rs2.id = NEW.rating_score_id
          );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER auto_verify_api_ratings_trigger
    BEFORE INSERT OR UPDATE ON player_rating_score
    FOR EACH ROW
    EXECUTE FUNCTION auto_verify_api_ratings();

COMMENT ON FUNCTION auto_verify_api_ratings() IS 'Automatically verifies ratings with source_type=api_verified and demotes other ratings to non-primary';

-- ============================================
-- PART 6: CREATE HELPER FUNCTION FOR PEER VERIFICATION
-- ============================================

-- Function to check if a player has enough peer ratings for verification
CREATE OR REPLACE FUNCTION check_peer_verification_threshold(
    p_player_id UUID,
    p_sport_id UUID,
    p_threshold INTEGER DEFAULT 5
)
RETURNS TABLE(
    should_create_verified BOOLEAN,
    peer_count INTEGER,
    average_rating NUMERIC,
    recommended_rating_score_id UUID
) AS $$
DECLARE
    v_peer_count INTEGER;
    v_average_rating NUMERIC;
    v_recommended_id UUID;
BEGIN
    -- Get peer rating statistics
    SELECT 
        COUNT(*),
        AVG(skill_rating_value)
    INTO v_peer_count, v_average_rating
    FROM player_review
    WHERE reviewed_id = p_player_id
      AND sport_id = p_sport_id
      AND skill_rating_value IS NOT NULL;
    
    -- Find closest rating_score for the average
    IF v_average_rating IS NOT NULL THEN
        SELECT rs.id INTO v_recommended_id
        FROM rating_score rs
        JOIN rating r ON rs.rating_id = r.id
        WHERE r.sport_id = p_sport_id
        ORDER BY ABS(rs.score_value - v_average_rating)
        LIMIT 1;
    END IF;
    
    -- Return results
    RETURN QUERY SELECT 
        v_peer_count >= p_threshold,
        v_peer_count,
        v_average_rating,
        v_recommended_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_peer_verification_threshold IS 'Checks if player has enough peer ratings for verification and recommends a rating_score';

-- ============================================
-- PART 7: REMOVE 'self_assessment' FROM rating_type (OPTIONAL)
-- ============================================

-- Note: This is commented out for now as it requires careful data migration
-- Uncomment and run separately when ready to clean up the rating_type enum

/*
-- Step 1: Delete ratings with self_assessment type
DELETE FROM rating WHERE rating_type = 'self_assessment';

-- Step 2: Create new enum without self_assessment
ALTER TYPE rating_type RENAME TO rating_type_old;
CREATE TYPE rating_type AS ENUM ('ntrp', 'utr', 'dupr');

-- Step 3: Update rating table to use new enum
ALTER TABLE rating ALTER COLUMN rating_type TYPE rating_type USING rating_type::text::rating_type;

-- Step 4: Drop old enum
DROP TYPE rating_type_old;

-- Step 5: Update seed data (remove self_assessment ratings from initial migration)
*/

-- ============================================
-- PART 8: UPDATE RLS POLICIES (if needed)
-- ============================================

-- RLS policies for player_rating_score remain the same
-- Players can still manage their own ratings through the existing policy:
-- "Players can manage their ratings" ON player_rating_score FOR ALL USING (auth.uid() = player_id);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the migration
DO $$
BEGIN
    -- Check if rating_source_type exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rating_source_type') THEN
        RAISE EXCEPTION 'rating_source_type enum was not created';
    END IF;
    
    -- Check if new columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'player_rating_score' 
        AND column_name = 'source_type'
    ) THEN
        RAISE EXCEPTION 'source_type column was not added to player_rating_score';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'player_review' 
        AND column_name = 'skill_rating_value'
    ) THEN
        RAISE EXCEPTION 'skill_rating_value column was not added to player_review';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;
