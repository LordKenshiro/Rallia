-- Fix infinite recursion in match/match_participant RLS policies (v2)
-- The solution: Use SECURITY DEFINER functions to bypass RLS during policy checks

-- ============================================
-- CREATE HELPER FUNCTIONS (SECURITY DEFINER)
-- These bypass RLS to avoid circular dependencies
-- ============================================

-- Function to check if user is a participant in a match
CREATE OR REPLACE FUNCTION is_match_participant(p_match_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM match_participant
        WHERE match_id = p_match_id AND player_id = p_player_id
    );
$$;

-- Function to check if user is the match creator
CREATE OR REPLACE FUNCTION is_match_creator(p_match_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM match
        WHERE id = p_match_id AND created_by = p_player_id
    );
$$;

-- Function to get match IDs created by a user
CREATE OR REPLACE FUNCTION get_user_created_match_ids(p_player_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT id FROM match WHERE created_by = p_player_id;
$$;

-- Function to get match IDs where user is a participant
CREATE OR REPLACE FUNCTION get_user_participating_match_ids(p_player_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT match_id FROM match_participant WHERE player_id = p_player_id;
$$;

-- ============================================
-- DROP ALL EXISTING MATCH POLICIES
-- ============================================

DROP POLICY IF EXISTS "Players can view matches they're part of" ON match;
DROP POLICY IF EXISTS "Match creators can view their matches" ON match;
DROP POLICY IF EXISTS "Participants can view their matches" ON match;
DROP POLICY IF EXISTS "Public matches are visible to all" ON match;
DROP POLICY IF EXISTS "Players can create matches" ON match;
DROP POLICY IF EXISTS "Match creators can update their matches" ON match;

-- ============================================
-- DROP ALL EXISTING MATCH_PARTICIPANT POLICIES
-- ============================================

DROP POLICY IF EXISTS "Players can view match participants" ON match_participant;
DROP POLICY IF EXISTS "Match creators can view their match participants" ON match_participant;
DROP POLICY IF EXISTS "Match creators can add participants" ON match_participant;

-- ============================================
-- RECREATE MATCH POLICIES (using helper functions)
-- ============================================

-- Creators can view their own matches (direct check, no recursion)
CREATE POLICY "match_select_creator"
ON match FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Participants can view matches (uses SECURITY DEFINER function)
CREATE POLICY "match_select_participant"
ON match FOR SELECT
TO authenticated
USING (is_match_participant(id, auth.uid()));

-- Public matches visible to all
CREATE POLICY "match_select_public"
ON match FOR SELECT
TO authenticated
USING (visibility = 'public');

-- Anyone can create a match (as long as they're the creator)
CREATE POLICY "match_insert"
ON match FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Creators can update their matches
CREATE POLICY "match_update_creator"
ON match FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Creators can delete their matches
CREATE POLICY "match_delete_creator"
ON match FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- ============================================
-- RECREATE MATCH_PARTICIPANT POLICIES (using helper functions)
-- ============================================

-- Players can view their own participation
CREATE POLICY "match_participant_select_self"
ON match_participant FOR SELECT
TO authenticated
USING (player_id = auth.uid());

-- Match creators can view all participants (uses SECURITY DEFINER function)
CREATE POLICY "match_participant_select_creator"
ON match_participant FOR SELECT
TO authenticated
USING (is_match_creator(match_id, auth.uid()));

-- Co-participants can view each other (uses SECURITY DEFINER function)
CREATE POLICY "match_participant_select_coparticipant"
ON match_participant FOR SELECT
TO authenticated
USING (is_match_participant(match_id, auth.uid()));

-- Match creators can add participants
CREATE POLICY "match_participant_insert_creator"
ON match_participant FOR INSERT
TO authenticated
WITH CHECK (is_match_creator(match_id, auth.uid()) OR player_id = auth.uid());

-- Match creators can update participants
CREATE POLICY "match_participant_update_creator"
ON match_participant FOR UPDATE
TO authenticated
USING (is_match_creator(match_id, auth.uid()));

-- Match creators can remove participants
CREATE POLICY "match_participant_delete_creator"
ON match_participant FOR DELETE
TO authenticated
USING (is_match_creator(match_id, auth.uid()));

-- Players can remove themselves from a match
CREATE POLICY "match_participant_delete_self"
ON match_participant FOR DELETE
TO authenticated
USING (player_id = auth.uid());

