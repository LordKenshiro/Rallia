-- Migration: Add count function for facility search
-- Description: Creates a function to get total count of facilities matching search criteria
--              without pagination, for displaying total results count

CREATE OR REPLACE FUNCTION search_facilities_nearby_count(
  p_sport_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_search_query TEXT DEFAULT NULL,
  p_max_distance_km DOUBLE PRECISION DEFAULT NULL,
  p_facility_types TEXT[] DEFAULT NULL,
  p_surface_types TEXT[] DEFAULT NULL,
  p_court_types TEXT[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT f.id) INTO v_count
  FROM facility f
  INNER JOIN facility_sport fs ON fs.facility_id = f.id
  LEFT JOIN organization o ON o.id = f.organization_id
  LEFT JOIN data_provider fp ON fp.id = f.data_provider_id
  LEFT JOIN data_provider op ON op.id = o.data_provider_id
  WHERE fs.sport_id = p_sport_id
    AND f.is_active = TRUE
    -- Text search filter
    AND (
      p_search_query IS NULL
      OR f.name ILIKE '%' || p_search_query || '%'
      OR f.city ILIKE '%' || p_search_query || '%'
      OR f.address ILIKE '%' || p_search_query || '%'
    )
    -- Distance filter (convert km to meters)
    AND (
      p_max_distance_km IS NULL
      OR extensions.ST_DWithin(
        f.location,
        extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography,
        p_max_distance_km * 1000
      )
    )
    -- Facility type filter
    AND (
      p_facility_types IS NULL
      OR f.facility_type::TEXT = ANY(p_facility_types)
    )
    -- Surface type filter (check if facility has any court with matching surface)
    AND (
      p_surface_types IS NULL
      OR EXISTS (
        SELECT 1 FROM court c
        WHERE c.facility_id = f.id
          AND c.is_active = TRUE
          AND c.surface_type::TEXT = ANY(p_surface_types)
      )
    )
    -- Court type filter (indoor/outdoor based on court.indoor boolean)
    AND (
      p_court_types IS NULL
      OR EXISTS (
        SELECT 1 FROM court c
        WHERE c.facility_id = f.id
          AND c.is_active = TRUE
          AND (
            ('indoor' = ANY(p_court_types) AND c.indoor = TRUE)
            OR ('outdoor' = ANY(p_court_types) AND c.indoor = FALSE)
          )
      )
    );

  RETURN v_count;
END;
$$;

-- Update comment (full signature required when multiple overloads exist)
COMMENT ON FUNCTION search_facilities_nearby_count(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, TEXT[], TEXT[], TEXT[]) IS
'Get total count of facilities matching search criteria without pagination.
Uses the same filtering logic as search_facilities_nearby for consistency.
Returns the total number of facilities that match the search filters.';
