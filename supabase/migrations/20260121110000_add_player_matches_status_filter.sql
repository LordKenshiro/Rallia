-- Migration: Add status filter to get_player_matches RPC
-- Description: Updates the get_player_matches function to accept a p_status_filter parameter
--              for filtering matches by participant status, hosting role, and match state.
--              Enables server-side filtering for proper pagination with filters.

-- =============================================================================
-- FUNCTION: get_player_matches (updated with status filter)
-- =============================================================================
-- Returns match IDs for a player with optional status filtering.
-- Supports different filter values for upcoming vs past matches.

-- Drop the old function signature first (5 params) to avoid overload conflicts
DROP FUNCTION IF EXISTS get_player_matches(UUID, TEXT, UUID, INT, INT);

CREATE OR REPLACE FUNCTION get_player_matches(
  p_player_id UUID,
  p_time_filter TEXT DEFAULT 'upcoming', -- 'upcoming' or 'past'
  p_sport_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_status_filter TEXT DEFAULT 'all' -- New parameter for status filtering
)
RETURNS TABLE (
  match_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_time_utc TIMESTAMPTZ := NOW();
  forty_eight_hours_ago TIMESTAMPTZ := NOW() - INTERVAL '48 hours';
BEGIN
  RETURN QUERY
  SELECT m.id AS match_id
  FROM match m
  -- Join to get user's participant record (may not exist if user is only creator)
  LEFT JOIN match_participant mp ON mp.match_id = m.id AND mp.player_id = p_player_id
  WHERE 
    -- Match is created by player OR player is an active participant
    (
      m.created_by = p_player_id
      OR mp.status IN ('joined', 'requested', 'pending', 'waitlisted')
    )
    -- Sport filter (optional)
    AND (p_sport_id IS NULL OR m.sport_id = p_sport_id)
    -- Cancelled filter handling:
    -- For 'cancelled' status filter, we INCLUDE cancelled matches
    -- For all other filters, we EXCLUDE cancelled matches
    AND (
      CASE 
        WHEN p_status_filter = 'cancelled' THEN m.cancelled_at IS NOT NULL
        ELSE m.cancelled_at IS NULL
      END
    )
    -- Status filter conditions
    AND (
      CASE p_status_filter
        -- =====================================================
        -- COMMON FILTERS (work for both upcoming and past)
        -- =====================================================
        WHEN 'all' THEN TRUE
        
        WHEN 'hosting' THEN 
          m.created_by = p_player_id
        
        WHEN 'confirmed' THEN 
          mp.status = 'joined'
        
        WHEN 'pending' THEN 
          mp.status = 'pending'
        
        WHEN 'requested' THEN 
          mp.status = 'requested'
        
        WHEN 'waitlisted' THEN 
          mp.status = 'waitlisted'
        
        -- =====================================================
        -- UPCOMING-SPECIFIC FILTERS
        -- =====================================================
        WHEN 'needs_players' THEN
          -- Match is not full (joined count < expected count)
          (SELECT COUNT(*) FROM match_participant mp2 
           WHERE mp2.match_id = m.id AND mp2.status = 'joined') 
          < CASE WHEN m.format = 'doubles' THEN 4 ELSE 2 END
        
        WHEN 'ready_to_play' THEN
          -- User is confirmed AND match is full
          mp.status = 'joined'
          AND (SELECT COUNT(*) FROM match_participant mp2 
               WHERE mp2.match_id = m.id AND mp2.status = 'joined') 
              >= CASE WHEN m.format = 'doubles' THEN 4 ELSE 2 END
        
        -- =====================================================
        -- PAST-SPECIFIC FILTERS
        -- =====================================================
        WHEN 'feedback_needed' THEN
          -- User hasn't completed feedback, match was full, and within 48h window
          mp.status = 'joined'
          AND mp.feedback_completed = false
          AND (SELECT COUNT(*) FROM match_participant mp2 
               WHERE mp2.match_id = m.id AND mp2.status = 'joined') 
              >= CASE WHEN m.format = 'doubles' THEN 4 ELSE 2 END
          -- Check if match ended within last 48 hours
          AND (
            CASE 
              WHEN m.timezone IS NOT NULL THEN
                CASE
                  WHEN m.end_time < m.start_time THEN
                    timezone(m.timezone, ((m.match_date + INTERVAL '1 day') + m.end_time)::timestamp) >= forty_eight_hours_ago
                  ELSE
                    timezone(m.timezone, (m.match_date + m.end_time)::timestamp) >= forty_eight_hours_ago
                END
              ELSE
                CASE
                  WHEN m.end_time < m.start_time THEN
                    ((m.match_date + INTERVAL '1 day') + m.end_time)::timestamp >= (forty_eight_hours_ago AT TIME ZONE 'UTC')::timestamp
                  ELSE
                    (m.match_date + m.end_time)::timestamp >= (forty_eight_hours_ago AT TIME ZONE 'UTC')::timestamp
                END
            END
          )
        
        WHEN 'played' THEN
          -- Match was full (actually happened)
          (SELECT COUNT(*) FROM match_participant mp2 
           WHERE mp2.match_id = m.id AND mp2.status = 'joined') 
          >= CASE WHEN m.format = 'doubles' THEN 4 ELSE 2 END
        
        WHEN 'hosted' THEN
          m.created_by = p_player_id
        
        WHEN 'as_participant' THEN
          m.created_by != p_player_id
        
        WHEN 'expired' THEN
          -- Match ended but was NOT full (never had enough players)
          (SELECT COUNT(*) FROM match_participant mp2 
           WHERE mp2.match_id = m.id AND mp2.status = 'joined') 
          < CASE WHEN m.format = 'doubles' THEN 4 ELSE 2 END
        
        WHEN 'cancelled' THEN
          -- Already handled above (m.cancelled_at IS NOT NULL)
          TRUE
        
        ELSE TRUE -- Unknown filter, return all
      END
    )
    -- Time filter based on match END time
    AND (
      CASE 
        WHEN p_time_filter = 'upcoming' THEN
          -- Upcoming: match end_time has NOT passed yet
          -- Also exclude completed matches (check for result existence)
          NOT EXISTS (SELECT 1 FROM match_result mr WHERE mr.match_id = m.id)
          AND (
            CASE 
              WHEN m.timezone IS NOT NULL THEN
                CASE
                  WHEN m.end_time < m.start_time THEN
                    timezone(m.timezone, ((m.match_date + INTERVAL '1 day') + m.end_time)::timestamp) >= current_time_utc
                  ELSE
                    timezone(m.timezone, (m.match_date + m.end_time)::timestamp) >= current_time_utc
                END
              ELSE
                CASE
                  WHEN m.end_time < m.start_time THEN
                    ((m.match_date + INTERVAL '1 day') + m.end_time)::timestamp >= (current_time_utc AT TIME ZONE 'UTC')::timestamp
                  ELSE
                    (m.match_date + m.end_time)::timestamp >= (current_time_utc AT TIME ZONE 'UTC')::timestamp
                END
            END
          )
        WHEN p_time_filter = 'past' THEN
          -- Past: match end_time HAS passed OR match has a result (completed)
          EXISTS (SELECT 1 FROM match_result mr WHERE mr.match_id = m.id)
          OR (
            CASE 
              WHEN m.timezone IS NOT NULL THEN
                CASE
                  WHEN m.end_time < m.start_time THEN
                    timezone(m.timezone, ((m.match_date + INTERVAL '1 day') + m.end_time)::timestamp) < current_time_utc
                  ELSE
                    timezone(m.timezone, (m.match_date + m.end_time)::timestamp) < current_time_utc
                END
              ELSE
                CASE
                  WHEN m.end_time < m.start_time THEN
                    ((m.match_date + INTERVAL '1 day') + m.end_time)::timestamp < (current_time_utc AT TIME ZONE 'UTC')::timestamp
                  ELSE
                    (m.match_date + m.end_time)::timestamp < (current_time_utc AT TIME ZONE 'UTC')::timestamp
                END
            END
          )
        ELSE
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

-- Update comment for documentation (must use full signature to avoid ambiguity)
COMMENT ON FUNCTION get_player_matches(UUID, TEXT, UUID, INT, INT, TEXT) IS 'Get matches for a player with optional status filtering. Supports filters: all, hosting, confirmed, pending, requested, waitlisted, needs_players, ready_to_play (upcoming), feedback_needed, played, hosted, as_participant, expired, cancelled (past). Uses server-side filtering for proper pagination.';
