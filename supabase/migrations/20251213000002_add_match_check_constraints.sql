-- ============================================================================
-- Migration: Add check constraints for match table
-- Created: 2024-12-13
-- Description: Adds check constraints that reference the 'custom' duration value
-- NOTE: This must run AFTER 20251213000001_add_custom_duration_enum.sql
-- ============================================================================

-- Ensure custom_duration_minutes is set when duration is 'custom'
ALTER TABLE match ADD CONSTRAINT check_custom_duration 
    CHECK (
        (duration IS NULL) OR
        (duration != 'custom') OR 
        (duration = 'custom' AND custom_duration_minutes IS NOT NULL AND custom_duration_minutes > 0)
    );

