-- Migration: Allow anonymous users to view participants of public matches
-- Description: Adds RLS policy to allow unauthenticated (anonymous) users to view 
--              participants of public matches. This complements the existing policy
--              that allows viewing public matches themselves, ensuring that the
--              participant count and avatars display correctly for signed-out users.

-- =============================================================================
-- ADD RLS POLICY FOR ANONYMOUS USERS TO VIEW PUBLIC MATCH PARTICIPANTS
-- =============================================================================

-- Reuse the existing is_public_match function (SECURITY DEFINER) to check visibility
-- This function was created in 20251228000000_allow_viewing_public_match_participants.sql

-- Allow anonymous users to view participants of public matches
DROP POLICY IF EXISTS "match_participant_select_public_match_anon" ON match_participant;

CREATE POLICY "match_participant_select_public_match_anon"
ON match_participant FOR SELECT
TO anon
USING (is_public_match(match_id));

-- Add comment for documentation
COMMENT ON POLICY "match_participant_select_public_match_anon" ON match_participant IS 
'Allows unauthenticated (anonymous) users to view participants of public matches. This enables signed-out users to see participant counts and avatars when browsing public matches.';
