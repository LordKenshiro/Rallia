-- Migration: Add facility-files Storage Bucket and RLS Policies
-- Created: 2026-01-27
-- Description: Creates the facility-files storage bucket for uploading documents/files
--              and adds RLS policies for both storage and database tables
-- This migration is idempotent and can be run multiple times safely

-- ============================================================================
-- 1. CREATE FACILITY-FILES STORAGE BUCKET
-- ============================================================================

-- Create facility-files bucket (authenticated access, supports more file types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'facility-files',
  'facility-files',
  true, -- Public read access for easy file downloads
  52428800, -- 50MB limit (50 * 1024 * 1024) for larger documents
  ARRAY[
    -- Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    -- Audio/Video
    'audio/mpeg', 'audio/wav', 'audio/mp4',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 2. CREATE RLS POLICIES FOR facility-files BUCKET
-- ============================================================================

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Authenticated users can upload facility files" ON storage.objects;
DROP POLICY IF EXISTS "Public facility files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update facility files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete facility files" ON storage.objects;

-- Allow authenticated users to upload facility files
CREATE POLICY "Authenticated users can upload facility files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'facility-files');

-- Allow public read access to facility files (for easy download links)
CREATE POLICY "Public facility files are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'facility-files');

-- Allow authenticated users to update facility files
CREATE POLICY "Authenticated users can update facility files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'facility-files')
WITH CHECK (bucket_id = 'facility-files');

-- Allow authenticated users to delete facility files
CREATE POLICY "Authenticated users can delete facility files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'facility-files');

-- ============================================================================
-- 3. ENABLE RLS ON FILE AND FACILITY_FILE TABLES
-- ============================================================================

-- Enable RLS on file table if not already enabled
ALTER TABLE file ENABLE ROW LEVEL SECURITY;

-- Enable RLS on facility_file table if not already enabled
ALTER TABLE facility_file ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES FOR FILE TABLE
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view files" ON file;
DROP POLICY IF EXISTS "Authenticated users can insert files" ON file;
DROP POLICY IF EXISTS "Users can update their own files" ON file;
DROP POLICY IF EXISTS "Users can delete their own files" ON file;

-- Allow authenticated users to view all files
CREATE POLICY "Authenticated users can view files"
ON file FOR SELECT
TO authenticated
USING (is_deleted = false);

-- Allow authenticated users to insert files
CREATE POLICY "Authenticated users can insert files"
ON file FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());

-- Allow users to update their own files
CREATE POLICY "Users can update their own files"
ON file FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Allow users to delete (soft delete) their own files
CREATE POLICY "Users can delete their own files"
ON file FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());

-- ============================================================================
-- 5. CREATE RLS POLICIES FOR FACILITY_FILE TABLE
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view facility files" ON facility_file;
DROP POLICY IF EXISTS "Org members can insert facility files" ON facility_file;
DROP POLICY IF EXISTS "Org members can update facility files" ON facility_file;
DROP POLICY IF EXISTS "Org members can delete facility files" ON facility_file;

-- Allow authenticated users to view facility files
CREATE POLICY "Authenticated users can view facility files"
ON facility_file FOR SELECT
TO authenticated
USING (true);

-- Allow organization members to insert facility files
CREATE POLICY "Org members can insert facility files"
ON facility_file FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM facility f
    JOIN organization_member om ON om.organization_id = f.organization_id
    WHERE f.id = facility_file.facility_id
      AND om.user_id = auth.uid()
  )
);

-- Allow organization members to update facility files
CREATE POLICY "Org members can update facility files"
ON facility_file FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM facility f
    JOIN organization_member om ON om.organization_id = f.organization_id
    WHERE f.id = facility_file.facility_id
      AND om.user_id = auth.uid()
  )
);

-- Allow organization members to delete facility files
CREATE POLICY "Org members can delete facility files"
ON facility_file FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM facility f
    JOIN organization_member om ON om.organization_id = f.organization_id
    WHERE f.id = facility_file.facility_id
      AND om.user_id = auth.uid()
  )
);

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant table access to authenticated users (RLS will handle row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE ON file TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON facility_file TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify bucket was created
DO $$
DECLARE
  bucket_count integer;
BEGIN
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets
  WHERE id = 'facility-files';
  
  IF bucket_count < 1 THEN
    RAISE WARNING 'facility-files bucket was not created';
  ELSE
    RAISE NOTICE 'Successfully created/verified facility-files storage bucket';
  END IF;
END $$;
