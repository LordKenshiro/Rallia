-- Migration: Seed Sports, Rating Systems, and Rating Scores
-- Created: 2024-12-08
-- Description: Seeds core data that was lost during table consolidation
-- This must run AFTER the consolidation migrations
--
-- Note: The schema uses rating_system (singular) and rating_score with rating_system_id

-- ============================================
-- 1. SEED SPORTS
-- ============================================

INSERT INTO sport (name, slug, display_name, description, icon_url, is_active)
VALUES
    ('tennis', 'tennis', 'Tennis', 'Traditional tennis sport', 'images/tennis.jpg', true),
    ('pickleball', 'pickleball', 'Pickleball', 'Fast-paced paddle sport', 'images/pickleball.jpg', true)
ON CONFLICT (name) DO UPDATE SET
    slug = EXCLUDED.slug,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon_url = EXCLUDED.icon_url,
    is_active = EXCLUDED.is_active;

-- ============================================
-- 2. SEED RATING SYSTEMS
-- ============================================

-- Tennis Rating Systems
INSERT INTO rating_system (sport_id, code, name, description, min_value, max_value, step, default_initial_value, is_active)
VALUES
    ((SELECT id FROM sport WHERE name = 'tennis'), 'NTRP', 'NTRP', 'National Tennis Rating Program', 1.0, 7.0, 0.5, 3.0, true),
    ((SELECT id FROM sport WHERE name = 'tennis'), 'UTR', 'UTR', 'Universal Tennis Rating', 1.0, 16.5, 0.1, 5.0, true),
    ((SELECT id FROM sport WHERE name = 'tennis'), 'SELF_TENNIS', 'Self Assessment', 'Player self-assessed skill level', 1.0, 10.0, 0.5, 5.0, true)
ON CONFLICT (code) DO UPDATE SET
    sport_id = EXCLUDED.sport_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    min_value = EXCLUDED.min_value,
    max_value = EXCLUDED.max_value,
    step = EXCLUDED.step,
    default_initial_value = EXCLUDED.default_initial_value,
    is_active = EXCLUDED.is_active;

-- Pickleball Rating Systems
INSERT INTO rating_system (sport_id, code, name, description, min_value, max_value, step, default_initial_value, is_active)
VALUES
    ((SELECT id FROM sport WHERE name = 'pickleball'), 'DUPR', 'DUPR', 'Dynamic Universal Pickleball Rating', 1.0, 8.0, 0.5, 3.5, true),
    ((SELECT id FROM sport WHERE name = 'pickleball'), 'SELF_PICKLE', 'Self Assessment', 'Player self-assessed skill level', 1.0, 10.0, 0.5, 5.0, true)
ON CONFLICT (code) DO UPDATE SET
    sport_id = EXCLUDED.sport_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    min_value = EXCLUDED.min_value,
    max_value = EXCLUDED.max_value,
    step = EXCLUDED.step,
    default_initial_value = EXCLUDED.default_initial_value,
    is_active = EXCLUDED.is_active;

-- ============================================
-- 3. SEED RATING SCORES - Tennis NTRP
-- ============================================

INSERT INTO rating_score (rating_system_id, value, label, description)
VALUES
    ((SELECT id FROM rating_system WHERE code = 'NTRP'), 1.5, 'NTRP 1.5', 
     'Still working on getting consistent; errors, many focused on getting the ball into play.'),
    ((SELECT id FROM rating_system WHERE code = 'NTRP'), 2.0, 'NTRP 2.0',
     'Obvious stroke weaknesses for singles and doubles. Has clear stroke weaknesses and needs more court experience.'),
    ((SELECT id FROM rating_system WHERE code = 'NTRP'), 2.5, 'NTRP 2.5',
     'Starting to judge ball direction and sustain short rallies; limited court coverage.'),
    ((SELECT id FROM rating_system WHERE code = 'NTRP'), 3.0, 'NTRP 3.0',
     'Fairly consistent on medium paced shots but lacks control, depth and power with faster shots. Struggles with formations.'),
    ((SELECT id FROM rating_system WHERE code = 'NTRP'), 3.5, 'NTRP 3.5',
     'More reliable strokes with directional control. Improving net play, coverage, and teamwork.'),
    ((SELECT id FROM rating_system WHERE code = 'NTRP'), 4.0, 'NTRP 4.0',
     'Dependable strokes with control and depth; placement in point play shows teamwork, though rallies may end from impatience.'),
    ((SELECT id FROM rating_system WHERE code = 'NTRP'), 4.5, 'NTRP 4.5',
     'Solid power and consistency. Controls depth and spin. Strategic shot placement. Good anticipation.'),
    ((SELECT id FROM rating_system WHERE code = 'NTRP'), 5.0, 'NTRP 5.0',
     'Exceptional shot variety with pace and spin. Excellent footwork and court coverage. Tactical awareness.'),
    ((SELECT id FROM rating_system WHERE code = 'NTRP'), 5.5, 'NTRP 5.5',
     'Mastery of all shots. Exceptional consistency and power. Advanced tactics and mental game.'),
    ((SELECT id FROM rating_system WHERE code = 'NTRP'), 6.0, 'NTRP 6.0+',
     'Professional level play. National or international tournament experience. Elite consistency and shot-making.')
ON CONFLICT (rating_system_id, value) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description;

-- ============================================
-- 4. SEED RATING SCORES - Pickleball DUPR
-- ============================================

INSERT INTO rating_score (rating_system_id, value, label, description)
VALUES
    ((SELECT id FROM rating_system WHERE code = 'DUPR'), 1.0, 'DUPR 1.0',
     'Just starting out. Learning basic rules and stroke mechanics. Very short rallies.'),
    ((SELECT id FROM rating_system WHERE code = 'DUPR'), 2.0, 'DUPR 2.0',
     'Just getting started. Short rallies (1-2 shots). Learning basic scoring knowledge.'),
    ((SELECT id FROM rating_system WHERE code = 'DUPR'), 2.5, 'DUPR 2.5',
     'Developing basic strokes. Can sustain short rallies. Learning court positioning.'),
    ((SELECT id FROM rating_system WHERE code = 'DUPR'), 3.0, 'DUPR 3.0',
     'Can sustain short rallies and serves. Beginning to dink. Learning positioning.'),
    ((SELECT id FROM rating_system WHERE code = 'DUPR'), 3.5, 'DUPR 3.5',
     'Developing third-shot drop. Can dink moderately. Avoids backhands.'),
    ((SELECT id FROM rating_system WHERE code = 'DUPR'), 4.0, 'DUPR 4.0',
     'Plays longer rallies with patience. Aware of positioning. Uses varied shots. Mixing power and soft shots.'),
    ((SELECT id FROM rating_system WHERE code = 'DUPR'), 4.5, 'DUPR 4.5',
     'Strong consistency and power. Varied shots. Faster speed. Comfortable crashing near the kitchen.'),
    ((SELECT id FROM rating_system WHERE code = 'DUPR'), 5.0, 'DUPR 5.0',
     'Highest level of shot types. Rarely makes unforced errors. Plays competitively.'),
    ((SELECT id FROM rating_system WHERE code = 'DUPR'), 5.5, 'DUPR 5.5',
     'Exceptional skill level. Mastery of all shots. Tournament-level play.'),
    ((SELECT id FROM rating_system WHERE code = 'DUPR'), 6.0, 'DUPR 6.0+',
     'Professional level. National or international tournament play. Elite consistency and shot-making.')
ON CONFLICT (rating_system_id, value) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description;

-- ============================================
-- 5. VERIFICATION
-- ============================================

DO $$
DECLARE
  sport_count INTEGER;
  rating_system_count INTEGER;
  ntrp_score_count INTEGER;
  dupr_score_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO sport_count FROM sport;
  SELECT COUNT(*) INTO rating_system_count FROM rating_system;
  SELECT COUNT(*) INTO ntrp_score_count FROM rating_score WHERE rating_system_id = (SELECT id FROM rating_system WHERE code = 'NTRP');
  SELECT COUNT(*) INTO dupr_score_count FROM rating_score WHERE rating_system_id = (SELECT id FROM rating_system WHERE code = 'DUPR');
  
  RAISE NOTICE 'Seed data verification:';
  RAISE NOTICE '  - Sports: % (expected: 2)', sport_count;
  RAISE NOTICE '  - Rating Systems: % (expected: 5)', rating_system_count;
  RAISE NOTICE '  - Tennis NTRP scores: % (expected: 10)', ntrp_score_count;
  RAISE NOTICE '  - Pickleball DUPR scores: % (expected: 10)', dupr_score_count;
  
  IF sport_count < 2 THEN
    RAISE WARNING 'Missing sports data!';
  END IF;
  IF rating_system_count < 5 THEN
    RAISE WARNING 'Missing rating system data!';
  END IF;
END $$;
