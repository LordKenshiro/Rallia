-- =============================================================================
-- ADD MATCH CLOSURE QUERY FUNCTION
-- Returns matches whose end time (in their local timezone) was more than
-- cutoff_hours ago. Handles midnight-spanning matches correctly.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_matches_ready_for_closure(
  cutoff_hours INT DEFAULT 48,
  batch_limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  format match_format_enum
) AS $$
DECLARE
  current_time_utc TIMESTAMPTZ := NOW();
BEGIN
  RETURN QUERY
  SELECT m.id, m.format
  FROM match m
  WHERE m.closed_at IS NULL
    AND m.cancelled_at IS NULL  -- Exclude cancelled matches
    AND (
      CASE
        WHEN m.timezone IS NOT NULL THEN
          -- Handle midnight-spanning matches (end_time < start_time)
          CASE
            WHEN m.end_time < m.start_time THEN
              -- Match spans midnight: end time is on next day
              timezone(m.timezone, ((m.match_date + INTERVAL '1 day') + m.end_time)::timestamp)
            ELSE
              -- Normal case: end time is on same day
              timezone(m.timezone, (m.match_date + m.end_time)::timestamp)
          END
        ELSE
          -- Fallback: if no timezone, assume UTC
          (m.match_date + m.end_time)::timestamptz
      END
    ) < (current_time_utc - (cutoff_hours || ' hours')::INTERVAL)
  ORDER BY m.match_date, m.end_time
  LIMIT batch_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_matches_ready_for_closure IS
  'Returns matches whose end time (in their local timezone) was more than cutoff_hours ago. Handles midnight-spanning matches correctly.';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Allow authenticated users (including service role) to call this function
GRANT EXECUTE ON FUNCTION get_matches_ready_for_closure TO authenticated;
GRANT EXECUTE ON FUNCTION get_matches_ready_for_closure TO service_role;
