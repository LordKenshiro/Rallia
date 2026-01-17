-- Migration: Fix Enhanced Chat Features
-- Description: Fixes the helper functions that failed in the previous migration

-- =============================================================================
-- 6. HELPER FUNCTIONS (FIX)
-- =============================================================================

-- Drop existing functions if they exist (to recreate properly)
DROP FUNCTION IF EXISTS is_player_online(UUID);
DROP FUNCTION IF EXISTS get_player_online_status(UUID);
DROP FUNCTION IF EXISTS search_conversation_messages(UUID, TEXT, INTEGER);

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
RETURNS TABLE(is_online BOOLEAN, last_seen TIMESTAMPTZ) AS $$
  SELECT 
    p.last_seen_at > NOW() - INTERVAL '5 minutes' AS is_online,
    p.last_seen_at AS last_seen
  FROM public.player p
  WHERE p.id = player_uuid;
$$ LANGUAGE sql STABLE;

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
$$ LANGUAGE sql STABLE;

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
  RAISE NOTICE 'Enhanced chat features fix migration completed successfully';
END $$;
