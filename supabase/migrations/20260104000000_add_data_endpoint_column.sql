-- Migration: Add data_endpoint column to organization and facility tables
-- This column stores the URL endpoint that can be queried to retrieve facility court availabilities

-- Add data_endpoint to organization table
ALTER TABLE organization
ADD COLUMN data_endpoint TEXT;

COMMENT ON COLUMN organization.data_endpoint IS 'URL endpoint to query for facility court availabilities';

-- Add data_endpoint to facility table  
ALTER TABLE facility
ADD COLUMN data_endpoint TEXT;

COMMENT ON COLUMN facility.data_endpoint IS 'URL endpoint to query for court availabilities at this facility';

