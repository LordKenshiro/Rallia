-- Migration: Populate play_style and play_attribute tables
-- Date: 2026-01-26
-- Description: Adds play styles and play attributes for Tennis and Pickleball sports
--              These will replace the enum-based approach for more flexibility

-- =====================================================
-- 1. POPULATE PLAY_STYLE TABLE
-- =====================================================

-- First, ensure we have a unique constraint for the ON CONFLICT to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'play_style_sport_id_name_key'
  ) THEN
    ALTER TABLE play_style ADD CONSTRAINT play_style_sport_id_name_key UNIQUE (sport_id, name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'play_attribute_sport_id_name_key'
  ) THEN
    ALTER TABLE play_attribute ADD CONSTRAINT play_attribute_sport_id_name_key UNIQUE (sport_id, name);
  END IF;
END $$;

-- Get Tennis sport ID
DO $$
DECLARE
  tennis_id UUID;
  pickleball_id UUID;
BEGIN
  -- Get sport IDs
  SELECT id INTO tennis_id FROM sport WHERE slug = 'tennis';
  SELECT id INTO pickleball_id FROM sport WHERE slug = 'pickleball';

  -- Tennis Play Styles
  IF tennis_id IS NOT NULL THEN
    INSERT INTO play_style (sport_id, name, description) VALUES
      (tennis_id, 'aggressive_baseliner', 'Controls the point from the back of the court, hits hard and deep with powerful groundstrokes.'),
      (tennis_id, 'counterpuncher', 'Defensive style that uses opponent''s pace against them, very consistent and patient.'),
      (tennis_id, 'serve_and_volley', 'Rushes the net immediately after serving, prefers to finish points at the net.'),
      (tennis_id, 'all_court', 'Comfortable at both net and baseline, mixes spins and shot variety.')
    ON CONFLICT (sport_id, name) DO UPDATE SET
      description = EXCLUDED.description,
      updated_at = now();
  END IF;

  -- Pickleball Play Styles
  IF pickleball_id IS NOT NULL THEN
    INSERT INTO play_style (sport_id, name, description) VALUES
      (pickleball_id, 'banger', 'Aggressive player who hits hard drives and tries to overpower opponents.'),
      (pickleball_id, 'soft_game', 'Relies on dinks, drops, and patience at the kitchen line.'),
      (pickleball_id, 'hybrid', 'Mixes power shots with soft game depending on the situation.'),
      (pickleball_id, 'speedup_specialist', 'Excels at speeding up the ball from the kitchen line to create attack opportunities.')
    ON CONFLICT (sport_id, name) DO UPDATE SET
      description = EXCLUDED.description,
      updated_at = now();
  END IF;
END $$;

-- =====================================================
-- 2. POPULATE PLAY_ATTRIBUTE TABLE
-- =====================================================

DO $$
DECLARE
  tennis_id UUID;
  pickleball_id UUID;
BEGIN
  -- Get sport IDs
  SELECT id INTO tennis_id FROM sport WHERE slug = 'tennis';
  SELECT id INTO pickleball_id FROM sport WHERE slug = 'pickleball';

  -- Tennis Play Attributes
  IF tennis_id IS NOT NULL THEN
    INSERT INTO play_attribute (sport_id, name, category, description) VALUES
      -- Serve attributes
      (tennis_id, 'big_serve', 'Serve', 'Powerful first serve with high speed'),
      (tennis_id, 'kick_serve', 'Serve', 'Heavy topspin serve that bounces high'),
      (tennis_id, 'accurate_placement', 'Serve', 'Precise serve placement to corners and body'),
      -- Forehand attributes
      (tennis_id, 'heavy_topspin_forehand', 'Forehand', 'Generates high RPM on forehand shots'),
      (tennis_id, 'flat_forehand', 'Forehand', 'Hits flatter forehand shots with pace'),
      (tennis_id, 'inside_out_forehand', 'Forehand', 'Strong inside-out forehand pattern'),
      -- Backhand attributes
      (tennis_id, 'one_handed_backhand', 'Backhand', 'Uses a single-handed backhand technique'),
      (tennis_id, 'two_handed_backhand', 'Backhand', 'Uses a two-handed backhand technique'),
      (tennis_id, 'backhand_slice', 'Backhand', 'Effective slice backhand for defense and approach'),
      -- Net game attributes
      (tennis_id, 'strong_volleyer', 'Net Game', 'Excellent volleys and net coverage'),
      (tennis_id, 'overhead_smash', 'Net Game', 'Powerful and reliable overhead smash'),
      -- Physical attributes
      (tennis_id, 'court_coverage', 'Physical', 'Fast court coverage and foot speed'),
      (tennis_id, 'endurance', 'Physical', 'Can play long 3-set matches without fatigue'),
      (tennis_id, 'quick_reflexes', 'Physical', 'Fast reaction time for returns and volleys'),
      -- Mental attributes
      (tennis_id, 'clutch_performer', 'Mental', 'Plays well under pressure in big points'),
      (tennis_id, 'consistent', 'Mental', 'Makes few unforced errors, very steady')
    ON CONFLICT (sport_id, name) DO UPDATE SET
      category = EXCLUDED.category,
      description = EXCLUDED.description,
      updated_at = now();
  END IF;

  -- Pickleball Play Attributes
  IF pickleball_id IS NOT NULL THEN
    INSERT INTO play_attribute (sport_id, name, category, description) VALUES
      -- Serve attributes
      (pickleball_id, 'power_serve', 'Serve', 'Strong, deep serve that pushes opponents back'),
      (pickleball_id, 'spin_serve', 'Serve', 'Uses spin on serves to create difficult returns'),
      -- Soft game attributes
      (pickleball_id, 'dink_master', 'Soft Game', 'Excellent control and patience in dink rallies'),
      (pickleball_id, 'drop_shot', 'Soft Game', 'Accurate third shot drops from baseline'),
      (pickleball_id, 'reset_specialist', 'Soft Game', 'Can reset hard shots back to kitchen line'),
      -- Power game attributes
      (pickleball_id, 'drive_specialist', 'Power Game', 'Powerful groundstroke drives'),
      (pickleball_id, 'speedup_attack', 'Power Game', 'Effective at speeding up dinks into attacks'),
      (pickleball_id, 'erne_specialist', 'Power Game', 'Comfortable hitting ernie shots around the post'),
      -- Physical attributes
      (pickleball_id, 'quick_hands', 'Physical', 'Fast reflexes for hand battles at kitchen'),
      (pickleball_id, 'court_mobility', 'Physical', 'Good movement and court coverage'),
      (pickleball_id, 'stamina', 'Physical', 'Can play multiple games without tiring'),
      -- Mental attributes
      (pickleball_id, 'patient', 'Mental', 'Waits for the right ball to attack'),
      (pickleball_id, 'strategic', 'Mental', 'Good shot selection and court awareness')
    ON CONFLICT (sport_id, name) DO UPDATE SET
      category = EXCLUDED.category,
      description = EXCLUDED.description,
      updated_at = now();
  END IF;
END $$;

-- =====================================================
-- 3. VERIFY DATA
-- =====================================================

-- Log counts for verification
DO $$
DECLARE
  style_count INTEGER;
  attr_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO style_count FROM play_style WHERE is_active = true;
  SELECT COUNT(*) INTO attr_count FROM play_attribute WHERE is_active = true;
  RAISE NOTICE 'Play styles inserted: %', style_count;
  RAISE NOTICE 'Play attributes inserted: %', attr_count;
END $$;
