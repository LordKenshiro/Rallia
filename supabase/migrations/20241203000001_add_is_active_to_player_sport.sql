-- Migration: Add is_active column to player_sport table
-- Purpose: Allow toggling sport activation without deleting entries (preserves history)
-- Date: 2024-12-03

-- Add is_active column to player_sport table
ALTER TABLE player_sport
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add comment explaining the column
COMMENT ON COLUMN player_sport.is_active IS 'Whether this sport is currently active for the player (allows deactivation without data loss)';

-- Create index for efficient filtering by is_active
CREATE INDEX IF NOT EXISTS idx_player_sport_is_active ON player_sport(is_active);

-- Update any existing records to set is_active = true
UPDATE player_sport SET is_active = TRUE WHERE is_active IS NULL;
