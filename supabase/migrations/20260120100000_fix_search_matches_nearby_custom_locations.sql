-- ============================================================================
-- Migration: Fix search_matches_nearby RPC to include custom location matches
-- Created: 2026-01-20
-- Description: The migration 20260112000000_creator_as_participant.sql accidentally
--              broke custom location support by using INNER JOIN with facility table.
--              This migration restores the correct behavior to include both facility
--              and custom location matches.
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
-- STEP 2: Recreate with LEFT JOIN and custom location support
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

-- Add comment for documentation
COMMENT ON FUNCTION search_matches_nearby IS 'Search nearby matches at both facilities AND custom locations. Uses LEFT JOIN to include custom location matches. Creator is now included as a participant, so spot calculation counts all joined participants without adding 1 for creator.';
