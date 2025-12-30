-- Add geography point column to match table for spatial queries
-- This is a computed column derived from custom_latitude and custom_longitude

-- Ensure PostGIS extension is enabled (required for geography type)
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Add the geography column as a generated/computed column
-- Note: For custom locations, we use custom_latitude/custom_longitude
-- For facility locations, the facility table already has the geography point
ALTER TABLE match ADD COLUMN IF NOT EXISTS location extensions.geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE 
      WHEN custom_latitude IS NOT NULL AND custom_longitude IS NOT NULL 
      THEN extensions.ST_SetSRID(extensions.ST_MakePoint(custom_longitude, custom_latitude), 4326)::extensions.geography
      ELSE NULL
    END
  ) STORED;

-- Create spatial index for efficient proximity queries
CREATE INDEX IF NOT EXISTS idx_match_location_gist ON match USING GIST (location);

-- Add comment for documentation
COMMENT ON COLUMN match.location IS 'Geography point for custom locations, auto-computed from custom_latitude/custom_longitude. Use for spatial queries like finding nearby matches.';



