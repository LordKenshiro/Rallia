-- =============================================================================
-- Migration: Add group-images storage bucket
-- Description: Creates a storage bucket for group cover images
-- =============================================================================

-- Create the group-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'group-images',
  'group-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- RLS Policies for group-images bucket
-- =============================================================================

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated users can upload group images" ON storage.objects;
CREATE POLICY "Authenticated users can upload group images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'group-images');

-- Allow anyone to view group images (public bucket)
DROP POLICY IF EXISTS "Anyone can view group images" ON storage.objects;
CREATE POLICY "Anyone can view group images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'group-images');

-- Allow authenticated users to update their own uploads
DROP POLICY IF EXISTS "Authenticated users can update group images" ON storage.objects;
CREATE POLICY "Authenticated users can update group images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'group-images')
WITH CHECK (bucket_id = 'group-images');

-- Allow authenticated users to delete their own uploads
DROP POLICY IF EXISTS "Authenticated users can delete group images" ON storage.objects;
CREATE POLICY "Authenticated users can delete group images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'group-images');
