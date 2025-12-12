-- Migration: Add rating_system_code_enum and update rating_system table
-- This migration:
-- 1. Creates a new enum for rating system codes
-- 2. Alters the rating_system.code column to use the enum
-- 3. Updates existing data to use lowercase enum values

-- ============================================
-- PHASE 1: CREATE THE ENUM
-- ============================================

-- Create new enum for rating system codes
CREATE TYPE rating_system_code_enum AS ENUM (
  'ntrp',           -- Tennis NTRP (National Tennis Rating Program)
  'utr',            -- Tennis UTR (Universal Tennis Rating)
  'self_tennis',    -- Tennis Self Assessment
  'dupr',           -- Pickleball DUPR (Dynamic Universal Pickleball Rating)
  'self_pickle'     -- Pickleball Self Assessment
);

COMMENT ON TYPE rating_system_code_enum IS 'Enum for standardized rating system codes across sports';

-- ============================================
-- PHASE 2: UPDATE EXISTING DATA
-- ============================================

-- Update existing rating_system rows to use lowercase values
-- (The seed data used uppercase like 'NTRP', 'DUPR', etc.)
UPDATE rating_system SET code = LOWER(code) WHERE code IS NOT NULL;

-- ============================================
-- PHASE 3: ALTER THE COLUMN TYPE
-- ============================================

-- Alter rating_system.code from varchar to the new enum
ALTER TABLE rating_system 
  ALTER COLUMN code TYPE rating_system_code_enum 
  USING code::rating_system_code_enum;

-- ============================================
-- PHASE 4: VERIFICATION
-- ============================================

DO $$
DECLARE
  rating_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rating_count FROM rating_system;
  RAISE NOTICE 'Rating systems after migration: %', rating_count;
  
  IF rating_count = 0 THEN
    RAISE WARNING 'No rating systems found after migration';
  END IF;
END $$;

