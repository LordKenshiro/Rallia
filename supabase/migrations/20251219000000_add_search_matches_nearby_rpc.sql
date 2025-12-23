-- Migration: Add search_matches_nearby RPC function
-- Description: PostGIS-based function to search public matches at facilities within a given distance

-- Drop old function if exists (to handle signature change)
DROP FUNCTION IF EXISTS search_matches_nearby(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INT, INT);

CREATE OR REPLACE FUNCTION search_matches_nearby(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_max_distance_km DOUBLE PRECISION,
  p_sport_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  match_id UUID,
  distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS match_id,
    extensions.ST_Distance(
      f.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography
    ) AS distance_meters
  FROM match m
  INNER JOIN facility f ON f.id = m.facility_id
  WHERE m.location_type = 'facility'
    AND m.visibility = 'public'
    AND m.status = 'scheduled'
    AND m.sport_id = p_sport_id  -- Filter by selected sport
    AND f.is_active = TRUE
    AND f.location IS NOT NULL
    AND extensions.ST_DWithin(
      f.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography,
      p_max_distance_km * 1000  -- Convert km to meters
    )
    AND m.match_date >= CURRENT_DATE  -- Only future matches
  ORDER BY 
    (m.match_date + m.start_time)::timestamp ASC  -- Sort by combined datetime (date + time)
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION search_matches_nearby IS 'Search public matches at facilities within a given distance from user location, filtered by sport. Returns match IDs sorted by date/time.';

