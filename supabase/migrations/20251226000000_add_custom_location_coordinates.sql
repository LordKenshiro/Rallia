-- ============================================================================
-- Migration: Add Custom Location Coordinates to Match Table
-- Created: 2024-12-26
-- Description: Add latitude and longitude columns to store coordinates for
--              custom location matches (location_type = 'custom').
--              This enables displaying custom location matches on maps alongside
--              facility-based matches.
-- ============================================================================

-- Add latitude column for custom locations
ALTER TABLE match ADD COLUMN IF NOT EXISTS custom_latitude NUMERIC(10, 7);

-- Add longitude column for custom locations
ALTER TABLE match ADD COLUMN IF NOT EXISTS custom_longitude NUMERIC(10, 7);

-- Add index for spatial queries on custom locations (useful for future map queries)
CREATE INDEX IF NOT EXISTS idx_match_custom_location 
ON match(custom_latitude, custom_longitude) 
WHERE location_type = 'custom' AND custom_latitude IS NOT NULL AND custom_longitude IS NOT NULL;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN match.custom_latitude IS 'Latitude coordinate for custom locations (when location_type=custom). Populated from Google Places API.';
COMMENT ON COLUMN match.custom_longitude IS 'Longitude coordinate for custom locations (when location_type=custom). Populated from Google Places API.';


