-- Migration: Fix reputation_event RLS for insert+select pattern
-- Description: When using .insert().select() in Supabase, both INSERT and SELECT
--              policies must pass. The previous SELECT policy blocked all reads,
--              causing the insert to fail even though the INSERT policy allowed it.

-- =============================================================================
-- Fix SELECT policy to allow reading newly inserted rows
-- =============================================================================

DROP POLICY IF EXISTS "reputation_event_select_none" ON reputation_event;
DROP POLICY IF EXISTS "reputation_event_insert_authenticated" ON reputation_event;

-- Allow users to read events they created (for insert+select pattern)
-- This is needed because Supabase's .insert().select() requires SELECT access
-- to the newly inserted row
DROP POLICY IF EXISTS "reputation_event_select_own_inserts" ON reputation_event;
CREATE POLICY "reputation_event_select_own_inserts" ON reputation_event
    FOR SELECT
    TO authenticated
    USING (
        -- Players can see events affecting themselves
        player_id = auth.uid()
        OR
        -- Players can see events they caused (e.g., review given)
        caused_by_player_id = auth.uid()
    );

-- Allow authenticated users to insert events
DROP POLICY IF EXISTS "reputation_event_insert" ON reputation_event;
CREATE POLICY "reputation_event_insert" ON reputation_event
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
