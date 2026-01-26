-- Migration: Revert preferred_play_style column back to enum
-- The column should remain as play_style_enum - we'll use joins to get play_style data instead
-- Created: 2026-01-26

-- Drop the text index if it exists
DROP INDEX IF EXISTS idx_player_sport_play_style;

-- Change the column back from TEXT to play_style_enum
-- We need to handle any values that don't exist in the enum
UPDATE player_sport 
SET preferred_play_style = NULL 
WHERE preferred_play_style IS NOT NULL 
  AND preferred_play_style NOT IN ('counterpuncher', 'aggressive_baseliner', 'serve_and_volley', 'all_court', 'banger', 'soft_game', 'hybrid', 'dinker');

-- Alter column back to enum type
ALTER TABLE player_sport
ALTER COLUMN preferred_play_style TYPE play_style_enum
USING preferred_play_style::play_style_enum;

-- Recreate the index
CREATE INDEX IF NOT EXISTS idx_player_sport_play_style 
ON player_sport(preferred_play_style) 
WHERE preferred_play_style IS NOT NULL;

-- Restore comment
COMMENT ON COLUMN player_sport.preferred_play_style IS 'Player preferred play style for this sport';
