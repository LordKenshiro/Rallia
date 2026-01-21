-- Migration: Add Match-Network Junction Table
-- Description: Links matches to networks (groups/communities) with many-to-many relationship
-- This allows the same match to be posted to multiple groups/communities

-- =============================================================================
-- TABLE: match_network
-- Purpose: Junction table linking matches to networks they're posted in
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.match_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.match(id) ON DELETE CASCADE,
  network_id UUID NOT NULL REFERENCES public.network(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL REFERENCES public.player(id) ON DELETE CASCADE,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, network_id)
);

-- Add comments
COMMENT ON TABLE public.match_network IS 'Junction table linking matches to networks (groups/communities). Allows same match to appear in multiple networks.';
COMMENT ON COLUMN public.match_network.posted_by IS 'Player who posted this match to the network';
COMMENT ON COLUMN public.match_network.posted_at IS 'When the match was posted to this network';

-- =============================================================================
-- INDEXES for performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_match_network_match_id ON public.match_network(match_id);
CREATE INDEX IF NOT EXISTS idx_match_network_network_id ON public.match_network(network_id);
CREATE INDEX IF NOT EXISTS idx_match_network_posted_by ON public.match_network(posted_by);
CREATE INDEX IF NOT EXISTS idx_match_network_posted_at ON public.match_network(posted_at DESC);

-- =============================================================================
-- RLS Policies for match_network
-- =============================================================================
ALTER TABLE public.match_network ENABLE ROW LEVEL SECURITY;

-- Members can view matches posted to their networks
CREATE POLICY "match_network_select_policy" ON public.match_network
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.network_member nm
      WHERE nm.network_id = match_network.network_id
      AND nm.player_id = auth.uid()
      AND nm.status = 'active'
    )
  );

-- Members can post matches to their networks (must be participant or match creator)
CREATE POLICY "match_network_insert_policy" ON public.match_network
  FOR INSERT WITH CHECK (
    -- User must be an active member of the network
    EXISTS (
      SELECT 1 FROM public.network_member nm
      WHERE nm.network_id = network_id
      AND nm.player_id = auth.uid()
      AND nm.status = 'active'
    )
    AND
    -- User must be a participant in the match OR the match creator
    (
      EXISTS (
        SELECT 1 FROM public.match_participant mp
        WHERE mp.match_id = match_id
        AND mp.player_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.match m
        WHERE m.id = match_id
        AND m.created_by = auth.uid()
      )
    )
  );

-- Only the poster can delete their post (or moderators)
CREATE POLICY "match_network_delete_policy" ON public.match_network
  FOR DELETE USING (
    posted_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.network_member nm
      WHERE nm.network_id = match_network.network_id
      AND nm.player_id = auth.uid()
      AND nm.role = 'moderator'
      AND nm.status = 'active'
    )
  );
