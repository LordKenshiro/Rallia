-- Migration: Make facility-images bucket public
-- Created: 2026-01-27
-- Description: Updates facility-images bucket to be public for easy image display

-- Update facility-images bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'facility-images';

-- Verify the update
DO $$
DECLARE
  is_public boolean;
BEGIN
  SELECT public INTO is_public
  FROM storage.buckets
  WHERE id = 'facility-images';
  
  IF is_public THEN
    RAISE NOTICE 'facility-images bucket is now public';
  ELSE
    RAISE WARNING 'Failed to make facility-images bucket public';
  END IF;
END $$;
