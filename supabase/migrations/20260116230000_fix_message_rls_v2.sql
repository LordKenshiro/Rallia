-- Migration: Fix message RLS with simplified policy
-- Description: Simplifies the message insert policy to fix RLS issues

-- First, let's drop all message policies and recreate them
DROP POLICY IF EXISTS "Participants can view conversation messages" ON public.message;
DROP POLICY IF EXISTS "Participants can send messages" ON public.message;
DROP POLICY IF EXISTS "Senders can update own messages" ON public.message;
DROP POLICY IF EXISTS "Senders can delete own messages" ON public.message;

-- Make sure RLS is enabled
ALTER TABLE public.message ENABLE ROW LEVEL SECURITY;

-- SELECT: Participants can view messages in their conversations
CREATE POLICY "message_select_policy"
    ON public.message FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participant
            WHERE conversation_participant.conversation_id = message.conversation_id
            AND conversation_participant.player_id = auth.uid()
        )
    );

-- INSERT: Users can insert messages to conversations they participate in
-- Using a simpler approach with explicit table reference
CREATE POLICY "message_insert_policy"
    ON public.message FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND conversation_id IN (
            SELECT cp.conversation_id 
            FROM public.conversation_participant cp 
            WHERE cp.player_id = auth.uid()
        )
    );

-- UPDATE: Senders can update their own messages
CREATE POLICY "message_update_policy"
    ON public.message FOR UPDATE
    USING (sender_id = auth.uid());

-- DELETE: Senders can delete their own messages
CREATE POLICY "message_delete_policy"
    ON public.message FOR DELETE
    USING (sender_id = auth.uid());

-- Also verify conversation_participant table has proper RLS
DROP POLICY IF EXISTS "conversation_participant_select" ON public.conversation_participant;
DROP POLICY IF EXISTS "Users can view their conversation participations" ON public.conversation_participant;

CREATE POLICY "conversation_participant_select"
    ON public.conversation_participant FOR SELECT
    USING (player_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.conversation_participant cp2
        WHERE cp2.conversation_id = conversation_participant.conversation_id
        AND cp2.player_id = auth.uid()
    ));

-- Allow system (triggers) to insert conversation participants
DROP POLICY IF EXISTS "conversation_participant_insert" ON public.conversation_participant;
CREATE POLICY "conversation_participant_insert"
    ON public.conversation_participant FOR INSERT
    WITH CHECK (true); -- Triggers use SECURITY DEFINER

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Message RLS policies simplified and recreated';
END $$;
