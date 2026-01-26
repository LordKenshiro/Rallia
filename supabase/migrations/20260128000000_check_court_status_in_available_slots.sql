-- ============================================
-- FIX: get_available_slots should check court availability_status
-- ============================================
-- If a court's status is not 'available', no slots should be returned.
-- This ensures that courts under maintenance, closed, or reserved
-- cannot have bookings created for them.
-- ============================================

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
    -- Get court status and facility ID
    SELECT c.facility_id, c.availability_status 
    INTO v_facility_id, v_court_status 
    FROM court c 
    WHERE c.id = p_court_id;
    
    -- If court is not available, return no slots
    IF v_court_status IS NULL OR v_court_status != 'available' THEN
        RETURN;
    END IF;
    
    v_day_of_week := lower(trim(to_char(p_date, 'Day')));
    
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
     Returns empty if court availability_status is not "available".
     Generates individual bookable slots from templates using slot_duration_minutes.
     Computes: (effective templates → individual slots) - existing bookings - availability blocks.
     Also applies pricing rules if defined.';
