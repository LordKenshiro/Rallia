-- Migration: Add match_participant_status_enum
-- This migration:
-- 1. Creates a new enum for match participant statuses
-- 2. Alters the match_participant.invitation_status column to use the new enum
-- 3. Renames the column to 'status' for clarity

-- ============================================
-- PHASE 1: CREATE THE ENUM
-- ============================================

CREATE TYPE match_participant_status_enum AS ENUM (
  'pending',      -- Invited, awaiting response
  'requested',    -- Player requested to join (awaiting host approval)
  'joined',       -- Actively participating in the match
  'declined',     -- Declined invitation
  'left',         -- Voluntarily left the match
  'kicked',       -- Removed by host
  'waitlisted'    -- On waitlist for a full match
);

COMMENT ON TYPE match_participant_status_enum IS 'Status of a player''s participation in a match';

-- ============================================
-- PHASE 2: CONVERT COLUMN TO TEXT TEMPORARILY
-- ============================================

-- Drop default if exists
ALTER TABLE match_participant 
  ALTER COLUMN invitation_status DROP DEFAULT;

-- Convert column to text first so we can update values
ALTER TABLE match_participant 
  ALTER COLUMN invitation_status TYPE text 
  USING invitation_status::text;

-- ============================================
-- PHASE 3: UPDATE EXISTING DATA
-- ============================================

-- Map existing member_status values to new match_participant_status_enum values
-- member_status: 'active', 'inactive', 'pending', 'suspended'
-- Mapping:
--   'active' -> 'joined'
--   'inactive' -> 'left'
--   'pending' -> 'pending'
--   'suspended' -> 'kicked'
--   NULL -> 'pending' (default for new participants)

UPDATE match_participant 
SET invitation_status = 'pending' 
WHERE invitation_status IS NULL;

UPDATE match_participant 
SET invitation_status = CASE 
  WHEN invitation_status = 'active' THEN 'joined'
  WHEN invitation_status = 'inactive' THEN 'left'
  WHEN invitation_status = 'pending' THEN 'pending'
  WHEN invitation_status = 'suspended' THEN 'kicked'
  ELSE 'pending'
END;

-- ============================================
-- PHASE 4: ALTER THE COLUMN TYPE TO NEW ENUM
-- ============================================

-- Now convert to the new enum type
ALTER TABLE match_participant 
  ALTER COLUMN invitation_status TYPE match_participant_status_enum 
  USING invitation_status::match_participant_status_enum;

-- Set default value for new participants
ALTER TABLE match_participant 
  ALTER COLUMN invitation_status SET DEFAULT 'pending'::match_participant_status_enum;

-- ============================================
-- PHASE 5: RENAME COLUMN (optional but cleaner)
-- ============================================

-- Rename invitation_status to status for clarity
ALTER TABLE match_participant 
  RENAME COLUMN invitation_status TO status;

-- ============================================
-- PHASE 6: VERIFICATION
-- ============================================

DO $$
DECLARE
  participant_count INTEGER;
  status_counts TEXT;
BEGIN
  SELECT COUNT(*) INTO participant_count FROM match_participant;
  RAISE NOTICE 'Total match participants: %', participant_count;
  
  -- Log status distribution
  SELECT string_agg(status || ': ' || cnt, ', ')
  INTO status_counts
  FROM (
    SELECT status::text, COUNT(*) as cnt 
    FROM match_participant 
    GROUP BY status
  ) sub;
  
  IF status_counts IS NOT NULL THEN
    RAISE NOTICE 'Status distribution: %', status_counts;
  END IF;
END $$;

