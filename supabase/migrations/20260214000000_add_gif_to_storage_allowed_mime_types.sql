-- Migration: Add GIF support to storage buckets
-- Created: 2026-02-14
-- Description: Adds image/gif to allowed_mime_types for profile-pictures and facility-images buckets

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
WHERE id IN ('profile-pictures', 'facility-images');
