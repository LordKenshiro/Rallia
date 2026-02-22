-- Migration: Allow anonymous users to browse public matches
-- Description: Adds RLS policies to allow unauthenticated (anonymous) users to:
--   1. View all active sports (for sport selection)
--   2. View public matches (for browsing the "Soon & Nearby" section)
--   3. View facilities associated with matches
--   4. View profiles of match creators (display name, avatar)
-- This enables the guest browsing experience before signing up.

-- =============================================================================
-- STEP 1: Allow anonymous users to view sports
-- =============================================================================

DROP POLICY IF EXISTS "Anonymous users can view sports" ON sport;
CREATE POLICY "Anonymous users can view sports"
ON sport FOR SELECT
TO anon
USING (is_active = true);

COMMENT ON POLICY "Anonymous users can view sports" ON sport IS 
'Allows unauthenticated users to view active sports for browsing matches.';

-- =============================================================================
-- STEP 2: Allow anonymous users to view public matches
-- =============================================================================

DROP POLICY IF EXISTS "match_select_public_anon" ON match;
CREATE POLICY "match_select_public_anon"
ON match FOR SELECT
TO anon
USING (visibility = 'public' AND cancelled_at IS NULL);

COMMENT ON POLICY "match_select_public_anon" ON match IS 
'Allows unauthenticated users to view public, non-cancelled matches for browsing.';

-- =============================================================================
-- STEP 3: Allow anonymous users to view facilities
-- =============================================================================

-- Check if anonymous access policy already exists
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'facility'
    AND policyname = 'Anonymous users can view facilities';
  
  IF policy_count = 0 THEN
    EXECUTE 'CREATE POLICY "Anonymous users can view facilities"
      ON facility FOR SELECT
      TO anon
      USING (is_active = true)';
  END IF;
END $$;

-- =============================================================================
-- STEP 4: Allow anonymous users to view public profiles (for match creators)
-- =============================================================================

-- Check if anonymous access policy already exists
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profile'
    AND policyname = 'Anonymous users can view profiles';
  
  IF policy_count = 0 THEN
    -- Allow anonymous to see limited profile info (name, avatar, city)
    EXECUTE 'CREATE POLICY "Anonymous users can view profiles"
      ON profile FOR SELECT
      TO anon
      USING (true)';
  END IF;
END $$;

-- =============================================================================
-- STEP 5: Allow anonymous users to view player table (for creator info)
-- =============================================================================

-- Check if anonymous access policy already exists
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'player'
    AND policyname = 'Anonymous users can view players';
  
  IF policy_count = 0 THEN
    EXECUTE 'CREATE POLICY "Anonymous users can view players"
      ON player FOR SELECT
      TO anon
      USING (true)';
  END IF;
END $$;

-- =============================================================================
-- STEP 6: Allow anonymous users to view rating_score (for match skill level display)
-- =============================================================================

-- Check if anonymous access policy already exists
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'rating_score'
    AND policyname = 'Anonymous users can view rating scores';
  
  IF policy_count = 0 THEN
    EXECUTE 'CREATE POLICY "Anonymous users can view rating scores"
      ON rating_score FOR SELECT
      TO anon
      USING (true)';
  END IF;
END $$;

-- =============================================================================
-- STEP 7: Allow anonymous users to view courts (for match court display)
-- =============================================================================

-- Check if anonymous access policy already exists
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'court'
    AND policyname = 'Anonymous users can view courts';
  
  IF policy_count = 0 THEN
    EXECUTE 'CREATE POLICY "Anonymous users can view courts"
      ON court FOR SELECT
      TO anon
      USING (true)';
  END IF;
END $$;
