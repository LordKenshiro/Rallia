-- Migration: Add Role Restrictions to Network Member Insert Policy
-- Description: Updates the insert policy to enforce role restrictions after role column exists
--              Non-moderators can only add members with 'member' role

-- Drop and recreate the insert policy with role restrictions
DROP POLICY IF EXISTS "Members can add members" ON public.network_member;

CREATE POLICY "Members can add members" ON public.network_member
  FOR INSERT
  WITH CHECK (
    -- Must be a member or creator of the network
    (
      is_network_member(network_id, auth.uid())
      OR is_network_creator(network_id, auth.uid())
    )
    -- Non-moderators can only add with 'member' role
    AND (
      role = 'member'
      OR is_network_moderator(network_id, auth.uid())
      OR is_network_creator(network_id, auth.uid())
    )
  );
