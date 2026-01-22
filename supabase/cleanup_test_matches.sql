-- =============================================================================
-- CLEANUP TEST MATCHES
-- Run this to remove test data after testing
-- =============================================================================

-- First, show what will be deleted
SELECT id, notes FROM match WHERE notes LIKE 'TEST:%';

-- Delete feedback for test matches
DELETE FROM match_feedback 
WHERE match_id IN (SELECT id FROM match WHERE notes LIKE 'TEST:%');

-- Delete reputation events for test matches
DELETE FROM reputation_event 
WHERE match_id IN (SELECT id FROM match WHERE notes LIKE 'TEST:%');

-- Delete participants for test matches (cascade won't help here due to ON DELETE CASCADE on match)
DELETE FROM match_participant 
WHERE match_id IN (SELECT id FROM match WHERE notes LIKE 'TEST:%');

-- Delete the test matches
DELETE FROM match WHERE notes LIKE 'TEST:%';

-- Verify cleanup
SELECT COUNT(*) as remaining_test_matches FROM match WHERE notes LIKE 'TEST:%';
