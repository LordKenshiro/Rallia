-- Migration: Add skill_level column back to rating_score table
-- The skill_level column was in the old schema but missing from the new rating_scores table

-- ============================================
-- PHASE 1: ADD SKILL_LEVEL COLUMN
-- ============================================

ALTER TABLE rating_score
ADD COLUMN IF NOT EXISTS skill_level skill_level;

COMMENT ON COLUMN rating_score.skill_level IS 'Skill level category for the rating score (beginner, intermediate, advanced, professional)';

-- ============================================
-- PHASE 1.5: SEED RATING SCORES
-- ============================================
-- Insert all rating scores for each rating system if they don't already exist.
-- Uses ON CONFLICT on the unique (rating_system_id, value) index to be idempotent.

-- NTRP scores (1.5 - 6.0)
INSERT INTO rating_score (rating_system_id, value, label, description)
VALUES
  ((SELECT id FROM rating_system WHERE code = 'ntrp'), 1.5, 'NTRP 1.5', 'Still working on getting the ball consistently in play. Learning basic positions and scoring.'),
  ((SELECT id FROM rating_system WHERE code = 'ntrp'), 2.0, 'NTRP 2.0', 'Obvious stroke weaknesses but familiar with basic positions for singles and doubles play.'),
  ((SELECT id FROM rating_system WHERE code = 'ntrp'), 2.5, 'NTRP 2.5', 'Starting to judge where the ball is going. Can sustain a slow-paced rally with some consistency.'),
  ((SELECT id FROM rating_system WHERE code = 'ntrp'), 3.0, 'NTRP 3.0', 'Fairly consistent on medium-paced shots. Not comfortable with all strokes. Lacks control on faster shots.'),
  ((SELECT id FROM rating_system WHERE code = 'ntrp'), 3.5, 'NTRP 3.5', 'More reliable strokes with directional control on moderate shots. Starting to develop consistency in net play.'),
  ((SELECT id FROM rating_system WHERE code = 'ntrp'), 4.0, 'NTRP 4.0', 'Dependable strokes with control and depth on both forehand and backhand. Can use lobs, overheads, and volleys with some success.'),
  ((SELECT id FROM rating_system WHERE code = 'ntrp'), 4.5, 'NTRP 4.5', 'Solid power and consistency. Uses spin effectively. Handles pace well. Can vary game plan according to opponent.'),
  ((SELECT id FROM rating_system WHERE code = 'ntrp'), 5.0, 'NTRP 5.0', 'Exceptional shot variety with pace and spin. Can execute all strokes reliably. Has developed good anticipation.'),
  ((SELECT id FROM rating_system WHERE code = 'ntrp'), 5.5, 'NTRP 5.5', 'Mastery of all shots. Can hit winners and force errors. Strong mental game. Tournament-competitive player.'),
  ((SELECT id FROM rating_system WHERE code = 'ntrp'), 6.0, 'NTRP 6.0+', 'Professional-level play. Has had intensive training for national tournament competition at junior or adult levels.')
ON CONFLICT (rating_system_id, value) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;

-- UTR scores (representative levels)
INSERT INTO rating_score (rating_system_id, value, label, description)
VALUES
  ((SELECT id FROM rating_system WHERE code = 'utr'), 2.0, 'UTR 2.0', 'Beginner level player. Still developing fundamental strokes.'),
  ((SELECT id FROM rating_system WHERE code = 'utr'), 4.0, 'UTR 4.0', 'Intermediate player. Consistent rallying ability with basic shot selection.'),
  ((SELECT id FROM rating_system WHERE code = 'utr'), 6.0, 'UTR 6.0', 'Advanced recreational player. Good consistency, can direct shots.'),
  ((SELECT id FROM rating_system WHERE code = 'utr'), 8.0, 'UTR 8.0', 'Strong club-level player. Consistent power and spin, good tactical awareness.'),
  ((SELECT id FROM rating_system WHERE code = 'utr'), 10.0, 'UTR 10.0', 'Competitive tournament player. High-level consistency and shot variety.'),
  ((SELECT id FROM rating_system WHERE code = 'utr'), 12.0, 'UTR 12.0', 'Elite amateur / college-level player. Professional-quality strokes.'),
  ((SELECT id FROM rating_system WHERE code = 'utr'), 14.0, 'UTR 14.0', 'Professional-level player. Competes in ATP/WTA qualifying and Futures events.'),
  ((SELECT id FROM rating_system WHERE code = 'utr'), 16.0, 'UTR 16.0', 'World-class professional. Competes at the highest level of professional tennis.')
ON CONFLICT (rating_system_id, value) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;

-- Self Assessment Tennis scores
INSERT INTO rating_score (rating_system_id, value, label, description)
VALUES
  ((SELECT id FROM rating_system WHERE code = 'self_tennis'), 1.5, 'Beginner', 'New to tennis, learning the basics.'),
  ((SELECT id FROM rating_system WHERE code = 'self_tennis'), 2.5, 'Advanced Beginner', 'Can rally but still developing consistency.'),
  ((SELECT id FROM rating_system WHERE code = 'self_tennis'), 3.0, 'Intermediate', 'Consistent on moderate shots, developing variety.'),
  ((SELECT id FROM rating_system WHERE code = 'self_tennis'), 3.5, 'Advanced Intermediate', 'Reliable strokes with directional control.'),
  ((SELECT id FROM rating_system WHERE code = 'self_tennis'), 4.0, 'Competitive', 'Dependable strokes, good doubles awareness.'),
  ((SELECT id FROM rating_system WHERE code = 'self_tennis'), 4.5, 'Advanced', 'Strong all-around game with power and consistency.'),
  ((SELECT id FROM rating_system WHERE code = 'self_tennis'), 5.0, 'Expert', 'High-level play with exceptional variety.'),
  ((SELECT id FROM rating_system WHERE code = 'self_tennis'), 5.5, 'Tournament', 'Tournament-competitive with mastery of all shots.'),
  ((SELECT id FROM rating_system WHERE code = 'self_tennis'), 6.0, 'Professional', 'Professional-caliber player.')
ON CONFLICT (rating_system_id, value) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;

-- DUPR scores (1.0 - 6.0)
INSERT INTO rating_score (rating_system_id, value, label, description)
VALUES
  ((SELECT id FROM rating_system WHERE code = 'dupr'), 1.0, 'DUPR 1.0', 'Just starting out. Learning the basic rules and strokes.'),
  ((SELECT id FROM rating_system WHERE code = 'dupr'), 2.0, 'DUPR 2.0', 'Just getting started. Can serve and return but lacks consistency.'),
  ((SELECT id FROM rating_system WHERE code = 'dupr'), 2.5, 'DUPR 2.5', 'Developing basic strokes. Understands court positioning.'),
  ((SELECT id FROM rating_system WHERE code = 'dupr'), 3.0, 'DUPR 3.0', 'Can sustain short rallies. Working on third-shot drops and dinks.'),
  ((SELECT id FROM rating_system WHERE code = 'dupr'), 3.5, 'DUPR 3.5', 'Developing third-shot drop. Can sustain longer rallies and play at the kitchen line.'),
  ((SELECT id FROM rating_system WHERE code = 'dupr'), 4.0, 'DUPR 4.0', 'Plays longer rallies with patience. Good dinking and net play. Uses variety of shots.'),
  ((SELECT id FROM rating_system WHERE code = 'dupr'), 4.5, 'DUPR 4.5', 'Strong consistency and power. Uses spin and placement effectively. Good reset ability.'),
  ((SELECT id FROM rating_system WHERE code = 'dupr'), 5.0, 'DUPR 5.0', 'Highest level of shot types and placement. Strong strategic play. Tournament-competitive.'),
  ((SELECT id FROM rating_system WHERE code = 'dupr'), 5.5, 'DUPR 5.5', 'Exceptional skill level. Dominant in most recreational and tournament settings.'),
  ((SELECT id FROM rating_system WHERE code = 'dupr'), 6.0, 'DUPR 6.0+', 'Professional-level pickleball. Competes at the highest level of the sport.')
ON CONFLICT (rating_system_id, value) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;

-- Self Assessment Pickleball scores
INSERT INTO rating_score (rating_system_id, value, label, description)
VALUES
  ((SELECT id FROM rating_system WHERE code = 'self_pickle'), 1.0, 'Beginner', 'New to pickleball, learning the rules.'),
  ((SELECT id FROM rating_system WHERE code = 'self_pickle'), 2.0, 'Advanced Beginner', 'Understands rules, working on consistency.'),
  ((SELECT id FROM rating_system WHERE code = 'self_pickle'), 2.5, 'Intermediate', 'Can sustain rallies and play at the kitchen line.'),
  ((SELECT id FROM rating_system WHERE code = 'self_pickle'), 3.0, 'Advanced Intermediate', 'Good dink game, developing power shots.'),
  ((SELECT id FROM rating_system WHERE code = 'self_pickle'), 3.5, 'Competitive', 'Consistent all-around game, good shot selection.'),
  ((SELECT id FROM rating_system WHERE code = 'self_pickle'), 4.0, 'Advanced', 'Strong strategic play with shot variety.'),
  ((SELECT id FROM rating_system WHERE code = 'self_pickle'), 4.5, 'Expert', 'High-level play, tournament competitive.'),
  ((SELECT id FROM rating_system WHERE code = 'self_pickle'), 5.0, 'Tournament', 'Dominant in competitive play.'),
  ((SELECT id FROM rating_system WHERE code = 'self_pickle'), 5.5, 'Professional', 'Professional-caliber player.')
ON CONFLICT (rating_system_id, value) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;

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

