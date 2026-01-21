-- Add postal code location columns to player table
-- These columns store the user's home location based on their postal code
-- Used for finding nearby matches and calculating distances

-- Ensure PostGIS extension is enabled (required for geography type)
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

ALTER TABLE player ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE player ADD COLUMN IF NOT EXISTS postal_code_country VARCHAR(2); -- 'CA' or 'US'
ALTER TABLE player ADD COLUMN IF NOT EXISTS postal_code_lat DECIMAL(9,6);
ALTER TABLE player ADD COLUMN IF NOT EXISTS postal_code_long DECIMAL(9,6);
ALTER TABLE player ADD COLUMN IF NOT EXISTS postal_code_location extensions.geography(Point,4326);

-- Index for spatial queries (find players near a location)
CREATE INDEX IF NOT EXISTS idx_player_postal_code_location_geo 
  ON player USING GIST(postal_code_location);

-- Comments for documentation
COMMENT ON COLUMN player.postal_code IS 'User postal/ZIP code (CA: A1A 1A1, US: 12345)';
COMMENT ON COLUMN player.postal_code_country IS 'Country code: CA or US';
COMMENT ON COLUMN player.postal_code_lat IS 'Latitude from geocoded postal code centroid';
COMMENT ON COLUMN player.postal_code_long IS 'Longitude from geocoded postal code centroid';
COMMENT ON COLUMN player.postal_code_location IS 'PostGIS geography point for spatial queries';
