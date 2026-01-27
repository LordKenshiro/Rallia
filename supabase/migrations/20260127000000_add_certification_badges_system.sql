-- Migration: Add Certification Badges System
-- Description: Adds support for certification badges with color-coded status,
--              auto-certification triggers, and peer evaluation tracking.
-- Created: 2026-01-27

-- ============================================================================
-- 1. CREATE badge_status ENUM
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'badge_status_enum') THEN
        CREATE TYPE badge_status_enum AS ENUM (
            'self_declared',     -- Yellow badge: user declared, not certified
            'certified',         -- Green badge: certified via proofs or references
            'disputed'           -- Red badge: certified but evaluations suggest lower level
        );
    END IF;
END $$;

-- ============================================================================
-- 2. ADD COLUMNS TO player_rating_score
-- ============================================================================

-- Add badge_status column
ALTER TABLE player_rating_score 
ADD COLUMN IF NOT EXISTS badge_status badge_status_enum NOT NULL DEFAULT 'self_declared';

-- Add approved proofs count (denormalized for performance)
ALTER TABLE player_rating_score 
ADD COLUMN IF NOT EXISTS approved_proofs_count INTEGER NOT NULL DEFAULT 0;

-- Add peer evaluation average (from last 5 non-extreme evaluations)
ALTER TABLE player_rating_score 
ADD COLUMN IF NOT EXISTS peer_evaluation_average NUMERIC(4,2);

-- Add peer evaluation count (how many evaluations in the average)
ALTER TABLE player_rating_score 
ADD COLUMN IF NOT EXISTS peer_evaluation_count INTEGER NOT NULL DEFAULT 0;

-- Add original rating score id (to track level changes)
ALTER TABLE player_rating_score 
ADD COLUMN IF NOT EXISTS previous_rating_score_id UUID REFERENCES rating_score(id) ON DELETE SET NULL;

-- Add level change timestamp
ALTER TABLE player_rating_score 
ADD COLUMN IF NOT EXISTS level_changed_at TIMESTAMPTZ;

-- ============================================================================
-- 3. ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN player_rating_score.badge_status IS 
'Badge color: self_declared (yellow), certified (green), disputed (red - evaluations suggest lower)';

COMMENT ON COLUMN player_rating_score.approved_proofs_count IS 
'Denormalized count of approved proofs for this rating (for auto-certification: >=2 = certified)';

COMMENT ON COLUMN player_rating_score.peer_evaluation_average IS 
'Average of last 5 peer evaluations (excluding extreme values ±1.0 from current level)';

COMMENT ON COLUMN player_rating_score.peer_evaluation_count IS 
'Number of evaluations included in peer_evaluation_average';

COMMENT ON COLUMN player_rating_score.previous_rating_score_id IS 
'Previous rating score before level change (to track certification history)';

COMMENT ON COLUMN player_rating_score.level_changed_at IS 
'Timestamp of last level change';

-- ============================================================================
-- 4. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_player_rating_score_badge_status 
ON player_rating_score(badge_status);

CREATE INDEX IF NOT EXISTS idx_player_rating_score_certified 
ON player_rating_score(is_certified, badge_status);

-- ============================================================================
-- 5. FUNCTION: Update approved proofs count
-- ============================================================================

CREATE OR REPLACE FUNCTION update_approved_proofs_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the count on the player_rating_score
    UPDATE player_rating_score
    SET approved_proofs_count = (
        SELECT COUNT(*)
        FROM rating_proof
        WHERE player_rating_score_id = COALESCE(NEW.player_rating_score_id, OLD.player_rating_score_id)
        AND status = 'approved'
        AND is_active = true
    )
    WHERE id = COALESCE(NEW.player_rating_score_id, OLD.player_rating_score_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. TRIGGER: Auto-update proofs count on rating_proof changes
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_approved_proofs_count ON rating_proof;
CREATE TRIGGER trigger_update_approved_proofs_count
AFTER INSERT OR UPDATE OR DELETE ON rating_proof
FOR EACH ROW
EXECUTE FUNCTION update_approved_proofs_count();

-- ============================================================================
-- 7. FUNCTION: Check and update certification status
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_update_certification()
RETURNS TRIGGER AS $$
DECLARE
    v_referrals_count INTEGER;
    v_approved_proofs_count INTEGER;
    v_should_certify BOOLEAN := false;
    v_rating_value NUMERIC;
    v_sport_name TEXT;
    v_min_for_referral NUMERIC;
BEGIN
    -- Get current counts
    v_referrals_count := NEW.referrals_count;
    v_approved_proofs_count := NEW.approved_proofs_count;
    
    -- Get rating value and sport info
    SELECT rs.value, s.name, rsys.min_for_referral
    INTO v_rating_value, v_sport_name, v_min_for_referral
    FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    JOIN sport s ON rsys.sport_id = s.id
    WHERE rs.id = NEW.rating_score_id;
    
    -- Check certification conditions:
    -- 1. At least 2 approved proofs
    -- 2. At least 3 references from certified players at same/higher level
    IF v_approved_proofs_count >= 2 THEN
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
        IF v_approved_proofs_count >= 2 THEN
            NEW.certified_via := 'proof';
        ELSE
            NEW.certified_via := 'referral';
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
-- 8. TRIGGER: Auto-check certification on player_rating_score updates
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_check_certification ON player_rating_score;
CREATE TRIGGER trigger_check_certification
BEFORE UPDATE ON player_rating_score
FOR EACH ROW
WHEN (
    OLD.referrals_count IS DISTINCT FROM NEW.referrals_count OR
    OLD.approved_proofs_count IS DISTINCT FROM NEW.approved_proofs_count OR
    OLD.peer_evaluation_average IS DISTINCT FROM NEW.peer_evaluation_average
)
EXECUTE FUNCTION check_and_update_certification();

-- ============================================================================
-- 9. FUNCTION: Update referrals count when reference request is completed
-- ============================================================================

CREATE OR REPLACE FUNCTION update_referrals_count_on_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when status changes to 'accepted' and rating_supported is true
    IF NEW.status = 'accepted' AND NEW.rating_supported = true THEN
        UPDATE player_rating_score
        SET referrals_count = referrals_count + 1
        WHERE id = NEW.player_rating_score_id;
    END IF;
    
    -- Handle case where reference was accepted but now declined/expired
    IF OLD.status = 'accepted' AND OLD.rating_supported = true 
       AND (NEW.status != 'accepted' OR NEW.rating_supported = false) THEN
        UPDATE player_rating_score
        SET referrals_count = GREATEST(0, referrals_count - 1)
        WHERE id = NEW.player_rating_score_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. TRIGGER: Update referrals count on rating_reference_request changes
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_referrals_count ON rating_reference_request;
CREATE TRIGGER trigger_update_referrals_count
AFTER UPDATE ON rating_reference_request
FOR EACH ROW
EXECUTE FUNCTION update_referrals_count_on_reference();

-- ============================================================================
-- 11. INITIALIZE EXISTING DATA
-- ============================================================================

-- Update approved_proofs_count for existing records
UPDATE player_rating_score prs
SET approved_proofs_count = (
    SELECT COUNT(*)
    FROM rating_proof rp
    WHERE rp.player_rating_score_id = prs.id
    AND rp.status = 'approved'
    AND rp.is_active = true
);

-- Update badge_status based on is_certified
UPDATE player_rating_score
SET badge_status = CASE
    WHEN is_certified = true THEN 'certified'::badge_status_enum
    ELSE 'self_declared'::badge_status_enum
END;

-- ============================================================================
-- 12. ADD min_for_referral TO rating_system IF NOT EXISTS
-- ============================================================================

-- Tennis (NTRP): 3.0 minimum for referrals
UPDATE rating_system
SET min_for_referral = 3.0
WHERE code = 'ntrp' AND min_for_referral IS NULL;

-- Pickleball (DUPR): 3.5 minimum for referrals
UPDATE rating_system
SET min_for_referral = 3.5
WHERE code = 'dupr' AND min_for_referral IS NULL;

-- ============================================================================
-- 13. RLS POLICIES (if not already existing)
-- ============================================================================

-- Players can view all badge statuses (public info for finding certified players)
-- No changes needed as player_rating_score already has appropriate RLS
