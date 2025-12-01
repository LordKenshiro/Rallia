-- Migration: Add description field and populate rating_score table
-- Created: 2024-11-29
-- Description: Add description column to rating_score and populate with Tennis NTRP and Pickleball DUPR ratings

-- ============================================
-- 1. Add description column to rating_score
-- ============================================

ALTER TABLE rating_score
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN rating_score.description IS 'Detailed description of the rating level for UI display';

-- ============================================
-- 2. Populate Tennis NTRP Ratings
-- ============================================

-- Get the Tennis NTRP rating ID
DO $$
DECLARE
  tennis_ntrp_rating_id UUID;
BEGIN
  -- Get the NTRP rating ID for Tennis
  SELECT id INTO tennis_ntrp_rating_id
  FROM rating
  WHERE sport_id = '550e8400-e29b-41d4-a716-446655440001' -- Tennis
    AND rating_type = 'ntrp';
  
  IF tennis_ntrp_rating_id IS NULL THEN
    RAISE EXCEPTION 'Tennis NTRP rating not found';
  END IF;
  
  -- Insert Tennis NTRP rating scores
  INSERT INTO rating_score (rating_id, score_value, display_label, skill_level, description) VALUES
    -- NTRP 1.5 - Beginner
    (tennis_ntrp_rating_id, 1.5, 'NTRP 1.5', 'beginner', 
     'Still working on getting consistent; errors, many focused on getting the ball into play.'),
    
    -- NTRP 2.0 - Novice (Beginner)
    (tennis_ntrp_rating_id, 2.0, 'NTRP 2.0', 'beginner',
     'Obvious stroke weaknesses for singles and doubles. Has clear stroke weaknesses and needs more court experience.'),
    
    -- NTRP 2.5 - Advancing Beginner
    (tennis_ntrp_rating_id, 2.5, 'NTRP 2.5', 'beginner',
     'Starting to judge ball direction and sustain short rallies; limited court coverage.'),
    
    -- NTRP 3.0 - Recreational Player (Intermediate)
    (tennis_ntrp_rating_id, 3.0, 'NTRP 3.0', 'intermediate',
     'Fairly consistent on medium paced shots but lacks control, depth and power with faster shots. Struggles with formations.'),
    
    -- NTRP 3.5 - Intermediate
    (tennis_ntrp_rating_id, 3.5, 'NTRP 3.5', 'intermediate',
     'More reliable strokes with directional control. Improving net play, coverage, and teamwork.'),
    
    -- NTRP 4.0 - Advanced Intermediate
    (tennis_ntrp_rating_id, 4.0, 'NTRP 4.0', 'intermediate',
     'Dependable strokes with control and depth; placement in point play shows teamwork, though rallies may end from impatience.'),
    
    -- NTRP 4.5 - Advanced
    (tennis_ntrp_rating_id, 4.5, 'NTRP 4.5', 'advanced',
     'Solid power and consistency. Controls depth and spin. Strategic shot placement. Good anticipation.'),
    
    -- NTRP 5.0 - Advanced
    (tennis_ntrp_rating_id, 5.0, 'NTRP 5.0', 'advanced',
     'Exceptional shot variety with pace and spin. Excellent footwork and court coverage. Tactical awareness.'),
    
    -- NTRP 5.5 - Advanced/Professional
    (tennis_ntrp_rating_id, 5.5, 'NTRP 5.5', 'advanced',
     'Mastery of all shots. Exceptional consistency and power. Advanced tactics and mental game.'),
    
    -- NTRP 6.0+ - Professional
    (tennis_ntrp_rating_id, 6.0, 'NTRP 6.0+', 'professional',
     'Professional level play. National or international tournament experience. Elite consistency and shot-making.')
  ON CONFLICT (rating_id, score_value) DO UPDATE
    SET display_label = EXCLUDED.display_label,
        skill_level = EXCLUDED.skill_level,
        description = EXCLUDED.description;
  
  RAISE NOTICE 'Tennis NTRP rating scores populated successfully';
END $$;

-- ============================================
-- 3. Populate Pickleball DUPR Ratings
-- ============================================

DO $$
DECLARE
  pickleball_dupr_rating_id UUID;
BEGIN
  -- Get the DUPR rating ID for Pickleball
  SELECT id INTO pickleball_dupr_rating_id
  FROM rating
  WHERE sport_id = '550e8400-e29b-41d4-a716-446655440002' -- Pickleball
    AND rating_type = 'dupr';
  
  IF pickleball_dupr_rating_id IS NULL THEN
    RAISE EXCEPTION 'Pickleball DUPR rating not found';
  END IF;
  
  -- Insert Pickleball DUPR rating scores
  INSERT INTO rating_score (rating_id, score_value, display_label, skill_level, description) VALUES
    -- DUPR 1.0 - Beginner
    (pickleball_dupr_rating_id, 1.0, 'DUPR 1.0', 'beginner',
     'Just starting out. Learning basic rules and stroke mechanics. Very short rallies.'),
    
    -- DUPR 2.0 - Beginner
    (pickleball_dupr_rating_id, 2.0, 'DUPR 2.0', 'beginner',
     'Just getting started. Short rallies (1-2 shots). Learning basic scoring knowledge.'),
    
    -- DUPR 2.5 - Beginner
    (pickleball_dupr_rating_id, 2.5, 'DUPR 2.5', 'beginner',
     'Developing basic strokes. Can sustain short rallies. Learning court positioning.'),
    
    -- DUPR 3.0 - Lower Intermediate
    (pickleball_dupr_rating_id, 3.0, 'DUPR 3.0', 'beginner',
     'Can sustain short rallies and serves. Beginning to dink. Learning positioning.'),
    
    -- DUPR 3.5 - Intermediate
    (pickleball_dupr_rating_id, 3.5, 'DUPR 3.5', 'intermediate',
     'Developing third-shot drop. Can dink moderately. Avoids backhands.'),
    
    -- DUPR 4.0 - Upper Intermediate
    (pickleball_dupr_rating_id, 4.0, 'DUPR 4.0', 'intermediate',
     'Plays longer rallies with patience. Aware of positioning. Uses varied shots. Mixing power and soft shots.'),
    
    -- DUPR 4.5 - Advanced
    (pickleball_dupr_rating_id, 4.5, 'DUPR 4.5', 'intermediate',
     'Strong consistency and power. Varied shots. Faster speed. Comfortable crashing near the kitchen.'),
    
    -- DUPR 5.0 - Elite (Advanced)
    (pickleball_dupr_rating_id, 5.0, 'DUPR 5.0', 'advanced',
     'Highest level of shot types. Rarely makes unforced errors. Plays competitively.'),
    
    -- DUPR 5.5 - Elite (Advanced)
    (pickleball_dupr_rating_id, 5.5, 'DUPR 5.5', 'advanced',
     'Exceptional skill level. Mastery of all shots. Tournament-level play.'),
    
    -- DUPR 6.0+ - Professional
    (pickleball_dupr_rating_id, 6.0, 'DUPR 6.0+', 'professional',
     'Professional level. National or international tournament play. Elite consistency and shot-making.')
  ON CONFLICT (rating_id, score_value) DO UPDATE
    SET display_label = EXCLUDED.display_label,
        skill_level = EXCLUDED.skill_level,
        description = EXCLUDED.description;
  
  RAISE NOTICE 'Pickleball DUPR rating scores populated successfully';
END $$;

-- ============================================
-- 4. Create RPC function to fetch rating scores
-- ============================================

CREATE OR REPLACE FUNCTION get_rating_scores_by_type(
  p_sport_name TEXT,
  p_rating_type rating_type
)
RETURNS TABLE(
  id UUID,
  score_value NUMERIC,
  display_label TEXT,
  skill_level skill_level,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rs.id,
    rs.score_value,
    rs.display_label,
    rs.skill_level,
    rs.description
  FROM rating_score rs
  INNER JOIN rating r ON rs.rating_id = r.id
  INNER JOIN sport s ON r.sport_id = s.id
  WHERE s.name = p_sport_name
    AND r.rating_type = p_rating_type
    AND r.is_active = TRUE
  ORDER BY rs.score_value ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_rating_scores_by_type(TEXT, rating_type) TO authenticated;
GRANT EXECUTE ON FUNCTION get_rating_scores_by_type(TEXT, rating_type) TO anon;

COMMENT ON FUNCTION get_rating_scores_by_type IS 'Fetches rating scores for a specific sport and rating type (e.g., Tennis NTRP, Pickleball DUPR)';

-- ============================================
-- 5. Verification
-- ============================================

DO $$
DECLARE
  tennis_count INTEGER;
  pickleball_count INTEGER;
BEGIN
  -- Count Tennis NTRP ratings
  SELECT COUNT(*) INTO tennis_count
  FROM get_rating_scores_by_type('tennis', 'ntrp');
  
  -- Count Pickleball DUPR ratings
  SELECT COUNT(*) INTO pickleball_count
  FROM get_rating_scores_by_type('pickleball', 'dupr');
  
  RAISE NOTICE 'Verification: Tennis NTRP ratings = %, Pickleball DUPR ratings = %', tennis_count, pickleball_count;
  
  IF tennis_count < 6 THEN
    RAISE WARNING 'Expected at least 6 Tennis NTRP ratings, found %', tennis_count;
  END IF;
  
  IF pickleball_count < 6 THEN
    RAISE WARNING 'Expected at least 6 Pickleball DUPR ratings, found %', pickleball_count;
  END IF;
END $$;
