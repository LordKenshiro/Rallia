-- Migration: Add chat agreement tracking
-- Description: Tracks whether a user has agreed to chat rules

-- Add chat_rules_agreed column to player table
ALTER TABLE public.player
ADD COLUMN IF NOT EXISTS chat_rules_agreed_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.player.chat_rules_agreed_at IS 'Timestamp when user agreed to chat community guidelines';
