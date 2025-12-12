-- Migration: Add skill_level column back to rating_score table
-- The skill_level column was in the old schema but missing from the new rating_scores table

-- ============================================
-- PHASE 1: ADD SKILL_LEVEL COLUMN
-- ============================================

ALTER TABLE rating_score
ADD COLUMN IF NOT EXISTS skill_level skill_level;

COMMENT ON COLUMN rating_score.skill_level IS 'Skill level category for the rating score (beginner, intermediate, advanced, professional)';

-- ============================================
-- PHASE 2: POPULATE SKILL LEVELS FOR EXISTING DATA
-- ============================================

-- Update Tennis NTRP skill levels based on score value (matching original seed data)
-- 1.5, 2.0, 2.5 = beginner | 3.0, 3.5, 4.0 = intermediate | 4.5, 5.0, 5.5 = advanced | 6.0+ = professional
UPDATE rating_score rs
SET skill_level = CASE
  WHEN rs.value <= 2.5 THEN 'beginner'::skill_level
  WHEN rs.value <= 4.0 THEN 'intermediate'::skill_level
  WHEN rs.value <= 5.5 THEN 'advanced'::skill_level
  ELSE 'professional'::skill_level
END
FROM rating_system rsys
WHERE rs.rating_system_id = rsys.id
  AND rsys.code = 'ntrp'
  AND rs.skill_level IS NULL;

-- Update Pickleball DUPR skill levels based on score value (matching original seed data)
-- 1.0, 2.0, 2.5, 3.0 = beginner | 3.5, 4.0, 4.5 = intermediate | 5.0, 5.5 = advanced | 6.0+ = professional
UPDATE rating_score rs
SET skill_level = CASE
  WHEN rs.value <= 3.0 THEN 'beginner'::skill_level
  WHEN rs.value <= 4.5 THEN 'intermediate'::skill_level
  WHEN rs.value <= 5.5 THEN 'advanced'::skill_level
  ELSE 'professional'::skill_level
END
FROM rating_system rsys
WHERE rs.rating_system_id = rsys.id
  AND rsys.code = 'dupr'
  AND rs.skill_level IS NULL;

-- Update any remaining NULL skill_levels to intermediate as default
UPDATE rating_score
SET skill_level = 'intermediate'::skill_level
WHERE skill_level IS NULL;

-- ============================================
-- PHASE 3: UPDATE RPC FUNCTION TO RETURN SKILL_LEVEL
-- ============================================

-- Now that skill_level column exists, update the RPC function to return it
CREATE OR REPLACE FUNCTION get_rating_scores_by_type(
  p_sport_name TEXT,
  p_rating_system_code rating_system_code_enum
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
    rs.value::NUMERIC as score_value,
    rs.label::TEXT as display_label,
    rs.skill_level,
    rs.description::TEXT
  FROM rating_score rs
  INNER JOIN rating_system rsys ON rs.rating_system_id = rsys.id
  INNER JOIN sport s ON rsys.sport_id = s.id
  WHERE s.name = p_sport_name
    AND rsys.code = p_rating_system_code
    AND rsys.is_active = TRUE
  ORDER BY rs.value ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PHASE 4: VERIFICATION
-- ============================================

DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM rating_score WHERE skill_level IS NULL;
  
  IF null_count > 0 THEN
    RAISE WARNING 'Found % rating scores with NULL skill_level', null_count;
  ELSE
    RAISE NOTICE 'All rating scores have skill_level populated';
  END IF;
END $$;

