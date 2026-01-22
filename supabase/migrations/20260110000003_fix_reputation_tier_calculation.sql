-- Migration: Fix reputation tier calculation to use total_events instead of matches_completed
-- Description: The calculate_reputation_tier function was still using matches_completed
--              to determine if tier should be 'unknown', but the threshold was changed
--              to use total_events >= 10. This causes players with 10+ events but
--              less than 3 match_completed events to still show as 'unknown' tier.

-- =============================================================================
-- STEP 1: Drop and recreate calculate_reputation_tier function with new signature
-- =============================================================================
-- Note: We must drop first because PostgreSQL doesn't allow changing parameter names
-- with CREATE OR REPLACE FUNCTION. We use CASCADE to also drop dependent functions
-- (like recalculate_player_reputation) which we'll recreate immediately after.

DROP FUNCTION IF EXISTS calculate_reputation_tier(DECIMAL, INT, INT) CASCADE;

CREATE FUNCTION calculate_reputation_tier(score DECIMAL, total_events INT, min_events INT DEFAULT 10)
RETURNS reputation_tier
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Not enough events = unknown tier
    IF total_events < min_events THEN
        RETURN 'unknown';
    END IF;

    -- Tier based on score
    IF score >= 90 THEN
        RETURN 'platinum';
    ELSIF score >= 75 THEN
        RETURN 'gold';
    ELSIF score >= 60 THEN
        RETURN 'silver';
    ELSE
        RETURN 'bronze';
    END IF;
END;
$$;

-- =============================================================================
-- STEP 2: Recreate recalculate_player_reputation to use total_events
-- =============================================================================
-- Note: This was dropped by CASCADE above, so we recreate it with the fix

CREATE OR REPLACE FUNCTION recalculate_player_reputation(target_player_id UUID, apply_decay BOOLEAN DEFAULT false)
RETURNS player_reputation
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    base_score DECIMAL(5,2) := 100;
    total_impact DECIMAL(5,2) := 0;
    event_record RECORD;
    decay_factor DECIMAL(5,4);
    age_days INT;
    result_row player_reputation;
    p_total_events INT := 0;
    p_positive_events INT := 0;
    p_negative_events INT := 0;
    p_matches_completed INT := 0;
BEGIN
    -- Calculate sum of all event impacts with optional decay
    FOR event_record IN
        SELECT
            re.base_impact,
            re.event_type,
            re.event_occurred_at,
            rc.decay_enabled,
            rc.decay_half_life_days
        FROM reputation_event re
        LEFT JOIN reputation_config rc ON rc.event_type = re.event_type
        WHERE re.player_id = target_player_id
    LOOP
        p_total_events := p_total_events + 1;

        IF event_record.base_impact > 0 THEN
            p_positive_events := p_positive_events + 1;
        ELSIF event_record.base_impact < 0 THEN
            p_negative_events := p_negative_events + 1;
        END IF;

        -- Count matches completed
        IF event_record.event_type = 'match_completed' THEN
            p_matches_completed := p_matches_completed + 1;
        END IF;

        -- Apply decay if enabled
        IF apply_decay AND event_record.decay_enabled AND event_record.decay_half_life_days IS NOT NULL THEN
            age_days := EXTRACT(EPOCH FROM (now() - event_record.event_occurred_at)) / 86400;
            decay_factor := POWER(0.5, age_days::DECIMAL / event_record.decay_half_life_days);
            total_impact := total_impact + (event_record.base_impact * decay_factor);
        ELSE
            total_impact := total_impact + event_record.base_impact;
        END IF;
    END LOOP;

    -- Calculate final score (clamped 0-100)
    base_score := GREATEST(0, LEAST(100, base_score + total_impact));

    -- Upsert player_reputation
    INSERT INTO player_reputation (
        player_id,
        reputation_score,
        reputation_tier,
        total_events,
        positive_events,
        negative_events,
        matches_completed,
        last_decay_calculation,
        calculated_at,
        updated_at
    )
    VALUES (
        target_player_id,
        base_score,
        calculate_reputation_tier(base_score, p_total_events, 10),
        p_total_events,
        p_positive_events,
        p_negative_events,
        p_matches_completed,
        CASE WHEN apply_decay THEN now() ELSE NULL END,
        now(),
        now()
    )
    ON CONFLICT (player_id) DO UPDATE SET
        reputation_score = EXCLUDED.reputation_score,
        reputation_tier = EXCLUDED.reputation_tier,
        total_events = EXCLUDED.total_events,
        positive_events = EXCLUDED.positive_events,
        negative_events = EXCLUDED.negative_events,
        matches_completed = EXCLUDED.matches_completed,
        last_decay_calculation = EXCLUDED.last_decay_calculation,
        calculated_at = EXCLUDED.calculated_at,
        updated_at = EXCLUDED.updated_at
    RETURNING * INTO result_row;

    RETURN result_row;
END;
$$;

-- =============================================================================
-- STEP 3: Grant execute permission on updated function
-- =============================================================================

GRANT EXECUTE ON FUNCTION calculate_reputation_tier(DECIMAL, INT, INT) TO authenticated;

-- =============================================================================
-- STEP 4: Recalculate all existing reputations to fix tiers
-- =============================================================================
-- Note: This will recalculate tiers for all players based on total_events
-- instead of matches_completed. Run this to fix existing data.

-- Uncomment the following to recalculate all reputations:
-- DO $$
-- DECLARE
--     player_record RECORD;
-- BEGIN
--     FOR player_record IN SELECT DISTINCT player_id FROM reputation_event
--     LOOP
--         PERFORM recalculate_player_reputation(player_record.player_id, false);
--     END LOOP;
-- END $$;
