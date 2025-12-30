-- Migration: Add get_player_matches RPC function
-- Description: Creates a function to get matches for a player (as creator or participant)
--              with proper timezone-aware filtering based on match END time.
--              Matches are considered "past" when their end_time has passed in the match's timezone.

-- =============================================================================
-- FUNCTION: get_player_matches
-- =============================================================================
-- Returns match IDs for a player based on time filter.
-- Uses end_time (not start_time) to determine if a match has concluded.

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
    -- Exclude cancelled matches
    AND m.status != 'cancelled'
    -- Sport filter (optional)
    AND (p_sport_id IS NULL OR m.sport_id = p_sport_id)
    -- Time filter based on match END time
    -- Account for matches that span midnight (e.g., 11 PM - 1 AM)
    -- If end_time < start_time, the end time is on the next day
    AND (
      CASE 
        WHEN p_time_filter = 'upcoming' THEN
          -- Upcoming: match end_time has NOT passed yet
          -- Also exclude completed matches
          m.status != 'completed'
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
          -- Past: match end_time HAS passed OR match is completed
          m.status = 'completed'
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

-- Add comment for documentation
COMMENT ON FUNCTION get_player_matches IS 'Get matches for a player (as creator or active participant) with timezone-aware filtering. Uses match end_time to determine if a match is past or upcoming. Upcoming matches are those where end_time has not passed yet. Past matches are those where end_time has passed or status is completed.';


