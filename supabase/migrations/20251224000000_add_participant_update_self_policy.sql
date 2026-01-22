-- Migration: Allow participants to update their own participation status
-- This fixes the issue where participants cannot leave a match because
-- the UPDATE policy only allowed the match creator to update records.

-- Add policy for participants to update their own record
-- This enables the "leave match" functionality where we set status = 'left'
CREATE POLICY "match_participant_update_self"
ON match_participant FOR UPDATE
TO authenticated
USING (player_id = auth.uid())
WITH CHECK (player_id = auth.uid());

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Added match_participant_update_self policy';
END $$;

