-- =============================================================================
-- Migration: Fix RLS recursion in network_member policies
-- Description: Replace self-referencing policies with security definer functions
-- =============================================================================

-- =============================================================================
-- FUNCTION: Check if user is a member of a network (SECURITY DEFINER to bypass RLS)
-- =============================================================================
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

-- =============================================================================
-- FUNCTION: Check if user is a moderator of a network (SECURITY DEFINER to bypass RLS)
-- Note: Returns false if role column doesn't exist yet (will be updated in later migration)
-- =============================================================================
CREATE OR REPLACE FUNCTION is_network_moderator(network_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Check if role column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'network_member' 
    AND column_name = 'role'
  ) THEN
    -- If role column doesn't exist, check if user is the network creator (acts as moderator)
    RETURN EXISTS (
      SELECT 1 FROM public.network
      WHERE id = network_id_param
      AND created_by = user_id_param
    );
  END IF;
  
  -- If role column exists, check for moderator role
  RETURN EXISTS (
    SELECT 1 FROM public.network_member
    WHERE network_id = network_id_param
    AND player_id = user_id_param
    AND role = 'moderator'
    AND status = 'active'
  );
END;
$$;

-- =============================================================================
-- FUNCTION: Check if user is the creator of a network (SECURITY DEFINER to bypass RLS)
-- =============================================================================
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
-- Drop existing problematic policies on network_member
-- =============================================================================
DROP POLICY IF EXISTS "Members can view network members" ON public.network_member;
DROP POLICY IF EXISTS "Members can add members" ON public.network_member;
DROP POLICY IF EXISTS "Moderators can update members" ON public.network_member;
DROP POLICY IF EXISTS "Moderators can remove members" ON public.network_member;

-- =============================================================================
-- Re-create RLS POLICIES for network_member using helper functions
-- =============================================================================

-- Members can view members of networks they belong to
CREATE POLICY "Members can view network members" ON public.network_member
  FOR SELECT
  USING (
    is_network_member(network_id, auth.uid())
    OR is_network_creator(network_id, auth.uid())
  );

-- Members can add new members
-- Note: Role restrictions will be added in a later migration after role column exists
CREATE POLICY "Members can add members" ON public.network_member
  FOR INSERT
  WITH CHECK (
    -- Must be a member or creator of the network
    is_network_member(network_id, auth.uid())
    OR is_network_creator(network_id, auth.uid())
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
-- Drop and recreate network policies too (they also reference network_member)
-- =============================================================================
DROP POLICY IF EXISTS "Members can view their networks" ON public.network;
DROP POLICY IF EXISTS "Users can create networks" ON public.network;
DROP POLICY IF EXISTS "Moderators can update network" ON public.network;
DROP POLICY IF EXISTS "Creator can delete network" ON public.network;

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
-- Grant execute on helper functions
-- =============================================================================
GRANT EXECUTE ON FUNCTION is_network_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_network_moderator(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_network_creator(UUID, UUID) TO authenticated;
