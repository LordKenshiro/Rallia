-- ============================================================================
-- Migration: Add 'casual' to match_type_enum
-- Created: 2025-12-19
-- Description: Ensures 'casual' exists in match_type_enum for seed migrations
-- NOTE: This must run BEFORE seed migrations that use 'casual' for player_expectation
-- ============================================================================

-- Add 'casual' to match_type_enum if it doesn't exist
-- This is needed because production may have match_type_enum with 'practice' instead of 'casual'
-- Using IF NOT EXISTS to make this idempotent
ALTER TYPE match_type_enum ADD VALUE IF NOT EXISTS 'casual';
