-- Migration: Update search_facilities_nearby to use data_provider table
-- Description: Returns resolved provider info (facility-level or org-level fallback)

-- Drop existing function first (required to change return type)
DROP FUNCTION IF EXISTS search_facilities_nearby(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INT, INT);

-- Recreate the function with provider info columns
CREATE OR REPLACE FUNCTION search_facilities_nearby(
  p_sport_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_search_query TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  city VARCHAR(100),
  address VARCHAR(255),
  distance_meters DOUBLE PRECISION,
  -- Provider info (resolved: facility first, then org fallback)
  data_provider_id UUID,
  data_provider_type TEXT,
  booking_url_template TEXT,
  external_provider_id TEXT,
  -- Keep legacy columns for backwards compatibility during transition
  data_endpoint TEXT,
  organization_data_endpoint TEXT
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
    -- Resolved provider info (facility takes precedence over org)
    COALESCE(f.data_provider_id, o.data_provider_id) AS data_provider_id,
    COALESCE(fp.provider_type, op.provider_type) AS data_provider_type,
    COALESCE(fp.booking_url_template, op.booking_url_template) AS booking_url_template,
    f.external_provider_id,
    -- Legacy columns (can be removed after full migration)
    f.data_endpoint,
    o.data_endpoint AS organization_data_endpoint
  FROM facility f
  INNER JOIN facility_sport fs ON fs.facility_id = f.id
  LEFT JOIN organization o ON o.id = f.organization_id
  LEFT JOIN data_provider fp ON fp.id = f.data_provider_id AND fp.is_active = TRUE
  LEFT JOIN data_provider op ON op.id = o.data_provider_id AND op.is_active = TRUE
  WHERE f.is_active = TRUE
    AND fs.sport_id = p_sport_id
    AND f.location IS NOT NULL
    AND (p_search_query IS NULL OR f.name ILIKE '%' || p_search_query || '%')
  ORDER BY distance_meters ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Update comment
COMMENT ON FUNCTION search_facilities_nearby IS 'Search facilities by sport, sorted by distance from user location. Includes resolved data provider info for availability fetching.';

