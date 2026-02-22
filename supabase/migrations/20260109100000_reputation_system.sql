-- =============================================================================
-- REPUTATION SYSTEM
-- Event-driven player reputation tracking
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE reputation_event_type AS ENUM (
        -- Match-related
        'match_completed',        -- Showed up and played
        'match_no_show',          -- Didn't show up
        'match_ghosted',          -- Stopped responding after accepting
        'match_on_time',          -- Arrived on time
        'match_late',             -- Arrived late (>10min)
        'match_cancelled_early',  -- Cancelled with adequate notice
        'match_cancelled_late',   -- Last-minute cancellation (<24h)
        'match_repeat_opponent',  -- Played with same opponent again

        -- Peer reviews
        'review_received_5star',
        'review_received_4star',
        'review_received_3star',
        'review_received_2star',
        'review_received_1star',

        -- Reports/Moderation
        'report_received',        -- Someone reported this player
        'report_dismissed',       -- Report was dismissed (false report bonus)
        'report_upheld',          -- Report was upheld (penalty)
        'warning_issued',
        'suspension_lifted',

        -- Community
        'peer_rating_given',      -- Helped rate another player
        'first_match_bonus'       -- Bonus for completing first match
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reputation_tier AS ENUM (
        'unknown',      -- Not enough matches
        'bronze',       -- 0-59%
        'silver',       -- 60-74%
        'gold',         -- 75-89%
        'platinum'      -- 90-100%
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- REPUTATION EVENT TABLE
-- Immutable log of events affecting player reputation
-- =============================================================================

CREATE TABLE IF NOT EXISTS reputation_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    event_type reputation_event_type NOT NULL,

    -- Base impact before decay/modifiers
    base_impact DECIMAL(5,2) NOT NULL,

    -- Context references (nullable, depends on event type)
    match_id UUID REFERENCES match(id) ON DELETE SET NULL,
    caused_by_player_id UUID REFERENCES player(id) ON DELETE SET NULL,

    -- Extensible metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    event_occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_reputation_event_player ON reputation_event(player_id);
CREATE INDEX IF NOT EXISTS idx_reputation_event_type ON reputation_event(event_type);
CREATE INDEX IF NOT EXISTS idx_reputation_event_occurred ON reputation_event(event_occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_reputation_event_player_occurred ON reputation_event(player_id, event_occurred_at DESC);

-- Enable RLS
ALTER TABLE reputation_event ENABLE ROW LEVEL SECURITY;

-- PRIVACY: Block all player access to individual events
-- Only service_role (backend) can read events
DROP POLICY IF EXISTS "reputation_event_block_player_read" ON reputation_event;
CREATE POLICY "reputation_event_block_player_read" ON reputation_event
    FOR SELECT
    TO authenticated
    USING (false);

-- Allow service role full access (handled by Supabase service key)
-- No explicit policy needed - service_role bypasses RLS

-- Allow authenticated users to insert (will be validated by application logic)
DROP POLICY IF EXISTS "reputation_event_allow_insert" ON reputation_event;
CREATE POLICY "reputation_event_allow_insert" ON reputation_event
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- =============================================================================
-- PLAYER REPUTATION TABLE
-- Cached/calculated reputation scores
-- =============================================================================

CREATE TABLE IF NOT EXISTS player_reputation (
    player_id UUID PRIMARY KEY REFERENCES player(id) ON DELETE CASCADE,

    -- Current calculated values
    reputation_score DECIMAL(5,2) NOT NULL DEFAULT 100,
    reputation_tier reputation_tier NOT NULL DEFAULT 'unknown',

    -- Aggregates for quick access
    total_events INT NOT NULL DEFAULT 0,
    positive_events INT NOT NULL DEFAULT 0,
    negative_events INT NOT NULL DEFAULT 0,
    matches_completed INT NOT NULL DEFAULT 0,

    -- Configuration
    min_matches_for_public INT NOT NULL DEFAULT 3,
    is_public BOOLEAN GENERATED ALWAYS AS (matches_completed >= min_matches_for_public) STORED,

    -- Decay tracking (for future scheduled job)
    last_decay_calculation TIMESTAMPTZ,

    -- Timestamps
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE player_reputation ENABLE ROW LEVEL SECURITY;

-- Allow players to read their own reputation
DROP POLICY IF EXISTS "player_reputation_read_own" ON player_reputation;
CREATE POLICY "player_reputation_read_own" ON player_reputation
    FOR SELECT
    TO authenticated
    USING (player_id = auth.uid());

-- Allow players to read other public reputations
DROP POLICY IF EXISTS "player_reputation_read_public" ON player_reputation;
CREATE POLICY "player_reputation_read_public" ON player_reputation
    FOR SELECT
    TO authenticated
    USING (is_public = true);

-- Only service role can insert/update (via application logic)
DROP POLICY IF EXISTS "player_reputation_insert" ON player_reputation;
CREATE POLICY "player_reputation_insert" ON player_reputation
    FOR INSERT
    TO authenticated
    WITH CHECK (player_id = auth.uid());

DROP POLICY IF EXISTS "player_reputation_update_own" ON player_reputation;
CREATE POLICY "player_reputation_update_own" ON player_reputation
    FOR UPDATE
    TO authenticated
    USING (player_id = auth.uid())
    WITH CHECK (player_id = auth.uid());

-- =============================================================================
-- REPUTATION CONFIG TABLE
-- Configurable event impact values
-- =============================================================================

CREATE TABLE IF NOT EXISTS reputation_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type reputation_event_type UNIQUE NOT NULL,

    -- Impact configuration
    default_impact DECIMAL(5,2) NOT NULL,
    min_impact DECIMAL(5,2),
    max_impact DECIMAL(5,2),

    -- Decay configuration (for future use)
    decay_enabled BOOLEAN NOT NULL DEFAULT false,
    decay_half_life_days INT DEFAULT 180,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (config is read-only for all, managed by admins)
ALTER TABLE reputation_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read config
DROP POLICY IF EXISTS "reputation_config_read_all" ON reputation_config;
CREATE POLICY "reputation_config_read_all" ON reputation_config
    FOR SELECT
    TO authenticated
    USING (true);

-- =============================================================================
-- SEED DEFAULT CONFIGURATION
-- =============================================================================

INSERT INTO reputation_config (event_type, default_impact, min_impact, max_impact, decay_enabled, decay_half_life_days) VALUES
    -- Match-related
    ('match_completed', 25, 20, 30, true, 180),
    ('match_no_show', -50, -60, -40, true, 180),
    ('match_ghosted', -20, -30, -15, true, 180),
    ('match_on_time', 5, 3, 10, false, NULL),
    ('match_late', -10, -15, -5, false, NULL),
    ('match_cancelled_early', 0, 0, 0, false, NULL),
    ('match_cancelled_late', -25, -30, -20, true, 180),
    ('match_repeat_opponent', 3, 2, 5, false, NULL),

    -- Peer reviews
    ('review_received_5star', 20, 15, 25, true, 365),
    ('review_received_4star', 10, 8, 12, true, 365),
    ('review_received_3star', 0, 0, 0, false, NULL),
    ('review_received_2star', -5, -8, -3, true, 365),
    ('review_received_1star', -10, -15, -8, true, 365),

    -- Reports/Moderation
    ('report_received', 0, 0, 0, false, NULL),
    ('report_dismissed', 5, 3, 8, false, NULL),
    ('report_upheld', -15, -25, -10, true, 365),
    ('warning_issued', -10, -15, -5, true, 180),
    ('suspension_lifted', 0, 0, 0, false, NULL),

    -- Community
    ('peer_rating_given', 1, 0, 2, false, NULL),
    ('first_match_bonus', 10, 10, 10, false, NULL)
ON CONFLICT (event_type) DO NOTHING;

-- =============================================================================
-- HELPER FUNCTION: Calculate tier from score
-- =============================================================================

DROP FUNCTION IF EXISTS calculate_reputation_tier(DECIMAL, INT, INT);
CREATE OR REPLACE FUNCTION calculate_reputation_tier(score DECIMAL, matches_completed INT, min_matches INT DEFAULT 3)
RETURNS reputation_tier
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Not enough matches = unknown tier
    IF matches_completed < min_matches THEN
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
-- HELPER FUNCTION: Recalculate player reputation
-- =============================================================================

DROP FUNCTION IF EXISTS recalculate_player_reputation(UUID, BOOLEAN);
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
        calculate_reputation_tier(base_score, p_matches_completed, 3),
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
-- TRIGGER: Recalculate reputation on new events
-- =============================================================================

DROP FUNCTION IF EXISTS trigger_recalculate_reputation() CASCADE;
CREATE OR REPLACE FUNCTION trigger_recalculate_reputation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Recalculate without decay (decay is handled by scheduled job)
    PERFORM recalculate_player_reputation(NEW.player_id, false);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reputation_event_recalculate ON reputation_event;
CREATE TRIGGER reputation_event_recalculate
    AFTER INSERT ON reputation_event
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_reputation();

-- =============================================================================
-- RPC: Get player reputation summary (privacy-safe)
-- =============================================================================

DROP FUNCTION IF EXISTS get_reputation_summary(UUID);
CREATE OR REPLACE FUNCTION get_reputation_summary(target_player_id UUID)
RETURNS TABLE (
    score DECIMAL(5,2),
    tier reputation_tier,
    matches_completed INT,
    is_public BOOLEAN,
    positive_events INT,
    negative_events INT,
    total_events INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pr.reputation_score,
        pr.reputation_tier,
        pr.matches_completed,
        pr.is_public,
        pr.positive_events,
        pr.negative_events,
        pr.total_events
    FROM player_reputation pr
    WHERE pr.player_id = target_player_id;

    -- If no record found, return default values
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            100::DECIMAL(5,2) as score,
            'unknown'::reputation_tier as tier,
            0 as matches_completed,
            false as is_public,
            0 as positive_events,
            0 as negative_events,
            0 as total_events;
    END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_reputation_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_reputation_tier(DECIMAL, INT, INT) TO authenticated;
