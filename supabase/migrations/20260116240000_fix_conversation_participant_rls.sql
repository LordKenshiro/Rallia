-- Migration: Fix conversation_participant RLS recursion
-- Description: Removes the recursive policy that was causing infinite loops

-- Drop the problematic policies
DROP POLICY IF EXISTS "conversation_participant_select" ON public.conversation_participant;
DROP POLICY IF EXISTS "conversation_participant_insert" ON public.conversation_participant;

-- Simple policy: users can see their own participations
CREATE POLICY "Users can view own participations"
    ON public.conversation_participant FOR SELECT
    USING (player_id = auth.uid());

-- Allow viewing other participants in conversations you're part of
-- Using a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION get_user_conversation_ids(user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT conversation_id 
  FROM public.conversation_participant 
  WHERE player_id = user_id;
$$;

-- Policy to view other participants in same conversations
CREATE POLICY "Users can view co-participants"
    ON public.conversation_participant FOR SELECT
    USING (
        conversation_id IN (SELECT get_user_conversation_ids(auth.uid()))
    );

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Fixed conversation_participant RLS recursion';
END $$;
