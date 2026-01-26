-- Migration: Add player_favorite_facility table for favorite facilities feature
-- This allows players to store up to 3 favorite facilities for quick access
-- Created: 2025-01-25

-- Create the player_favorite_facility table
CREATE TABLE IF NOT EXISTS player_favorite_facility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facility(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each player can only favorite a facility once
  CONSTRAINT player_favorite_facility_unique UNIQUE(player_id, facility_id),
  -- Display order must be between 1 and 3 (max 3 favorites)
  CONSTRAINT player_favorite_facility_order_check CHECK (display_order >= 1 AND display_order <= 3)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_player_favorite_facility_player_id ON player_favorite_facility(player_id);
CREATE INDEX IF NOT EXISTS idx_player_favorite_facility_facility_id ON player_favorite_facility(facility_id);

-- Enable RLS
ALTER TABLE player_favorite_facility ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Players can view their own favorite facilities
CREATE POLICY "Players can view own favorite facilities"
  ON player_favorite_facility FOR SELECT
  USING (auth.uid() = player_id);

-- Players can insert their own favorite facilities (max 3 enforced by app logic)
CREATE POLICY "Players can insert own favorite facilities"
  ON player_favorite_facility FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Players can update their own favorite facilities
CREATE POLICY "Players can update own favorite facilities"
  ON player_favorite_facility FOR UPDATE
  USING (auth.uid() = player_id);

-- Players can delete their own favorite facilities
CREATE POLICY "Players can delete own favorite facilities"
  ON player_favorite_facility FOR DELETE
  USING (auth.uid() = player_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_player_favorite_facility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER player_favorite_facility_updated_at
  BEFORE UPDATE ON player_favorite_facility
  FOR EACH ROW
  EXECUTE FUNCTION update_player_favorite_facility_updated_at();

-- Comment on table
COMMENT ON TABLE player_favorite_facility IS 'Junction table linking players to their favorite facilities (max 3)';
COMMENT ON COLUMN player_favorite_facility.display_order IS 'Order of display (1-3), allows user to prioritize favorites';
