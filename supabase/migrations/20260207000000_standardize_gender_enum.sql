-- ============================================================================
-- Migration: Standardize Gender Enum
-- Created: 2026-02-07
-- Description: Consolidate two competing gender enums (gender_enum with M/F/O
--              and gender_type with male/female/other) into a single gender_enum
--              with values: male, female, other. Drops get_gender_types() RPC,
--              removes prefer_not_to_say, and updates all dependent columns/functions.
-- ============================================================================

-- =============================================================================
-- STEP 1: Update any rows using 'prefer_not_to_say' to 'other'
-- =============================================================================

UPDATE player SET gender = 'other' WHERE gender = 'prefer_not_to_say';
UPDATE match SET preferred_opponent_gender = 'other' WHERE preferred_opponent_gender = 'prefer_not_to_say';

-- =============================================================================
-- STEP 2: Drop the old gender_enum (M/F/O/prefer_not_to_say) — not used by any columns
-- =============================================================================

DROP TYPE IF EXISTS "public"."gender_enum" CASCADE;

-- =============================================================================
-- STEP 3: Remove 'prefer_not_to_say' from gender_type
-- PostgreSQL doesn't support DROP VALUE from enum, so we recreate:
--   1. Create the new enum as gender_enum (with correct values)
--   2. Alter columns to use it
--   3. Drop old gender_type
-- =============================================================================

-- Create the new consolidated enum
CREATE TYPE "public"."gender_enum" AS ENUM ('male', 'female', 'other');

-- Alter player.gender column: cast through text to new enum
ALTER TABLE player
  ALTER COLUMN gender TYPE "public"."gender_enum"
  USING (gender::text::"public"."gender_enum");

-- Alter match.preferred_opponent_gender column
ALTER TABLE match
  ALTER COLUMN preferred_opponent_gender TYPE "public"."gender_enum"
  USING (preferred_opponent_gender::text::"public"."gender_enum");

-- Drop the old gender_type enum
DROP TYPE IF EXISTS "public"."gender_type" CASCADE;

-- =============================================================================
-- STEP 4: Drop the get_gender_types() RPC function (no longer needed)
-- =============================================================================

DROP FUNCTION IF EXISTS get_gender_types();

-- =============================================================================
-- STEP 5: Recreate search_matches_nearby with gender_enum cast
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
  p_user_gender TEXT DEFAULT NULL
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
  v_user_point := extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography;

  RETURN QUERY
  SELECT
    m.id AS match_id,
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
    AND m.cancelled_at IS NULL
    AND m.sport_id = p_sport_id
    AND (
      (m.location_type = 'facility' AND f.is_active = TRUE AND f.location IS NOT NULL)
      OR (m.location_type = 'custom' AND m.custom_latitude IS NOT NULL AND m.custom_longitude IS NOT NULL)
    )
    AND (
      (m.location_type = 'facility' AND extensions.ST_DWithin(
        f.location,
        v_user_point,
        p_max_distance_km * 1000
      ))
      OR
      (m.location_type = 'custom' AND extensions.ST_DWithin(
        extensions.ST_SetSRID(extensions.ST_MakePoint(m.custom_longitude, m.custom_latitude), 4326)::extensions.geography,
        v_user_point,
        p_max_distance_km * 1000
      ))
    )
    AND (
      CASE
        WHEN m.timezone IS NOT NULL THEN
          timezone(m.timezone, (m.match_date + m.start_time)::timestamp) > current_time_utc
        ELSE
          (m.match_date + m.start_time)::timestamp > (current_time_utc AT TIME ZONE 'UTC')::timestamp
      END
    )
    AND (
      p_user_gender IS NULL
      OR m.preferred_opponent_gender IS NULL
      OR m.preferred_opponent_gender = p_user_gender::gender_enum
    )
  ORDER BY
    (m.match_date + m.start_time)::timestamp ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION search_matches_nearby IS 'Search public matches (both facility and custom location) within a given distance from user location, filtered by sport and gender eligibility. Uses gender_enum. Returns match IDs sorted by date/time.';

GRANT EXECUTE ON FUNCTION search_matches_nearby(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, INT, INT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION search_matches_nearby(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, INT, INT, TEXT
) TO anon;

-- =============================================================================
-- STEP 6: Recreate search_public_matches with gender_enum cast
-- =============================================================================
-- Drop all known overloads (16-param from older migrations, 20-param from 20260128000004)
-- so only one version exists before we create the new one.

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
  TEXT,
  TEXT,
  DATE,
  INT,
  INT,
  TEXT,
  UUID
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
  p_offset INT DEFAULT 0,
  p_user_gender TEXT DEFAULT NULL
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
  v_has_distance_filter := p_max_distance_km IS NOT NULL AND p_max_distance_km > 0;

  IF v_has_distance_filter THEN
    v_user_point := extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography;
  END IF;

  v_date_from := CURRENT_DATE;

  IF p_date_range = 'today' THEN
    v_date_to := CURRENT_DATE;
  ELSIF p_date_range = 'week' THEN
    v_date_to := CURRENT_DATE + INTERVAL '7 days';
  ELSIF p_date_range = 'weekend' THEN
    v_date_from := CURRENT_DATE + ((6 - EXTRACT(DOW FROM CURRENT_DATE)::INT) % 7) * INTERVAL '1 day';
    v_date_to := v_date_from + INTERVAL '1 day';
    IF EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6) THEN
      v_date_from := CURRENT_DATE;
      IF EXTRACT(DOW FROM CURRENT_DATE) = 6 THEN
        v_date_to := CURRENT_DATE + INTERVAL '1 day';
      ELSE
        v_date_to := CURRENT_DATE;
      END IF;
    END IF;
  ELSE
    v_date_to := CURRENT_DATE + INTERVAL '1 year';
  END IF;

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

  IF p_search_query IS NOT NULL AND p_search_query <> '' THEN
    v_search_pattern := '%' || LOWER(p_search_query) || '%';
  END IF;

  RETURN QUERY
  SELECT
    m.id AS match_id,
    CASE
      WHEN NOT v_has_distance_filter THEN
        NULL
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
  LEFT JOIN profile p ON p.id = m.created_by
  LEFT JOIN rating_score rs ON rs.id = m.min_rating_score_id
  WHERE m.visibility = 'public'
    AND m.cancelled_at IS NULL
    AND m.sport_id = p_sport_id
    AND (
      NOT v_has_distance_filter
      OR (
        (m.location_type = 'facility' AND f.is_active = TRUE AND f.location IS NOT NULL)
        OR (m.location_type = 'custom' AND m.custom_latitude IS NOT NULL AND m.custom_longitude IS NOT NULL)
      )
    )
    AND (
      NOT v_has_distance_filter
      OR (
        (m.location_type = 'facility' AND extensions.ST_DWithin(
          f.location,
          v_user_point,
          p_max_distance_km * 1000
        ))
        OR
        (m.location_type = 'custom' AND extensions.ST_DWithin(
          extensions.ST_SetSRID(extensions.ST_MakePoint(m.custom_longitude, m.custom_latitude), 4326)::extensions.geography,
          v_user_point,
          p_max_distance_km * 1000
        ))
      )
    )
    AND m.match_date >= v_date_from
    AND m.match_date <= v_date_to
    AND (m.match_date + m.start_time) > (NOW() AT TIME ZONE COALESCE(m.timezone, 'UTC'))
    AND (p_format IS NULL OR m.format = p_format::match_format_enum)
    AND (
      p_match_type IS NULL
      OR (p_match_type = 'casual' AND m.player_expectation IN ('casual', 'both'))
      OR (p_match_type = 'competitive' AND m.player_expectation IN ('competitive', 'both'))
    )
    AND (
      v_time_start IS NULL
      OR (m.start_time >= v_time_start AND m.start_time < v_time_end)
    )
    AND (
      p_skill_level IS NULL
      OR (p_skill_level = 'beginner' AND (rs.id IS NULL OR rs.value < 3.0))
      OR (p_skill_level = 'intermediate' AND rs.value >= 3.0 AND rs.value < 4.5)
      OR (p_skill_level = 'advanced' AND rs.value >= 4.5)
    )
    AND (
      p_user_gender IS NULL
      OR m.preferred_opponent_gender IS NULL
      OR m.preferred_opponent_gender = p_user_gender::gender_enum
    )
    AND (
      p_gender IS NULL
      OR m.preferred_opponent_gender IS NULL
      OR m.preferred_opponent_gender = p_gender::gender_enum
    )
    AND (
      p_cost IS NULL
      OR (p_cost = 'free' AND m.is_court_free = TRUE)
      OR (p_cost = 'paid' AND m.is_court_free = FALSE)
    )
    AND (
      p_join_mode IS NULL
      OR m.join_mode = p_join_mode::match_join_mode_enum
    )
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

COMMENT ON FUNCTION search_public_matches(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT
) IS 'Search public matches with comprehensive filters including gender eligibility. Uses gender_enum. When p_max_distance_km is NULL, returns matches of ALL location types.';

GRANT EXECUTE ON FUNCTION search_public_matches(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION search_public_matches(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT
) TO anon;
