-- ============================================================================
-- Migration: Creator as Participant
-- Created: 2026-01-12
-- Description: Match creators now automatically get a match_participant record
--              with is_host=true and status='joined'. This unifies the data model
--              and simplifies spot calculations by removing special-case handling.
-- ============================================================================

-- =============================================================================
-- STEP 1: Backfill existing matches with creator participant records
-- =============================================================================
-- Insert match_participant records for all existing match creators where one doesn't exist

INSERT INTO match_participant (match_id, player_id, is_host, status)
SELECT m.id, m.created_by, TRUE, 'joined'
FROM match m
WHERE NOT EXISTS (
  SELECT 1 FROM match_participant mp 
  WHERE mp.match_id = m.id AND mp.player_id = m.created_by
);

-- =============================================================================
-- STEP 2: Create trigger function to auto-insert host participant on match creation
-- =============================================================================

CREATE OR REPLACE FUNCTION create_host_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Automatically create a match_participant record for the match creator
  INSERT INTO match_participant (match_id, player_id, is_host, status)
  VALUES (NEW.id, NEW.created_by, TRUE, 'joined');
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after match insert
DROP TRIGGER IF EXISTS match_create_host_participant ON match;
CREATE TRIGGER match_create_host_participant
  AFTER INSERT ON match
  FOR EACH ROW
  EXECUTE FUNCTION create_host_participant();

-- =============================================================================
-- STEP 3: Update get_player_matches RPC
-- =============================================================================
-- Simplify to only check match_participant (creator is now in participants)

DROP FUNCTION IF EXISTS get_player_matches(UUID, TEXT, UUID, INT, INT);

CREATE OR REPLACE FUNCTION get_player_matches(
  p_player_id UUID,
  p_time_filter TEXT DEFAULT 'upcoming', -- 'upcoming' or 'past'
  p_sport_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  match_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_time_utc TIMESTAMPTZ := NOW();
BEGIN
  RETURN QUERY
  SELECT m.id AS match_id
  FROM match m
  WHERE 
    -- Player is an active participant (now includes creators since they have participant records)
    EXISTS (
      SELECT 1 FROM match_participant mp 
      WHERE mp.match_id = m.id 
        AND mp.player_id = p_player_id
        AND mp.status IN ('joined', 'requested', 'pending', 'waitlisted')
    )
    -- Exclude cancelled matches (use cancelled_at instead of status)
    AND m.cancelled_at IS NULL
    -- Sport filter (optional)
    AND (p_sport_id IS NULL OR m.sport_id = p_sport_id)
    -- Time filter based on match END time
    -- Account for matches that span midnight (e.g., 11 PM - 1 AM)
    -- If end_time < start_time, the end time is on the next day
    AND (
      CASE 
        WHEN p_time_filter = 'upcoming' THEN
          -- Upcoming: match end_time has NOT passed yet
          -- Also exclude completed matches (check for result existence)
          NOT EXISTS (SELECT 1 FROM match_result mr WHERE mr.match_id = m.id)
          AND (
            CASE 
              WHEN m.timezone IS NOT NULL THEN
                -- Check if match spans midnight (end_time < start_time)
                CASE
                  WHEN m.end_time < m.start_time THEN
                    -- Match spans midnight: end time is on next day
                    timezone(m.timezone, ((m.match_date + INTERVAL '1 day') + m.end_time)::timestamp) >= current_time_utc
                  ELSE
                    -- Normal case: end time is on same day
                    timezone(m.timezone, (m.match_date + m.end_time)::timestamp) >= current_time_utc
                END
              ELSE
                -- Fallback: if no timezone, compare directly (assumes UTC)
                CASE
                  WHEN m.end_time < m.start_time THEN
                    ((m.match_date + INTERVAL '1 day') + m.end_time)::timestamp >= (current_time_utc AT TIME ZONE 'UTC')::timestamp
                  ELSE
                    (m.match_date + m.end_time)::timestamp >= (current_time_utc AT TIME ZONE 'UTC')::timestamp
                END
            END
          )
        WHEN p_time_filter = 'past' THEN
          -- Past: match has a result OR end_time has passed
          EXISTS (SELECT 1 FROM match_result mr WHERE mr.match_id = m.id)
          OR (
            CASE 
              WHEN m.timezone IS NOT NULL THEN
                -- Check if match spans midnight (end_time < start_time)
                CASE
                  WHEN m.end_time < m.start_time THEN
                    -- Match spans midnight: end time is on next day
                    timezone(m.timezone, ((m.match_date + INTERVAL '1 day') + m.end_time)::timestamp) < current_time_utc
                  ELSE
                    -- Normal case: end time is on same day
                    timezone(m.timezone, (m.match_date + m.end_time)::timestamp) < current_time_utc
                END
              ELSE
                -- Fallback: if no timezone, compare directly (assumes UTC)
                CASE
                  WHEN m.end_time < m.start_time THEN
                    -- Match spans midnight: end time is on next day
                    ((m.match_date + INTERVAL '1 day') + m.end_time)::timestamp < (current_time_utc AT TIME ZONE 'UTC')::timestamp
                  ELSE
                    -- Normal case: end time is on same day
                    (m.match_date + m.end_time)::timestamp < (current_time_utc AT TIME ZONE 'UTC')::timestamp
                END
            END
          )
        ELSE
          -- Invalid filter, return nothing
          FALSE
      END
    )
  ORDER BY 
    -- For upcoming: sort by earliest first (ascending)
    -- For past: sort by most recent first (descending)
    CASE WHEN p_time_filter = 'upcoming' THEN (m.match_date + m.start_time)::timestamp END ASC,
    CASE WHEN p_time_filter = 'past' THEN (m.match_date + m.start_time)::timestamp END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_player_matches(UUID, TEXT, UUID, INT, INT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_player_matches IS 'Get matches for a player (as active participant, including hosts who now have participant records) with timezone-aware filtering. Uses match end_time to determine if a match is past or upcoming.';

-- =============================================================================
-- STEP 4: Update search_public_matches RPC
-- =============================================================================
-- Remove the +1 for creator since they are now counted in participants

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
  v_now_in_tz TIMESTAMP WITH TIME ZONE;
  v_current_time_tz TIME;
BEGIN
  -- Create point from coordinates
  v_point := extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography;
  
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
        -- Use facility coordinates when available
        WHEN m.facility_id IS NOT NULL AND f.location IS NOT NULL THEN
          extensions.ST_Distance(v_point, f.location::extensions.geography)
        -- Use custom location coordinates when available  
        WHEN m.location_type = 'custom' AND m.custom_latitude IS NOT NULL AND m.custom_longitude IS NOT NULL THEN
          extensions.ST_Distance(v_point, extensions.ST_SetSRID(extensions.ST_MakePoint(m.custom_longitude, m.custom_latitude), 4326)::extensions.geography)
        -- TBD locations have NULL distance
        ELSE NULL
      END AS dist_meters
    FROM match m
    LEFT JOIN facility f ON m.facility_id = f.id
    WHERE 
      -- Only public, non-cancelled matches
      m.visibility = 'public'
      AND m.cancelled_at IS NULL
      -- Sport filter
      AND m.sport_id = p_sport_id
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
        p_max_distance_km IS NULL 
        OR md.dist_meters IS NOT NULL AND md.dist_meters <= p_max_distance_km * 1000
      )
      -- For today filter: also filter out matches where start time has passed
      AND (
        p_date_range != 'today' 
        OR m.match_date > v_date_start 
        OR (
          m.match_date = v_date_start 
          AND m.start_time > (
            -- Get current time in match's timezone
            SELECT LOCALTIME AT TIME ZONE COALESCE(m.timezone, 'UTC')
          )
        )
      )
      -- Date range filter (matches on or after today)
      AND m.match_date >= v_date_start
      AND (v_date_end IS NULL OR m.match_date <= v_date_end)
      -- Format filter (singles/doubles)
      AND (p_format IS NULL OR m.format = p_format)
      -- Match type filter (casual/competitive/both) - now uses player_expectation
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
      -- Cost filter
      AND (
        p_cost IS NULL
        OR (p_cost = 'free' AND m.is_court_free = TRUE)
        OR (p_cost = 'paid' AND (m.is_court_free = FALSE OR m.estimated_cost IS NOT NULL))
      )
      -- Join mode filter
      AND (p_join_mode IS NULL OR m.join_mode = p_join_mode)
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


-- =============================================================================
-- STEP 5: Update search_matches_nearby RPC
-- =============================================================================
-- Remove the +1 for creator since they are now counted in participants

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
      extensions.ST_Distance(v_point, f.location::extensions.geography) AS dist_meters,
      m.match_date,
      m.start_time,
      m.format,
      m.preferred_opponent_gender,
      CASE m.format 
        WHEN 'doubles' THEN 4 
        ELSE 2 
      END AS total_spots
    FROM match m
    INNER JOIN facility f ON m.facility_id = f.id
    WHERE 
      -- Only public, non-cancelled matches
      m.visibility = 'public'
      AND m.cancelled_at IS NULL
      -- Only future matches (date >= today)
      AND m.match_date >= CURRENT_DATE
      -- Sport filter
      AND m.sport_id = p_sport_id
      -- Distance filter (within radius)
      AND extensions.ST_Distance(v_point, f.location::extensions.geography) <= p_max_distance_km * 1000
      -- Gender eligibility filter: only show matches the user is eligible to join
      AND (
        m.preferred_opponent_gender IS NULL  -- Open to all genders
        OR p_user_gender IS NULL              -- User didn't specify their gender (show all)
        OR m.preferred_opponent_gender::TEXT = p_user_gender  -- User matches the preference (cast enum to text)
      )
  ),
  -- Calculate participant counts to filter out full matches
  match_counts AS (
    SELECT 
      md.id,
      md.dist_meters,
      md.match_date,
      md.start_time,
      md.total_spots,
      -- Count joined participants (now includes the creator who has a participant record)
      (
        SELECT COUNT(*) 
        FROM match_participant mp 
        WHERE mp.match_id = md.id AND mp.status = 'joined'
      ) AS filled_spots
    FROM match_distances md
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
    mc.dist_meters ASC
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

-- Add comments for documentation
COMMENT ON FUNCTION search_public_matches IS 'Search public matches with comprehensive filters. Creator is now included as a participant, so spot calculation counts all joined participants without adding 1 for creator.';
COMMENT ON FUNCTION search_matches_nearby IS 'Search nearby matches at facilities. Creator is now included as a participant, so spot calculation counts all joined participants without adding 1 for creator.';
