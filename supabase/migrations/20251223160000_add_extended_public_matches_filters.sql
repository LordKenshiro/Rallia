-- Migration: Add extended filters to search_public_matches RPC function
-- Description: Adds time of day, skill level, gender, cost, and join mode filters

-- Drop the old function first (it has a different signature with fewer parameters)
DROP FUNCTION IF EXISTS search_public_matches(
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INT,
  INT
);

CREATE OR REPLACE FUNCTION search_public_matches(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_max_distance_km DOUBLE PRECISION,
  p_sport_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_format TEXT DEFAULT NULL,
  p_match_type TEXT DEFAULT NULL,
  p_date_range TEXT DEFAULT NULL,
  p_time_of_day TEXT DEFAULT NULL,
  p_skill_level TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_cost TEXT DEFAULT NULL,
  p_join_mode TEXT DEFAULT NULL,
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
  v_time_start TIME;
  v_time_end TIME;
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
  
  -- Calculate time of day range
  IF p_time_of_day = 'morning' THEN
    v_time_start := '06:00:00'::TIME;
    v_time_end := '12:00:00'::TIME;
  ELSIF p_time_of_day = 'afternoon' THEN
    v_time_start := '12:00:00'::TIME;
    v_time_end := '17:00:00'::TIME;
  ELSIF p_time_of_day = 'evening' THEN
    v_time_start := '17:00:00'::TIME;
    v_time_end := '23:59:59'::TIME;
  ELSE
    v_time_start := NULL;
    v_time_end := NULL;
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
  LEFT JOIN rating_score rs ON rs.id = m.min_rating_score_id
  WHERE m.location_type = 'facility'
    AND m.visibility = 'public'
    AND m.status = 'scheduled'
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
    AND (p_format IS NULL OR m.format = p_format::match_format_enum)
    -- Match type filter (practice/competitive/both mapped to casual/competitive/both)
    AND (
      p_match_type IS NULL 
      OR (p_match_type = 'practice' AND m.match_type IN ('casual', 'both'))
      OR (p_match_type = 'competitive' AND m.match_type IN ('competitive', 'both'))
    )
    -- Time of day filter
    AND (
      v_time_start IS NULL
      OR (m.start_time >= v_time_start AND m.start_time < v_time_end)
    )
    -- Skill level filter (based on min_rating_score)
    AND (
      p_skill_level IS NULL
      OR (p_skill_level = 'beginner' AND (rs.id IS NULL OR rs.value < 3.0))
      OR (p_skill_level = 'intermediate' AND rs.value >= 3.0 AND rs.value < 4.5)
      OR (p_skill_level = 'advanced' AND rs.value >= 4.5)
    )
    -- Gender preference filter
    AND (
      p_gender IS NULL
      OR m.preferred_opponent_gender IS NULL
      OR m.preferred_opponent_gender = p_gender::gender_type
    )
    -- Cost filter
    AND (
      p_cost IS NULL
      OR (p_cost = 'free' AND m.is_court_free = TRUE)
      OR (p_cost = 'paid' AND m.is_court_free = FALSE)
    )
    -- Join mode filter
    AND (
      p_join_mode IS NULL
      OR m.join_mode = p_join_mode::match_join_mode_enum
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
COMMENT ON FUNCTION search_public_matches IS 'Search public matches with comprehensive filters. Supports: text search (location, facility, city, notes, creator), format (singles/doubles), match type (practice/competitive), date range (today/week/weekend), time of day (morning/afternoon/evening), skill level (beginner/intermediate/advanced), gender preference, cost (free/paid), and join mode (direct/request).';

