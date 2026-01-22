-- Migration: Remove deprecated data_endpoint columns
-- Description: Removes the legacy data_endpoint columns from facility and organization tables
--              since we now use the data_provider system for court availability

-- =============================================================================
-- 1. UPDATE SEARCH FUNCTION TO REMOVE LEGACY FIELDS
-- =============================================================================

-- Drop existing function first (required to change return type)
DROP FUNCTION IF EXISTS search_facilities_nearby(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INT, INT);

-- Recreate function without legacy data_endpoint fields
CREATE OR REPLACE FUNCTION search_facilities_nearby(
  p_sport_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_search_query TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  name VARCHAR(255),
  city VARCHAR(100),
  address VARCHAR(255),
  distance_meters DOUBLE PRECISION,
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
    AND (
      p_search_query IS NULL
      OR f.name ILIKE '%' || p_search_query || '%'
      OR f.city ILIKE '%' || p_search_query || '%'
      OR f.address ILIKE '%' || p_search_query || '%'
    )
  ORDER BY distance_meters ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =============================================================================
-- 2. DROP LEGACY COLUMNS
-- =============================================================================

-- Remove data_endpoint from facility table
ALTER TABLE facility
DROP COLUMN IF EXISTS data_endpoint;

-- Remove data_endpoint from organization table
ALTER TABLE organization
DROP COLUMN IF EXISTS data_endpoint;

-- =============================================================================
-- 3. COMMENTS
-- =============================================================================

COMMENT ON FUNCTION search_facilities_nearby IS 
'Search for facilities near a location that support a specific sport. 
Returns facility info with provider details for court availability fetching.';

