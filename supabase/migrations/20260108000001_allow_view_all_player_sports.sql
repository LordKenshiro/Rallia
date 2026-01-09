-- Migration: Allow authenticated users to view all player_sport records
-- This is needed for the player search feature to find other players
-- who are active in the same sport.

-- Add a new policy that allows authenticated users to SELECT all player_sport records
CREATE POLICY "Authenticated users can view all player sports"
  ON "public"."player_sport"
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: This allows all authenticated users to see which sports other players are active in.
-- The existing "Users can view their own player_sport data" policy is now redundant for SELECT
-- but we keep it for clarity. The new policy is more permissive and will allow the query.
