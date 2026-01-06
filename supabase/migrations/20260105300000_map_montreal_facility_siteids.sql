-- Migration: Map Montreal facilities to Loisir Montreal siteIds
-- Description: Sets external_provider_id for Montreal tennis facilities
-- Note: These siteIds need to be obtained from the Loisir Montreal API
--       by searching for each facility name and matching to their database

-- =============================================================================
-- MAP MONTREAL FACILITIES TO LOISIR MONTREAL SITE IDS
-- =============================================================================

-- The external_provider_id for Montreal facilities should be the siteId
-- from the Loisir Montreal system. These can be discovered by:
-- 1. Calling the search API with searchString matching the facility name
-- 2. Or browsing the Loisir Montreal website to find the siteId in URLs
--
-- Example API call to discover siteIds:
-- POST https://loisirs.montreal.ca/IC3/api/U6510/public/search
-- Body: { "searchString": "Parc Jarry", "dates": ["2024-01-15"], "limit": 50 }

-- Placeholder mappings - update these with actual siteIds from Loisir Montreal
-- When you discover the correct siteId for each facility, update with:
-- UPDATE facility SET external_provider_id = '<siteId>' WHERE id = '<facilityUUID>';
--
-- Facilities under Ville de Montreal organization (0dc574ba-afa1-4d8b-89f1-9be39f67e23d)
-- To find the siteIds, query the Loisir Montreal API with the facility names

-- For now, we'll set external_provider_id to NULL which means the provider
-- will search by facility name or return all Montreal courts
-- The provider system will still work, just without filtering to specific sites

-- Note: To enable per-facility filtering, discover the siteIds and run:
-- UPDATE facility SET external_provider_id = '<siteId>' WHERE id = '<facilityUUID>';

-- =============================================================================
-- COMMENT
-- =============================================================================

COMMENT ON TABLE facility IS 'Tennis and pickleball facilities. external_provider_id maps to Loisir Montreal siteId for Montreal public courts.';

