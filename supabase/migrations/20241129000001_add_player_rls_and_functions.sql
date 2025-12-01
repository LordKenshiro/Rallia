-- Add RLS policies for player table and create missing RPC functions
-- This fixes the 403 Forbidden error and missing get_gender_types function

-- ========================================
-- PART 1: RLS Policies for player table
-- ========================================

-- Enable RLS on player table (if not already enabled)
ALTER TABLE player ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own player data" ON player;
DROP POLICY IF EXISTS "Users can insert their own player data" ON player;
DROP POLICY IF EXISTS "Users can update their own player data" ON player;
DROP POLICY IF EXISTS "Users can delete their own player data" ON player;

-- Policy: Users can view their own player data
CREATE POLICY "Users can view their own player data"
ON player
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy: Users can insert their own player data
CREATE POLICY "Users can insert their own player data"
ON player
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own player data
CREATE POLICY "Users can update their own player data"
ON player
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Users can delete their own player data (optional)
CREATE POLICY "Users can delete their own player data"
ON player
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- ========================================
-- PART 2: Create get_gender_types RPC function
-- ========================================

-- Drop the function if it exists
DROP FUNCTION IF EXISTS get_gender_types();

-- Create function to get gender types from enum
CREATE OR REPLACE FUNCTION get_gender_types()
RETURNS TABLE(value TEXT, label TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    enumlabel::TEXT AS value,
    enumlabel::TEXT AS label
  FROM pg_enum
  WHERE enumtypid = 'gender_type'::regtype
  ORDER BY enumsortorder;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_gender_types() TO authenticated;

-- Add comments for documentation
COMMENT ON POLICY "Users can view their own player data" ON player IS 'Allows authenticated users to read their own player data';
COMMENT ON POLICY "Users can insert their own player data" ON player IS 'Allows authenticated users to create their own player record during onboarding';
COMMENT ON POLICY "Users can update their own player data" ON player IS 'Allows authenticated users to update their own player data';
COMMENT ON POLICY "Users can delete their own player data" ON player IS 'Allows authenticated users to delete their own player data';
COMMENT ON FUNCTION get_gender_types() IS 'Returns all available gender types from the gender_type enum';
