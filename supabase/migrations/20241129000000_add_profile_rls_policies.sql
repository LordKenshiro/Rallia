-- Add RLS policies for profile table
-- This allows authenticated users to manage their own profile data

-- Enable RLS on profile table (if not already enabled)
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON profile;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profile;
DROP POLICY IF EXISTS "Users can update their own profile" ON profile;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profile;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON profile
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON profile
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON profile
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Users can delete their own profile (optional, usually not needed)
CREATE POLICY "Users can delete their own profile"
ON profile
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Add comment for documentation
COMMENT ON POLICY "Users can view their own profile" ON profile IS 'Allows authenticated users to read their own profile data';
COMMENT ON POLICY "Users can insert their own profile" ON profile IS 'Allows authenticated users to create their own profile during onboarding';
COMMENT ON POLICY "Users can update their own profile" ON profile IS 'Allows authenticated users to update their own profile data';
COMMENT ON POLICY "Users can delete their own profile" ON profile IS 'Allows authenticated users to delete their own profile (use with caution)';
