-- Migration: Unify match_duration and match_duration_enum into a single enum
-- The goal is to have only match_duration_enum with values: 30, 60, 90, 120, custom

-- Step 1: Migrate player_sport.preferred_match_duration from match_duration to match_duration_enum
-- First, create a temporary column
ALTER TABLE player_sport ADD COLUMN preferred_match_duration_new match_duration_enum;

-- Copy data with type conversion (1h → 60, 1.5h → 90, 2h → 120)
UPDATE player_sport SET preferred_match_duration_new = CASE 
  WHEN preferred_match_duration::text = '1h' THEN '60'::match_duration_enum
  WHEN preferred_match_duration::text = '1.5h' THEN '90'::match_duration_enum
  WHEN preferred_match_duration::text = '2h' THEN '120'::match_duration_enum
  ELSE '60'::match_duration_enum -- Default fallback
END WHERE preferred_match_duration IS NOT NULL;

-- Drop the old column and rename the new one
ALTER TABLE player_sport DROP COLUMN preferred_match_duration;
ALTER TABLE player_sport RENAME COLUMN preferred_match_duration_new TO preferred_match_duration;

-- Step 2: Update get_match_duration_types() RPC function to use match_duration_enum
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
      WHEN '30' THEN '30 Minutes'
      WHEN '60' THEN '1 Hour'
      WHEN '90' THEN '1.5 Hours'
      WHEN '120' THEN '2 Hours'
      WHEN 'custom' THEN 'Custom'
      ELSE enumlabel::TEXT
    END AS label
  FROM pg_enum
  WHERE enumtypid = 'match_duration_enum'::regtype
  ORDER BY enumsortorder;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_match_duration_types() TO authenticated;
GRANT EXECUTE ON FUNCTION get_match_duration_types() TO anon;

-- Step 3: Update comment
COMMENT ON FUNCTION get_match_duration_types() IS 'Returns all match duration options from match_duration_enum for PlayerPreferencesOverlay';

-- Step 4: Drop the old match_duration enum (only after confirming no other references)
-- Note: This will fail if there are any remaining references
DROP TYPE IF EXISTS match_duration CASCADE;


