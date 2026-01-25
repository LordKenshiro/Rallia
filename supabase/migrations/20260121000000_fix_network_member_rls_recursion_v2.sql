-- =============================================================================
-- Migration: Fix RLS recursion in network_member policies (v2)
-- Description: Forcefully drop and recreate policies with security definer functions
-- Date: 2026-01-21
-- =============================================================================

-- =============================================================================
-- STEP 1: Create or replace helper functions with SECURITY DEFINER
-- These bypass RLS when checking membership to avoid infinite recursion
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
-- STEP 2: Drop ALL existing policies on network_member (force clean slate)
-- =============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'network_member' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.network_member', pol.policyname);
    END LOOP;
END $$;

-- =============================================================================
-- STEP 3: Create NEW RLS policies using helper functions (no recursion)
-- =============================================================================

-- Enable RLS (idempotent)
ALTER TABLE public.network_member ENABLE ROW LEVEL SECURITY;

-- SELECT: Members can view members of networks they belong to
CREATE POLICY "network_member_select_policy" ON public.network_member
  FOR SELECT
  USING (
    is_network_member(network_id, auth.uid())
    OR is_network_creator(network_id, auth.uid())
    OR player_id = auth.uid()  -- Users can always see their own membership records
  );

-- INSERT: Members can add new members
CREATE POLICY "network_member_insert_policy" ON public.network_member
  FOR INSERT
  WITH CHECK (
    (
      is_network_member(network_id, auth.uid())
      OR is_network_creator(network_id, auth.uid())
    )
    AND (
      role = 'member'
      OR is_network_moderator(network_id, auth.uid())
      OR is_network_creator(network_id, auth.uid())
    )
  );

-- UPDATE: Only moderators/creators can update members
CREATE POLICY "network_member_update_policy" ON public.network_member
  FOR UPDATE
  USING (
    is_network_moderator(network_id, auth.uid())
    OR is_network_creator(network_id, auth.uid())
  );

-- DELETE: Moderators can remove members, members can remove themselves
CREATE POLICY "network_member_delete_policy" ON public.network_member
  FOR DELETE
  USING (
    is_network_moderator(network_id, auth.uid())
    OR is_network_creator(network_id, auth.uid())
    OR player_id = auth.uid()
  );

-- =============================================================================
-- STEP 4: Fix network table policies too
-- =============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'network' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.network', pol.policyname);
    END LOOP;
END $$;

-- Enable RLS (idempotent)
ALTER TABLE public.network ENABLE ROW LEVEL SECURITY;

-- SELECT: Members can view networks they belong to
CREATE POLICY "network_select_policy" ON public.network
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_network_member(id, auth.uid())
  );

-- INSERT: Authenticated users can create networks
CREATE POLICY "network_insert_policy" ON public.network
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- UPDATE: Only creator or moderators can update
CREATE POLICY "network_update_policy" ON public.network
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR is_network_moderator(id, auth.uid())
  );

-- DELETE: Only creator can delete
CREATE POLICY "network_delete_policy" ON public.network
  FOR DELETE
  USING (created_by = auth.uid());

-- =============================================================================
-- STEP 5: Grant execute permissions on helper functions
-- =============================================================================

GRANT EXECUTE ON FUNCTION is_network_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_network_moderator(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_network_creator(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_network_member(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION is_network_moderator(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION is_network_creator(UUID, UUID) TO anon;

-- =============================================================================
-- STEP 6: Verify the fix
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'RLS recursion fix applied successfully!';
  RAISE NOTICE 'Policies now use SECURITY DEFINER functions to bypass RLS checks.';
END $$;
