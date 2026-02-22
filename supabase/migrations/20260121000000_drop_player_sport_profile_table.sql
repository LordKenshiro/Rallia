-- ============================================
-- Migration: Drop redundant player_sport_profile table
-- ============================================
-- 
-- The player_sport_profile table is redundant with player_sport.
-- Both tables serve the same purpose of linking players to sports.
-- 
-- player_sport is the primary table that has been actively used throughout
-- the codebase. player_sport_profile was created as an alternative approach
-- but was never fully adopted.
-- 
-- player_sport already has all necessary columns:
-- - preferred_play_style (as enum)
-- - preferred_play_attributes (as enum array)
-- - preferred_match_duration, preferred_match_type
-- - preferred_facility_id, is_active, is_primary
--
-- This migration:
-- 1. Drops the player_play_attribute junction table (depends on player_sport_profile)
-- 2. Drops the player_sport_profile table
-- 3. Removes related RLS policies, indexes, and constraints
-- ============================================

-- ============================================
-- PHASE 1: DROP DEPENDENT TABLE FIRST
-- ============================================

-- Drop RLS policies on player_play_attribute if they exist
DROP POLICY IF EXISTS "Players can view play attributes" ON player_play_attribute;
DROP POLICY IF EXISTS "Players can manage their own play attributes" ON player_play_attribute;

-- Drop the player_play_attribute table (has FK to player_sport_profile)
DROP TABLE IF EXISTS player_play_attribute CASCADE;

-- ============================================
-- PHASE 2: DROP player_sport_profile TABLE
-- ============================================

-- Drop RLS policies on player_sport_profile if they exist
DROP POLICY IF EXISTS "Players can view sport profiles" ON player_sport_profile;
DROP POLICY IF EXISTS "Players can manage their own sport profiles" ON player_sport_profile;

-- Drop the player_sport_profile table
DROP TABLE IF EXISTS player_sport_profile CASCADE;

-- ============================================
-- PHASE 3: CLEANUP (indices dropped with tables)
-- ============================================

-- Note: The following were automatically dropped with the tables:
-- - idx_player_sport_profile_player_id
-- - idx_player_sport_profile_sport_id  
-- - uq_player_sport_profile_player_sport
-- - uq_player_play_attribute
-- - All foreign key constraints

-- ============================================
-- VERIFICATION COMMENT
-- ============================================

COMMENT ON TABLE player_sport IS 'Primary table linking players to sports with their preferences. The player_sport_profile table was dropped as redundant.';
