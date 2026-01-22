-- Migration: Seed Loisir Montreal data provider
-- Description: Creates the Loisir Montreal provider and links it to the Montreal organization

-- =============================================================================
-- 1. CREATE LOISIR MONTREAL PROVIDER
-- =============================================================================

INSERT INTO data_provider (
    id,
    name,
    provider_type,
    api_base_url,
    api_config,
    booking_url_template,
    is_active
)
VALUES (
    'd1234567-89ab-cdef-0123-456789abcdef',
    'Loisir Montreal',
    'loisir_montreal',
    'https://loisirs.montreal.ca/IC3/api/U6510',
    '{
        "searchPath": "/public/search",
        "defaultLimit": 50,
        "facilityTypeIds": null,
        "boroughIds": null
    }'::jsonb,
    'https://loisirs.montreal.ca/IC3/#/U6510/view/{facilityId}/{startDateTime}/{endDateTime}/{facilityScheduleId}',
    true
)
ON CONFLICT (provider_type) DO UPDATE SET
    name = EXCLUDED.name,
    api_base_url = EXCLUDED.api_base_url,
    api_config = EXCLUDED.api_config,
    booking_url_template = EXCLUDED.booking_url_template,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =============================================================================
-- 2. LINK MONTREAL ORGANIZATION TO PROVIDER
-- =============================================================================

-- Update the Ville de Montreal organization to use the Loisir Montreal provider
-- All facilities under this organization will inherit this provider
UPDATE organization
SET data_provider_id = 'd1234567-89ab-cdef-0123-456789abcdef'
WHERE id = '0dc574ba-afa1-4d8b-89f1-9be39f67e23d';

-- =============================================================================
-- 3. COMMENT
-- =============================================================================

COMMENT ON TABLE data_provider IS 'External data providers for court availability. Loisir Montreal is the first provider for public courts in Montreal.';

