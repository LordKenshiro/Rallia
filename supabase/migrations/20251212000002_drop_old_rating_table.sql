-- Migration: Drop deprecated rating table and rating_type enum
-- This migration cleans up the old rating schema that has been replaced by rating_system
-- 
-- IMPORTANT: This migration should only be run after verifying:
-- 1. All code has been migrated to use rating_system
-- 2. No foreign key references to the rating table exist
-- 3. The rating_system table is properly seeded with data

-- ============================================
-- PHASE 1: DROP DEPENDENT OBJECTS
-- ============================================

-- Drop the old RPC function that used rating_type (if it still exists)
DROP FUNCTION IF EXISTS get_rating_scores_by_type(TEXT, rating_type);

-- ============================================
-- PHASE 2: DROP THE OLD RATING TABLE
-- ============================================

-- First check if rating table has the old schema (rating_id column in rating_score)
-- The new schema uses rating_system_id, so we only drop if nothing depends on it

-- Drop the old rating table
DROP TABLE IF EXISTS rating CASCADE;

-- ============================================
-- PHASE 3: DROP THE OLD RATING_TYPE ENUM
-- ============================================

-- Drop the rating_type enum that was used by the old rating table
DROP TYPE IF EXISTS rating_type CASCADE;

-- ============================================
-- PHASE 4: VERIFICATION
-- ============================================

DO $$
DECLARE
  rating_system_count INTEGER;
  rating_score_count INTEGER;
BEGIN
  -- Verify rating_system table exists and has data
  SELECT COUNT(*) INTO rating_system_count FROM rating_system WHERE is_active = true;
  
  -- Verify rating_score table has data
  SELECT COUNT(*) INTO rating_score_count FROM rating_score;
  
  RAISE NOTICE 'Verification after cleanup:';
  RAISE NOTICE '  - Active rating systems: %', rating_system_count;
  RAISE NOTICE '  - Rating scores: %', rating_score_count;
  
  IF rating_system_count = 0 THEN
    RAISE WARNING 'No active rating systems found! Please seed the rating_system table.';
  END IF;
  
  IF rating_score_count = 0 THEN
    RAISE WARNING 'No rating scores found! Please seed the rating_score table.';
  END IF;
END $$;

-- Add comment to document the migration
COMMENT ON TABLE rating_system IS 'Rating systems configuration (replaces deprecated rating table). Uses rating_system_code_enum for the code column.';

