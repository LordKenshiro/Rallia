-- Debug and Fix Script for rating_proof.rating_score_id
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- ============================================================================
-- STEP 1: Check if any proofs have NULL rating_score_id
-- ============================================================================

SELECT 
    rp.id as proof_id,
    rp.title,
    rp.rating_score_id as proof_rating_score_id,
    rp.player_rating_score_id,
    prs.rating_score_id as current_player_rating_score_id,
    rs.rating_value,
    rp.is_active,
    rp.created_at
FROM rating_proof rp
JOIN player_rating_score prs ON rp.player_rating_score_id = prs.id
LEFT JOIN rating_score rs ON prs.rating_score_id = rs.id
ORDER BY rp.created_at DESC
LIMIT 20;

-- ============================================================================
-- STEP 2: Count proofs with NULL vs non-NULL rating_score_id
-- ============================================================================

SELECT 
    CASE WHEN rating_score_id IS NULL THEN 'NULL' ELSE 'SET' END as status,
    COUNT(*) as count
FROM rating_proof
GROUP BY CASE WHEN rating_score_id IS NULL THEN 'NULL' ELSE 'SET' END;

-- ============================================================================
-- STEP 3: FIX - Update proofs that have NULL rating_score_id
-- This sets them to the CURRENT rating_score_id of the player_rating_score
-- ============================================================================

UPDATE rating_proof rp
SET rating_score_id = prs.rating_score_id
FROM player_rating_score prs
WHERE rp.player_rating_score_id = prs.id
AND rp.rating_score_id IS NULL;

-- ============================================================================
-- STEP 4: Verify the fix - should show all proofs now have rating_score_id
-- ============================================================================

SELECT 
    CASE WHEN rating_score_id IS NULL THEN 'NULL' ELSE 'SET' END as status,
    COUNT(*) as count
FROM rating_proof
GROUP BY CASE WHEN rating_score_id IS NULL THEN 'NULL' ELSE 'SET' END;
