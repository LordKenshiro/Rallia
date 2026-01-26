-- Migration: Change preferred_play_style column from enum to TEXT
-- This allows storing play style names directly from the play_style table
-- Created: 2026-01-26

-- Change the column type from play_style_enum to TEXT
-- Note: This requires dropping the old index first, then recreating it
DROP INDEX IF EXISTS idx_player_sport_play_style;

-- Alter the column type - PostgreSQL handles the enum-to-text conversion automatically
ALTER TABLE player_sport
ALTER COLUMN preferred_play_style TYPE TEXT
USING preferred_play_style::TEXT;

-- Recreate the index on the text column
CREATE INDEX IF NOT EXISTS idx_player_sport_play_style 
ON player_sport(preferred_play_style) 
WHERE preferred_play_style IS NOT NULL;

-- Add a comment explaining the new column purpose
COMMENT ON COLUMN player_sport.preferred_play_style IS 'Player preferred play style name (references play_style.name for this sport)';

-- Optional: Drop the old enum type if no longer needed elsewhere
-- (Commenting out to be safe - only uncomment if you're sure the enum isn't used elsewhere)
-- DROP TYPE IF EXISTS play_style_enum;
