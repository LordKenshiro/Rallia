-- Migration Part 2: Use the new 'casual' value and migrate data
-- This runs after the enum value has been committed

-- Step 1: Update existing data - change 'practice' to 'casual' in match.player_expectation
-- Cast to text for comparison since 'practice' is no longer a valid enum value
UPDATE match SET player_expectation = 'casual'::match_type_enum WHERE player_expectation::text = 'practice';

-- Step 2: Update existing data in player_sport_profile if any have 'practice'
-- Cast to text for comparison since 'practice' is no longer a valid enum value
UPDATE player_sport_profile SET preferred_match_type = 'casual'::match_type_enum WHERE preferred_match_type::text = 'practice';

-- Step 3: Migrate match.match_type column from match_type enum to match_type_enum
-- First, create a temporary column
ALTER TABLE match ADD COLUMN match_type_new match_type_enum;

-- Copy data with type conversion (casual maps to casual, competitive to competitive, both to both)
UPDATE match SET match_type_new = CASE 
  WHEN match_type::text = 'casual' THEN 'casual'::match_type_enum
  WHEN match_type::text = 'competitive' THEN 'competitive'::match_type_enum
  WHEN match_type::text = 'both' THEN 'both'::match_type_enum
  ELSE 'both'::match_type_enum
END;

-- Drop the old column and rename the new one
ALTER TABLE match DROP COLUMN match_type;
ALTER TABLE match RENAME COLUMN match_type_new TO match_type;
ALTER TABLE match ALTER COLUMN match_type SET NOT NULL;

-- Step 4: Migrate player_sport.preferred_match_type from match_type enum to match_type_enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'player_sport' AND column_name = 'preferred_match_type'
  ) THEN
    -- Create temporary column
    ALTER TABLE player_sport ADD COLUMN preferred_match_type_new match_type_enum;
    
    -- Copy data (casual maps to casual, competitive to competitive, both to both)
    UPDATE player_sport SET preferred_match_type_new = CASE
      WHEN preferred_match_type::text = 'casual' THEN 'casual'::match_type_enum
      WHEN preferred_match_type::text = 'competitive' THEN 'competitive'::match_type_enum
      WHEN preferred_match_type::text = 'both' THEN 'both'::match_type_enum
      ELSE NULL
    END WHERE preferred_match_type IS NOT NULL;
    
    -- Drop old and rename new
    ALTER TABLE player_sport DROP COLUMN preferred_match_type;
    ALTER TABLE player_sport RENAME COLUMN preferred_match_type_new TO preferred_match_type;
  END IF;
END $$;

-- Step 5: Update any functions that return match_type values
-- Drop and recreate the function to use match_type_enum instead of match_type
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
  WHERE enumtypid = 'match_type_enum'::regtype
  ORDER BY enumsortorder;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_match_type_types() TO authenticated;
GRANT EXECUTE ON FUNCTION get_match_type_types() TO anon;

-- Step 6: Drop the old match_type enum if possible
DROP TYPE IF EXISTS match_type CASCADE;

-- Step 7: Add comment
COMMENT ON TYPE match_type_enum IS 'Match type: casual, competitive, or both (open to either)';

