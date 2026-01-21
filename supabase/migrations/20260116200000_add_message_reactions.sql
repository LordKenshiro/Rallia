-- Migration: Add message reactions support
-- This allows users to react to messages with emojis (like WhatsApp)

-- =============================================================================
-- MESSAGE REACTIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.message_reaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.message(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.player(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- One reaction per emoji per user per message
    CONSTRAINT message_reaction_unique UNIQUE (message_id, player_id, emoji)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_message_reaction_message_id ON public.message_reaction(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reaction_player_id ON public.message_reaction(player_id);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================
ALTER TABLE public.message_reaction ENABLE ROW LEVEL SECURITY;

-- Anyone in the conversation can see reactions
CREATE POLICY "Users can view reactions in their conversations"
ON public.message_reaction FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.message m
        JOIN public.conversation_participant cp ON cp.conversation_id = m.conversation_id
        WHERE m.id = message_reaction.message_id
        AND cp.player_id = auth.uid()
    )
);

-- Users can add reactions to messages in their conversations
CREATE POLICY "Users can add reactions to messages in their conversations"
ON public.message_reaction FOR INSERT
WITH CHECK (
    player_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.message m
        JOIN public.conversation_participant cp ON cp.conversation_id = m.conversation_id
        WHERE m.id = message_reaction.message_id
        AND cp.player_id = auth.uid()
    )
);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
ON public.message_reaction FOR DELETE
USING (player_id = auth.uid());

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================
GRANT SELECT, INSERT, DELETE ON public.message_reaction TO authenticated;

-- =============================================================================
-- ADD COMMENT
-- =============================================================================
COMMENT ON TABLE public.message_reaction IS 'Stores emoji reactions to messages, similar to WhatsApp reactions';
