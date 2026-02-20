-- Migration: Consolidate player location data onto player table
-- Created: 2026-02-20
-- Description:
--   Moves all location data (address, city, province) from profile to player table.
--   Renames postal_code_country -> country, postal_code_lat -> latitude,
--   postal_code_long -> longitude. Replaces manual postal_code_location with
--   auto-generated location geography column.

-- ============================================================================
-- 1. Add new columns to player table
-- ============================================================================
ALTER TABLE player ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE player ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE player ADD COLUMN IF NOT EXISTS province TEXT;

-- ============================================================================
-- 2. Copy address, city, province data from profile to player (existing rows)
-- ============================================================================
UPDATE player
SET
  address = p.address,
  city = p.city,
  province = p.province
FROM profile p
WHERE player.id = p.id;

-- ============================================================================
-- 3. Rename columns on player table
-- ============================================================================
ALTER TABLE player RENAME COLUMN postal_code_country TO country;
ALTER TABLE player RENAME COLUMN postal_code_lat TO latitude;
ALTER TABLE player RENAME COLUMN postal_code_long TO longitude;

-- ============================================================================
-- 4. Drop postal_code_location column and recreate as auto-generated location
-- ============================================================================
-- Drop the old spatial index first
DROP INDEX IF EXISTS idx_player_postal_code_location_geo;

-- Drop the old manual column
ALTER TABLE player DROP COLUMN IF EXISTS postal_code_location;

-- Add auto-generated geography column (same pattern as match.location)
ALTER TABLE player ADD COLUMN IF NOT EXISTS location extensions.geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE
      WHEN latitude IS NOT NULL AND longitude IS NOT NULL
      THEN extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)::extensions.geography
      ELSE NULL
    END
  ) STORED;

-- ============================================================================
-- 5. Create new spatial index
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_player_location_geo ON player USING GIST (location);

-- ============================================================================
-- 6. Drop location columns from profile table
-- ============================================================================
ALTER TABLE profile DROP COLUMN IF EXISTS address;
ALTER TABLE profile DROP COLUMN IF EXISTS postal_code;
ALTER TABLE profile DROP COLUMN IF EXISTS city;
ALTER TABLE profile DROP COLUMN IF EXISTS province;
ALTER TABLE profile DROP COLUMN IF EXISTS country;

-- ============================================================================
-- 7. Add index on player.city for search performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_player_city ON player (city);

-- ============================================================================
-- 8. Add comments for documentation
-- ============================================================================
COMMENT ON COLUMN player.address IS 'Street address from onboarding';
COMMENT ON COLUMN player.city IS 'City name from onboarding';
COMMENT ON COLUMN player.province IS 'Province/state code (e.g. QC, ON)';
COMMENT ON COLUMN player.country IS 'Country code: CA or US';
COMMENT ON COLUMN player.latitude IS 'Latitude from geocoded postal code centroid';
COMMENT ON COLUMN player.longitude IS 'Longitude from geocoded postal code centroid';
COMMENT ON COLUMN player.location IS 'Auto-generated PostGIS geography point from latitude/longitude for spatial queries';
