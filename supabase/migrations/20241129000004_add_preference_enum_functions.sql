-- Add RPC functions for preference enums
-- This enables dynamic dropdowns in PlayerPreferencesOverlay

-- ========================================
-- PART 1: get_playing_hand_types RPC function
-- ========================================

DROP FUNCTION IF EXISTS get_playing_hand_types();

CREATE OR REPLACE FUNCTION get_playing_hand_types()
RETURNS TABLE(value TEXT, label TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    enumlabel::TEXT AS value,
    CASE enumlabel::TEXT
      WHEN 'left' THEN 'Left'
      WHEN 'right' THEN 'Right'
      WHEN 'both' THEN 'Both'
      ELSE enumlabel::TEXT
    END AS label
  FROM pg_enum
  WHERE enumtypid = 'playing_hand'::regtype
  ORDER BY enumsortorder;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_playing_hand_types() TO authenticated;
GRANT EXECUTE ON FUNCTION get_playing_hand_types() TO anon;

-- ========================================
-- PART 2: get_match_duration_types RPC function
-- ========================================

DROP FUNCTION IF EXISTS get_match_duration_types();

CREATE OR REPLACE FUNCTION get_match_duration_types()
RETURNS TABLE(value TEXT, label TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    enumlabel::TEXT AS value,
    CASE enumlabel::TEXT
      WHEN '1h' THEN '1 hour'
      WHEN '1.5h' THEN '1.5 hours'
      WHEN '2h' THEN '2 hours'
      ELSE enumlabel::TEXT
    END AS label
  FROM pg_enum
  WHERE enumtypid = 'match_duration'::regtype
  ORDER BY enumsortorder;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_match_duration_types() TO authenticated;
GRANT EXECUTE ON FUNCTION get_match_duration_types() TO anon;

-- ========================================
-- PART 3: get_match_type_types RPC function
-- ========================================

DROP FUNCTION IF EXISTS get_match_type_types();

CREATE OR REPLACE FUNCTION get_match_type_types()
RETURNS TABLE(value TEXT, label TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    enumlabel::TEXT AS value,
    CASE enumlabel::TEXT
      WHEN 'casual' THEN 'Casual'
      WHEN 'competitive' THEN 'Competitive'
      WHEN 'both' THEN 'Both'
      ELSE enumlabel::TEXT
    END AS label
  FROM pg_enum
  WHERE enumtypid = 'match_type'::regtype
  ORDER BY enumsortorder;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_match_type_types() TO authenticated;
GRANT EXECUTE ON FUNCTION get_match_type_types() TO anon;

-- ========================================
-- PART 4: Verify functions work
-- ========================================

DO $$
DECLARE
  hand_count INTEGER;
  duration_count INTEGER;
  type_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO hand_count FROM get_playing_hand_types();
  SELECT COUNT(*) INTO duration_count FROM get_match_duration_types();
  SELECT COUNT(*) INTO type_count FROM get_match_type_types();
  
  RAISE NOTICE 'get_playing_hand_types() verified: % options found', hand_count;
  RAISE NOTICE 'get_match_duration_types() verified: % options found', duration_count;
  RAISE NOTICE 'get_match_type_types() verified: % options found', type_count;
END $$;

-- Add comments
COMMENT ON FUNCTION get_playing_hand_types() IS 'Returns all playing hand options from playing_hand enum for PlayerPreferencesOverlay';
COMMENT ON FUNCTION get_match_duration_types() IS 'Returns all match duration options from match_duration enum for PlayerPreferencesOverlay';
COMMENT ON FUNCTION get_match_type_types() IS 'Returns all match type options from match_type enum for PlayerPreferencesOverlay';
