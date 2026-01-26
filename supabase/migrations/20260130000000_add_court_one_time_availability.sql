-- ============================================
-- ONE-TIME COURT AVAILABILITY
-- ============================================
-- This migration adds support for one-time availability slots
-- that can be specified for specific dates, in addition to
-- the recurring weekly templates in court_slot.
-- ============================================

-- ============================================
-- 1. CREATE NEW TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS court_one_time_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- court_id is nullable to support facility-wide one-time slots
    court_id UUID REFERENCES court(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES facility(id) ON DELETE CASCADE,
    availability_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
    price_cents INTEGER,
    -- TRUE = add availability, FALSE = block availability for this time
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    reason TEXT,
    created_by UUID REFERENCES profile(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure end_time is after start_time
    CONSTRAINT chk_one_time_time_range CHECK (end_time > start_time),
    -- Ensure slot duration is positive
    CONSTRAINT chk_one_time_slot_duration CHECK (slot_duration_minutes > 0)
);

-- Add comment for documentation
COMMENT ON TABLE court_one_time_availability IS 
    'One-time availability slots for specific dates. If court_id is NULL, applies to all courts 
     at the facility. These slots are merged with recurring templates from court_slot when 
     computing available slots. If is_available is FALSE, this acts as a block for that time.';

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

-- Index for querying by facility and date (common query pattern)
CREATE INDEX IF NOT EXISTS idx_one_time_availability_facility_date 
    ON court_one_time_availability(facility_id, availability_date);

-- Index for querying by court and date
CREATE INDEX IF NOT EXISTS idx_one_time_availability_court_date 
    ON court_one_time_availability(court_id, availability_date) 
    WHERE court_id IS NOT NULL;

-- Index for facility-wide one-time slots
CREATE INDEX IF NOT EXISTS idx_one_time_availability_facility_wide 
    ON court_one_time_availability(facility_id, availability_date) 
    WHERE court_id IS NULL;

-- Index for future availability queries
CREATE INDEX IF NOT EXISTS idx_one_time_availability_date 
    ON court_one_time_availability(availability_date);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE court_one_time_availability ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- SELECT: Organization members can view one-time availabilities
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'court_one_time_availability' 
        AND policyname = 'one_time_availability_select_org_members'
    ) THEN
        CREATE POLICY "one_time_availability_select_org_members" ON court_one_time_availability
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM organization_member om
                    JOIN facility f ON f.organization_id = om.organization_id
                    WHERE f.id = court_one_time_availability.facility_id
                        AND om.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- INSERT: Only org admins/owners can create one-time availabilities
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'court_one_time_availability' 
        AND policyname = 'one_time_availability_insert_org_staff'
    ) THEN
        CREATE POLICY "one_time_availability_insert_org_staff" ON court_one_time_availability
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM organization_member om
                    JOIN facility f ON f.organization_id = om.organization_id
                    WHERE f.id = court_one_time_availability.facility_id
                        AND om.user_id = auth.uid()
                        AND om.role IN ('admin', 'owner')
                )
            );
    END IF;
END $$;

-- UPDATE: Only org admins/owners can update one-time availabilities
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'court_one_time_availability' 
        AND policyname = 'one_time_availability_update_org_staff'
    ) THEN
        CREATE POLICY "one_time_availability_update_org_staff" ON court_one_time_availability
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM organization_member om
                    JOIN facility f ON f.organization_id = om.organization_id
                    WHERE f.id = court_one_time_availability.facility_id
                        AND om.user_id = auth.uid()
                        AND om.role IN ('admin', 'owner')
                )
            );
    END IF;
END $$;

-- DELETE: Only org admins/owners can delete one-time availabilities
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'court_one_time_availability' 
        AND policyname = 'one_time_availability_delete_org_staff'
    ) THEN
        CREATE POLICY "one_time_availability_delete_org_staff" ON court_one_time_availability
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM organization_member om
                    JOIN facility f ON f.organization_id = om.organization_id
                    WHERE f.id = court_one_time_availability.facility_id
                        AND om.user_id = auth.uid()
                        AND om.role IN ('admin', 'owner')
                )
            );
    END IF;
END $$;

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON court_one_time_availability TO authenticated;

-- ============================================
-- 6. UPDATE get_available_slots FUNCTION
-- ============================================
-- This function now includes one-time availability slots and handles
-- the case where one-time slots should override recurring templates.

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
    v_court_status TEXT;
BEGIN
    v_day_of_week := lower(trim(to_char(p_date, 'Day')));
    SELECT c.facility_id, c.availability_status INTO v_facility_id, v_court_status 
    FROM court c WHERE c.id = p_court_id;
    
    -- If court is not available (maintenance, closed, etc.), return no slots
    IF v_court_status IS NOT NULL AND v_court_status != 'available' THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    WITH 
    -- Check if there are any one-time availability entries for this date
    has_one_time AS (
        SELECT EXISTS (
            SELECT 1 FROM court_one_time_availability ota
            WHERE ota.availability_date = p_date
                AND (ota.court_id = p_court_id OR (ota.court_id IS NULL AND ota.facility_id = v_facility_id))
                AND ota.is_available = TRUE
        ) AS has_entries
    ),
    -- Get one-time availability slots for this specific date
    one_time_templates AS (
        SELECT 
            ota.start_time AS template_start,
            ota.end_time AS template_end,
            ota.price_cents,
            ota.slot_duration_minutes,
            'one_time' AS template_source,
            CASE WHEN ota.court_id IS NOT NULL THEN 1 ELSE 0 END AS priority
        FROM court_one_time_availability ota
        WHERE ota.availability_date = p_date
            AND (ota.court_id = p_court_id OR (ota.court_id IS NULL AND ota.facility_id = v_facility_id))
            AND ota.is_available = TRUE
    ),
    -- Get effective recurring templates (court-specific overrides facility-wide)
    recurring_templates AS (
        SELECT 
            et.start_time AS template_start,
            et.end_time AS template_end,
            et.price_cents,
            et.slot_duration_minutes,
            et.template_source,
            0 AS priority
        FROM get_effective_templates(p_court_id, p_date) et
    ),
    -- Combine templates: use one-time if available, otherwise use recurring
    -- If there are any one-time entries for this date, use ONLY one-time slots
    -- This allows clubs to completely override the recurring schedule for a specific date
    combined_templates AS (
        SELECT * FROM one_time_templates
        WHERE (SELECT has_entries FROM has_one_time)
        UNION ALL
        SELECT * FROM recurring_templates
        WHERE NOT (SELECT has_entries FROM has_one_time)
    ),
    -- Generate individual slots from templates using slot_duration_minutes
    generated_slots AS (
        SELECT 
            (ct.template_start + (gs.slot_num * (ct.slot_duration_minutes || ' minutes')::INTERVAL))::TIME AS slot_start,
            (ct.template_start + ((gs.slot_num + 1) * (ct.slot_duration_minutes || ' minutes')::INTERVAL))::TIME AS slot_end,
            ct.price_cents,
            ct.template_source
        FROM combined_templates ct
        CROSS JOIN LATERAL generate_series(
            0, 
            GREATEST(0, (EXTRACT(EPOCH FROM (ct.template_end - ct.template_start)) / 60 / ct.slot_duration_minutes)::INTEGER - 1)
        ) AS gs(slot_num)
        WHERE (ct.template_start + ((gs.slot_num + 1) * (ct.slot_duration_minutes || ' minutes')::INTERVAL))::TIME <= ct.template_end
    ),
    -- Get existing bookings for this court and date
    booked_times AS (
        SELECT b.start_time, b.end_time
        FROM booking b
        WHERE b.court_id = p_court_id
            AND b.booking_date = p_date
            AND b.status NOT IN ('cancelled')
    ),
    -- Get blocks for this court/facility and date (from availability_block table)
    blocked_times AS (
        SELECT ab.start_time, ab.end_time
        FROM availability_block ab
        WHERE ab.block_date = p_date
            AND (ab.court_id = p_court_id OR (ab.court_id IS NULL AND ab.facility_id = v_facility_id))
    ),
    -- Also get one-time unavailability entries (is_available = FALSE)
    one_time_blocked AS (
        SELECT ota.start_time, ota.end_time
        FROM court_one_time_availability ota
        WHERE ota.availability_date = p_date
            AND (ota.court_id = p_court_id OR (ota.court_id IS NULL AND ota.facility_id = v_facility_id))
            AND ota.is_available = FALSE
    )
    -- Return slots that are not booked or blocked
    SELECT 
        gs.slot_start AS start_time,
        gs.slot_end AS end_time,
        -- Apply pricing rules if any match this slot
        COALESCE(
            (SELECT pr.price_cents 
             FROM pricing_rule pr 
             WHERE (pr.court_id = p_court_id OR (pr.facility_id = v_facility_id AND pr.court_id IS NULL))
                 AND p_date >= COALESCE(pr.valid_from, '1900-01-01'::DATE)
                 AND p_date <= COALESCE(pr.valid_until, '2100-01-01'::DATE)
                 AND EXTRACT(DOW FROM p_date)::INTEGER = ANY(pr.days_of_week)
                 AND gs.slot_start >= pr.start_time
                 AND gs.slot_start < pr.end_time
                 AND pr.is_active = TRUE
             ORDER BY CASE WHEN pr.court_id IS NOT NULL THEN 1 ELSE 0 END DESC, pr.priority DESC
             LIMIT 1),
            gs.price_cents
        ) AS price_cents,
        gs.template_source
    FROM generated_slots gs
    -- Exclude booked slots
    WHERE NOT EXISTS (
        SELECT 1 FROM booked_times bt
        WHERE (gs.slot_start, gs.slot_end) OVERLAPS (bt.start_time, bt.end_time)
    )
    -- Exclude blocked slots (from availability_block)
    AND NOT EXISTS (
        SELECT 1 FROM blocked_times bl
        WHERE bl.start_time IS NULL  -- entire day block
           OR (gs.slot_start, gs.slot_end) OVERLAPS (bl.start_time, bl.end_time)
    )
    -- Exclude one-time blocked slots
    AND NOT EXISTS (
        SELECT 1 FROM one_time_blocked otb
        WHERE (gs.slot_start, gs.slot_end) OVERLAPS (otb.start_time, otb.end_time)
    )
    ORDER BY gs.slot_start;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_available_slots(UUID, DATE) IS 
    'Returns available booking slots for a court on a specific date.
     Now includes one-time availability slots from court_one_time_availability.
     If one-time slots exist for a date, they completely override recurring templates.
     Computes: (one-time OR recurring templates → individual slots) - bookings - blocks.
     Also applies pricing rules if defined.';
