-- ============================================================================
-- Migration: Remove Duplicate match_type Column
-- Created: 2026-01-02
-- Description: The match table has both match_type and player_expectation columns
--              that both use match_type_enum and store the same value. This migration
--              removes the redundant match_type column and keeps player_expectation
--              as it's more semantically meaningful.
-- ============================================================================

-- Step 1: Sync any mismatched data (ensure player_expectation has correct value)
-- Some records might have match_type set but player_expectation NULL
UPDATE match 
SET player_expectation = match_type 
WHERE player_expectation IS NULL AND match_type IS NOT NULL;

-- Step 2: Make player_expectation NOT NULL with default value
-- First set default for any remaining NULL values
UPDATE match 
SET player_expectation = 'both' 
WHERE player_expectation IS NULL;

-- Step 3: Alter player_expectation to be NOT NULL with a default
ALTER TABLE match 
ALTER COLUMN player_expectation SET NOT NULL,
ALTER COLUMN player_expectation SET DEFAULT 'both';

-- Step 4: Drop the redundant match_type column
ALTER TABLE match DROP COLUMN IF EXISTS match_type;

-- Step 5: Add comment for documentation
COMMENT ON COLUMN match.player_expectation IS 'The type of match: casual (relaxed/practice), competitive (ranked/serious), or both (open to either)';

