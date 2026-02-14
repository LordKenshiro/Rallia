-- ============================================================================
-- Migration: Seed "All Players" player group for local development
-- Created: 2026-02-03
-- Description: Ensures network_type 'player_group' exists, then creates one
--              player group named "All Players" and adds every player in the
--              database as an active member. Safe to run multiple times
--              (idempotent for the group creation).
-- ============================================================================

-- =============================================================================
-- STEP 1: Ensure network_type 'player_group' exists
-- =============================================================================
INSERT INTO public.network_type (name, display_name, description, is_active)
VALUES (
  'player_group',
  'Player Group',
  'A group of players who can see each other''s matches and get notifications',
  true
)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- STEP 2: Create "All Players" network and add all players as members
-- =============================================================================
DO $$
DECLARE
  v_player_group_type_id UUID;
  v_creator_id UUID;
  v_network_id UUID;
  v_existing_network_id UUID;
BEGIN
  -- Get player_group network type
  SELECT id INTO v_player_group_type_id
  FROM public.network_type
  WHERE name = 'player_group'
  LIMIT 1;

  IF v_player_group_type_id IS NULL THEN
    RAISE NOTICE 'network_type player_group not found. Skipping seed.';
    RETURN;
  END IF;

  -- Get first player to use as group creator
  SELECT id INTO v_creator_id
  FROM public.player
  ORDER BY created_at ASC NULLS LAST, id ASC
  LIMIT 1;

  IF v_creator_id IS NULL THEN
    RAISE NOTICE 'No players in database. Skipping All Players group seed.';
    RETURN;
  END IF;

  -- Use existing "All Players" group if we already created one (by name + type + creator)
  SELECT id INTO v_existing_network_id
  FROM public.network
  WHERE network_type_id = v_player_group_type_id
    AND name = 'All Players'
    AND created_by = v_creator_id
  LIMIT 1;

  IF v_existing_network_id IS NOT NULL THEN
    v_network_id := v_existing_network_id;
    RAISE NOTICE 'All Players group already exists (id: %). Adding any missing members.', v_network_id;
  ELSE
    -- Create the network (trigger will set conversation_id and member_count)
    INSERT INTO public.network (
      network_type_id,
      name,
      description,
      is_private,
      created_by
    )
    VALUES (
      v_player_group_type_id,
      'All Players',
      'All players in the database (local dev seed)',
      true,
      v_creator_id
    )
    RETURNING id INTO v_network_id;

    -- Add creator as first member (moderator)
    INSERT INTO public.network_member (network_id, player_id, role, status, added_by, joined_at)
    VALUES (v_network_id, v_creator_id, 'moderator', 'active', NULL, NOW())
    ON CONFLICT (network_id, player_id) DO NOTHING;

    RAISE NOTICE 'Created All Players group (id: %).', v_network_id;
  END IF;

  -- Add every player as member (skip duplicates)
  INSERT INTO public.network_member (network_id, player_id, role, status, added_by, joined_at)
  SELECT
    v_network_id,
    p.id,
    CASE WHEN p.id = v_creator_id THEN 'moderator'::network_member_role_enum ELSE 'member'::network_member_role_enum END,
    'active',
    NULL,
    NOW()
  FROM public.player p
  ON CONFLICT (network_id, player_id) DO NOTHING;

  RAISE NOTICE 'All Players group has all players as members.';
END $$;
