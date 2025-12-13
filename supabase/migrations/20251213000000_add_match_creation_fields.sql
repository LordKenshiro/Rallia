-- ============================================================================
-- Migration: Add Match Creation Fields
-- Created: 2024-12-13
-- Description: Add new enums and columns to support the match creation wizard
-- ============================================================================

-- ============================================================================
-- NEW ENUM TYPES
-- ============================================================================

-- Match format (singles vs doubles) - distinct from match_type which is practice/competitive
CREATE TYPE match_format_enum AS ENUM ('singles', 'doubles');

-- Court reservation status
CREATE TYPE court_status_enum AS ENUM ('reserved', 'to_reserve');

-- Match visibility (who can see and join)
CREATE TYPE match_visibility_enum AS ENUM ('public', 'private');

-- Match join mode (auto-join vs request to join, like RacketPal)
CREATE TYPE match_join_mode_enum AS ENUM ('direct', 'request');

-- Cost split type for court fees
CREATE TYPE cost_split_type_enum AS ENUM ('host_pays', 'split_equal', 'custom');

-- Location type (how location was specified)
CREATE TYPE location_type_enum AS ENUM ('facility', 'custom', 'tbd');

-- ============================================================================
-- NOTE: match_duration_enum modification
-- ============================================================================
-- Adding 'custom' to match_duration_enum must be done in a SEPARATE migration
-- because PostgreSQL doesn't allow using a newly added enum value in the same
-- transaction. See migration 20251213000001_add_custom_duration_enum.sql

-- ============================================================================
-- ALTER MATCH TABLE: Add new columns
-- ============================================================================

-- Duration column (using existing match_duration_enum with new 'custom' value)
ALTER TABLE match ADD COLUMN IF NOT EXISTS duration match_duration_enum;

-- Custom duration in minutes (used when duration = 'custom')
ALTER TABLE match ADD COLUMN IF NOT EXISTS custom_duration_minutes INT;

-- Match format (singles/doubles)
ALTER TABLE match ADD COLUMN IF NOT EXISTS format match_format_enum DEFAULT 'singles';

-- Location type (facility/custom/tbd)
ALTER TABLE match ADD COLUMN IF NOT EXISTS location_type location_type_enum DEFAULT 'tbd';

-- Facility reference (nullable, used when location_type = 'facility')
ALTER TABLE match ADD COLUMN IF NOT EXISTS facility_id UUID;

-- Court reference (nullable, used when location_type = 'facility')
ALTER TABLE match ADD COLUMN IF NOT EXISTS court_id UUID;

-- Court reservation status
ALTER TABLE match ADD COLUMN IF NOT EXISTS court_status court_status_enum;

-- Whether the court is free (no cost)
ALTER TABLE match ADD COLUMN IF NOT EXISTS is_court_free BOOLEAN DEFAULT true;

-- Cost split type
ALTER TABLE match ADD COLUMN IF NOT EXISTS cost_split_type cost_split_type_enum DEFAULT 'split_equal';

-- Estimated total court cost (in local currency)
ALTER TABLE match ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2);

-- Minimum opponent rating requirement (FK to rating_score)
ALTER TABLE match ADD COLUMN IF NOT EXISTS min_rating_score_id UUID;

-- Preferred opponent gender (reusing existing gender_type enum)
ALTER TABLE match ADD COLUMN IF NOT EXISTS preferred_opponent_gender gender_type;

-- Player expectation: rally/practice vs competitive match (reusing match_type_enum)
ALTER TABLE match ADD COLUMN IF NOT EXISTS player_expectation match_type_enum DEFAULT 'both';

-- Match visibility (public/private)
ALTER TABLE match ADD COLUMN IF NOT EXISTS visibility match_visibility_enum DEFAULT 'public';

-- Join mode (direct join vs request to join)
ALTER TABLE match ADD COLUMN IF NOT EXISTS join_mode match_join_mode_enum DEFAULT 'direct';

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- FK: match.facility_id -> facility.id
ALTER TABLE match 
    ADD CONSTRAINT match_facility_id_fkey 
    FOREIGN KEY (facility_id) 
    REFERENCES facility(id) 
    ON DELETE SET NULL;

-- FK: match.court_id -> court.id
ALTER TABLE match 
    ADD CONSTRAINT match_court_id_fkey 
    FOREIGN KEY (court_id) 
    REFERENCES court(id) 
    ON DELETE SET NULL;

-- FK: match.min_rating_score_id -> rating_score.id
ALTER TABLE match 
    ADD CONSTRAINT match_min_rating_score_id_fkey 
    FOREIGN KEY (min_rating_score_id) 
    REFERENCES rating_score(id) 
    ON DELETE SET NULL;

-- ============================================================================
-- ADD INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Index for finding matches by visibility (public matches for discovery)
CREATE INDEX IF NOT EXISTS idx_match_visibility ON match(visibility);

-- Index for finding matches by format (singles/doubles filtering)
CREATE INDEX IF NOT EXISTS idx_match_format ON match(format);

-- Index for finding matches by location type
CREATE INDEX IF NOT EXISTS idx_match_location_type ON match(location_type);

-- Index for finding matches at a specific facility
CREATE INDEX IF NOT EXISTS idx_match_facility ON match(facility_id);

-- Composite index for match discovery (public, by date, by format)
CREATE INDEX IF NOT EXISTS idx_match_discovery ON match(visibility, match_date, format);

-- ============================================================================
-- ADD CHECK CONSTRAINTS FOR DATA INTEGRITY
-- ============================================================================

-- NOTE: The check_custom_duration constraint will be added in the follow-up migration
-- after the 'custom' enum value is committed. See 20251213000001_add_custom_duration_enum.sql

-- Ensure facility_id and court_id are set when location_type is 'facility'
-- Note: court_id can be null even for facility (user might not know the specific court yet)
ALTER TABLE match ADD CONSTRAINT check_facility_location 
    CHECK (
        location_type != 'facility' OR facility_id IS NOT NULL
    );

-- Ensure estimated_cost is set when court is not free
ALTER TABLE match ADD CONSTRAINT check_court_cost 
    CHECK (
        is_court_free = true OR estimated_cost IS NOT NULL
    );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN match.duration IS 'Standard match duration (30/60/90/120 minutes or custom)';
COMMENT ON COLUMN match.custom_duration_minutes IS 'Custom duration in minutes (required when duration=custom)';
COMMENT ON COLUMN match.format IS 'Match format: singles (2 players) or doubles (4 players)';
COMMENT ON COLUMN match.location_type IS 'How location was specified: facility (from DB), custom (text), or tbd';
COMMENT ON COLUMN match.facility_id IS 'Reference to facility (when location_type=facility)';
COMMENT ON COLUMN match.court_id IS 'Reference to specific court (when location_type=facility)';
COMMENT ON COLUMN match.court_status IS 'Whether the court is already reserved or needs to be reserved';
COMMENT ON COLUMN match.is_court_free IS 'Whether the court has no cost';
COMMENT ON COLUMN match.cost_split_type IS 'How court costs are split: host_pays, split_equal, or custom';
COMMENT ON COLUMN match.estimated_cost IS 'Total estimated court cost in local currency';
COMMENT ON COLUMN match.min_rating_score_id IS 'Minimum required rating for opponents';
COMMENT ON COLUMN match.preferred_opponent_gender IS 'Preferred gender of opponent/partner';
COMMENT ON COLUMN match.player_expectation IS 'What the player expects: practice/rally, competitive match, or both';
COMMENT ON COLUMN match.visibility IS 'Who can see this match: public (everyone) or private (invite only)';
COMMENT ON COLUMN match.join_mode IS 'How players join: direct (auto-approve) or request (manual approval)';

