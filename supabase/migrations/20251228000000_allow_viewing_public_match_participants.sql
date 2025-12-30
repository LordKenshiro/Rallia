-- Migration: Allow viewing participants of public matches
-- Description: Adds RLS policy to allow authenticated users to view participants
--              of public matches, even if they haven't joined yet.
--              This fixes the bug where participants of request-to-join matches
--              weren't visible until the user requested to join.

-- =============================================================================
-- CREATE HELPER FUNCTION
-- =============================================================================

-- Function to check if a match is public (uses SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION is_public_match(p_match_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM match
        WHERE id = p_match_id AND visibility = 'public'
    );
$$;

-- =============================================================================
-- ADD RLS POLICY FOR PUBLIC MATCH PARTICIPANTS
-- =============================================================================

-- Allow viewing participants of public matches
-- This policy allows any authenticated user to view participants of public matches,
-- even if they haven't joined the match yet.
CREATE POLICY "match_participant_select_public_match"
ON match_participant FOR SELECT
TO authenticated
USING (is_public_match(match_id));

-- Add comment for documentation
COMMENT ON POLICY "match_participant_select_public_match" ON match_participant IS 
'Allows authenticated users to view participants of public matches, even if they have not joined the match yet. This enables users to see who is already participating in request-to-join matches before they request to join.';

