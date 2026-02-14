-- =============================================================================
-- Migration: Add conversation and network management columns
-- Description: Adds conversation_id for group chats and member tracking columns
-- =============================================================================

-- =============================================================================
-- Add conversation_id to network for group chat support
-- =============================================================================
ALTER TABLE public.network 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversation(id) ON DELETE SET NULL;

-- Index for conversation lookups
CREATE INDEX IF NOT EXISTS idx_network_conversation_id 
ON public.network(conversation_id) 
WHERE conversation_id IS NOT NULL;

-- =============================================================================
-- Add member tracking columns to network
-- =============================================================================
ALTER TABLE public.network 
ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;

ALTER TABLE public.network 
ADD COLUMN IF NOT EXISTS max_members INTEGER;

ALTER TABLE public.network 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- =============================================================================
-- FUNCTION: Create conversation for a network/group
-- =============================================================================
CREATE OR REPLACE FUNCTION create_network_conversation()
RETURNS TRIGGER AS $$
DECLARE
  new_conversation_id UUID;
  group_type_id UUID;
BEGIN
  -- Get player_group network type id
  SELECT id INTO group_type_id FROM public.network_type WHERE name = 'player_group';
  
  -- Create conversation for player groups only (if no conversation exists)
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

-- Create trigger (if it doesn't exist)
DROP TRIGGER IF EXISTS trigger_create_network_conversation ON public.network;
CREATE TRIGGER trigger_create_network_conversation
  BEFORE INSERT ON public.network
  FOR EACH ROW
  EXECUTE FUNCTION create_network_conversation();

-- =============================================================================
-- TRIGGER: Update member_count when network_member changes
-- =============================================================================
CREATE OR REPLACE FUNCTION update_network_member_count()
RETURNS TRIGGER AS $$
DECLARE
  target_network_id UUID;
BEGIN
  -- Determine which network to update
  IF TG_OP = 'DELETE' THEN
    target_network_id := OLD.network_id;
  ELSE
    target_network_id := NEW.network_id;
  END IF;
  
  -- Update the member count
  UPDATE public.network
  SET member_count = (
    SELECT COUNT(*) 
    FROM public.network_member 
    WHERE network_id = target_network_id 
    AND status = 'active'
  )
  WHERE id = target_network_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_network_member_count ON public.network_member;
CREATE TRIGGER trigger_update_network_member_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.network_member
  FOR EACH ROW
  EXECUTE FUNCTION update_network_member_count();

-- =============================================================================
-- TRIGGER: Add new network members to conversation
-- =============================================================================
CREATE OR REPLACE FUNCTION add_network_member_to_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Only act on active members
  IF NEW.status = 'active' THEN
    -- Get the network's conversation_id
    SELECT conversation_id INTO v_conversation_id
    FROM public.network
    WHERE id = NEW.network_id;
    
    -- If network has a conversation, add the member as a participant
    IF v_conversation_id IS NOT NULL THEN
      INSERT INTO public.conversation_participant (conversation_id, player_id)
      VALUES (v_conversation_id, NEW.player_id)
      ON CONFLICT (conversation_id, player_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_add_network_member_to_conversation ON public.network_member;
CREATE TRIGGER trigger_add_network_member_to_conversation
  AFTER INSERT OR UPDATE OF status ON public.network_member
  FOR EACH ROW
  EXECUTE FUNCTION add_network_member_to_conversation();

-- =============================================================================
-- Initialize member counts for existing networks
-- =============================================================================
UPDATE public.network n
SET member_count = (
  SELECT COUNT(*) 
  FROM public.network_member nm 
  WHERE nm.network_id = n.id 
  AND nm.status = 'active'
);

-- =============================================================================
-- Add comments
-- =============================================================================
COMMENT ON COLUMN public.network.conversation_id IS 'Associated group conversation for chat';
COMMENT ON COLUMN public.network.member_count IS 'Cached count of active members';
COMMENT ON COLUMN public.network.max_members IS 'Maximum allowed members (NULL for unlimited)';
COMMENT ON COLUMN public.network.cover_image_url IS 'URL of the group cover/banner image';
