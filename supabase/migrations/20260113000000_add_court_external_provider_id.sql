-- ============================================================================
-- Migration: Add external_provider_id to court table
-- Created: 2026-01-13
-- Description: Adds external_provider_id column to court table to enable
--              mapping between external provider courts (e.g., Loisir Montreal)
--              and local court records. This allows linking matches to specific
--              courts when users book through external systems.
-- ============================================================================

-- Add external_provider_id column to court table
-- This stores the external system's identifier for the court
-- (e.g., Loisir Montreal's facility.id which is computed as siteId * 100 + courtIndex + 1)
ALTER TABLE court ADD COLUMN IF NOT EXISTS external_provider_id TEXT;

-- Create index for efficient lookups by external_provider_id
-- Partial index since most courts may not have an external ID initially
CREATE INDEX IF NOT EXISTS idx_court_external_provider_id 
  ON court(external_provider_id) 
  WHERE external_provider_id IS NOT NULL;

-- Create unique constraint on facility_id + external_provider_id to prevent duplicates
-- This ensures each external court ID is unique within a facility
CREATE UNIQUE INDEX IF NOT EXISTS idx_court_facility_external_unique
  ON court(facility_id, external_provider_id)
  WHERE external_provider_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN court.external_provider_id IS 'External ID used by data providers (e.g., Loisir Montreal facility.id). Used to map external booking systems to local court records.';
