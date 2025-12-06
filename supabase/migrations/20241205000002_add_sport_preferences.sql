-- =====================================================
-- Migration: Add Sport Preferences
-- Description: Adds play style and play attributes support
--              for player sport profiles with preference tracking
-- Date: 2024-12-05
-- =====================================================

-- =====================================================
-- 1. CREATE ENUM TYPES
-- =====================================================

-- Play Style ENUM (shared across all sports)
CREATE TYPE play_style_enum AS ENUM (
  'counterpuncher',
  'aggressive_baseliner',
  'serve_and_volley',
  'all_court'
);

COMMENT ON TYPE play_style_enum IS 'Player play styles applicable to racquet sports';

-- Play Attribute ENUM (shared across all sports)
CREATE TYPE play_attribute_enum AS ENUM (
  'serve_speed_and_placement',
  'net_play',
  'court_coverage',
  'forehand_power',
  'shot_selection',
  'spin_control'
);

COMMENT ON TYPE play_attribute_enum IS 'Key playing attributes for racquet sports';

-- =====================================================
-- 2. ALTER PLAYER_SPORT TABLE
-- =====================================================

-- Add preferred court field (text for now, can be facility reference later)
ALTER TABLE player_sport 
ADD COLUMN preferred_court TEXT;

COMMENT ON COLUMN player_sport.preferred_court IS 'Preferred court/facility name (currently text, could be foreign key in future)';

-- Add preferred play style
ALTER TABLE player_sport 
ADD COLUMN preferred_play_style play_style_enum;

COMMENT ON COLUMN player_sport.preferred_play_style IS 'Player preferred play style for this sport';

-- Add preferred play attributes (array to support multiple selections)
ALTER TABLE player_sport 
ADD COLUMN preferred_play_attributes play_attribute_enum[];

COMMENT ON COLUMN player_sport.preferred_play_attributes IS 'Array of preferred play attributes that define player strengths';

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- Index for querying by play style
CREATE INDEX idx_player_sport_play_style 
ON player_sport(preferred_play_style) 
WHERE preferred_play_style IS NOT NULL;

-- Index for querying by play attributes using GIN (for array searches)
CREATE INDEX idx_player_sport_play_attributes 
ON player_sport USING GIN (preferred_play_attributes) 
WHERE preferred_play_attributes IS NOT NULL;

-- Index for querying by court
CREATE INDEX idx_player_sport_preferred_court 
ON player_sport(preferred_court) 
WHERE preferred_court IS NOT NULL;

-- =====================================================
-- 4. UPDATE RLS POLICIES (if needed)
-- =====================================================

-- Note: Existing RLS policies on player_sport should already cover
-- the new columns. No additional policies needed unless specific
-- restrictions are required for preferences.

-- Verify existing policies allow SELECT/UPDATE:
-- - Users can view their own preferences
-- - Users can update their own preferences
-- - Public can view preferences of other players (for matching)

-- =====================================================
-- 5. HELPER FUNCTION: Get Players by Play Style
-- =====================================================

CREATE OR REPLACE FUNCTION get_players_by_play_style(
  p_sport_id UUID,
  p_play_style play_style_enum
)
RETURNS TABLE (
  player_id UUID,
  play_style play_style_enum,
  play_attributes play_attribute_enum[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.player_id,
    ps.preferred_play_style,
    ps.preferred_play_attributes
  FROM player_sport ps
  WHERE ps.sport_id = p_sport_id
    AND ps.preferred_play_style = p_play_style
    AND ps.is_active = TRUE;
END;
$$;

COMMENT ON FUNCTION get_players_by_play_style IS 'Find players with specific play style for matchmaking';

-- =====================================================
-- 6. HELPER FUNCTION: Get Players by Play Attributes
-- =====================================================

CREATE OR REPLACE FUNCTION get_players_by_play_attributes(
  p_sport_id UUID,
  p_play_attributes play_attribute_enum[]
)
RETURNS TABLE (
  player_id UUID,
  play_style play_style_enum,
  play_attributes play_attribute_enum[],
  matching_attributes INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.player_id,
    ps.preferred_play_style,
    ps.preferred_play_attributes,
    -- Count how many attributes match
    COALESCE(
      array_length(
        ARRAY(
          SELECT UNNEST(ps.preferred_play_attributes)
          INTERSECT
          SELECT UNNEST(p_play_attributes)
        ),
        1
      ),
      0
    ) AS matching_attributes
  FROM player_sport ps
  WHERE ps.sport_id = p_sport_id
    AND ps.preferred_play_attributes && p_play_attributes -- Has at least one matching attribute
    AND ps.is_active = TRUE
  ORDER BY matching_attributes DESC;
END;
$$;

COMMENT ON FUNCTION get_players_by_play_attributes IS 'Find players with matching play attributes for compatibility matching';

-- =====================================================
-- 7. DATA MIGRATION (if needed)
-- =====================================================

-- No data migration needed - new columns default to NULL
-- Users will populate preferences through UI

-- =====================================================
-- END OF MIGRATION
-- =====================================================
