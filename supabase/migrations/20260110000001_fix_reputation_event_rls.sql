-- Migration: Fix reputation_event RLS policies
-- Description: Update RLS policies to allow authenticated users to insert
--              reputation events. The original policy may have been too restrictive.

-- =============================================================================
-- STEP 1: Drop existing policies
-- =============================================================================

DROP POLICY IF EXISTS "reputation_event_block_player_read" ON reputation_event;
DROP POLICY IF EXISTS "reputation_event_allow_insert" ON reputation_event;

-- =============================================================================
-- STEP 2: Create new policies
-- =============================================================================

-- PRIVACY: Block all player access to reading individual events
-- Only service_role (backend) can read events
CREATE POLICY "reputation_event_select_none" ON reputation_event
    FOR SELECT
    TO authenticated
    USING (false);

-- Allow authenticated users to insert events for any player
-- This is needed because:
-- 1. Host cancelling match creates events for all participants
-- 2. Reviews create events for reviewed player (not self)
-- 3. Application logic validates the legitimacy of events
CREATE POLICY "reputation_event_insert_authenticated" ON reputation_event
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Note: UPDATE and DELETE are intentionally not allowed for authenticated users
-- Events are immutable - only service_role should modify them if needed
