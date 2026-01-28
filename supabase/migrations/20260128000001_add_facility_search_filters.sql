-- Migration: Add filters to facility search RPC
-- Description: Extends search_facilities_nearby with distance, facility_type, 
--              surface_type, and court_type filters

-- Drop existing function first (required to change signature)
DROP FUNCTION IF EXISTS search_facilities_nearby(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INT, INT);

-- Recreate function with filter parameters
-- Note: p_court_types uses 'indoor'/'outdoor' values which map to the court.indoor boolean
CREATE OR REPLACE FUNCTION search_facilities_nearby(
  p_sport_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_search_query TEXT DEFAULT NULL,
  p_max_distance_km DOUBLE PRECISION DEFAULT NULL,
  p_facility_types TEXT[] DEFAULT NULL,
  p_surface_types TEXT[] DEFAULT NULL,
  p_court_types TEXT[] DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  name VARCHAR(255),
  city VARCHAR(100),
  address VARCHAR(255),
  distance_meters DOUBLE PRECISION,
  facility_type TEXT,
  data_provider_id UUID,
  data_provider_type TEXT,
  booking_url_template TEXT,
  external_provider_id TEXT,
  timezone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.name,
    f.city,
    f.address,
    extensions.ST_Distance(
      f.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography
    ) AS distance_meters,
    f.facility_type::TEXT AS facility_type,
    -- Provider info: facility-level takes precedence over organization-level
    COALESCE(f.data_provider_id, o.data_provider_id) AS data_provider_id,
    COALESCE(fp.provider_type, op.provider_type) AS data_provider_type,
    COALESCE(fp.booking_url_template, op.booking_url_template) AS booking_url_template,
    f.external_provider_id,
    -- Timezone for accurate scheduling
    f.timezone
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
    -- 'indoor' = c.indoor = true, 'outdoor' = c.indoor = false
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
    )
  ORDER BY distance_meters ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Update comment
COMMENT ON FUNCTION search_facilities_nearby IS 
'Search for facilities near a location that support a specific sport.
Supports filtering by:
- Distance (max km from location)
- Facility type (park, club, indoor_center, etc.)
- Surface type (hard, clay, grass, etc.)
- Court type (indoor, outdoor, covered)
Returns facility info with provider details for court availability fetching.';
