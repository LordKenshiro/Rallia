-- =============================================================================
-- Migration: Add Player Group Support
-- Description: Extends network tables to support private player groups with
--              moderator roles, member limits, and group chat integration
-- =============================================================================

-- =============================================================================
-- ENUM: network_member_role_enum
-- Purpose: Define roles within a network/group (member vs moderator)
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_member_role_enum') THEN
        CREATE TYPE network_member_role_enum AS ENUM ('member', 'moderator');
    END IF;
END
$$;

-- =============================================================================
-- ALTER TABLE: network
-- Add new columns for group functionality
-- =============================================================================
ALTER TABLE public.network 
ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 10 CHECK (max_members >= 2 AND max_members <= 50),
ADD COLUMN IF NOT EXISTS member_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversation(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Add comment
COMMENT ON COLUMN public.network.max_members IS 'Maximum number of members allowed in this group (default 10 for player groups)';
COMMENT ON COLUMN public.network.member_count IS 'Current count of active members';
COMMENT ON COLUMN public.network.conversation_id IS 'Associated group chat conversation';
COMMENT ON COLUMN public.network.cover_image_url IS 'Optional cover image for the group';

-- =============================================================================
-- ALTER TABLE: network_member
-- Add role column for moderator functionality
-- =============================================================================
ALTER TABLE public.network_member 
ADD COLUMN IF NOT EXISTS role network_member_role_enum NOT NULL DEFAULT 'member',
ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES public.player(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN public.network_member.role IS 'Role of the member (member or moderator). Creator is moderator by default.';
COMMENT ON COLUMN public.network_member.added_by IS 'Player who added this member to the group';

-- =============================================================================
-- Create indexes for performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_network_created_by ON public.network(created_by);
CREATE INDEX IF NOT EXISTS idx_network_network_type_id ON public.network(network_type_id);
CREATE INDEX IF NOT EXISTS idx_network_conversation_id ON public.network(conversation_id);
CREATE INDEX IF NOT EXISTS idx_network_member_network_id ON public.network_member(network_id);
CREATE INDEX IF NOT EXISTS idx_network_member_player_id ON public.network_member(player_id);
CREATE INDEX IF NOT EXISTS idx_network_member_role ON public.network_member(role);

-- =============================================================================
-- Insert 'player_group' network type if it doesn't exist
-- =============================================================================
INSERT INTO public.network_type (name, display_name, description, is_active)
VALUES ('player_group', 'Player Group', 'Private groups for close friends and regular teammates', true)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- FUNCTION: Update network member_count
-- =============================================================================
CREATE OR REPLACE FUNCTION update_network_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      UPDATE public.network 
      SET member_count = member_count + 1, updated_at = NOW()
      WHERE id = NEW.network_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE public.network 
      SET member_count = member_count + 1, updated_at = NOW()
      WHERE id = NEW.network_id;
    ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE public.network 
      SET member_count = GREATEST(member_count - 1, 0), updated_at = NOW()
      WHERE id = NEW.network_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' THEN
      UPDATE public.network 
      SET member_count = GREATEST(member_count - 1, 0), updated_at = NOW()
      WHERE id = OLD.network_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_network_member_count ON public.network_member;
CREATE TRIGGER trigger_update_network_member_count
AFTER INSERT OR UPDATE OF status OR DELETE ON public.network_member
FOR EACH ROW
EXECUTE FUNCTION update_network_member_count();

-- =============================================================================
-- FUNCTION: Enforce max members limit
-- =============================================================================
CREATE OR REPLACE FUNCTION enforce_network_max_members()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Only check on insert or when status changes to active
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') THEN
    SELECT member_count, max_members INTO current_count, max_allowed
    FROM public.network 
    WHERE id = NEW.network_id;
    
    IF current_count >= max_allowed THEN
      RAISE EXCEPTION 'Cannot add member: group has reached maximum capacity of % members', max_allowed;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_enforce_network_max_members ON public.network_member;
CREATE TRIGGER trigger_enforce_network_max_members
BEFORE INSERT OR UPDATE OF status ON public.network_member
FOR EACH ROW
EXECUTE FUNCTION enforce_network_max_members();

-- =============================================================================
-- FUNCTION: Create group conversation when network is created
-- =============================================================================
CREATE OR REPLACE FUNCTION create_network_conversation()
RETURNS TRIGGER AS $$
DECLARE
  new_conversation_id UUID;
  group_type_id UUID;
BEGIN
  -- Only create conversation for player groups
  SELECT id INTO group_type_id FROM public.network_type WHERE name = 'player_group';
  
  IF NEW.network_type_id = group_type_id AND NEW.conversation_id IS NULL THEN
    -- Create the group conversation
    INSERT INTO public.conversation (conversation_type, title, created_by)
    VALUES ('group', NEW.name, NEW.created_by)
    RETURNING id INTO new_conversation_id;
    
    -- Update the network with the conversation id
    NEW.conversation_id := new_conversation_id;
    
    -- Add the creator as a participant
    INSERT INTO public.conversation_participant (conversation_id, player_id)
    VALUES (new_conversation_id, NEW.created_by);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_network_conversation ON public.network;
CREATE TRIGGER trigger_create_network_conversation
BEFORE INSERT ON public.network
FOR EACH ROW
EXECUTE FUNCTION create_network_conversation();

-- =============================================================================
-- FUNCTION: Add member to group conversation when they join
-- =============================================================================
CREATE OR REPLACE FUNCTION add_member_to_network_conversation()
RETURNS TRIGGER AS $$
DECLARE
  network_conversation_id UUID;
BEGIN
  -- Get the conversation_id for this network
  SELECT conversation_id INTO network_conversation_id
  FROM public.network 
  WHERE id = NEW.network_id;
  
  -- If there's a conversation and status is active, add the participant
  IF network_conversation_id IS NOT NULL AND NEW.status = 'active' THEN
    INSERT INTO public.conversation_participant (conversation_id, player_id)
    VALUES (network_conversation_id, NEW.player_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_add_member_to_network_conversation ON public.network_member;
CREATE TRIGGER trigger_add_member_to_network_conversation
AFTER INSERT OR UPDATE OF status ON public.network_member
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION add_member_to_network_conversation();

-- =============================================================================
-- FUNCTION: Remove member from group conversation when they leave
-- =============================================================================
CREATE OR REPLACE FUNCTION remove_member_from_network_conversation()
RETURNS TRIGGER AS $$
DECLARE
  network_conversation_id UUID;
BEGIN
  -- Get the conversation_id for this network
  SELECT conversation_id INTO network_conversation_id
  FROM public.network 
  WHERE id = OLD.network_id;
  
  -- If there's a conversation and member is being removed/blocked
  IF network_conversation_id IS NOT NULL AND (TG_OP = 'DELETE' OR NEW.status IN ('removed', 'blocked')) THEN
    DELETE FROM public.conversation_participant 
    WHERE conversation_id = network_conversation_id 
    AND player_id = COALESCE(OLD.player_id, NEW.player_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_remove_member_from_network_conversation ON public.network_member;
CREATE TRIGGER trigger_remove_member_from_network_conversation
AFTER UPDATE OF status OR DELETE ON public.network_member
FOR EACH ROW
EXECUTE FUNCTION remove_member_from_network_conversation();

-- =============================================================================
-- RLS POLICIES for network table
-- =============================================================================
ALTER TABLE public.network ENABLE ROW LEVEL SECURITY;

-- Members can view networks they belong to
DROP POLICY IF EXISTS "Members can view their networks" ON public.network;
CREATE POLICY "Members can view their networks" ON public.network
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR id IN (
      SELECT network_id FROM public.network_member 
      WHERE player_id = auth.uid() AND status = 'active'
    )
  );

-- Only authenticated users can create networks
DROP POLICY IF EXISTS "Users can create networks" ON public.network;
CREATE POLICY "Users can create networks" ON public.network
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Only creator or moderators can update network
DROP POLICY IF EXISTS "Moderators can update network" ON public.network;
CREATE POLICY "Moderators can update network" ON public.network
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR id IN (
      SELECT network_id FROM public.network_member 
      WHERE player_id = auth.uid() AND role = 'moderator' AND status = 'active'
    )
  );

-- Only creator can delete network
DROP POLICY IF EXISTS "Creator can delete network" ON public.network;
CREATE POLICY "Creator can delete network" ON public.network
  FOR DELETE
  USING (created_by = auth.uid());

-- =============================================================================
-- RLS POLICIES for network_member table
-- =============================================================================
ALTER TABLE public.network_member ENABLE ROW LEVEL SECURITY;

-- Members can view members of networks they belong to
DROP POLICY IF EXISTS "Members can view network members" ON public.network_member;
CREATE POLICY "Members can view network members" ON public.network_member
  FOR SELECT
  USING (
    network_id IN (
      SELECT network_id FROM public.network_member 
      WHERE player_id = auth.uid() AND status = 'active'
    )
    OR network_id IN (
      SELECT id FROM public.network WHERE created_by = auth.uid()
    )
  );

-- Members can add new members (but non-moderators can't set role to moderator)
DROP POLICY IF EXISTS "Members can add members" ON public.network_member;
CREATE POLICY "Members can add members" ON public.network_member
  FOR INSERT
  WITH CHECK (
    -- Must be a member or creator of the network
    (
      network_id IN (
        SELECT network_id FROM public.network_member 
        WHERE player_id = auth.uid() AND status = 'active'
      )
      OR network_id IN (
        SELECT id FROM public.network WHERE created_by = auth.uid()
      )
    )
    -- Non-moderators can only add with 'member' role
    AND (
      role = 'member'
      OR network_id IN (
        SELECT network_id FROM public.network_member 
        WHERE player_id = auth.uid() AND role = 'moderator' AND status = 'active'
      )
      OR network_id IN (
        SELECT id FROM public.network WHERE created_by = auth.uid()
      )
    )
  );

-- Only moderators can update member status/role
DROP POLICY IF EXISTS "Moderators can update members" ON public.network_member;
CREATE POLICY "Moderators can update members" ON public.network_member
  FOR UPDATE
  USING (
    network_id IN (
      SELECT network_id FROM public.network_member 
      WHERE player_id = auth.uid() AND role = 'moderator' AND status = 'active'
    )
    OR network_id IN (
      SELECT id FROM public.network WHERE created_by = auth.uid()
    )
  );

-- Only moderators can remove members
DROP POLICY IF EXISTS "Moderators can remove members" ON public.network_member;
CREATE POLICY "Moderators can remove members" ON public.network_member
  FOR DELETE
  USING (
    -- Moderators can delete
    network_id IN (
      SELECT network_id FROM public.network_member 
      WHERE player_id = auth.uid() AND role = 'moderator' AND status = 'active'
    )
    OR network_id IN (
      SELECT id FROM public.network WHERE created_by = auth.uid()
    )
    -- Members can remove themselves
    OR player_id = auth.uid()
  );

-- =============================================================================
-- TABLE: group_activity (for tracking group activities on home tab)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.group_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES public.network(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.player(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
    'member_joined', 
    'member_left',
    'member_promoted',
    'member_demoted',
    'match_created', 
    'match_completed',
    'game_created',
    'message_sent',
    'group_updated'
  )),
  related_entity_id UUID, -- Can reference match_id, message_id, etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.group_activity IS 'Activity feed for group home page showing recent events';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_activity_network_id ON public.group_activity(network_id);
CREATE INDEX IF NOT EXISTS idx_group_activity_created_at ON public.group_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_activity_type ON public.group_activity(activity_type);

-- RLS for group_activity
ALTER TABLE public.group_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view group activity" ON public.group_activity;
CREATE POLICY "Members can view group activity" ON public.group_activity
  FOR SELECT
  USING (
    network_id IN (
      SELECT network_id FROM public.network_member 
      WHERE player_id = auth.uid() AND status = 'active'
    )
    OR network_id IN (
      SELECT id FROM public.network WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert group activity" ON public.group_activity;
CREATE POLICY "System can insert group activity" ON public.group_activity
  FOR INSERT
  WITH CHECK (
    network_id IN (
      SELECT network_id FROM public.network_member 
      WHERE player_id = auth.uid() AND status = 'active'
    )
    OR network_id IN (
      SELECT id FROM public.network WHERE created_by = auth.uid()
    )
  );

-- =============================================================================
-- FUNCTION: Log group activity when member joins
-- =============================================================================
CREATE OR REPLACE FUNCTION log_member_joined_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO public.group_activity (network_id, player_id, activity_type, metadata)
    VALUES (
      NEW.network_id, 
      NEW.player_id, 
      'member_joined',
      jsonb_build_object('added_by', NEW.added_by)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_member_joined_activity ON public.network_member;
CREATE TRIGGER trigger_log_member_joined_activity
AFTER INSERT ON public.network_member
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION log_member_joined_activity();

-- =============================================================================
-- FUNCTION: Log group activity when member leaves
-- =============================================================================
CREATE OR REPLACE FUNCTION log_member_left_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status IN ('removed', 'blocked') THEN
    INSERT INTO public.group_activity (network_id, player_id, activity_type)
    VALUES (OLD.network_id, OLD.player_id, 'member_left');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_member_left_activity ON public.network_member;
CREATE TRIGGER trigger_log_member_left_activity
AFTER UPDATE OF status ON public.network_member
FOR EACH ROW
EXECUTE FUNCTION log_member_left_activity();

-- =============================================================================
-- Add creator as first member with moderator role automatically
-- =============================================================================
CREATE OR REPLACE FUNCTION add_creator_as_moderator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.network_member (network_id, player_id, role, status, added_by)
  VALUES (NEW.id, NEW.created_by, 'moderator', 'active', NEW.created_by)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_add_creator_as_moderator ON public.network;
CREATE TRIGGER trigger_add_creator_as_moderator
AFTER INSERT ON public.network
FOR EACH ROW
EXECUTE FUNCTION add_creator_as_moderator();
