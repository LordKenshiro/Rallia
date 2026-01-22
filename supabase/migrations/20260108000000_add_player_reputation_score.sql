-- Add reputation_score column to player table
-- This column stores the player's reputation score (0-100) based on their behavior and reviews

ALTER TABLE player
ADD COLUMN IF NOT EXISTS reputation_score DECIMAL(5,2) DEFAULT 0.00 NOT NULL;

COMMENT ON COLUMN player.reputation_score IS 'Player reputation score (0-100) based on behavior, reviews, and reliability';

-- Create index for efficient sorting by reputation
CREATE INDEX IF NOT EXISTS idx_player_reputation_score ON player(reputation_score DESC);
