-- Migration: Add 'refused' status to match_participant_status_enum
-- This migration adds a new 'refused' value to distinguish between:
--   - 'declined': An invited player turning down an invitation
--   - 'refused': A match creator refusing a player's request to join

-- ============================================
-- ADD 'refused' TO ENUM
-- ============================================

ALTER TYPE match_participant_status_enum ADD VALUE IF NOT EXISTS 'refused';

-- Add comment documenting the distinction
COMMENT ON TYPE match_participant_status_enum IS 'Status of a player''s participation in a match. Values: pending (invited, awaiting response), requested (player requested to join, awaiting host approval), joined (actively participating), declined (player declined an invitation), refused (host refused a join request), left (voluntarily left), kicked (removed by host), waitlisted (on waitlist for full match)';



