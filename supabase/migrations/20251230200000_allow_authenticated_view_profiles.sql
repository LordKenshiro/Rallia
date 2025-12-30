-- Migration: Allow authenticated users to view all profiles
-- Created: 2024-12-30
-- Description: Allows authenticated users to view basic profile information of other users.
--              This is required for displaying participant avatars and names in matches.
--
-- IMPORTANT: The current RLS policy "Users can view their own profile" only allows
-- users to see their own profile (auth.uid() = id). This means when fetching match
-- participants' profiles for avatars, the query returns null for other users.
--
-- This migration adds a new policy that allows all authenticated users to SELECT
-- from the profile table, enabling features like:
-- - Viewing participant avatars in match cards
-- - Displaying host names and pictures in match details
-- - Showing player profiles in search results
--
-- Note: UPDATE, INSERT, and DELETE are still restricted to own profile only.

-- =============================================================================
-- 1. DROP THE RESTRICTIVE POLICY
-- =============================================================================

-- Drop the existing restrictive policy that only allows viewing own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON profile;

-- =============================================================================
-- 2. CREATE NEW PERMISSIVE POLICY FOR VIEWING PROFILES
-- =============================================================================

-- Policy: All authenticated users can view all profiles
-- This enables viewing avatars and names of other players in matches
CREATE POLICY "Authenticated users can view all profiles"
ON profile
FOR SELECT
TO authenticated
USING (true);

-- Add comment for documentation
COMMENT ON POLICY "Authenticated users can view all profiles" ON profile IS 
'Allows authenticated users to read any profile. Required for viewing match participant avatars, host names, and player search. Sensitive data should be filtered at application level based on privacy settings.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify the policy was created
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profile'
    AND policyname = 'Authenticated users can view all profiles';
  
  IF policy_count = 0 THEN
    RAISE WARNING 'Policy "Authenticated users can view all profiles" was not created';
  ELSE
    RAISE NOTICE 'Successfully created profile viewing policy for authenticated users';
  END IF;
END $$;

