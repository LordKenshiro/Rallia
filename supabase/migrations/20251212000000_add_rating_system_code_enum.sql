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
-- PHASE 1.5: SEED RATING SYSTEMS
-- ============================================
-- Insert the 5 rating systems if they don't already exist.
-- Uses ON CONFLICT on the unique code column to be idempotent.
-- Codes are inserted as lowercase (matching the enum values).

INSERT INTO rating_system (sport_id, code, name, description, min_value, max_value, step, default_initial_value, min_for_referral, is_active)
VALUES
  ((SELECT id FROM sport WHERE slug = 'tennis'), 'ntrp', 'NTRP', 'National Tennis Rating Program', 1.0, 7.0, 0.5, 3.0, 3.0, true),
  ((SELECT id FROM sport WHERE slug = 'tennis'), 'utr', 'UTR', 'Universal Tennis Rating', 1.0, 16.5, 0.01, 5.0, 4.0, true),
  ((SELECT id FROM sport WHERE slug = 'tennis'), 'self_tennis', 'Self Assessment (Tennis)', 'Player self-assessed tennis skill level', 1.0, 7.0, 0.5, 3.0, NULL, true),
  ((SELECT id FROM sport WHERE slug = 'pickleball'), 'dupr', 'DUPR', 'Dynamic Universal Pickleball Rating', 1.0, 8.0, 0.5, 3.0, 3.0, true),
  ((SELECT id FROM sport WHERE slug = 'pickleball'), 'self_pickle', 'Self Assessment (Pickleball)', 'Player self-assessed pickleball skill level', 1.0, 5.5, 0.5, 2.5, NULL, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  step = EXCLUDED.step,
  default_initial_value = EXCLUDED.default_initial_value,
  min_for_referral = EXCLUDED.min_for_referral;

-- ============================================
-- PHASE 2: UPDATE EXISTING DATA
-- ============================================

-- Update existing rating_system rows to use lowercase values
-- (Any previously-inserted data may have used uppercase like 'NTRP', 'DUPR', etc.)
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

