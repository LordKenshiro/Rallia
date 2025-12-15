-- Migration: Add search_facilities_nearby RPC function
-- Description: PostGIS-based function to search facilities by sport, sorted by distance from user location

CREATE OR REPLACE FUNCTION search_facilities_nearby(
  p_sport_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_search_query TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  city VARCHAR(100),
  address VARCHAR(255),
  distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.name,
    f.city,
    f.address,
    extensions.ST_Distance(
      f.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography
    ) AS distance_meters
  FROM facility f
  INNER JOIN facility_sport fs ON fs.facility_id = f.id
  WHERE f.is_active = TRUE
    AND fs.sport_id = p_sport_id
    AND f.location IS NOT NULL
    AND (p_search_query IS NULL OR f.name ILIKE '%' || p_search_query || '%')
  ORDER BY distance_meters ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION search_facilities_nearby IS 'Search facilities by sport, sorted by distance from user location. Supports text search on facility name.';

