-- Migration: Add preferred_facility_id column to player_sport table
-- Purpose: Allow players to set a preferred facility for each sport, which will be pre-selected in match creation
-- Date: 2025-12-25

-- Add preferred_facility_id column to player_sport table
ALTER TABLE player_sport
ADD COLUMN IF NOT EXISTS preferred_facility_id UUID;

-- Add foreign key constraint to facility table (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'player_sport_preferred_facility_id_fkey'
    ) THEN
        ALTER TABLE player_sport
        ADD CONSTRAINT player_sport_preferred_facility_id_fkey
        FOREIGN KEY (preferred_facility_id) REFERENCES facility(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add comment explaining the column
COMMENT ON COLUMN player_sport.preferred_facility_id IS 'Preferred facility for this sport, will be pre-selected when creating matches';

-- Create index for efficient filtering by preferred_facility_id
CREATE INDEX IF NOT EXISTS idx_player_sport_preferred_facility_id ON player_sport(preferred_facility_id);

