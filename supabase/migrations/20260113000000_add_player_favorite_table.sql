-- Migration: Add player_favorite table for favorites feature
-- Description: Creates a junction table to store player favorites (user-to-player relationship)
-- This enables users to favorite other players and filter by favorites in the Community screen

-- Create the player_favorite table
CREATE TABLE IF NOT EXISTS player_favorite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,  -- The user who is favoriting
  favorite_player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,  -- The player being favorited
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate favorites (a user can only favorite another player once)
  CONSTRAINT player_favorite_unique UNIQUE(player_id, favorite_player_id),
  
  -- Prevent self-favoriting
  CONSTRAINT player_favorite_no_self CHECK (player_id != favorite_player_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_player_favorite_player_id ON player_favorite(player_id);
CREATE INDEX IF NOT EXISTS idx_player_favorite_favorite_player_id ON player_favorite(favorite_player_id);

-- Enable Row Level Security
ALTER TABLE player_favorite ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
  ON player_favorite
  FOR SELECT
  USING (auth.uid() = player_id);

-- Users can add favorites
CREATE POLICY "Users can add favorites"
  ON player_favorite
  FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Users can remove their own favorites
CREATE POLICY "Users can delete their own favorites"
  ON player_favorite
  FOR DELETE
  USING (auth.uid() = player_id);

-- Add comment to table
COMMENT ON TABLE player_favorite IS 'Stores player favorites - allows users to mark other players as favorites for quick access';
COMMENT ON COLUMN player_favorite.player_id IS 'The user who is marking another player as favorite';
COMMENT ON COLUMN player_favorite.favorite_player_id IS 'The player being marked as favorite';
