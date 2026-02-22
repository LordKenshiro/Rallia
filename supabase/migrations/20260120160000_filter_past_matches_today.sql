-- ============================================================================
-- Migration: Filter out matches that have already started today
-- Created: 2026-01-20
-- Description: Both search_matches_nearby and search_public_matches were showing
--              matches from today that have already started. This migration fixes
--              both functions to always filter out past matches, not just when
--              the "today" date filter is selected.
--
-- Issue: 
--   - search_matches_nearby: Only checked match_date >= CURRENT_DATE, no time check
--   - search_public_matches: Time check only applied when p_date_range = 'today'
--
-- Fix:
--   - Both functions now filter out matches where:
--     match_date = CURRENT_DATE AND start_time < current local time
-- ============================================================================

-- =============================================================================
-- STEP 1: Fix search_matches_nearby - Add time filtering for today's matches
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
  v_point extensions.geography;
BEGIN
  -- Create point from coordinates
  v_point := extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography;
  
  RETURN QUERY
  WITH match_distances AS (
    SELECT 
      m.id,
      -- Calculate distance based on location type
      CASE 
        WHEN m.location_type = 'facility' AND f.location IS NOT NULL THEN
          extensions.ST_Distance(v_point, f.location::extensions.geography)
        WHEN m.location_type = 'custom' AND m.custom_latitude IS NOT NULL AND m.custom_longitude IS NOT NULL THEN
          extensions.ST_Distance(
            v_point,
            extensions.ST_SetSRID(extensions.ST_MakePoint(m.custom_longitude, m.custom_latitude), 4326)::extensions.geography
          )
        ELSE
          NULL
      END AS dist_meters,
      m.match_date,
      m.start_time,
      m.timezone,
      m.format,
      m.preferred_opponent_gender,
      CASE m.format 
        WHEN 'doubles' THEN 4 
        ELSE 2 
      END AS total_spots
    FROM match m
    LEFT JOIN facility f ON m.facility_id = f.id
    WHERE 
      -- Only public, non-cancelled matches
      m.visibility = 'public'
      AND m.cancelled_at IS NULL
      -- Only future matches (date >= today)
      AND m.match_date >= CURRENT_DATE
      -- Filter out matches that have already started today
      -- For matches today, only show if start_time > current time in match's timezone
      AND (
        m.match_date > CURRENT_DATE
        OR m.start_time > (NOW() AT TIME ZONE COALESCE(m.timezone, 'UTC'))::TIME
      )
      -- Sport filter
      AND m.sport_id = p_sport_id
      -- Include both facility and custom location types with valid coordinates
      AND (
        (m.location_type = 'facility' AND f.is_active = TRUE AND f.location IS NOT NULL)
        OR (m.location_type = 'custom' AND m.custom_latitude IS NOT NULL AND m.custom_longitude IS NOT NULL)
      )
      -- Distance filter for both location types
      AND (
        (m.location_type = 'facility' AND extensions.ST_Distance(v_point, f.location::extensions.geography) <= p_max_distance_km * 1000)
        OR (m.location_type = 'custom' AND extensions.ST_Distance(
          v_point,
          extensions.ST_SetSRID(extensions.ST_MakePoint(m.custom_longitude, m.custom_latitude), 4326)::extensions.geography
        ) <= p_max_distance_km * 1000)
      )
      -- Gender eligibility filter: only show matches the user is eligible to join
      AND (
        m.preferred_opponent_gender IS NULL  -- Open to all genders
        OR p_user_gender IS NULL              -- User didn't specify their gender (show all)
        OR m.preferred_opponent_gender::text = p_user_gender  -- Match preference matches user's gender
      )
  )
  SELECT 
    md.id AS match_id,
    md.dist_meters AS distance_meters
  FROM match_distances md
  WHERE 
    -- Only matches with available spots (total spots - joined participants > 0)
    md.total_spots - (
      SELECT COUNT(*)
      FROM match_participant mp
      WHERE mp.match_id = md.id
        AND mp.status = 'joined'
    ) > 0
  ORDER BY 
    md.match_date ASC,
    md.start_time ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_matches_nearby(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, INT, INT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION search_matches_nearby(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, INT, INT, TEXT
) TO anon;

COMMENT ON FUNCTION search_matches_nearby IS 'Search nearby matches at both facilities AND custom locations. Now filters out matches that have already started today based on the match timezone.';


-- =============================================================================
-- STEP 2: Fix search_public_matches - Apply time filter regardless of date range
-- =============================================================================

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
  p_match_type TEXT DEFAULT NULL,      -- Filter by match type (casual/competitive)
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
  v_point extensions.geography;
  v_date_start DATE;
  v_date_end DATE;
  v_time_start TIME;
  v_time_end TIME;
  v_search_pattern TEXT;
  v_has_distance_filter BOOLEAN;
BEGIN
  -- Create point from coordinates
  v_point := extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography;
  
  -- Determine if distance filter is active
  v_has_distance_filter := p_max_distance_km IS NOT NULL;
  
  -- Prepare search pattern for LIKE matching
  IF p_search_query IS NOT NULL AND LENGTH(TRIM(p_search_query)) > 0 THEN
    v_search_pattern := '%' || LOWER(TRIM(p_search_query)) || '%';
  END IF;
  
  -- Calculate date range boundaries based on filter
  IF p_date_range = 'today' THEN
    v_date_start := CURRENT_DATE;
    v_date_end := CURRENT_DATE;
  ELSIF p_date_range = 'week' THEN
    v_date_start := CURRENT_DATE;
    v_date_end := CURRENT_DATE + INTERVAL '7 days';
  ELSIF p_date_range = 'weekend' THEN
    -- Next Saturday to Sunday
    v_date_start := CURRENT_DATE + (6 - EXTRACT(DOW FROM CURRENT_DATE))::INT;
    v_date_end := v_date_start + INTERVAL '1 day';
  ELSE
    -- 'all' or NULL - no date filter beyond >= today
    v_date_start := CURRENT_DATE;
    v_date_end := NULL;
  END IF;
  
  -- Calculate time of day boundaries
  IF p_time_of_day = 'morning' THEN
    v_time_start := '06:00:00'::TIME;
    v_time_end := '12:00:00'::TIME;
  ELSIF p_time_of_day = 'afternoon' THEN
    v_time_start := '12:00:00'::TIME;
    v_time_end := '18:00:00'::TIME;
  ELSIF p_time_of_day = 'evening' THEN
    v_time_start := '18:00:00'::TIME;
    v_time_end := '23:59:59'::TIME;
  ELSE
    v_time_start := NULL;
    v_time_end := NULL;
  END IF;

  RETURN QUERY
  WITH match_distances AS (
    -- Calculate distance for matches with known coordinates (facility or custom location)
    SELECT 
      m.id,
      CASE
        -- Use facility coordinates when location_type is 'facility' and facility has valid location
        WHEN m.location_type = 'facility' AND f.location IS NOT NULL AND f.is_active = TRUE THEN
          extensions.ST_Distance(v_point, f.location::extensions.geography)
        -- Use custom location coordinates when location_type is 'custom' and coords are available
        WHEN m.location_type = 'custom' AND m.custom_latitude IS NOT NULL AND m.custom_longitude IS NOT NULL THEN
          extensions.ST_Distance(
            v_point, 
            extensions.ST_SetSRID(
              extensions.ST_MakePoint(m.custom_longitude, m.custom_latitude), 
              4326
            )::extensions.geography
          )
        -- TBD locations have NULL distance
        ELSE NULL
      END AS dist_meters
    FROM match m
    LEFT JOIN facility f ON m.facility_id = f.id AND f.is_active = TRUE
    WHERE 
      -- Only public, non-cancelled matches
      m.visibility = 'public'
      AND m.cancelled_at IS NULL
      -- Sport filter
      AND m.sport_id = p_sport_id
      -- When distance filter is active, only include matches with valid coordinates
      -- When no distance filter, include all location types (including TBD)
      AND (
        NOT v_has_distance_filter
        OR (
          -- Facility matches with valid location
          (m.location_type = 'facility' AND f.location IS NOT NULL AND f.is_active = TRUE)
          OR
          -- Custom location matches with valid coordinates
          (m.location_type = 'custom' AND m.custom_latitude IS NOT NULL AND m.custom_longitude IS NOT NULL)
        )
      )
  ),
  filtered_matches AS (
    SELECT 
      m.id,
      md.dist_meters,
      m.match_date,
      m.start_time,
      m.end_time,
      m.timezone,
      m.format,
      m.player_expectation,
      m.location_type,
      m.location_name,
      m.location_address,
      m.is_court_free,
      m.estimated_cost,
      m.join_mode,
      m.created_by,
      m.preferred_opponent_gender,
      m.min_rating_score_id,
      m.notes
    FROM match m
    INNER JOIN match_distances md ON m.id = md.id
    WHERE
      -- Distance filter (when specified)
      -- If p_max_distance_km is NULL, include all matches regardless of distance
      -- TBD locations (NULL distance) are included when p_max_distance_km is NULL
      (
        NOT v_has_distance_filter
        OR (md.dist_meters IS NOT NULL AND md.dist_meters <= p_max_distance_km * 1000)
      )
      -- ALWAYS filter out matches that have already started today (regardless of date range filter)
      -- For matches today, only show if start_time > current time in match's timezone
      AND (
        m.match_date > CURRENT_DATE
        OR m.start_time > (NOW() AT TIME ZONE COALESCE(m.timezone, 'UTC'))::TIME
      )
      -- Date range filter (matches on or after today)
      AND m.match_date >= v_date_start
      AND (v_date_end IS NULL OR m.match_date <= v_date_end)
      -- Format filter (singles/doubles) - cast enum to TEXT for comparison
      AND (p_format IS NULL OR m.format::TEXT = p_format)
      -- Match type filter (casual/competitive/both) - now uses player_expectation
      AND (
        p_match_type IS NULL 
        OR (p_match_type = 'casual' AND m.player_expectation::TEXT IN ('casual', 'both'))
        OR (p_match_type = 'competitive' AND m.player_expectation::TEXT IN ('competitive', 'both'))
      )
      -- Time of day filter
      AND (
        v_time_start IS NULL
        OR (m.start_time >= v_time_start AND m.start_time < v_time_end)
      )
      -- Cost filter
      AND (
        p_cost IS NULL
        OR (p_cost = 'free' AND m.is_court_free = TRUE)
        OR (p_cost = 'paid' AND (m.is_court_free = FALSE OR m.estimated_cost IS NOT NULL))
      )
      -- Join mode filter - cast enum to TEXT for comparison
      AND (p_join_mode IS NULL OR m.join_mode::TEXT = p_join_mode)
      -- Gender eligibility filter: only show matches the user is eligible to join
      -- Matches with NULL preferred_opponent_gender are open to all
      -- Matches with a specific gender requirement only show to users of that gender
      AND (
        m.preferred_opponent_gender IS NULL  -- Open to all genders
        OR p_user_gender IS NULL              -- User didn't specify their gender (show all)
        OR m.preferred_opponent_gender::TEXT = p_user_gender  -- User matches the preference (cast enum to text)
      )
      -- UI Gender filter (for additional narrowing within eligible matches)
      AND (
        p_gender IS NULL
        OR p_gender = 'all'
        OR m.preferred_opponent_gender::TEXT = p_gender  -- Cast enum to text for comparison
      )
      -- Text search on location name, address, notes, and creator display name
      AND (
        v_search_pattern IS NULL
        OR LOWER(COALESCE(m.location_name, '')) LIKE v_search_pattern
        OR LOWER(COALESCE(m.location_address, '')) LIKE v_search_pattern
        OR LOWER(COALESCE(m.notes, '')) LIKE v_search_pattern
        OR EXISTS (
          SELECT 1 FROM profile p 
          WHERE p.id = m.created_by 
          AND LOWER(COALESCE(p.display_name, '')) LIKE v_search_pattern
        )
      )
  ),
  -- Calculate participant counts to filter out full matches
  match_counts AS (
    SELECT 
      fm.id,
      fm.dist_meters,
      fm.match_date,
      fm.start_time,
      fm.format,
      CASE fm.format 
        WHEN 'doubles' THEN 4 
        ELSE 2 
      END AS total_spots,
      -- Count joined participants (now includes the creator who has a participant record)
      (
        SELECT COUNT(*) 
        FROM match_participant mp 
        WHERE mp.match_id = fm.id AND mp.status = 'joined'
      ) AS filled_spots
    FROM filtered_matches fm
  )
  SELECT 
    mc.id AS match_id,
    mc.dist_meters AS distance_meters
  FROM match_counts mc
  WHERE 
    -- Only include matches that still have spots available
    mc.filled_spots < mc.total_spots
  ORDER BY 
    mc.match_date ASC,
    mc.start_time ASC,
    COALESCE(mc.dist_meters, 999999999) ASC  -- TBD matches sort last within same date/time
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_public_matches(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION search_public_matches(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT
) TO anon;

COMMENT ON FUNCTION search_public_matches IS 'Search public matches with comprehensive filters. Always filters out matches that have already started today (regardless of date range filter). Uses match timezone for accurate time comparison.';
