-- Migration: Add search_public_matches RPC function
-- Description: Extended search function for public matches with text search and filters

CREATE OR REPLACE FUNCTION search_public_matches(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_max_distance_km DOUBLE PRECISION,
  p_sport_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_format TEXT DEFAULT NULL,
  p_match_type TEXT DEFAULT NULL,
  p_date_range TEXT DEFAULT NULL,
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
  v_date_from DATE;
  v_date_to DATE;
  v_search_pattern TEXT;
BEGIN
  -- Calculate date range based on filter
  v_date_from := CURRENT_DATE;
  
  IF p_date_range = 'today' THEN
    v_date_to := CURRENT_DATE;
  ELSIF p_date_range = 'week' THEN
    v_date_to := CURRENT_DATE + INTERVAL '7 days';
  ELSIF p_date_range = 'weekend' THEN
    -- Find next Saturday
    v_date_from := CURRENT_DATE + ((6 - EXTRACT(DOW FROM CURRENT_DATE)::INT) % 7) * INTERVAL '1 day';
    -- Sunday is the day after
    v_date_to := v_date_from + INTERVAL '1 day';
    -- If today is Saturday or Sunday, use today as start
    IF EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6) THEN
      v_date_from := CURRENT_DATE;
      -- If Saturday, end is Sunday; if Sunday, end is today
      IF EXTRACT(DOW FROM CURRENT_DATE) = 6 THEN
        v_date_to := CURRENT_DATE + INTERVAL '1 day';
      ELSE
        v_date_to := CURRENT_DATE;
      END IF;
    END IF;
  ELSE
    -- 'all' or NULL - no upper limit (use far future date)
    v_date_to := CURRENT_DATE + INTERVAL '1 year';
  END IF;
  
  -- Prepare search pattern for ILIKE
  IF p_search_query IS NOT NULL AND p_search_query <> '' THEN
    v_search_pattern := '%' || LOWER(p_search_query) || '%';
  END IF;
  
  RETURN QUERY
  SELECT
    m.id AS match_id,
    extensions.ST_Distance(
      f.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography
    ) AS distance_meters
  FROM match m
  INNER JOIN facility f ON f.id = m.facility_id
  LEFT JOIN profile p ON p.id = m.created_by
  WHERE m.location_type = 'facility'
    AND m.visibility = 'public'
    AND m.cancelled_at IS NULL
    AND m.sport_id = p_sport_id
    AND f.is_active = TRUE
    AND f.location IS NOT NULL
    AND extensions.ST_DWithin(
      f.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography,
      p_max_distance_km * 1000
    )
    -- Date range filter
    AND m.match_date >= v_date_from
    AND m.match_date <= v_date_to
    -- Timezone-aware datetime comparison for "today" to exclude past matches
    AND (m.match_date + m.start_time) > (NOW() AT TIME ZONE COALESCE(m.timezone, 'UTC'))
    -- Format filter (singles/doubles)
    AND (p_format IS NULL OR p_format = 'all' OR m.format = p_format::match_format_enum)
    -- Match type filter (practice/competitive/both mapped to casual/competitive/both)
    AND (
      p_match_type IS NULL 
      OR p_match_type = 'all' 
      OR (p_match_type = 'practice' AND m.match_type IN ('casual', 'both'))
      OR (p_match_type = 'competitive' AND m.match_type IN ('competitive', 'both'))
    )
    -- Text search on location name, address, notes, and creator display name
    AND (
      v_search_pattern IS NULL
      OR LOWER(COALESCE(m.location_name, '')) LIKE v_search_pattern
      OR LOWER(COALESCE(m.location_address, '')) LIKE v_search_pattern
      OR LOWER(COALESCE(m.notes, '')) LIKE v_search_pattern
      OR LOWER(COALESCE(f.name, '')) LIKE v_search_pattern
      OR LOWER(COALESCE(f.city, '')) LIKE v_search_pattern
      OR LOWER(COALESCE(p.display_name, '')) LIKE v_search_pattern
    )
  ORDER BY 
    (m.match_date + m.start_time)::timestamp ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION search_public_matches IS 'Search public matches with text search and filters. Supports searching by location, facility name, city, notes, and creator name. Filters by format (singles/doubles), match type (practice/competitive), and date range (today/week/weekend/all).';

