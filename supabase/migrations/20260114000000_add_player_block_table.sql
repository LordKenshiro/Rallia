-- Migration: Add player_block table for block feature
-- Description: Creates a junction table to store blocked players (user-to-player relationship)
-- This enables users to block other players and hide them from search results

-- Create the player_block table
CREATE TABLE IF NOT EXISTS player_block (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,  -- The user who is blocking
  blocked_player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,  -- The player being blocked
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate blocks (a user can only block another player once)
  CONSTRAINT player_block_unique UNIQUE(player_id, blocked_player_id),
  
  -- Prevent self-blocking
  CONSTRAINT player_block_no_self CHECK (player_id != blocked_player_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_player_block_player_id ON player_block(player_id);
CREATE INDEX IF NOT EXISTS idx_player_block_blocked_player_id ON player_block(blocked_player_id);

-- Enable Row Level Security
ALTER TABLE player_block ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own blocks
CREATE POLICY "Users can view their own blocks"
  ON player_block
  FOR SELECT
  USING (auth.uid() = player_id);

-- Users can add blocks
CREATE POLICY "Users can add blocks"
  ON player_block
  FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Users can remove their own blocks (unblock)
CREATE POLICY "Users can delete their own blocks"
  ON player_block
  FOR DELETE
  USING (auth.uid() = player_id);

-- Add comments to table
COMMENT ON TABLE player_block IS 'Stores blocked players - allows users to block other players and hide them from search results';
COMMENT ON COLUMN player_block.player_id IS 'The user who is blocking another player';
COMMENT ON COLUMN player_block.blocked_player_id IS 'The player being blocked';
