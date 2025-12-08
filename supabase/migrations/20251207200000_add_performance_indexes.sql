-- Performance Indexes Migration
-- This migration adds ADDITIONAL indexes to improve query performance
-- Note: Many indexes already exist in the initial schema (20241124000000_initial_schema.sql)

-- =====================================================
-- PLAYER_SPORT TABLE INDEXES (additional)
-- =====================================================
-- Composite index for player sport lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_player_sport_player_sport 
  ON player_sport (player_id, sport_id);

-- Index for primary sport lookup
CREATE INDEX IF NOT EXISTS idx_player_sport_primary 
  ON player_sport (player_id, is_primary) WHERE is_primary = true;

-- =====================================================
-- PLAYER_RATING_SCORE TABLE INDEXES (additional)
-- =====================================================
-- Composite index for rating score lookups with joins
CREATE INDEX IF NOT EXISTS idx_player_rating_score_rating 
  ON player_rating_score (rating_score_id);

-- Index for verified ratings
CREATE INDEX IF NOT EXISTS idx_player_rating_score_verified 
  ON player_rating_score (player_id, is_verified) WHERE is_verified = true;

-- =====================================================
-- RATING_SCORE TABLE INDEXES
-- =====================================================
-- Index for rating lookups (rating_score uses rating_id FK to rating table)
CREATE INDEX IF NOT EXISTS idx_rating_score_rating 
  ON rating_score (rating_id);

-- Index for display label lookups
CREATE INDEX IF NOT EXISTS idx_rating_score_label 
  ON rating_score (display_label);

-- Composite index for rating + skill level queries
CREATE INDEX IF NOT EXISTS idx_rating_score_rating_skill 
  ON rating_score (rating_id, skill_level);

-- =====================================================
-- PLAYER_AVAILABILITY TABLE INDEXES (additional)
-- =====================================================
-- Composite index for active availability lookups
CREATE INDEX IF NOT EXISTS idx_player_availability_player_active 
  ON player_availability (player_id, is_active) WHERE is_active = true;

-- =====================================================
-- SPORT TABLE INDEXES
-- =====================================================
-- Index for active sports (common filter)
CREATE INDEX IF NOT EXISTS idx_sport_active 
  ON sport (is_active) WHERE is_active = true;

-- Index for sport name lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_sport_name_lower 
  ON sport (LOWER(name));

-- =====================================================
-- VERIFICATION_CODES TABLE INDEXES
-- =====================================================
-- Index for email + code lookups (authentication flow)
CREATE INDEX IF NOT EXISTS idx_verification_codes_email_code 
  ON verification_codes (email, code);

-- Index for unused codes (common filter)
CREATE INDEX IF NOT EXISTS idx_verification_codes_unused 
  ON verification_codes (email, used, expires_at) WHERE used = false;

-- =====================================================
-- ANALYZE TABLES FOR QUERY OPTIMIZER
-- =====================================================
-- Run ANALYZE to update statistics for query planner
ANALYZE profile;
ANALYZE player;
ANALYZE player_sport;
ANALYZE player_rating_score;
ANALYZE rating_score;
ANALYZE rating;
ANALYZE player_availability;
ANALYZE sport;
