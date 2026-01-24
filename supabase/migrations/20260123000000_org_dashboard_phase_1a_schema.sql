-- ============================================
-- ORGANIZATION DASHBOARD - PHASE 1A: DATABASE SCHEMA
-- ============================================
-- This migration establishes the database infrastructure for the organization
-- dashboard feature, enabling facility management, booking with payments,
-- availability templates, and cancellation policies.
-- ============================================

-- ============================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ============================================

-- btree_gist is required for exclusion constraints to prevent double-booking
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================
-- 2. CREATE NEW ENUM TYPES
-- ============================================

-- Availability block types (reasons for blocking time slots)
DO $$ BEGIN
    CREATE TYPE availability_block_type_enum AS ENUM (
        'manual',        -- Staff blocked manually
        'maintenance',   -- Scheduled maintenance
        'holiday',       -- Facility closed for holiday
        'weather',       -- Weather closure
        'private_event'  -- Private booking/event
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add new booking status values
DO $$ BEGIN
    ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'no_show';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'awaiting_approval';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- 3. ENHANCE BOOKING TABLE
-- ============================================

-- Add new columns for organization reference, Stripe, approval, and cancellation
ALTER TABLE booking 
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organization(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS court_id UUID REFERENCES court(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profile(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS price_cents INTEGER,
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'CAD',
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profile(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER,
    ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_booking_organization ON booking(organization_id) 
    WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_court ON booking(court_id) 
    WHERE court_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_court_date ON booking(court_id, booking_date) 
    WHERE court_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_date_time ON booking(booking_date, start_time);
CREATE INDEX IF NOT EXISTS idx_booking_stripe_intent ON booking(stripe_payment_intent_id) 
    WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_cancelled ON booking(cancelled_at) 
    WHERE cancelled_at IS NOT NULL;

-- Add exclusion constraint to prevent double-booking
-- This enforces at database level that no two active bookings overlap for the same court
-- Note: We use tsrange with the date + time to create a proper time range
DO $$ BEGIN
    ALTER TABLE booking ADD CONSTRAINT no_overlapping_bookings
        EXCLUDE USING gist (
            court_id WITH =,
            tsrange(
                booking_date + start_time, 
                booking_date + end_time
            ) WITH &&
        ) WHERE (status NOT IN ('cancelled') AND court_id IS NOT NULL);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Comment on the court_id vs court_slot_id usage
COMMENT ON COLUMN booking.court_id IS 
    'Direct reference to the court being booked. Primary identifier for overlap detection.';
COMMENT ON COLUMN booking.court_slot_id IS 
    'Optional reference to the template used for pricing. Informational only.';

-- ============================================
-- 4. ENHANCE COURT_SLOT TABLE FOR HIERARCHICAL TEMPLATES
-- ============================================

-- Add new columns for hierarchical template support
ALTER TABLE court_slot 
    ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facility(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER DEFAULT 60,
    ADD COLUMN IF NOT EXISTS valid_from DATE,
    ADD COLUMN IF NOT EXISTS valid_until DATE,
    ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS price_cents INTEGER;

-- Migrate existing price to price_cents (assuming price was in dollars)
-- Only migrate if price_cents is NULL and price has a value
UPDATE court_slot 
SET price_cents = (price * 100)::INTEGER 
WHERE price IS NOT NULL AND price_cents IS NULL;

-- Populate facility_id from existing court_id references
UPDATE court_slot cs
SET facility_id = c.facility_id
FROM court c
WHERE cs.court_id = c.id AND cs.facility_id IS NULL;

-- Make court_id nullable to allow facility-wide templates
ALTER TABLE court_slot ALTER COLUMN court_id DROP NOT NULL;

-- Add constraint: must have either facility_id or court_id
-- Note: We check this after making court_id nullable
DO $$ BEGIN
    ALTER TABLE court_slot 
        ADD CONSTRAINT chk_template_scope 
        CHECK (facility_id IS NOT NULL OR court_id IS NOT NULL);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add indexes for template queries
CREATE INDEX IF NOT EXISTS idx_court_slot_facility ON court_slot(facility_id) 
    WHERE facility_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_court_slot_court_day ON court_slot(court_id, day_of_week) 
    WHERE court_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_court_slot_facility_day ON court_slot(facility_id, day_of_week) 
    WHERE facility_id IS NOT NULL AND court_id IS NULL;

COMMENT ON TABLE court_slot IS 
    'Availability templates. If court_id is NULL, applies to all courts at facility (default). 
     If court_id is set, applies only to that court and overrides facility template for same time.';

-- ============================================
-- 5. CREATE NEW TABLES
-- ============================================

-- Availability blocks (explicit closures: maintenance, holidays, special events)
-- Times are in facility-local timezone (facility.timezone)
CREATE TABLE IF NOT EXISTS availability_block (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID REFERENCES court(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES facility(id) ON DELETE CASCADE,
    block_date DATE NOT NULL,
    start_time TIME,  -- NULL = entire day
    end_time TIME,    -- NULL = entire day
    reason TEXT,
    block_type availability_block_type_enum NOT NULL DEFAULT 'manual',
    created_by UUID REFERENCES profile(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_time_range CHECK (
        (start_time IS NULL AND end_time IS NULL) OR 
        (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    )
);

-- Indexes for availability_block
CREATE INDEX IF NOT EXISTS idx_availability_block_facility_date 
    ON availability_block(facility_id, block_date);
CREATE INDEX IF NOT EXISTS idx_availability_block_court_date 
    ON availability_block(court_id, block_date) WHERE court_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_availability_block_facility_wide 
    ON availability_block(facility_id, block_date) WHERE court_id IS NULL;

COMMENT ON TABLE availability_block IS 
    'Explicit time blocks when courts are unavailable. If court_id is NULL, 
     block applies to all courts at the facility.';

-- Stripe Connect accounts for organizations
CREATE TABLE IF NOT EXISTS organization_stripe_account (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE UNIQUE,
    stripe_account_id VARCHAR(255) NOT NULL,
    stripe_account_type VARCHAR(50) DEFAULT 'express',
    onboarding_complete BOOLEAN DEFAULT FALSE,
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    default_currency VARCHAR(3) DEFAULT 'CAD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE organization_stripe_account IS 
    'Stripe Connect account information for organizations to receive payments.';

-- Pricing rules (dynamic pricing by time/day)
-- Note: Application must validate that facility_id/court_id belongs to organization_id
CREATE TABLE IF NOT EXISTS pricing_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    facility_id UUID REFERENCES facility(id) ON DELETE CASCADE,
    court_id UUID REFERENCES court(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    days_of_week INTEGER[] NOT NULL,  -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'CAD',
    priority INTEGER DEFAULT 0,  -- Higher priority wins
    valid_from DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_pricing_time_range CHECK (end_time > start_time),
    CONSTRAINT chk_days_of_week CHECK (
        days_of_week IS NOT NULL AND 
        array_length(days_of_week, 1) > 0 AND
        days_of_week <@ ARRAY[0,1,2,3,4,5,6]
    )
);

-- Indexes for pricing_rule
CREATE INDEX IF NOT EXISTS idx_pricing_rule_facility 
    ON pricing_rule(facility_id, is_active) WHERE facility_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_rule_court 
    ON pricing_rule(court_id) WHERE court_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_rule_org_active 
    ON pricing_rule(organization_id, is_active);

COMMENT ON TABLE pricing_rule IS 
    'Dynamic pricing rules that override template prices. Rules can be facility-wide 
     or court-specific, with priority determining which rule wins on conflicts.';

-- Cancellation policies per organization
CREATE TABLE IF NOT EXISTS cancellation_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE UNIQUE,
    free_cancellation_hours INTEGER DEFAULT 24,
    partial_refund_hours INTEGER DEFAULT 12,
    partial_refund_percent INTEGER DEFAULT 50,
    no_refund_hours INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_cancellation_hours CHECK (
        free_cancellation_hours >= partial_refund_hours AND
        partial_refund_hours >= no_refund_hours
    ),
    CONSTRAINT chk_refund_percent CHECK (
        partial_refund_percent >= 0 AND partial_refund_percent <= 100
    )
);

COMMENT ON TABLE cancellation_policy IS 
    'Cancellation and refund policy settings per organization. Determines refund 
     amounts based on how far in advance the booking is cancelled.';

-- Organization-level player blocking
CREATE TABLE IF NOT EXISTS organization_player_block (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    blocked_by UUID REFERENCES profile(id) ON DELETE SET NULL,
    reason TEXT,
    blocked_until TIMESTAMPTZ,  -- NULL = permanent
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_org_player_block_active 
    ON organization_player_block(organization_id, player_id) WHERE is_active = TRUE;

COMMENT ON TABLE organization_player_block IS 
    'Allows organizations to block specific players from making bookings.';

-- Organization settings (booking preferences)
-- Note: require_booking_approval and approval_timeout_hours are Phase 2 features
-- Schema includes them now for forward compatibility; UI deferred to Phase 2
CREATE TABLE IF NOT EXISTS organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE UNIQUE,
    require_booking_approval BOOLEAN DEFAULT FALSE,  -- Phase 2: Approval workflow
    approval_timeout_hours INTEGER DEFAULT 24,        -- Phase 2: Auto-decline timeout
    allow_same_day_booking BOOLEAN DEFAULT TRUE,
    min_booking_notice_hours INTEGER DEFAULT 1,
    max_advance_booking_days INTEGER DEFAULT 30,
    slot_duration_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_booking_notice CHECK (min_booking_notice_hours >= 0),
    CONSTRAINT chk_advance_booking CHECK (max_advance_booking_days > 0),
    CONSTRAINT chk_slot_duration CHECK (slot_duration_minutes > 0)
);

COMMENT ON TABLE organization_settings IS 
    'Booking and availability settings per organization.';

-- ============================================
-- 6. CREATE POSTGRESQL FUNCTIONS
-- ============================================

-- Function to get effective templates with hierarchical resolution
-- Court-specific templates override facility-wide defaults
CREATE OR REPLACE FUNCTION get_effective_templates(
    p_court_id UUID,
    p_date DATE
)
RETURNS TABLE (
    start_time TIME,
    end_time TIME,
    price_cents INTEGER,
    slot_duration_minutes INTEGER,
    template_source TEXT
) AS $$
DECLARE
    v_facility_id UUID;
    v_day_of_week TEXT;
BEGIN
    -- Get the facility ID for this court
    SELECT c.facility_id INTO v_facility_id FROM court c WHERE c.id = p_court_id;
    
    -- Get day of week (lowercase, trimmed to match enum)
    v_day_of_week := lower(trim(to_char(p_date, 'Day')));
    
    RETURN QUERY
    WITH ranked_templates AS (
        SELECT 
            cs.start_time,
            cs.end_time,
            COALESCE(cs.price_cents, (cs.price * 100)::INTEGER) AS price_cents,
            COALESCE(cs.slot_duration_minutes, 60) AS slot_duration_minutes,
            CASE WHEN cs.court_id IS NOT NULL THEN 'court' ELSE 'facility' END AS template_source,
            CASE WHEN cs.court_id IS NOT NULL THEN 1 ELSE 0 END AS priority
        FROM court_slot cs
        WHERE (cs.court_id = p_court_id OR (cs.facility_id = v_facility_id AND cs.court_id IS NULL))
            AND cs.day_of_week::TEXT = v_day_of_week
            AND cs.is_available = TRUE
            AND (cs.valid_from IS NULL OR cs.valid_from <= p_date)
            AND (cs.valid_until IS NULL OR cs.valid_until >= p_date)
    )
    -- Court-specific templates override facility templates for same time slot
    SELECT DISTINCT ON (rt.start_time)
        rt.start_time,
        rt.end_time,
        rt.price_cents,
        rt.slot_duration_minutes,
        rt.template_source
    FROM ranked_templates rt
    ORDER BY rt.start_time, rt.priority DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_effective_templates(UUID, DATE) IS 
    'Returns effective availability templates for a court on a specific date, 
     resolving inheritance between facility and court-specific templates.';

-- Function to get available slots for a court on a specific date
-- Computes: effective templates - existing bookings - availability blocks
CREATE OR REPLACE FUNCTION get_available_slots(
    p_court_id UUID,
    p_date DATE
)
RETURNS TABLE (
    start_time TIME,
    end_time TIME,
    price_cents INTEGER,
    template_source TEXT
) AS $$
DECLARE
    v_day_of_week TEXT;
    v_facility_id UUID;
BEGIN
    v_day_of_week := lower(trim(to_char(p_date, 'Day')));
    SELECT c.facility_id INTO v_facility_id FROM court c WHERE c.id = p_court_id;
    
    RETURN QUERY
    WITH 
    -- Get effective templates (court-specific overrides facility-wide)
    effective_templates AS (
        SELECT 
            et.start_time,
            et.end_time,
            et.price_cents,
            et.template_source
        FROM get_effective_templates(p_court_id, p_date) et
    ),
    -- Get existing bookings for this court and date
    booked_times AS (
        SELECT b.start_time, b.end_time
        FROM booking b
        WHERE b.court_id = p_court_id
            AND b.booking_date = p_date
            AND b.status NOT IN ('cancelled')
    ),
    -- Get blocks for this court/facility and date
    blocked_times AS (
        SELECT ab.start_time, ab.end_time
        FROM availability_block ab
        WHERE ab.block_date = p_date
            AND (ab.court_id = p_court_id OR (ab.court_id IS NULL AND ab.facility_id = v_facility_id))
    )
    -- Return slots that are not booked or blocked
    SELECT 
        et.start_time,
        et.end_time,
        COALESCE(
            (SELECT pr.price_cents 
             FROM pricing_rule pr 
             WHERE (pr.court_id = p_court_id OR (pr.facility_id = v_facility_id AND pr.court_id IS NULL))
                 AND p_date >= COALESCE(pr.valid_from, '1900-01-01'::DATE)
                 AND p_date <= COALESCE(pr.valid_until, '2100-01-01'::DATE)
                 AND EXTRACT(DOW FROM p_date)::INTEGER = ANY(pr.days_of_week)
                 AND et.start_time >= pr.start_time
                 AND et.start_time < pr.end_time
                 AND pr.is_active = TRUE
             ORDER BY CASE WHEN pr.court_id IS NOT NULL THEN 1 ELSE 0 END DESC, pr.priority DESC
             LIMIT 1),
            et.price_cents
        ) AS price_cents,
        et.template_source
    FROM effective_templates et
    WHERE NOT EXISTS (
        SELECT 1 FROM booked_times bt
        WHERE (et.start_time, et.end_time) OVERLAPS (bt.start_time, bt.end_time)
    )
    AND NOT EXISTS (
        SELECT 1 FROM blocked_times bl
        WHERE bl.start_time IS NULL  -- entire day block
           OR (et.start_time, et.end_time) OVERLAPS (bl.start_time, bl.end_time)
    )
    ORDER BY et.start_time;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_available_slots(UUID, DATE) IS 
    'Returns available booking slots for a court on a specific date. 
     Computes: effective templates - existing bookings - availability blocks. 
     Also applies pricing rules if defined.';

-- ============================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================
-- Note: player.id = profile.id = auth.uid() for authenticated users
-- So we can use auth.uid() directly to find the player's organization memberships

-- Enable RLS on new tables
ALTER TABLE availability_block ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_stripe_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_player_block ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- availability_block policies
CREATE POLICY "availability_block_select_org_members" ON availability_block
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            JOIN facility f ON f.organization_id = om.organization_id
            WHERE f.id = availability_block.facility_id
                AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "availability_block_insert_org_staff" ON availability_block
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_member om
            JOIN facility f ON f.organization_id = om.organization_id
            WHERE f.id = availability_block.facility_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "availability_block_update_org_staff" ON availability_block
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            JOIN facility f ON f.organization_id = om.organization_id
            WHERE f.id = availability_block.facility_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "availability_block_delete_org_staff" ON availability_block
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            JOIN facility f ON f.organization_id = om.organization_id
            WHERE f.id = availability_block.facility_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
        )
    );

-- organization_stripe_account policies
CREATE POLICY "org_stripe_select_org_members" ON organization_stripe_account
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_stripe_account.organization_id
                AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "org_stripe_insert_org_owner" ON organization_stripe_account
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_stripe_account.organization_id
                AND om.user_id = auth.uid()
                AND om.role = 'owner'
        )
    );

CREATE POLICY "org_stripe_update_org_owner" ON organization_stripe_account
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_stripe_account.organization_id
                AND om.user_id = auth.uid()
                AND om.role = 'owner'
        )
    );

-- pricing_rule policies
CREATE POLICY "pricing_rule_select_org_members" ON pricing_rule
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = pricing_rule.organization_id
                AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "pricing_rule_insert_org_staff" ON pricing_rule
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = pricing_rule.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "pricing_rule_update_org_staff" ON pricing_rule
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = pricing_rule.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "pricing_rule_delete_org_staff" ON pricing_rule
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = pricing_rule.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
        )
    );

-- cancellation_policy policies
CREATE POLICY "cancellation_policy_select_all" ON cancellation_policy
    FOR SELECT USING (true);  -- Anyone can view cancellation policies

CREATE POLICY "cancellation_policy_insert_org_owner" ON cancellation_policy
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = cancellation_policy.organization_id
                AND om.user_id = auth.uid()
                AND om.role = 'owner'
        )
    );

CREATE POLICY "cancellation_policy_update_org_staff" ON cancellation_policy
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = cancellation_policy.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
        )
    );

-- organization_player_block policies
CREATE POLICY "org_player_block_select_org_staff" ON organization_player_block
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_player_block.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner', 'staff')
        )
    );

CREATE POLICY "org_player_block_insert_org_staff" ON organization_player_block
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_player_block.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "org_player_block_update_org_staff" ON organization_player_block
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_player_block.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
        )
    );

-- organization_settings policies
CREATE POLICY "org_settings_select_org_members" ON organization_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_settings.organization_id
                AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "org_settings_insert_org_owner" ON organization_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_settings.organization_id
                AND om.user_id = auth.uid()
                AND om.role = 'owner'
        )
    );

CREATE POLICY "org_settings_update_org_staff" ON organization_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_settings.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
        )
    );

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_effective_templates(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_slots(UUID, DATE) TO authenticated;

-- Grant table access to authenticated users (RLS will handle row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE ON availability_block TO authenticated;
GRANT SELECT, INSERT, UPDATE ON organization_stripe_account TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pricing_rule TO authenticated;
GRANT SELECT, INSERT, UPDATE ON cancellation_policy TO authenticated;
GRANT SELECT, INSERT, UPDATE ON organization_player_block TO authenticated;
GRANT SELECT, INSERT, UPDATE ON organization_settings TO authenticated;
