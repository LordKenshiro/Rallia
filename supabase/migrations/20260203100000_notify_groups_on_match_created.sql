-- ============================================================================
-- Migration: Notify group members when a match is created (public or visible in groups)
-- Created: 2026-02-03
-- Description: Adds notification type match_new_available (push only by default)
--              and trigger to insert notifications for all group members when
--              a user creates a public match or a private match with visible_in_groups.
-- ============================================================================

-- =============================================================================
-- STEP 1: Add new notification type
-- =============================================================================
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'match_new_available';

-- =============================================================================
-- STEP 2: Trigger function - notify group members on match creation
-- =============================================================================
CREATE OR REPLACE FUNCTION notify_group_members_on_match_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_group_type_id UUID;
  v_sport_name TEXT;
  v_notifications JSONB := '[]'::JSONB;
BEGIN
  -- Only run when match is public, or private with visible_in_groups
  IF NEW.visibility IS DISTINCT FROM 'public'
     AND NOT (NEW.visibility = 'private' AND COALESCE(NEW.visible_in_groups, true) = true) THEN
    RETURN NEW;
  END IF;

  -- Get player_group network type id
  SELECT id INTO v_player_group_type_id
  FROM network_type
  WHERE name = 'player_group'
  LIMIT 1;

  IF v_player_group_type_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Optional: sport name for payload (for push display)
  SELECT s.name INTO v_sport_name
  FROM sport s
  WHERE s.id = NEW.sport_id
  LIMIT 1;

  -- Build batch of notifications for distinct group members (excluding creator)
  -- Recipients: active members of any player_group the creator is in, except the creator
  WITH creator_groups AS (
    SELECT nm.network_id
    FROM network_member nm
    JOIN network n ON n.id = nm.network_id AND n.network_type_id = v_player_group_type_id
    WHERE nm.player_id = NEW.created_by
      AND nm.status = 'active'
  ),
  recipients AS (
    SELECT DISTINCT nm.player_id AS user_id
    FROM network_member nm
    JOIN creator_groups cg ON cg.network_id = nm.network_id
    WHERE nm.player_id IS NOT NULL
      AND nm.player_id != NEW.created_by
      AND nm.status = 'active'
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'user_id', r.user_id,
        'type', 'match_new_available',
        'target_id', NEW.id,
        'title', 'New game',
        'body', 'A group member created a match you can join.',
        'payload', jsonb_build_object(
          'matchId', NEW.id,
          'creatorId', NEW.created_by,
          'sportName', COALESCE(v_sport_name, '')
        ),
        'priority', 'normal'
      )
    ),
    '[]'::JSONB
  )
  INTO v_notifications
  FROM recipients r;

  IF jsonb_array_length(v_notifications) > 0 THEN
    PERFORM insert_notifications(v_notifications);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION notify_group_members_on_match_created() IS
  'After a match is inserted: if public or private with visible_in_groups, notifies all members of the creator''s player groups (excluding the creator).';

-- =============================================================================
-- STEP 3: Create trigger on match
-- =============================================================================
DROP TRIGGER IF EXISTS match_notify_group_members_on_create ON match;
CREATE TRIGGER match_notify_group_members_on_create
  AFTER INSERT ON match
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_members_on_match_created();
