-- Migration: Add INSERT policy for conversation_participant
-- Description: Allow users to add participants to conversations they create

-- Drop any existing insert policy
DROP POLICY IF EXISTS "conversation_participant_insert" ON public.conversation_participant;
DROP POLICY IF EXISTS "Users can add participants to conversations they create" ON public.conversation_participant;

-- Allow users to insert participants when:
-- 1. They are the creator of the conversation, OR
-- 2. They are adding themselves as a participant
CREATE POLICY "Users can add participants to conversations"
    ON public.conversation_participant FOR INSERT
    WITH CHECK (
        -- User is the creator of the conversation
        EXISTS (
            SELECT 1 FROM public.conversation c
            WHERE c.id = conversation_id
            AND c.created_by = auth.uid()
        )
        OR
        -- User is adding themselves as a participant
        player_id = auth.uid()
    );

-- Also add UPDATE policy for conversation_participant (e.g., marking as read, leaving)
DROP POLICY IF EXISTS "Users can update own participation" ON public.conversation_participant;
CREATE POLICY "Users can update own participation"
    ON public.conversation_participant FOR UPDATE
    USING (player_id = auth.uid())
    WITH CHECK (player_id = auth.uid());

-- Add DELETE policy so users can leave conversations
DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_participant;
CREATE POLICY "Users can leave conversations"
    ON public.conversation_participant FOR DELETE
    USING (player_id = auth.uid());

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Added conversation_participant INSERT, UPDATE, DELETE policies';
END $$;
