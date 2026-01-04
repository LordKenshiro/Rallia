-- ============================================================================
-- Migration: Fix search_matches_nearby RPC (restore LEFT JOIN and custom locations)
-- Created: 2026-01-03
-- Description: The previous migration (20260102200001) accidentally broke the
--              search_matches_nearby function by:
--              1. Changing LEFT JOIN to INNER JOIN (excludes custom location matches)
--              2. Removing support for custom location types entirely
--              This migration restores the correct behavior.
-- ============================================================================

-- =============================================================================
-- STEP 1: Drop the broken function
-- =============================================================================

DROP FUNCTION IF EXISTS search_matches_nearby(
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  UUID,
  INT,
  INT,
  TEXT
);

-- =============================================================================
-- STEP 2: Recreate the function with correct LEFT JOIN and custom location support
-- =============================================================================

CREATE OR REPLACE FUNCTION search_matches_nearby(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_max_distance_km DOUBLE PRECISION,
  p_sport_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_user_gender TEXT DEFAULT NULL  -- The viewing user's gender for eligibility filtering
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
    -- Use cancelled_at IS NULL instead of status = 'scheduled'
    AND m.cancelled_at IS NULL
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
    -- Gender ELIGIBILITY filter (based on user's actual gender)
    -- If user hasn't set gender (NULL), show all matches
    -- Otherwise, only show matches where:
    --   - Match has no gender preference (open to all), OR
    --   - Match's gender preference matches the user's gender
    AND (
      p_user_gender IS NULL
      OR m.preferred_opponent_gender IS NULL
      OR m.preferred_opponent_gender = p_user_gender::gender_type
    )
  ORDER BY 
    (m.match_date + m.start_time)::timestamp ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION search_matches_nearby IS 'Search public matches (both facility and custom location) within a given distance from user location, filtered by sport and gender eligibility. Uses cancelled_at IS NULL instead of status check. Uses p_user_gender to filter matches based on viewing user''s gender (only shows matches they can join). Returns match IDs sorted by date/time.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_matches_nearby(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, INT, INT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION search_matches_nearby(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, INT, INT, TEXT
) TO anon;


-- =============================================================================
-- STEP 3: Also fix search_public_matches to restore the simpler, working version
-- =============================================================================
-- The CTE-based version in the previous migration may have issues with the 
-- complex subquery logic. Restoring the cleaner approach.

DROP FUNCTION IF EXISTS search_public_matches(
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INT,
  INT,
  TEXT
);

CREATE OR REPLACE FUNCTION search_public_matches(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_max_distance_km DOUBLE PRECISION,  -- NULL means no distance filter (fetch all location types)
  p_sport_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_format TEXT DEFAULT NULL,
  p_match_type TEXT DEFAULT NULL,      -- Filter by match type (casual/competitive) - uses player_expectation
  p_date_range TEXT DEFAULT NULL,
  p_time_of_day TEXT DEFAULT NULL,
  p_skill_level TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,           -- UI filter for narrowing within eligible matches
  p_cost TEXT DEFAULT NULL,
  p_join_mode TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_user_gender TEXT DEFAULT NULL       -- The viewing user's gender for eligibility filtering
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
  v_user_point extensions.geography;
  v_has_distance_filter BOOLEAN;
BEGIN
  -- Determine if we have a distance filter
  v_has_distance_filter := p_max_distance_km IS NOT NULL AND p_max_distance_km > 0;
  
  -- Create user point for distance calculations (only if distance filter is active)
  IF v_has_distance_filter THEN
    v_user_point := extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography;
  END IF;

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
    -- Calculate distance based on location type (only when distance filter is active)
    CASE 
      WHEN NOT v_has_distance_filter THEN
        NULL  -- No distance calculation needed when no distance filter
      WHEN m.location_type = 'facility' AND f.location IS NOT NULL THEN
        extensions.ST_Distance(f.location, v_user_point)
      WHEN m.location_type = 'custom' AND m.custom_latitude IS NOT NULL AND m.custom_longitude IS NOT NULL THEN
        extensions.ST_Distance(
          extensions.ST_SetSRID(extensions.ST_MakePoint(m.custom_longitude, m.custom_latitude), 4326)::extensions.geography,
          v_user_point
        )
      ELSE
        NULL  -- TBD locations have no distance
    END AS distance_meters
  FROM match m
  LEFT JOIN facility f ON f.id = m.facility_id
  LEFT JOIN profile p ON p.id = m.created_by
  LEFT JOIN rating_score rs ON rs.id = m.min_rating_score_id
  WHERE m.visibility = 'public'
    -- Use cancelled_at instead of status = 'scheduled'
    AND m.cancelled_at IS NULL
    AND m.sport_id = p_sport_id
    -- Location type logic:
    -- When no distance filter: allow ALL location types
    -- When distance filter: only allow 'facility' and 'custom' with valid coordinates
    AND (
      NOT v_has_distance_filter  -- No distance filter = all location types allowed
      OR (
        -- Distance filter active: only facility and custom with valid locations
        (m.location_type = 'facility' AND f.is_active = TRUE AND f.location IS NOT NULL)
        OR (m.location_type = 'custom' AND m.custom_latitude IS NOT NULL AND m.custom_longitude IS NOT NULL)
      )
    )
    -- Distance filter (only applied when distance filter is active)
    AND (
      NOT v_has_distance_filter
      OR (
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
    )
    -- Date range filter
    AND m.match_date >= v_date_from
    AND m.match_date <= v_date_to
    -- Timezone-aware datetime comparison for "today" to exclude past matches
    AND (m.match_date + m.start_time) > (NOW() AT TIME ZONE COALESCE(m.timezone, 'UTC'))
    -- Format filter (singles/doubles)
    AND (p_format IS NULL OR m.format = p_format::match_format_enum)
    -- Match type filter (casual/competitive/both) - uses player_expectation
    AND (
      p_match_type IS NULL 
      OR (p_match_type = 'casual' AND m.player_expectation IN ('casual', 'both'))
      OR (p_match_type = 'competitive' AND m.player_expectation IN ('competitive', 'both'))
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
    -- Gender ELIGIBILITY filter (based on user's actual gender)
    -- If user hasn't set gender (NULL), show all matches
    -- Otherwise, only show matches where:
    --   - Match has no gender preference (open to all), OR
    --   - Match's gender preference matches the user's gender
    AND (
      p_user_gender IS NULL
      OR m.preferred_opponent_gender IS NULL
      OR m.preferred_opponent_gender = p_user_gender::gender_type
    )
    -- Gender UI filter (for further narrowing within eligible matches)
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

COMMENT ON FUNCTION search_public_matches IS 'Search public matches with comprehensive filters including gender eligibility. Uses p_user_gender to filter matches based on viewing user''s gender (only shows matches they can join). Uses p_gender for additional UI filtering. When p_max_distance_km is NULL, returns matches of ALL location types. Uses player_expectation for match type filtering.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_public_matches(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION search_public_matches(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT
) TO anon;

