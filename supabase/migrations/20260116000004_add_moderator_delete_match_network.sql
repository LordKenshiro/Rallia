-- Migration: Add Moderator Delete Support for Match Network
-- Description: Updates match_network delete policy to allow moderators to delete posts
--              This runs after the role column is added to network_member

-- Drop and recreate the delete policy with moderator support
DROP POLICY IF EXISTS "match_network_delete_policy" ON public.match_network;

CREATE POLICY "match_network_delete_policy" ON public.match_network
  FOR DELETE USING (
    -- Poster can delete their own post
    posted_by = auth.uid()
    OR
    -- Network creator can delete any post
    EXISTS (
      SELECT 1 FROM public.network n
      WHERE n.id = match_network.network_id
      AND n.created_by = auth.uid()
    )
    OR
    -- Moderators can delete posts
    EXISTS (
      SELECT 1 FROM public.network_member nm
      WHERE nm.network_id = match_network.network_id
      AND nm.player_id = auth.uid()
      AND nm.role = 'moderator'
      AND nm.status = 'active'
    )
  );
