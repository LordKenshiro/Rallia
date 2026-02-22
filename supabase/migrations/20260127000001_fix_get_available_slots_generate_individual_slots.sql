-- ============================================
-- FIX: get_available_slots to generate individual bookable slots
-- ============================================
-- The original function was returning template time ranges (e.g., 9:00-17:00)
-- instead of individual bookable slots (e.g., 9:00-10:00, 10:00-11:00, etc.)
-- 
-- This fix uses generate_series to split templates into individual slots
-- based on slot_duration_minutes.
-- ============================================

-- First, update get_effective_templates to include slot_duration_minutes
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
     resolving inheritance between facility and court-specific templates.
     Returns the full template time range - use get_available_slots for individual bookable slots.';

-- Now fix get_available_slots to generate individual slots
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
            et.start_time AS template_start,
            et.end_time AS template_end,
            et.price_cents,
            et.slot_duration_minutes,
            et.template_source
        FROM get_effective_templates(p_court_id, p_date) et
    ),
    -- Generate individual slots from templates using slot_duration_minutes
    generated_slots AS (
        SELECT 
            (et.template_start + (gs.slot_num * (et.slot_duration_minutes || ' minutes')::INTERVAL))::TIME AS slot_start,
            (et.template_start + ((gs.slot_num + 1) * (et.slot_duration_minutes || ' minutes')::INTERVAL))::TIME AS slot_end,
            et.price_cents,
            et.template_source
        FROM effective_templates et
        CROSS JOIN LATERAL generate_series(
            0, 
            -- Calculate number of slots: (end - start) / duration - 1
            GREATEST(0, (EXTRACT(EPOCH FROM (et.template_end - et.template_start)) / 60 / et.slot_duration_minutes)::INTEGER - 1)
        ) AS gs(slot_num)
        -- Ensure we don't generate slots past the template end time
        WHERE (et.template_start + ((gs.slot_num + 1) * (et.slot_duration_minutes || ' minutes')::INTERVAL))::TIME <= et.template_end
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
    -- Exclude blocked slots
    AND NOT EXISTS (
        SELECT 1 FROM blocked_times bl
        WHERE bl.start_time IS NULL  -- entire day block
           OR (gs.slot_start, gs.slot_end) OVERLAPS (bl.start_time, bl.end_time)
    )
    ORDER BY gs.slot_start;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_available_slots(UUID, DATE) IS 
    'Returns available booking slots for a court on a specific date.
     Generates individual bookable slots from templates using slot_duration_minutes.
     Computes: (effective templates → individual slots) - existing bookings - availability blocks.
     Also applies pricing rules if defined.';
