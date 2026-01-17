-- Migration: Add score_confirmation notification type
-- Description: Adds notification type for score confirmation requests
-- Created: 2026-01-16

-- Add score_confirmation notification type for the Add Score flow
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'score_confirmation';
