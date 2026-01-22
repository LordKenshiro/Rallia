-- ============================================================================
-- Migration: Add 'custom' value to match_duration_enum
-- Created: 2024-12-13
-- Description: Adds the 'custom' value to match_duration_enum and related constraints
-- NOTE: This must run AFTER 20251213000000_add_match_creation_fields.sql
-- ============================================================================

-- Add 'custom' value to match_duration_enum
-- This is safe to run multiple times as it will only add if not exists
ALTER TYPE match_duration_enum ADD VALUE IF NOT EXISTS 'custom';

