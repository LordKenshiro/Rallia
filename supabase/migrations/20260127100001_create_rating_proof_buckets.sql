-- Migration: Create storage buckets for rating proof files
-- This creates separate buckets for images, documents, and videos (fallback)

-- Insert rating-proof-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rating-proof-images',
  'rating-proof-images',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];

-- Insert rating-proof-documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rating-proof-documents',
  'rating-proof-documents',
  true,
  26214400, -- 25 MB
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

-- Insert rating-proof-videos bucket (fallback if Backblaze not configured)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rating-proof-videos',
  'rating-proof-videos',
  true,
  524288000, -- 500 MB
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/3gpp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/3gpp'];

-- Drop existing policies if they exist, then recreate
-- rating-proof-images policies
DROP POLICY IF EXISTS "Users can upload their own proof images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own proof images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own proof images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view proof images" ON storage.objects;

-- rating-proof-documents policies
DROP POLICY IF EXISTS "Users can upload their own proof documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own proof documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own proof documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view proof documents" ON storage.objects;

-- rating-proof-videos policies
DROP POLICY IF EXISTS "Users can upload their own proof videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own proof videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own proof videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view proof videos" ON storage.objects;

-- Create storage policies for rating-proof-images bucket
CREATE POLICY "Users can upload their own proof images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rating-proof-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own proof images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'rating-proof-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own proof images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'rating-proof-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view proof images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'rating-proof-images');

-- Create storage policies for rating-proof-documents bucket
CREATE POLICY "Users can upload their own proof documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rating-proof-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own proof documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'rating-proof-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own proof documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'rating-proof-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view proof documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'rating-proof-documents');

-- Create storage policies for rating-proof-videos bucket
CREATE POLICY "Users can upload their own proof videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rating-proof-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own proof videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'rating-proof-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own proof videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'rating-proof-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view proof videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'rating-proof-videos');
