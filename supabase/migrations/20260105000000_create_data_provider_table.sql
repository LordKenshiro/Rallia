-- Migration: Create data_provider table and add provider relationships
-- Description: Implements the provider system for court availability fetching from external APIs

-- =============================================================================
-- 1. CREATE DATA_PROVIDER TABLE
-- =============================================================================

CREATE TABLE data_provider (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                           -- Display name (e.g., "Loisir Montreal")
    provider_type TEXT NOT NULL UNIQUE,           -- Provider identifier (e.g., "loisir_montreal")
    api_base_url TEXT NOT NULL,                   -- Base URL for the API
    api_config JSONB DEFAULT '{}',                -- Provider-specific config (paths, auth, defaults)
    booking_url_template TEXT,                    -- URL template with placeholders for booking
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comments
COMMENT ON TABLE data_provider IS 'External data providers for court availability and booking';
COMMENT ON COLUMN data_provider.provider_type IS 'Unique identifier used by the provider registry';
COMMENT ON COLUMN data_provider.api_base_url IS 'Base URL for API requests';
COMMENT ON COLUMN data_provider.api_config IS 'Provider-specific configuration (search paths, auth tokens, etc.)';
COMMENT ON COLUMN data_provider.booking_url_template IS 'URL template with placeholders like {facilityId}, {startDateTime}, {endDateTime}, {facilityScheduleId}';

-- =============================================================================
-- 2. ADD DATA_PROVIDER_ID TO ORGANIZATION (all facilities inherit)
-- =============================================================================

ALTER TABLE organization 
ADD COLUMN data_provider_id UUID REFERENCES data_provider(id) ON DELETE SET NULL;

COMMENT ON COLUMN organization.data_provider_id IS 'Default data provider for all facilities under this organization';

-- =============================================================================
-- 3. ADD DATA_PROVIDER_ID TO FACILITY (optional override)
-- =============================================================================

ALTER TABLE facility 
ADD COLUMN data_provider_id UUID REFERENCES data_provider(id) ON DELETE SET NULL;

COMMENT ON COLUMN facility.data_provider_id IS 'Data provider override for this specific facility (takes precedence over organization)';

-- =============================================================================
-- 4. ADD EXTERNAL_PROVIDER_ID TO FACILITY (for ID mapping)
-- =============================================================================

ALTER TABLE facility 
ADD COLUMN external_provider_id TEXT;

COMMENT ON COLUMN facility.external_provider_id IS 'External ID used by the data provider (e.g., Loisir Montreal siteId)';

-- =============================================================================
-- 5. CREATE INDEXES
-- =============================================================================

CREATE INDEX idx_data_provider_type ON data_provider(provider_type);
CREATE INDEX idx_data_provider_active ON data_provider(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_organization_data_provider ON organization(data_provider_id) WHERE data_provider_id IS NOT NULL;
CREATE INDEX idx_facility_data_provider ON facility(data_provider_id) WHERE data_provider_id IS NOT NULL;
CREATE INDEX idx_facility_external_provider_id ON facility(external_provider_id) WHERE external_provider_id IS NOT NULL;

-- =============================================================================
-- 6. RLS POLICIES FOR DATA_PROVIDER
-- =============================================================================

ALTER TABLE data_provider ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active providers
CREATE POLICY "Authenticated users can read active data providers"
ON data_provider
FOR SELECT
TO authenticated
USING (is_active = TRUE);

-- Allow service role full access (for admin operations)
CREATE POLICY "Service role has full access to data providers"
ON data_provider
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- =============================================================================
-- 7. TRIGGER FOR UPDATED_AT
-- =============================================================================

CREATE TRIGGER set_data_provider_updated_at
    BEFORE UPDATE ON data_provider
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

