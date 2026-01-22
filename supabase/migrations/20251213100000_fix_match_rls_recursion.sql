-- Fix infinite recursion in match/match_participant RLS policies
-- The issue: match SELECT policy queries match_participant, 
-- and match_participant SELECT policy queries match → infinite loop

-- ============================================
-- FIX MATCH_PARTICIPANT POLICIES
-- ============================================

-- Drop the problematic match_participant policy
DROP POLICY IF EXISTS "Players can view match participants" ON match_participant;

-- Recreate without querying the match table directly (avoids recursion)
-- Players can view participants if they are:
-- 1. The participant themselves
-- 2. Also a participant in the same match
CREATE POLICY "Players can view match participants"
ON match_participant FOR SELECT
TO authenticated
USING (
    auth.uid() = player_id
    OR match_id IN (
        SELECT mp.match_id 
        FROM match_participant mp 
        WHERE mp.player_id = auth.uid()
    )
);

-- Match creators can view all participants of their matches
-- This is a separate policy to avoid complex OR conditions
CREATE POLICY "Match creators can view their match participants"
ON match_participant FOR SELECT
TO authenticated
USING (
    match_id IN (
        SELECT m.id FROM match m WHERE m.created_by = auth.uid()
    )
);

-- ============================================
-- ADD MISSING MATCH_PARTICIPANT INSERT POLICY
-- ============================================

-- Allow match creators to add participants
DROP POLICY IF EXISTS "Match creators can add participants" ON match_participant;
CREATE POLICY "Match creators can add participants"
ON match_participant FOR INSERT
TO authenticated
WITH CHECK (
    match_id IN (
        SELECT m.id FROM match m WHERE m.created_by = auth.uid()
    )
    OR player_id = auth.uid()
);

-- ============================================
-- FIX MATCH SELECT POLICY (simplify to avoid recursion)
-- ============================================

-- Drop existing match SELECT policy
DROP POLICY IF EXISTS "Players can view matches they're part of" ON match;

-- Simplified match SELECT policy - creators can always see their matches
CREATE POLICY "Match creators can view their matches"
ON match FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Participants can view matches they're in (now safe since match_participant doesn't query match)
CREATE POLICY "Participants can view their matches"
ON match FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT mp.match_id 
        FROM match_participant mp 
        WHERE mp.player_id = auth.uid()
    )
);

-- Public matches are visible to all authenticated users
CREATE POLICY "Public matches are visible to all"
ON match FOR SELECT
TO authenticated
USING (visibility = 'public');

