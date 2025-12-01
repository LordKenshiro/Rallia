-- Add RLS policies for all onboarding-related tables
-- This ensures authenticated users can access their own data during the onboarding flow

-- ========================================
-- PART 1: player_sport table (user's sport selections)
-- ========================================

-- Enable RLS on player_sport table
ALTER TABLE player_sport ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own player_sport data" ON player_sport;
DROP POLICY IF EXISTS "Users can insert their own player_sport data" ON player_sport;
DROP POLICY IF EXISTS "Users can update their own player_sport data" ON player_sport;
DROP POLICY IF EXISTS "Users can delete their own player_sport data" ON player_sport;

-- Policy: Users can view their own player_sport data
CREATE POLICY "Users can view their own player_sport data"
ON player_sport
FOR SELECT
TO authenticated
USING (auth.uid() = player_id);

-- Policy: Users can insert their own player_sport data
CREATE POLICY "Users can insert their own player_sport data"
ON player_sport
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = player_id);

-- Policy: Users can update their own player_sport data
CREATE POLICY "Users can update their own player_sport data"
ON player_sport
FOR UPDATE
TO authenticated
USING (auth.uid() = player_id)
WITH CHECK (auth.uid() = player_id);

-- Policy: Users can delete their own player_sport data
CREATE POLICY "Users can delete their own player_sport data"
ON player_sport
FOR DELETE
TO authenticated
USING (auth.uid() = player_id);

-- ========================================
-- PART 2: player_rating_score table (user's rating preferences)
-- ========================================

-- Enable RLS on player_rating_score table
ALTER TABLE player_rating_score ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own player_rating_score data" ON player_rating_score;
DROP POLICY IF EXISTS "Users can insert their own player_rating_score data" ON player_rating_score;
DROP POLICY IF EXISTS "Users can update their own player_rating_score data" ON player_rating_score;
DROP POLICY IF EXISTS "Users can delete their own player_rating_score data" ON player_rating_score;

-- Policy: Users can view their own player_rating_score data
CREATE POLICY "Users can view their own player_rating_score data"
ON player_rating_score
FOR SELECT
TO authenticated
USING (auth.uid() = player_id);

-- Policy: Users can insert their own player_rating_score data
CREATE POLICY "Users can insert their own player_rating_score data"
ON player_rating_score
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = player_id);

-- Policy: Users can update their own player_rating_score data
CREATE POLICY "Users can update their own player_rating_score data"
ON player_rating_score
FOR UPDATE
TO authenticated
USING (auth.uid() = player_id)
WITH CHECK (auth.uid() = player_id);

-- Policy: Users can delete their own player_rating_score data
CREATE POLICY "Users can delete their own player_rating_score data"
ON player_rating_score
FOR DELETE
TO authenticated
USING (auth.uid() = player_id);

-- ========================================
-- PART 3: sport table (read-only for all authenticated users)
-- ========================================

-- Enable RLS on sport table
ALTER TABLE sport ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view sports" ON sport;

-- Policy: All authenticated users can view sports
CREATE POLICY "Authenticated users can view sports"
ON sport
FOR SELECT
TO authenticated
USING (true);

-- ========================================
-- PART 4: rating table (read-only for all authenticated users)
-- ========================================

-- Enable RLS on rating table
ALTER TABLE rating ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view ratings" ON rating;

-- Policy: All authenticated users can view ratings
CREATE POLICY "Authenticated users can view ratings"
ON rating
FOR SELECT
TO authenticated
USING (true);

-- ========================================
-- PART 5: rating_score table (read-only for all authenticated users)
-- ========================================

-- Enable RLS on rating_score table
ALTER TABLE rating_score ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view rating_scores" ON rating_score;

-- Policy: All authenticated users can view rating_scores
CREATE POLICY "Authenticated users can view rating_scores"
ON rating_score
FOR SELECT
TO authenticated
USING (true);

-- Add comments for documentation
COMMENT ON POLICY "Users can view their own player_sport data" ON player_sport IS 'Allows authenticated users to read their sport selections';
COMMENT ON POLICY "Users can insert their own player_sport data" ON player_sport IS 'Allows authenticated users to add sport selections during onboarding';
COMMENT ON POLICY "Users can update their own player_sport data" ON player_sport IS 'Allows authenticated users to update their sport selections';
COMMENT ON POLICY "Users can delete their own player_sport data" ON player_sport IS 'Allows authenticated users to remove sport selections';

COMMENT ON POLICY "Users can view their own player_rating_score data" ON player_rating_score IS 'Allows authenticated users to read their rating preferences';
COMMENT ON POLICY "Users can insert their own player_rating_score data" ON player_rating_score IS 'Allows authenticated users to set rating preferences during onboarding';
COMMENT ON POLICY "Users can update their own player_rating_score data" ON player_rating_score IS 'Allows authenticated users to update their rating preferences';
COMMENT ON POLICY "Users can delete their own player_rating_score data" ON player_rating_score IS 'Allows authenticated users to remove rating preferences';

COMMENT ON POLICY "Authenticated users can view sports" ON sport IS 'Allows all authenticated users to view available sports (reference data)';
COMMENT ON POLICY "Authenticated users can view ratings" ON rating IS 'Allows all authenticated users to view available ratings (reference data)';
COMMENT ON POLICY "Authenticated users can view rating_scores" ON rating_score IS 'Allows all authenticated users to view available rating scores (reference data)';
