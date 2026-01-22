-- Migration: Update RPC functions to use rating_system instead of rating
-- This migration:
-- 1. Drops the old get_rating_scores_by_type function
-- 2. Creates a new function that uses rating_system with rating_system_code_enum
-- 3. Updates grants and comments

-- ============================================
-- PHASE 1: DROP OLD FUNCTION
-- ============================================

-- Drop the old function that used the rating table
DROP FUNCTION IF EXISTS get_rating_scores_by_type(TEXT, rating_type);

-- ============================================
-- PHASE 2: CREATE NEW FUNCTION
-- ============================================

-- New function using rating_system table with the enum
CREATE OR REPLACE FUNCTION get_rating_scores_by_type(
  p_sport_name TEXT,
  p_rating_system_code rating_system_code_enum
)
RETURNS TABLE(
  id UUID,
  score_value NUMERIC,
  display_label TEXT,
  skill_level skill_level,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rs.id,
    rs.value::NUMERIC as score_value,
    rs.label::TEXT as display_label,
    NULL::skill_level as skill_level,  -- Will be updated after skill_level column is added
    rs.description::TEXT
  FROM rating_score rs
  INNER JOIN rating_system rsys ON rs.rating_system_id = rsys.id
  INNER JOIN sport s ON rsys.sport_id = s.id
  WHERE s.name = p_sport_name
    AND rsys.code = p_rating_system_code
    AND rsys.is_active = TRUE
  ORDER BY rs.value ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_rating_scores_by_type(TEXT, rating_system_code_enum) TO authenticated;
GRANT EXECUTE ON FUNCTION get_rating_scores_by_type(TEXT, rating_system_code_enum) TO anon;

COMMENT ON FUNCTION get_rating_scores_by_type IS 'Fetches rating scores for a specific sport and rating system code (e.g., Tennis ntrp, Pickleball dupr)';

-- ============================================
-- PHASE 3: CREATE ADDITIONAL HELPER FUNCTIONS
-- ============================================

-- Function to get all rating systems for a sport
CREATE OR REPLACE FUNCTION get_rating_systems_for_sport(
  p_sport_name TEXT
)
RETURNS TABLE(
  id UUID,
  code rating_system_code_enum,
  name TEXT,
  description TEXT,
  min_value NUMERIC,
  max_value NUMERIC,
  step NUMERIC,
  default_initial_value NUMERIC,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rsys.id,
    rsys.code,
    rsys.name::TEXT,
    rsys.description::TEXT,
    rsys.min_value,
    rsys.max_value,
    rsys.step,
    rsys.default_initial_value,
    rsys.is_active
  FROM rating_system rsys
  INNER JOIN sport s ON rsys.sport_id = s.id
  WHERE s.name = p_sport_name
    AND rsys.is_active = TRUE
  ORDER BY rsys.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_rating_systems_for_sport(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_rating_systems_for_sport(TEXT) TO anon;

COMMENT ON FUNCTION get_rating_systems_for_sport IS 'Fetches all active rating systems for a specific sport';

-- ============================================
-- PHASE 4: VERIFICATION
-- ============================================

DO $$
DECLARE
  tennis_count INTEGER;
  pickleball_count INTEGER;
BEGIN
  -- Count Tennis NTRP ratings
  SELECT COUNT(*) INTO tennis_count
  FROM get_rating_scores_by_type('tennis', 'ntrp');
  
  -- Count Pickleball DUPR ratings
  SELECT COUNT(*) INTO pickleball_count
  FROM get_rating_scores_by_type('pickleball', 'dupr');
  
  RAISE NOTICE 'Verification: Tennis NTRP ratings = %, Pickleball DUPR ratings = %', tennis_count, pickleball_count;
  
  IF tennis_count < 6 THEN
    RAISE WARNING 'Expected at least 6 Tennis NTRP ratings, found %', tennis_count;
  END IF;
  
  IF pickleball_count < 6 THEN
    RAISE WARNING 'Expected at least 6 Pickleball DUPR ratings, found %', pickleball_count;
  END IF;
END $$;

