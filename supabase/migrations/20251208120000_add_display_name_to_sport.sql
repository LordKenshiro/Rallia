-- Migration: Add display_name column to sport table
-- The initial schema had this column, but it was missing from the remote schema sync

-- Add display_name column to sport table
ALTER TABLE sport
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- Update existing records to use name as display_name if display_name is null
UPDATE sport
SET display_name = name
WHERE display_name IS NULL;

-- Make display_name NOT NULL after populating existing records
ALTER TABLE sport
  ALTER COLUMN display_name SET NOT NULL;

-- Add comment
COMMENT ON COLUMN sport.display_name IS 'Display name for the sport (may differ from the name field for formatting purposes)';

