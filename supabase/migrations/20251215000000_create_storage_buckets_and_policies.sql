-- Migration: Create Storage Buckets and Policies
-- Created: 2024-12-15
-- Description: Creates storage buckets and RLS policies for profile-pictures and facility-images
-- This migration is idempotent and can be run multiple times safely

-- ============================================================================
-- 1. CREATE STORAGE BUCKETS
-- ============================================================================

-- Create profile-pictures bucket (public for read access)
-- Note: Supabase manages the storage.buckets table, so we use INSERT with ON CONFLICT
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true, -- Public read access
  5242880, -- 5MB limit (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create facility-images bucket (authenticated access only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'facility-images',
  'facility-images',
  false, -- Not public, requires authentication
  10485760, -- 10MB limit (10 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 2. CREATE RLS POLICIES FOR profile-pictures BUCKET
-- ============================================================================

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Users can upload own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Public profile pictures are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile picture" ON storage.objects;

-- Allow authenticated users to upload their own profile picture
-- Files must be in a folder named with their user ID: {user_id}/filename.jpg
CREATE POLICY "Users can upload own profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to profile pictures
CREATE POLICY "Public profile pictures are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- Allow users to update their own profile picture
CREATE POLICY "Users can update own profile picture"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own profile picture
CREATE POLICY "Users can delete own profile picture"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 3. CREATE RLS POLICIES FOR facility-images BUCKET
-- ============================================================================

-- Drop existing policies if they exist (to allow re-running migration)
-- This includes policies from remote schema migration that may have different names
DROP POLICY IF EXISTS "Authenticated users can retrieve facility images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload facility images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update facility images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete facility images" ON storage.objects;

-- Drop policies from remote schema migration (they have suffixes like "6mc4pu_0")
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE '%facility images%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
  END LOOP;
END $$;

-- Allow authenticated users to read facility images
CREATE POLICY "Authenticated users can retrieve facility images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'facility-images');

-- Allow authenticated users to upload facility images
CREATE POLICY "Authenticated users can upload facility images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'facility-images');

-- Allow authenticated users to update facility images
CREATE POLICY "Authenticated users can update facility images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'facility-images')
WITH CHECK (bucket_id = 'facility-images');

-- Allow authenticated users to delete facility images
CREATE POLICY "Authenticated users can delete facility images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'facility-images');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify buckets were created
DO $$
DECLARE
  bucket_count integer;
BEGIN
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets
  WHERE id IN ('profile-pictures', 'facility-images');
  
  IF bucket_count < 2 THEN
    RAISE WARNING 'Expected 2 buckets, found %', bucket_count;
  ELSE
    RAISE NOTICE 'Successfully created/verified storage buckets';
  END IF;
END $$;

