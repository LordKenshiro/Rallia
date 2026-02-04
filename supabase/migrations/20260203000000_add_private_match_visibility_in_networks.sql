-- ============================================================================
-- Migration: Add private match visibility in groups and communities
-- Created: 2025-02-03
-- Description: When visibility = 'private', allow creator to choose whether
--              the match is visible in their groups and communities.
-- ============================================================================

-- Only relevant when visibility = 'private'
ALTER TABLE match ADD COLUMN IF NOT EXISTS visible_in_groups BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE match ADD COLUMN IF NOT EXISTS visible_in_communities BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN match.visible_in_groups IS 'When visibility is private: whether this match is shown in groups the creator is part of';
COMMENT ON COLUMN match.visible_in_communities IS 'When visibility is private: whether this match is shown in communities the creator is part of';
