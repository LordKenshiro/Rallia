-- ============================================================================
-- Reseed "All Players" group – delete if exists and recreate with all players
-- ============================================================================
-- Run whenever you want to refresh the "All Players" group so it contains
-- exactly all current players. Deletes any existing "All Players" group and
-- creates a new one.
--
-- Run: ./scripts/supabase/reseed-all-players-group.sh
-- Or:  psql "$DB_URL" -f scripts/supabase/reseed-all-players-group.sql
-- ============================================================================

-- Ensure network_type 'player_group' exists
INSERT INTO public.network_type (name, display_name, description, is_active)
VALUES (
  'player_group',
  'Player Group',
  'A group of players who can see each other''s matches and get notifications',
  true
)
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  v_player_group_type_id UUID;
  v_creator_id UUID;
  v_network_id UUID;
  v_deleted INT;
BEGIN
  SELECT id INTO v_player_group_type_id
  FROM public.network_type
  WHERE name = 'player_group'
  LIMIT 1;

  IF v_player_group_type_id IS NULL THEN
    RAISE EXCEPTION 'network_type player_group not found.';
  END IF;

  -- Delete existing "All Players" group(s) of this type (members cascade)
  WITH deleted AS (
    DELETE FROM public.network
    WHERE network_type_id = v_player_group_type_id
      AND name = 'All Players'
    RETURNING id
  )
  SELECT COUNT(*)::INT INTO v_deleted FROM deleted;

  IF v_deleted > 0 THEN
    RAISE NOTICE 'Deleted % existing All Players group(s).', v_deleted;
  END IF;

  -- Need at least one player to create the group
  SELECT id INTO v_creator_id
  FROM public.player
  ORDER BY created_at ASC NULLS LAST, id ASC
  LIMIT 1;

  IF v_creator_id IS NULL THEN
    RAISE NOTICE 'No players in database. Skipping All Players group creation.';
    RETURN;
  END IF;

  -- Create the group
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

  -- Add every player as member (creator is moderator)
  INSERT INTO public.network_member (network_id, player_id, role, status, added_by, joined_at)
  SELECT
    v_network_id,
    p.id,
    CASE WHEN p.id = v_creator_id THEN 'moderator'::network_member_role_enum ELSE 'member'::network_member_role_enum END,
    'active',
    NULL,
    NOW()
  FROM public.player p;

  RAISE NOTICE 'Created All Players group (id: %) with all current players as members.', v_network_id;
END $$;
