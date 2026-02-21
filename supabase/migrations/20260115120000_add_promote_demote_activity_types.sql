-- Migration: Add promote/demote activity types to group_activity
-- Description: Allows tracking when members are promoted to moderator or demoted to member
-- Note: This migration runs conditionally - group_activity table is created in 20260206110000

DO $$
BEGIN
  -- Only run if table exists (it's created in a later migration)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_activity') THEN
    -- Drop the existing constraint
    ALTER TABLE public.group_activity 
    DROP CONSTRAINT IF EXISTS group_activity_activity_type_check;

    -- Add the new constraint with additional activity types
    ALTER TABLE public.group_activity 
    ADD CONSTRAINT group_activity_activity_type_check 
    CHECK (activity_type IN (
      'member_joined', 
      'member_left',
      'member_promoted',
      'member_demoted',
      'match_created', 
      'match_completed',
      'game_created',
      'message_sent',
      'group_updated'
    ));

    -- Add comment explaining the activity types
    COMMENT ON COLUMN public.group_activity.activity_type IS 'Type of activity: member_joined, member_left, member_promoted, member_demoted, match_created, match_completed, game_created, message_sent, group_updated';
    
    RAISE NOTICE 'Updated group_activity constraint with promote/demote activity types';
  ELSE
    RAISE NOTICE 'group_activity table does not exist yet - constraint will be added when table is created';
  END IF;
END $$;
