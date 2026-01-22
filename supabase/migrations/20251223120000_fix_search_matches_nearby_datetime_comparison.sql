-- Migration: Fix search_matches_nearby datetime comparison
-- Description: Fix the datetime comparison to properly filter out matches that have already started.
--              The previous logic had an issue with timezone conversion. This version explicitly
--              constructs the match datetime in the match's timezone and compares it correctly.

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
    AND m.cancelled_at IS NULL
    AND m.sport_id = p_sport_id  -- Filter by selected sport
    AND f.is_active = TRUE
    AND f.location IS NOT NULL
    AND extensions.ST_DWithin(
      f.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography,
      p_max_distance_km * 1000  -- Convert km to meters
    )
    -- Only matches where (date + time) in match's timezone is in the future
    -- Construct match datetime: combine date and time, interpret in match timezone, convert to UTC
    AND (
      CASE 
        WHEN m.timezone IS NOT NULL THEN
          -- timezone() function: treats the timestamp as being in the specified timezone and converts to UTC
          timezone(m.timezone, (m.match_date + m.start_time)::timestamp) > current_time_utc
        ELSE
          -- Fallback: if no timezone, compare timestamp directly (assumes server timezone)
          (m.match_date + m.start_time)::timestamp > (current_time_utc AT TIME ZONE 'UTC')::timestamp
      END
    )
  ORDER BY 
    (m.match_date + m.start_time)::timestamp ASC  -- Sort by combined datetime (date + time)
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Update comment for documentation
COMMENT ON FUNCTION search_matches_nearby IS 'Search public matches at facilities within a given distance from user location, filtered by sport. Only returns matches where (match_date + start_time) is in the future, accounting for the match timezone. Returns match IDs sorted by date/time.';

