-- Migration: Split full_name into first_name and last_name
-- Date: 2026-01-12
-- Description: Updates the profile table to have separate first_name and last_name columns

-- Step 1: Add new columns
ALTER TABLE profile ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Step 2: Migrate existing data from full_name to first_name/last_name (only if column exists)
-- Split on first space: first word becomes first_name, rest becomes last_name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profile' AND column_name = 'full_name'
  ) THEN
    UPDATE profile 
    SET 
      first_name = CASE 
        WHEN full_name IS NULL THEN NULL
        WHEN position(' ' IN full_name) > 0 THEN split_part(full_name, ' ', 1)
        ELSE full_name
      END,
      last_name = CASE 
        WHEN full_name IS NULL THEN NULL
        WHEN position(' ' IN full_name) > 0 THEN substring(full_name FROM position(' ' IN full_name) + 1)
        ELSE ''
      END
    WHERE full_name IS NOT NULL;
  END IF;
END $$;

-- Step 3: Make first_name NOT NULL (after data migration)
-- Note: We make first_name required, last_name optional
-- Only set NOT NULL if not already set
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profile' AND column_name = 'first_name' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE profile ALTER COLUMN first_name SET NOT NULL;
  END IF;
END $$;

-- Step 4: Drop the old full_name column
ALTER TABLE profile DROP COLUMN IF EXISTS full_name;

-- Step 5: Add comment for documentation
COMMENT ON COLUMN profile.first_name IS 'User first name (required)';
COMMENT ON COLUMN profile.last_name IS 'User last name (optional)';
