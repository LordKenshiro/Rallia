-- Migration: Add icon_url column to sport table
-- The original schema had icon_url but it was lost during the consolidation
-- from the remote schema (which didn't have it)

ALTER TABLE sport ADD COLUMN IF NOT EXISTS icon_url TEXT;

COMMENT ON COLUMN sport.icon_url IS 'URL to the sport icon image';

