-- Migration: Add Reference Verification System
-- Description: Adds support for reference-based rating verification where new users
--              can request certified players to validate their self-reported ratings.
--              When enough references are collected, an average is calculated to create
--              a reference_verified rating entry.
-- Created: 2024-12-05

-- ============================================================================
-- 0. ENABLE REQUIRED EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. EXTEND rating_source_type ENUM
-- ============================================================================
-- Add 'reference_verified' as a new source type
-- This represents ratings validated through reference requests from certified players

DO $$ 
BEGIN
    -- Check if the value already exists before adding
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'reference_verified' 
        AND enumtypid = 'rating_source_type'::regtype
    ) THEN
        ALTER TYPE rating_source_type ADD VALUE 'reference_verified';
    END IF;
END $$;

-- ============================================================================
-- 2. CREATE reference_request TABLE
-- ============================================================================
-- Stores reference requests where users ask certified players to validate their rating

CREATE TABLE IF NOT EXISTS reference_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- The user requesting the reference (new user with self_reported rating)
    requester_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
    
    -- The certified player providing the reference
    referee_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
    
    -- Sport for which the reference is requested
    sport_id UUID NOT NULL REFERENCES sport(id) ON DELETE CASCADE,
    
    -- The rating score the requester claims to have
    claimed_rating_score_id UUID NOT NULL REFERENCES rating_score(id) ON DELETE CASCADE,
    
    -- Status of the request
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'expired')),
    
    -- The rating value the referee provides (after accepting)
    reference_rating_value NUMERIC(4, 2),
    
    -- The rating score ID the referee assigns (might differ from claimed)
    reference_rating_score_id UUID REFERENCES rating_score(id) ON DELETE SET NULL,
    
    -- Optional comment from referee
    referee_comment TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'), -- Requests expire after 30 days
    responded_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT no_self_reference CHECK (requester_id != referee_id),
    CONSTRAINT reference_value_range CHECK (reference_rating_value >= 1.0 AND reference_rating_value <= 7.0),
    
    -- Prevent duplicate active requests
    CONSTRAINT unique_active_reference_request 
        UNIQUE(requester_id, referee_id, sport_id, status)
);

-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================

-- Index for finding requests by reviewer (for notification queries)
CREATE INDEX IF NOT EXISTS idx_reference_request_referee 
    ON reference_request(referee_id, status, created_at DESC);

-- Index for finding requests by requester (for tracking sent requests)
CREATE INDEX IF NOT EXISTS idx_reference_request_requester 
    ON reference_request(requester_id, status, created_at DESC);

-- Index for finding requests by sport
CREATE INDEX IF NOT EXISTS idx_reference_request_sport 
    ON reference_request(sport_id, status);

-- Index for expired requests cleanup
CREATE INDEX IF NOT EXISTS idx_reference_request_expiry 
    ON reference_request(expires_at) 
    WHERE status = 'pending';

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE reference_request ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view requests they sent or received
CREATE POLICY reference_request_select_policy ON reference_request
    FOR SELECT
    USING (
        auth.uid() = requester_id OR 
        auth.uid() = referee_id
    );

-- Policy: Users can insert requests they send
CREATE POLICY reference_request_insert_policy ON reference_request
    FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

-- Policy: Referees can update requests they received (accept/decline/complete)
CREATE POLICY reference_request_update_policy ON reference_request
    FOR UPDATE
    USING (auth.uid() = referee_id)
    WITH CHECK (auth.uid() = referee_id);

-- Policy: Requesters can delete their pending requests
CREATE POLICY reference_request_delete_policy ON reference_request
    FOR DELETE
    USING (
        auth.uid() = requester_id AND 
        status = 'pending'
    );

-- ============================================================================
-- 5. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if reference verification threshold is met
-- When a user receives enough completed references (e.g., 3-5), calculate average
-- and create a reference_verified rating entry

CREATE OR REPLACE FUNCTION check_reference_verification_threshold()
RETURNS TRIGGER AS $$
DECLARE
    completed_references_count INTEGER;
    reference_average NUMERIC;
    verification_threshold INTEGER := 3; -- Minimum 3 references needed
    existing_reference_verified_rating UUID;
BEGIN
    -- Only proceed if status changed to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Count completed references for this requester/sport
        SELECT COUNT(*), AVG(reference_rating_value)
        INTO completed_references_count, reference_average
        FROM reference_request
        WHERE requester_id = NEW.requester_id
          AND sport_id = NEW.sport_id
          AND status = 'completed'
          AND reference_rating_value IS NOT NULL;
        
        -- If threshold is met, create or update reference_verified rating
        IF completed_references_count >= verification_threshold THEN
            
            -- Find the appropriate rating_score for the average value
            DECLARE
                target_rating_score_id UUID;
            BEGIN
                SELECT rs.id INTO target_rating_score_id
                FROM rating_score rs
                INNER JOIN rating r ON rs.rating_id = r.id
                WHERE r.sport_id = NEW.sport_id
                  AND rs.score_value <= reference_average
                ORDER BY rs.score_value DESC
                LIMIT 1;
                
                IF target_rating_score_id IS NOT NULL THEN
                    -- Check if reference_verified rating already exists
                    SELECT id INTO existing_reference_verified_rating
                    FROM player_rating_score
                    WHERE player_id = NEW.requester_id
                      AND rating_score_id = target_rating_score_id
                      AND source_type = 'reference_verified';
                    
                    IF existing_reference_verified_rating IS NULL THEN
                        -- Create new reference_verified rating
                        INSERT INTO player_rating_score (
                            player_id,
                            rating_score_id,
                            source_type,
                            verification_method,
                            is_verified,
                            is_primary,
                            peer_rating_count,
                            peer_rating_average
                        ) VALUES (
                            NEW.requester_id,
                            target_rating_score_id,
                            'reference_verified',
                            'reference_consensus',
                            TRUE,
                            TRUE, -- Make it primary
                            completed_references_count,
                            reference_average
                        );
                        
                        -- Update old self_reported rating to not be primary
                        UPDATE player_rating_score
                        SET is_primary = FALSE
                        WHERE player_id = NEW.requester_id
                          AND sport_id = (
                              SELECT r.sport_id 
                              FROM rating_score rs
                              INNER JOIN rating r ON rs.rating_id = r.id
                              WHERE rs.id = rating_score_id
                          )
                          AND source_type = 'self_reported'
                          AND is_primary = TRUE;
                    ELSE
                        -- Update existing reference_verified rating
                        UPDATE player_rating_score
                        SET peer_rating_count = completed_references_count,
                            peer_rating_average = reference_average,
                            updated_at = now()
                        WHERE id = existing_reference_verified_rating;
                    END IF;
                END IF;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check threshold after each reference completion
CREATE TRIGGER check_reference_threshold_trigger
    AFTER INSERT OR UPDATE ON reference_request
    FOR EACH ROW
    EXECUTE FUNCTION check_reference_verification_threshold();

-- ============================================================================
-- 6. CREATE FUNCTION TO AUTO-EXPIRE OLD REQUESTS
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_old_reference_requests()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE reference_request
    SET status = 'expired',
        updated_at = now()
    WHERE status = 'pending'
      AND expires_at < now();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- You can schedule this function to run periodically using pg_cron or call it via an edge function

-- ============================================================================
-- 7. ADD HELPFUL VIEWS (OPTIONAL)
-- ============================================================================

-- View: Summary of reference requests for each player
CREATE OR REPLACE VIEW player_reference_summary AS
SELECT 
    p.id as player_id,
    p.full_name,
    s.id as sport_id,
    s.name as sport_name,
    COUNT(*) FILTER (WHERE rr.status = 'pending') as pending_requests,
    COUNT(*) FILTER (WHERE rr.status = 'completed') as completed_references,
    AVG(rr.reference_rating_value) FILTER (WHERE rr.status = 'completed') as average_reference_rating,
    MAX(rr.completed_at) FILTER (WHERE rr.status = 'completed') as last_reference_date
FROM profile p
CROSS JOIN sport s
LEFT JOIN reference_request rr ON rr.requester_id = p.id AND rr.sport_id = s.id
GROUP BY p.id, p.full_name, s.id, s.name;

-- ============================================================================
-- 8. ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE reference_request IS 
'Stores reference requests where new users ask certified players to validate their self-reported ratings. When enough references are collected (threshold), a reference_verified rating is automatically created.';

COMMENT ON COLUMN reference_request.requester_id IS 
'The user requesting the reference (typically new user with self_reported rating)';

COMMENT ON COLUMN reference_request.referee_id IS 
'The certified player providing the reference (must have api_verified, peer_verified, or admin_verified rating)';

COMMENT ON COLUMN reference_request.reference_rating_value IS 
'The numeric rating value the referee assigns (e.g., 4.5 for NTRP 4.5)';

COMMENT ON COLUMN reference_request.status IS 
'Request lifecycle: pending → accepted/declined → completed/expired';

COMMENT ON FUNCTION check_reference_verification_threshold() IS 
'Automatically creates a reference_verified rating when threshold (3+ references) is met';

COMMENT ON FUNCTION expire_old_reference_requests() IS 
'Marks pending requests older than 30 days as expired. Should be called periodically.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log success
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Added reference_verified source type';
    RAISE NOTICE 'Created reference_request table with RLS policies';
    RAISE NOTICE 'Created helper functions for automatic verification';
END $$;
