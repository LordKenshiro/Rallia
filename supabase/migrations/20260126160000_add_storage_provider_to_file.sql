-- Migration: Add storage_provider to file table for multi-provider support
-- This allows tracking whether files are stored in Supabase Storage or Backblaze B2
-- Videos are stored in Backblaze B2 for cost efficiency, other files in Supabase

-- Create storage provider enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_provider_enum') THEN
    CREATE TYPE storage_provider_enum AS ENUM ('supabase', 'backblaze');
  END IF;
END$$;

-- Add storage_provider column to file table
ALTER TABLE file 
ADD COLUMN IF NOT EXISTS storage_provider storage_provider_enum DEFAULT 'supabase' NOT NULL;

-- Add video_duration_seconds for video files (useful for preview/playback)
ALTER TABLE file 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Add video thumbnail status (for async thumbnail generation)
ALTER TABLE file 
ADD COLUMN IF NOT EXISTS thumbnail_status VARCHAR(50) DEFAULT 'pending';

-- Add index for storage provider (useful for cleanup/migration queries)
CREATE INDEX IF NOT EXISTS idx_file_storage_provider ON file(storage_provider);

-- Comment on new columns
COMMENT ON COLUMN file.storage_provider IS 'Storage provider: supabase for images/documents, backblaze for videos';
COMMENT ON COLUMN file.duration_seconds IS 'Duration in seconds for video/audio files';
COMMENT ON COLUMN file.thumbnail_status IS 'Status of thumbnail generation: pending, processing, completed, failed';
