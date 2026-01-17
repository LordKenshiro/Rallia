-- Migration: Enhanced Chat Features
-- Description: Adds support for typing indicators, online status, message replies,
--              edit/delete, pinning, archiving, and search functionality

-- =============================================================================
-- 1. ONLINE STATUS - Add last_seen_at to player for online/offline detection
-- =============================================================================
ALTER TABLE public.player 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Index for efficient online status queries
CREATE INDEX IF NOT EXISTS idx_player_last_seen_at ON public.player(last_seen_at);

-- Function to update last_seen_at (call this on any user activity)
CREATE OR REPLACE FUNCTION update_player_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.player 
  SET last_seen_at = NOW() 
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 2. MESSAGE ENHANCEMENTS - Reply, Edit, Delete support
-- =============================================================================

-- Add reply support
ALTER TABLE public.message 
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES public.message(id) ON DELETE SET NULL;

-- Add edit tracking
ALTER TABLE public.message 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

ALTER TABLE public.message 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add soft delete (message shows as "This message was deleted")
ALTER TABLE public.message 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for reply lookups
CREATE INDEX IF NOT EXISTS idx_message_reply_to ON public.message(reply_to_message_id);

-- =============================================================================
-- 3. CONVERSATION PARTICIPANT ENHANCEMENTS - Pin, Archive
-- =============================================================================

-- Add pinning support
ALTER TABLE public.conversation_participant 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

ALTER TABLE public.conversation_participant 
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- Add archive support
ALTER TABLE public.conversation_participant 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

ALTER TABLE public.conversation_participant 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Indexes for filtered queries
CREATE INDEX IF NOT EXISTS idx_conversation_participant_pinned 
ON public.conversation_participant(player_id, is_pinned) WHERE is_pinned = TRUE;

CREATE INDEX IF NOT EXISTS idx_conversation_participant_archived 
ON public.conversation_participant(player_id, is_archived) WHERE is_archived = TRUE;

-- =============================================================================
-- 4. TYPING INDICATOR - Using Supabase Realtime Presence (no table needed)
-- Typing indicators will use Supabase Realtime Presence feature
-- No database changes required - handled entirely in client code
-- =============================================================================

-- =============================================================================
-- 5. SEARCH SUPPORT - Full-text search on messages
-- =============================================================================

-- Add full-text search column to message
ALTER TABLE public.message 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast text search
CREATE INDEX IF NOT EXISTS idx_message_search ON public.message USING GIN(search_vector);

-- Function to update search vector on message insert/update
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search vector
DROP TRIGGER IF EXISTS trigger_update_message_search_vector ON public.message;
CREATE TRIGGER trigger_update_message_search_vector
BEFORE INSERT OR UPDATE OF content ON public.message
FOR EACH ROW
EXECUTE FUNCTION update_message_search_vector();

-- Backfill existing messages with search vectors
UPDATE public.message 
SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL;

-- =============================================================================
-- 6. HELPER FUNCTIONS
-- =============================================================================

-- Function to check if a player is online (seen within last 5 minutes)
CREATE OR REPLACE FUNCTION is_player_online(player_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.player 
    WHERE id = player_uuid 
    AND last_seen_at > NOW() - INTERVAL '5 minutes'
  );
$$ LANGUAGE sql STABLE;

-- Function to get player online status with last seen time
CREATE OR REPLACE FUNCTION get_player_online_status(player_uuid UUID)
RETURNS TABLE(is_online BOOLEAN, last_seen_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.last_seen_at > NOW() - INTERVAL '5 minutes' AS is_online,
    p.last_seen_at
  FROM public.player p
  WHERE p.id = player_uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to search messages in a conversation
CREATE OR REPLACE FUNCTION search_conversation_messages(
  p_conversation_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.created_at,
    ts_rank(m.search_vector, plainto_tsquery('english', p_query)) AS rank
  FROM public.message m
  WHERE m.conversation_id = p_conversation_id
    AND m.deleted_at IS NULL
    AND m.search_vector @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- 7. RLS POLICIES FOR NEW COLUMNS
-- =============================================================================

-- Allow users to update their own last_seen_at
DROP POLICY IF EXISTS "Users can update own last_seen" ON public.player;
CREATE POLICY "Users can update own last_seen"
ON public.player FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow users to update their own messages (for editing)
DROP POLICY IF EXISTS "Users can update own messages" ON public.message;
CREATE POLICY "Users can update own messages"
ON public.message FOR UPDATE
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- =============================================================================
-- 8. GRANT PERMISSIONS
-- =============================================================================
GRANT EXECUTE ON FUNCTION is_player_online(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_player_online_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_conversation_messages(UUID, TEXT, INTEGER) TO authenticated;

-- =============================================================================
-- COMPLETION
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Enhanced chat features migration completed successfully';
END $$;
