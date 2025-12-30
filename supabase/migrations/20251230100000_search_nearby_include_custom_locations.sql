-- Migration: Update search_matches_nearby to include custom location matches
-- Description: The "Soon & Nearby" section should include matches with custom locations
--              in addition to facility-based matches. Custom locations have their coordinates
--              stored directly on the match record (custom_latitude, custom_longitude).

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
DECLARE
  current_time_utc TIMESTAMPTZ := NOW();
  v_user_point extensions.geography;
BEGIN
  -- Create user point for distance calculations
  v_user_point := extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography;

  RETURN QUERY
  SELECT
    m.id AS match_id,
    -- Calculate distance based on location type
    CASE 
      WHEN m.location_type = 'facility' AND f.location IS NOT NULL THEN
        extensions.ST_Distance(f.location, v_user_point)
      WHEN m.location_type = 'custom' AND m.custom_latitude IS NOT NULL AND m.custom_longitude IS NOT NULL THEN
        extensions.ST_Distance(
          extensions.ST_SetSRID(extensions.ST_MakePoint(m.custom_longitude, m.custom_latitude), 4326)::extensions.geography,
          v_user_point
        )
      ELSE
        NULL
    END AS distance_meters
  FROM match m
  LEFT JOIN facility f ON f.id = m.facility_id
  WHERE m.visibility = 'public'
    AND m.status = 'scheduled'
    AND m.sport_id = p_sport_id
    -- Include both facility and custom location types with valid coordinates
    AND (
      (m.location_type = 'facility' AND f.is_active = TRUE AND f.location IS NOT NULL)
      OR (m.location_type = 'custom' AND m.custom_latitude IS NOT NULL AND m.custom_longitude IS NOT NULL)
    )
    -- Distance filter for both location types
    AND (
      -- Facility matches: check facility location
      (m.location_type = 'facility' AND extensions.ST_DWithin(
        f.location,
        v_user_point,
        p_max_distance_km * 1000
      ))
      OR
      -- Custom location matches: check custom coordinates
      (m.location_type = 'custom' AND extensions.ST_DWithin(
        extensions.ST_SetSRID(extensions.ST_MakePoint(m.custom_longitude, m.custom_latitude), 4326)::extensions.geography,
        v_user_point,
        p_max_distance_km * 1000
      ))
    )
    -- Only matches where (date + time) in match's timezone is in the future
    AND (
      CASE 
        WHEN m.timezone IS NOT NULL THEN
          timezone(m.timezone, (m.match_date + m.start_time)::timestamp) > current_time_utc
        ELSE
          (m.match_date + m.start_time)::timestamp > (current_time_utc AT TIME ZONE 'UTC')::timestamp
      END
    )
  ORDER BY 
    (m.match_date + m.start_time)::timestamp ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Update comment for documentation
COMMENT ON FUNCTION search_matches_nearby IS 'Search public matches (both facility and custom location) within a given distance from user location, filtered by sport. Uses facility.location for facility matches and match.custom_latitude/custom_longitude for custom location matches. Only returns matches where (match_date + start_time) is in the future, accounting for the match timezone. Includes all matches regardless of capacity. Returns match IDs sorted by date/time.';

