-- Test and verify get_gender_types function
-- This migration will ensure the function exists and works correctly

-- First, let's make absolutely sure the function exists
-- Drop and recreate to be certain
DROP FUNCTION IF EXISTS get_gender_types();

-- Create the function (using a slightly different approach for better compatibility)
CREATE OR REPLACE FUNCTION get_gender_types()
RETURNS TABLE(value TEXT, label TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    enumlabel::TEXT AS value,
    enumlabel::TEXT AS label
  FROM pg_enum
  WHERE enumtypid = 'gender_type'::regtype
  ORDER BY enumsortorder;
END;
$$;

-- Grant execute permission to authenticated AND anon users
GRANT EXECUTE ON FUNCTION get_gender_types() TO authenticated;
GRANT EXECUTE ON FUNCTION get_gender_types() TO anon;

-- Add helpful comment
COMMENT ON FUNCTION get_gender_types() IS 'Returns all available gender types from the gender_type enum. Used by PersonalInformationOverlay for dynamic gender dropdown.';

-- Verify the function works by selecting from it (this will show in migration output)
DO $$
DECLARE
  gender_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO gender_count FROM get_gender_types();
  RAISE NOTICE 'get_gender_types() function verified: % gender types found', gender_count;
END $$;
