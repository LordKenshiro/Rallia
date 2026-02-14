-- =============================================================================
-- Migration: Fix RLS recursion in network and network_member policies (v2)
-- Description: Complete fix for infinite recursion by using SECURITY DEFINER functions
-- This migration is idempotent and can be safely re-run
-- =============================================================================

-- =============================================================================
-- STEP 1: Create/Replace helper functions with SECURITY DEFINER
-- These bypass RLS when checking membership, preventing recursion
-- =============================================================================

-- Function to check if user is a member of a network
CREATE OR REPLACE FUNCTION is_network_member(network_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.network_member
    WHERE network_id = network_id_param
    AND player_id = user_id_param
    AND status = 'active'
  );
$$;

-- Function to check if user is a moderator of a network
CREATE OR REPLACE FUNCTION is_network_moderator(network_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.network_member
    WHERE network_id = network_id_param
    AND player_id = user_id_param
    AND role = 'moderator'
    AND status = 'active'
  );
$$;

-- Function to check if user is the creator of a network
CREATE OR REPLACE FUNCTION is_network_creator(network_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.network
    WHERE id = network_id_param
    AND created_by = user_id_param
  );
$$;

-- =============================================================================
-- STEP 2: Drop ALL existing policies on network_member (clean slate)
-- =============================================================================
DROP POLICY IF EXISTS "Members can view network members" ON public.network_member;
DROP POLICY IF EXISTS "Members can add members" ON public.network_member;
DROP POLICY IF EXISTS "Moderators can update members" ON public.network_member;
DROP POLICY IF EXISTS "Moderators can remove members" ON public.network_member;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.network_member;
DROP POLICY IF EXISTS "network_member_select_policy" ON public.network_member;
DROP POLICY IF EXISTS "network_member_insert_policy" ON public.network_member;
DROP POLICY IF EXISTS "network_member_update_policy" ON public.network_member;
DROP POLICY IF EXISTS "network_member_delete_policy" ON public.network_member;

-- =============================================================================
-- STEP 3: Create new non-recursive policies for network_member
-- =============================================================================

-- Members can view members of networks they belong to
CREATE POLICY "Members can view network members" ON public.network_member
  FOR SELECT
  USING (
    -- Use SECURITY DEFINER function to avoid recursion
    is_network_member(network_id, auth.uid())
    OR is_network_creator(network_id, auth.uid())
    -- Also allow users to see their own membership record
    OR player_id = auth.uid()
  );

-- Members can add new members
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

-- Only moderators can update member status/role
CREATE POLICY "Moderators can update members" ON public.network_member
  FOR UPDATE
  USING (
    is_network_moderator(network_id, auth.uid())
    OR is_network_creator(network_id, auth.uid())
  );

-- Moderators can remove members, or members can remove themselves
CREATE POLICY "Moderators can remove members" ON public.network_member
  FOR DELETE
  USING (
    is_network_moderator(network_id, auth.uid())
    OR is_network_creator(network_id, auth.uid())
    OR player_id = auth.uid()
  );

-- =============================================================================
-- STEP 4: Drop ALL existing policies on network table (clean slate)
-- =============================================================================
DROP POLICY IF EXISTS "Members can view their networks" ON public.network;
DROP POLICY IF EXISTS "Users can create networks" ON public.network;
DROP POLICY IF EXISTS "Moderators can update network" ON public.network;
DROP POLICY IF EXISTS "Creator can delete network" ON public.network;
DROP POLICY IF EXISTS "network_select_policy" ON public.network;
DROP POLICY IF EXISTS "network_insert_policy" ON public.network;
DROP POLICY IF EXISTS "network_update_policy" ON public.network;
DROP POLICY IF EXISTS "network_delete_policy" ON public.network;

-- =============================================================================
-- STEP 5: Create new non-recursive policies for network table
-- =============================================================================

-- Members can view networks they belong to
CREATE POLICY "Members can view their networks" ON public.network
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_network_member(id, auth.uid())
  );

-- Only authenticated users can create networks
CREATE POLICY "Users can create networks" ON public.network
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Only creator or moderators can update network
CREATE POLICY "Moderators can update network" ON public.network
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR is_network_moderator(id, auth.uid())
  );

-- Only creator can delete network
CREATE POLICY "Creator can delete network" ON public.network
  FOR DELETE
  USING (created_by = auth.uid());

-- =============================================================================
-- STEP 6: Grant execute permissions on helper functions
-- =============================================================================
GRANT EXECUTE ON FUNCTION is_network_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_network_moderator(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_network_creator(UUID, UUID) TO authenticated;

-- =============================================================================
-- STEP 7: Verify RLS is enabled
-- =============================================================================
ALTER TABLE public.network ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_member ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Done! The infinite recursion should now be fixed.
-- 
-- Key changes:
-- 1. Helper functions use SECURITY DEFINER to bypass RLS when checking membership
-- 2. Policies now call these functions instead of using subqueries on the same table
-- 3. Added "OR player_id = auth.uid()" to SELECT policy so users can always see their own records
-- =============================================================================
