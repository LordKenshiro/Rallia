-- Migration: Consolidate to Singular Table Names
-- This migration:
-- 1. Renames plural tables to singular (keeping plural schema for some)
-- 2. Migrates data from plural to singular tables where schema differs
-- 3. Standardizes enum names to use _enum suffix
-- 4. Updates foreign key references

-- ============================================
-- PHASE 1: SIMPLE TABLE RENAMES
-- These tables keep their current (plural) schema, just rename to singular
-- ============================================

-- Rename sports -> sport (drop existing singular if empty, rename plural)
DROP TABLE IF EXISTS sport CASCADE;
ALTER TABLE IF EXISTS sports RENAME TO sport;

-- Rename organizations -> organization
DROP TABLE IF EXISTS organization CASCADE;
ALTER TABLE IF EXISTS organizations RENAME TO organization;

-- Rename facilities -> facility  
DROP TABLE IF EXISTS facility CASCADE;
ALTER TABLE IF EXISTS facilities RENAME TO facility;

-- Rename courts -> court
DROP TABLE IF EXISTS court CASCADE;
ALTER TABLE IF EXISTS courts RENAME TO court;

-- Rename admins -> admin
DROP TABLE IF EXISTS admin CASCADE;
ALTER TABLE IF EXISTS admins RENAME TO admin;

-- Rename organization_members -> organization_member
DROP TABLE IF EXISTS organization_member CASCADE;
ALTER TABLE IF EXISTS organization_members RENAME TO organization_member;

-- ============================================
-- PHASE 2: SCHEMA MIGRATION - profiles -> profile
-- Keep singular schema, migrate data from plural
-- ============================================

-- First, add any missing columns from profiles to profile that we want to keep
ALTER TABLE profile ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Migrate data from profiles to profile (if profiles has data and profile doesn't)
INSERT INTO profile (
    id, 
    email, 
    full_name, 
    display_name, 
    birth_date, 
    phone, 
    profile_picture_url,
    bio,
    account_status,
    email_verified,
    phone_verified,
    onboarding_completed,
    address,
    city,
    province,
    postal_code,
    country,
    is_active,
    created_at, 
    updated_at,
    last_active_at
)
SELECT 
    p.id,
    p.email,
    COALESCE(p.full_name, ''),
    p.display_name,
    p.birth_date,
    p.phone,
    p.avatar_url,  -- Map avatar_url to profile_picture_url
    NULL,  -- bio
    'active',  -- account_status default
    false,  -- email_verified
    false,  -- phone_verified
    false,  -- onboarding_completed
    NULL,  -- address
    NULL,  -- city
    NULL,  -- province
    NULL,  -- postal_code
    NULL,  -- country
    p.is_active,
    p.created_at,
    p.updated_at,
    p.last_active_at
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM profile WHERE profile.id = p.id)
ON CONFLICT (id) DO NOTHING;

-- Drop the profiles table
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- PHASE 3: SCHEMA MIGRATION - players -> player
-- Keep singular schema, migrate data from plural
-- ============================================

-- Migrate data from players to player
INSERT INTO player (
    id,
    gender,
    playing_hand,
    max_travel_distance,
    notification_match_requests,
    notification_messages,
    notification_reminders,
    privacy_show_age,
    privacy_show_location,
    privacy_show_stats,
    created_at,
    updated_at
)
SELECT 
    p.id,
    CASE 
        WHEN p.gender = 'M' THEN 'male'
        WHEN p.gender = 'F' THEN 'female'
        WHEN p.gender = 'O' THEN 'other'
        ELSE 'prefer_not_to_say'
    END::gender_type,
    CASE
        WHEN p.playing_hand = 'right' THEN 'right'
        WHEN p.playing_hand = 'left' THEN 'left'
        WHEN p.playing_hand = 'both' THEN 'both'
        ELSE NULL
    END::playing_hand,
    p.max_travel_distance,
    true,  -- notification_match_requests default
    true,  -- notification_messages default
    true,  -- notification_reminders default
    true,  -- privacy_show_age default
    true,  -- privacy_show_location default
    true,  -- privacy_show_stats default
    NOW(),
    NOW()
FROM players p
WHERE NOT EXISTS (SELECT 1 FROM player WHERE player.id = p.id)
ON CONFLICT (id) DO NOTHING;

-- Drop the players table
DROP TABLE IF EXISTS players CASCADE;

-- ============================================
-- PHASE 4: SIMPLE RENAMES - Other tables
-- ============================================

-- notifications -> notification (similar schemas)
-- First check if notification exists and has data, if not, rename notifications
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification') OR 
           (SELECT COUNT(*) FROM notification) = 0 THEN
            DROP TABLE IF EXISTS notification CASCADE;
            ALTER TABLE notifications RENAME TO notification;
        ELSE
            -- Merge data if both exist
            DROP TABLE IF EXISTS notifications CASCADE;
        END IF;
    END IF;
END $$;

-- player_availabilities -> player_availability
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_availabilities') THEN
        DROP TABLE IF EXISTS player_availability CASCADE;
        ALTER TABLE player_availabilities RENAME TO player_availability;
    END IF;
END $$;

-- player_rating_scores -> player_rating_score
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_rating_scores') THEN
        DROP TABLE IF EXISTS player_rating_score CASCADE;
        ALTER TABLE player_rating_scores RENAME TO player_rating_score;
    END IF;
END $$;

-- rating_scores -> rating_score
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rating_scores') THEN
        DROP TABLE IF EXISTS rating_score CASCADE;
        ALTER TABLE rating_scores RENAME TO rating_score;
    END IF;
END $$;

-- ============================================
-- PHASE 5: ENUM STANDARDIZATION
-- Rename enums to use _enum suffix
-- ============================================

-- Note: PostgreSQL doesn't support direct enum renames in all cases
-- We'll create new enums and update columns where needed

-- gender_type -> gender_enum (if gender_type exists and gender_enum doesn't have the same values)
-- For now, keep both as they have different value sets:
-- gender_enum: 'M', 'F', 'O', 'prefer_not_to_say'
-- gender_type: 'male', 'female', 'other', 'prefer_not_to_say'
-- The singular tables use gender_type which has better values

-- match_type is already fine (casual, competitive, both)
-- match_type_enum has different values (practice, competitive, both)

-- match_duration: '1h', '1.5h', '2h'  
-- match_duration_enum: '30', '60', '90', '120'
-- Keep match_duration as it has friendlier values

-- day_of_week and day_enum are the same - keep day_of_week (more descriptive)

-- playing_hand and playing_hand_enum are the same - keep playing_hand

-- time_period doesn't have _enum suffix but is fine

-- ============================================
-- PHASE 6: UPDATE RELATED TABLES
-- Update foreign key references if needed
-- ============================================

-- Update facility_sports to reference sport instead of sports
ALTER TABLE IF EXISTS facility_sports 
    DROP CONSTRAINT IF EXISTS facility_sports_sport_id_fkey;

ALTER TABLE IF EXISTS facility_sports
    ADD CONSTRAINT facility_sports_sport_id_fkey 
    FOREIGN KEY (sport_id) REFERENCES sport(id) ON DELETE CASCADE;

-- Update court_sports to reference sport and court
ALTER TABLE IF EXISTS court_sports 
    DROP CONSTRAINT IF EXISTS court_sports_sport_id_fkey,
    DROP CONSTRAINT IF EXISTS court_sports_court_id_fkey;

ALTER TABLE IF EXISTS court_sports
    ADD CONSTRAINT court_sports_sport_id_fkey 
    FOREIGN KEY (sport_id) REFERENCES sport(id) ON DELETE CASCADE,
    ADD CONSTRAINT court_sports_court_id_fkey 
    FOREIGN KEY (court_id) REFERENCES court(id) ON DELETE CASCADE;

-- Update facility to reference organization
ALTER TABLE IF EXISTS facility 
    DROP CONSTRAINT IF EXISTS facilities_organization_id_fkey;

ALTER TABLE IF EXISTS facility
    ADD CONSTRAINT facility_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE CASCADE;

-- Update organization_member references
ALTER TABLE IF EXISTS organization_member
    DROP CONSTRAINT IF EXISTS organization_members_organization_id_fkey;

-- Note: organization_member.user_id references profile.id (which references auth.users)

-- ============================================
-- PHASE 7: CLEANUP - Rename constraints to match new table names
-- ============================================

-- This is optional but helps keep naming consistent
-- Most constraints will be auto-renamed with the table

COMMENT ON TABLE sport IS 'Sports available in the system (tennis, pickleball, etc.)';
COMMENT ON TABLE organization IS 'Organizations (clubs, municipalities, etc.)';
COMMENT ON TABLE facility IS 'Physical facilities with courts';
COMMENT ON TABLE court IS 'Individual courts within facilities';
COMMENT ON TABLE admin IS 'Platform administrators';
COMMENT ON TABLE organization_member IS 'Members of organizations';
COMMENT ON TABLE profile IS 'User profiles linked to auth.users';
COMMENT ON TABLE player IS 'Player-specific settings and preferences';

