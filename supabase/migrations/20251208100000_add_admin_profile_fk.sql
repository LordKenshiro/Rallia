-- Migration: Add foreign key from admin.id to profile.id
-- This enables joining admin records with profile data

-- Add foreign key constraint
ALTER TABLE admin
  ADD CONSTRAINT admin_id_fkey
  FOREIGN KEY (id)
  REFERENCES profile(id)
  ON DELETE CASCADE;

-- Add comment for documentation
COMMENT ON CONSTRAINT admin_id_fkey ON admin IS 'Links admin to their profile record';

