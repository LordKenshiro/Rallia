-- Migration: Add rating_score_id to rating_proof for level-specific proof tracking
-- Description: Adds a rating_score_id column to rating_proof to track which specific
--              rating level a proof was uploaded for. This enables:
--              1. Total proofs count (all proofs for a player's sport)
--              2. Current-level proofs count (proofs for current rating level only)
--              Certification should only consider current-level proofs.
-- Created: 2026-01-27

-- ============================================================================
-- 1. ADD COLUMN: rating_score_id to rating_proof
-- ============================================================================

-- Add the rating_score_id column (nullable initially for backfill)
ALTER TABLE rating_proof 
ADD COLUMN IF NOT EXISTS rating_score_id UUID REFERENCES rating_score(id) ON DELETE SET NULL;

-- Add comment explaining the column
COMMENT ON COLUMN rating_proof.rating_score_id IS 
'The specific rating level this proof was uploaded for. Used to track current-level vs total proofs.';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_rating_proof_rating_score_id 
ON rating_proof(rating_score_id);

-- ============================================================================
-- 2. BACKFILL: Populate rating_score_id from player_rating_score
-- ============================================================================

-- For existing proofs, set rating_score_id to the current rating_score_id
-- of the associated player_rating_score
UPDATE rating_proof rp
SET rating_score_id = prs.rating_score_id
FROM player_rating_score prs
WHERE rp.player_rating_score_id = prs.id
AND rp.rating_score_id IS NULL;

-- ============================================================================
-- 3. TRIGGER: Auto-set rating_score_id on new proof insert
-- ============================================================================

CREATE OR REPLACE FUNCTION set_rating_score_id_on_proof_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- If rating_score_id is not provided, get it from the player_rating_score
    IF NEW.rating_score_id IS NULL THEN
        SELECT rating_score_id INTO NEW.rating_score_id
        FROM player_rating_score
        WHERE id = NEW.player_rating_score_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_rating_score_id_on_proof ON rating_proof;
CREATE TRIGGER trigger_set_rating_score_id_on_proof
BEFORE INSERT ON rating_proof
FOR EACH ROW
EXECUTE FUNCTION set_rating_score_id_on_proof_insert();

-- ============================================================================
-- 4. FUNCTION: Count current-level proofs for certification
-- ============================================================================

CREATE OR REPLACE FUNCTION count_current_level_proofs(p_player_rating_score_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
    v_current_rating_score_id UUID;
BEGIN
    -- Get the current rating_score_id for the player
    SELECT rating_score_id INTO v_current_rating_score_id
    FROM player_rating_score
    WHERE id = p_player_rating_score_id;
    
    -- Count proofs that match the current rating level
    SELECT COUNT(*) INTO v_count
    FROM rating_proof
    WHERE player_rating_score_id = p_player_rating_score_id
    AND rating_score_id = v_current_rating_score_id
    AND is_active = true;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. UPDATE: Modify certification check to use current-level proofs only
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_update_certification()
RETURNS TRIGGER AS $$
DECLARE
    v_referrals_count INTEGER;
    v_current_level_proofs_count INTEGER;
    v_should_certify BOOLEAN := false;
    v_rating_value NUMERIC;
    v_sport_name TEXT;
    v_min_for_referral NUMERIC;
BEGIN
    -- Get current referrals count
    v_referrals_count := NEW.referrals_count;
    
    -- Get current-level proofs count (proofs that match current rating_score_id)
    SELECT COUNT(*) INTO v_current_level_proofs_count
    FROM rating_proof
    WHERE player_rating_score_id = NEW.id
    AND rating_score_id = NEW.rating_score_id
    AND is_active = true;
    
    -- Get rating value and sport info
    SELECT rs.value, s.name, rsys.min_for_referral
    INTO v_rating_value, v_sport_name, v_min_for_referral
    FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    JOIN sport s ON rsys.sport_id = s.id
    WHERE rs.id = NEW.rating_score_id;
    
    -- Check certification conditions:
    -- 1. At least 2 current-level proofs
    -- 2. At least 3 references from certified players at same/higher level
    IF v_current_level_proofs_count >= 2 THEN
        v_should_certify := true;
    ELSIF v_referrals_count >= 3 THEN
        v_should_certify := true;
    END IF;
    
    -- Update certification status
    IF v_should_certify AND NOT NEW.is_certified THEN
        NEW.is_certified := true;
        NEW.certified_at := NOW();
        NEW.badge_status := 'certified';
        
        -- Determine certification method
        IF v_current_level_proofs_count >= 2 THEN
            NEW.certified_via := 'proof';
        ELSE
            NEW.certified_via := 'referral';
        END IF;
    ELSIF NOT v_should_certify AND NEW.is_certified THEN
        -- If user changed rating and no longer meets criteria, reset to self_declared
        -- (only if the rating_score_id changed)
        IF OLD.rating_score_id IS DISTINCT FROM NEW.rating_score_id THEN
            NEW.is_certified := false;
            NEW.certified_at := NULL;
            NEW.badge_status := 'self_declared';
            NEW.certified_via := NULL;
        END IF;
    END IF;
    
    -- Check for disputed status (if certified but evaluation average is significantly lower)
    IF NEW.is_certified AND NEW.peer_evaluation_average IS NOT NULL THEN
        -- Get current rating value
        SELECT value INTO v_rating_value
        FROM rating_score WHERE id = NEW.rating_score_id;
        
        -- If evaluation average is 0.5+ lower, mark as disputed
        IF v_rating_value - NEW.peer_evaluation_average >= 0.5 THEN
            NEW.badge_status := 'disputed';
        ELSIF NEW.badge_status = 'disputed' THEN
            -- If no longer disputed, restore to certified
            NEW.badge_status := 'certified';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. RPC: Get proof counts (both total and current-level)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_proof_counts(p_player_rating_score_id UUID)
RETURNS TABLE (
    total_proofs_count INTEGER,
    current_level_proofs_count INTEGER
) AS $$
DECLARE
    v_current_rating_score_id UUID;
BEGIN
    -- Get the current rating_score_id
    SELECT rating_score_id INTO v_current_rating_score_id
    FROM player_rating_score
    WHERE id = p_player_rating_score_id;
    
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER AS total_proofs_count,
        COUNT(*) FILTER (WHERE rp.rating_score_id = v_current_rating_score_id)::INTEGER AS current_level_proofs_count
    FROM rating_proof rp
    WHERE rp.player_rating_score_id = p_player_rating_score_id
    AND rp.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_proof_counts(UUID) TO authenticated;
