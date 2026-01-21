-- =============================================================================
-- Migration: Add Group Invite Codes
-- Description: Add invite_code column to network table for shareable invite links
-- =============================================================================

-- Add invite_code column to network table
ALTER TABLE public.network 
ADD COLUMN IF NOT EXISTS invite_code VARCHAR(12) UNIQUE;

-- Create index for fast invite code lookups
CREATE INDEX IF NOT EXISTS idx_network_invite_code 
ON public.network(invite_code) 
WHERE invite_code IS NOT NULL;

-- =============================================================================
-- FUNCTION: Generate unique invite code
-- Uses a combination of random alphanumeric characters (8 chars)
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_unique_invite_code()
RETURNS VARCHAR(12) AS $$
DECLARE
  new_code VARCHAR(12);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code (uppercase letters + numbers)
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32 + 1)::int, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.network WHERE invite_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: Generate or get invite code for a group
-- Returns existing code or generates a new one
-- =============================================================================
CREATE OR REPLACE FUNCTION get_or_create_group_invite_code(group_id UUID)
RETURNS VARCHAR(12) AS $$
DECLARE
  existing_code VARCHAR(12);
  new_code VARCHAR(12);
BEGIN
  -- Check for existing code
  SELECT invite_code INTO existing_code 
  FROM public.network 
  WHERE id = group_id;
  
  -- Return existing code if present
  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;
  
  -- Generate new code
  new_code := generate_unique_invite_code();
  
  -- Update network with new code
  UPDATE public.network 
  SET invite_code = new_code 
  WHERE id = group_id;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Join group using invite code
-- =============================================================================
CREATE OR REPLACE FUNCTION join_group_by_invite_code(p_invite_code VARCHAR(12), p_player_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_network_id UUID;
  v_network_type_id UUID;
  v_player_group_type_id UUID;
  v_is_member BOOLEAN;
  v_group_name VARCHAR(255);
BEGIN
  -- Get player_group network type id
  SELECT id INTO v_player_group_type_id 
  FROM public.network_type 
  WHERE name = 'player_group';
  
  -- Find the group by invite code
  SELECT id, network_type_id, name INTO v_network_id, v_network_type_id, v_group_name
  FROM public.network 
  WHERE invite_code = UPPER(p_invite_code);
  
  -- Check if group exists
  IF v_network_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid invite code'
    );
  END IF;
  
  -- Verify it's a player group (not a club)
  IF v_network_type_id != v_player_group_type_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid invite code'
    );
  END IF;
  
  -- Check if already a member
  SELECT EXISTS(
    SELECT 1 FROM public.network_member 
    WHERE network_id = v_network_id 
    AND player_id = p_player_id 
    AND status = 'active'
  ) INTO v_is_member;
  
  IF v_is_member THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are already a member of this group'
    );
  END IF;
  
  -- Add player to group
  INSERT INTO public.network_member (network_id, player_id, role, status, added_by, joined_at)
  VALUES (v_network_id, p_player_id, 'member', 'active', NULL, NOW())
  ON CONFLICT (network_id, player_id) 
  DO UPDATE SET status = 'active', joined_at = NOW();
  
  -- Update member count
  UPDATE public.network 
  SET member_count = (
    SELECT COUNT(*) FROM public.network_member 
    WHERE network_id = v_network_id AND status = 'active'
  )
  WHERE id = v_network_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'group_id', v_network_id,
    'group_name', v_group_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Reset invite code (regenerate)
-- Only moderators/creators should be able to do this
-- =============================================================================
CREATE OR REPLACE FUNCTION reset_group_invite_code(p_group_id UUID, p_moderator_id UUID)
RETURNS VARCHAR(12) AS $$
DECLARE
  v_is_moderator BOOLEAN;
  new_code VARCHAR(12);
BEGIN
  -- Check if user is a moderator
  SELECT EXISTS(
    SELECT 1 FROM public.network_member 
    WHERE network_id = p_group_id 
    AND player_id = p_moderator_id 
    AND status = 'active'
    AND role = 'moderator'
  ) INTO v_is_moderator;
  
  IF NOT v_is_moderator THEN
    RAISE EXCEPTION 'Only moderators can reset the invite code';
  END IF;
  
  -- Generate new code
  new_code := generate_unique_invite_code();
  
  -- Update network with new code
  UPDATE public.network 
  SET invite_code = new_code 
  WHERE id = p_group_id;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_unique_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_group_invite_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION join_group_by_invite_code(VARCHAR(12), UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_group_invite_code(UUID, UUID) TO authenticated;
