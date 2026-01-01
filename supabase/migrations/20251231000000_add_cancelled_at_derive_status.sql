-- Migration: Add cancelled_at column and update RPCs to derive match status
-- Description: Removes dependency on denormalized match.status field by:
--   1. Adding cancelled_at column to track cancellation timestamp
--   2. Updating RPCs to use cancelled_at IS NULL instead of status = 'scheduled'
--   3. Backfilling cancelled_at for existing cancelled matches
--
-- Status derivation logic (to be implemented in application code):
--   1. cancelled_at IS NOT NULL → 'cancelled'
--   2. result IS NOT NULL OR end_time passed → 'completed'
--   3. start_time passed but end_time hasn't → 'in_progress'
--   4. Default → 'scheduled'

-- =============================================================================
-- STEP 1: Add cancelled_at column (if not already added)
-- =============================================================================
-- Note: cancelled_at was already added in migration 20251213000000_add_match_creation_fields.sql
-- This step ensures it exists for databases that haven't run that migration yet

ALTER TABLE match ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN match.cancelled_at IS 'Timestamp when the match was cancelled. NULL means the match is not cancelled. Used for deriving match status instead of the legacy status column.';

-- =============================================================================
-- STEP 2: Backfill cancelled_at for existing cancelled matches
-- =============================================================================
-- Only backfill if the status column exists (for migrations from old schema)
-- In fresh resets, status column doesn't exist, so skip this step

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'match' 
    AND column_name = 'status'
  ) THEN
    UPDATE match 
    SET cancelled_at = updated_at 
    WHERE status = 'cancelled' 
      AND cancelled_at IS NULL;
  END IF;
END $$;

-- =============================================================================
-- STEP 3: Update search_public_matches RPC
-- =============================================================================
-- Replace `m.status = 'scheduled'` with `m.cancelled_at IS NULL`
-- The time-based filters already exclude past matches

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
  INT
);

CREATE OR REPLACE FUNCTION search_public_matches(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_max_distance_km DOUBLE PRECISION,  -- NULL means no distance filter (fetch all location types)
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
    -- A match is "scheduled" (available to join) if it's not cancelled
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

COMMENT ON FUNCTION search_public_matches IS 'Search public matches with comprehensive filters. Uses cancelled_at IS NULL instead of status check for determining available matches. When p_max_distance_km is NULL, returns matches of ALL location types (facility, custom, tbd). When p_max_distance_km has a value, only returns facility and custom location matches within that distance.';

-- =============================================================================
-- STEP 4: Update get_player_matches RPC
-- =============================================================================
-- Replace status checks with cancelled_at and time-based logic:
--   - `m.status != 'cancelled'` → `m.cancelled_at IS NULL`
--   - `m.status != 'completed'` → use result/time check (already exists in the function)
--   - `m.status = 'completed'` → `m.result IS NOT NULL` for past matches

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
  LEFT JOIN match_result mr ON mr.match_id = m.id
  WHERE 
    -- Match is created by player OR player is an active participant
    (
      m.created_by = p_player_id
      OR EXISTS (
        SELECT 1 FROM match_participant mp 
        WHERE mp.match_id = m.id 
          AND mp.player_id = p_player_id
          AND mp.status IN ('joined', 'requested', 'pending', 'waitlisted')
      )
    )
    -- Exclude cancelled matches (use cancelled_at instead of status)
    AND m.cancelled_at IS NULL
    -- Sport filter (optional)
    AND (p_sport_id IS NULL OR m.sport_id = p_sport_id)
    -- Time filter based on match END time and result existence
    -- Account for matches that span midnight (e.g., 11 PM - 1 AM)
    -- If end_time < start_time, the end time is on the next day
    AND (
      CASE 
        WHEN p_time_filter = 'upcoming' THEN
          -- Upcoming: match end_time has NOT passed yet AND no result recorded
          mr.id IS NULL  -- No result means not completed
          AND (
            CASE 
              WHEN m.timezone IS NOT NULL THEN
                -- Check if match spans midnight (end_time < start_time)
                -- If so, add one day to match_date for end time calculation
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
                    -- Match spans midnight: end time is on next day
                    ((m.match_date + INTERVAL '1 day') + m.end_time)::timestamp >= (current_time_utc AT TIME ZONE 'UTC')::timestamp
                  ELSE
                    -- Normal case: end time is on same day
                    (m.match_date + m.end_time)::timestamp >= (current_time_utc AT TIME ZONE 'UTC')::timestamp
                END
            END
          )
        WHEN p_time_filter = 'past' THEN
          -- Past: match has result OR end_time HAS passed
          mr.id IS NOT NULL  -- Has result = completed
          OR (
            CASE 
              WHEN m.timezone IS NOT NULL THEN
                -- Check if match spans midnight (end_time < start_time)
                -- If so, add one day to match_date for end time calculation
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

COMMENT ON FUNCTION get_player_matches IS 'Get matches for a player (as creator or active participant) with timezone-aware filtering. Uses cancelled_at IS NULL instead of status check, and result existence instead of status=completed. Upcoming matches are those where end_time has not passed yet and no result recorded. Past matches are those where end_time has passed or result exists.';

-- =============================================================================
-- STEP 5: Add index for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_match_cancelled_at ON match(cancelled_at) WHERE cancelled_at IS NOT NULL;

COMMENT ON INDEX idx_match_cancelled_at IS 'Partial index for finding cancelled matches efficiently';


