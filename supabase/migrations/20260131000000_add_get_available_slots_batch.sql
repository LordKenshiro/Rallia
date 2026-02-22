-- ============================================
-- BATCHED AVAILABLE SLOTS FUNCTION
-- ============================================
-- This migration adds a batched version of get_available_slots
-- that accepts multiple court IDs and a date range, returning
-- all slots in a single query for performance optimization.
-- 
-- This reduces ~295 HTTP requests (for month view) down to 1.
-- ============================================

-- ============================================
-- 1. CREATE BATCHED FUNCTION
-- ============================================

-- Drop existing function if it exists (to allow return type changes)
DROP FUNCTION IF EXISTS get_available_slots_batch(UUID[], DATE, DATE);

CREATE OR REPLACE FUNCTION get_available_slots_batch(
    p_court_ids UUID[],
    p_date_from DATE,
    p_date_to DATE
)
RETURNS TABLE (
    out_court_id UUID,
    out_slot_date DATE,
    out_start_time TIME,
    out_end_time TIME,
    out_price_cents INTEGER,
    out_template_source TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH 
    -- Generate all dates in the range
    date_range AS (
        SELECT generate_series(p_date_from, p_date_to, '1 day'::INTERVAL)::DATE AS the_date
    ),
    -- Get all courts with their facility info and status
    courts_info AS (
        SELECT 
            c.id AS court_id,
            c.facility_id,
            c.availability_status
        FROM court c
        WHERE c.id = ANY(p_court_ids)
            -- Filter out unavailable courts
            AND (c.availability_status IS NULL OR c.availability_status = 'available')
    ),
    -- Cross join courts with dates to get all (court, date) combinations
    court_dates AS (
        SELECT 
            ci.court_id,
            ci.facility_id,
            dr.the_date,
            lower(trim(to_char(dr.the_date, 'Day'))) AS day_of_week
        FROM courts_info ci
        CROSS JOIN date_range dr
    ),
    -- Check which (court, date) pairs have one-time availability entries
    one_time_check AS (
        SELECT DISTINCT
            cd.court_id,
            cd.the_date,
            TRUE AS has_one_time
        FROM court_dates cd
        WHERE EXISTS (
            SELECT 1 FROM court_one_time_availability ota
            WHERE ota.availability_date = cd.the_date
                AND (ota.court_id = cd.court_id OR (ota.court_id IS NULL AND ota.facility_id = cd.facility_id))
                AND ota.is_available = TRUE
        )
    ),
    -- Get one-time availability templates
    one_time_templates AS (
        SELECT 
            cd.court_id,
            cd.the_date,
            cd.facility_id,
            ota.start_time AS template_start,
            ota.end_time AS template_end,
            ota.price_cents,
            ota.slot_duration_minutes,
            'one_time' AS template_source
        FROM court_dates cd
        JOIN court_one_time_availability ota ON (
            ota.availability_date = cd.the_date
            AND (ota.court_id = cd.court_id OR (ota.court_id IS NULL AND ota.facility_id = cd.facility_id))
            AND ota.is_available = TRUE
        )
        -- Only include if this court/date has one-time entries
        WHERE EXISTS (
            SELECT 1 FROM one_time_check otc
            WHERE otc.court_id = cd.court_id AND otc.the_date = cd.the_date
        )
    ),
    -- Get recurring templates for court/dates that DON'T have one-time entries
    recurring_templates AS (
        SELECT 
            cd.court_id,
            cd.the_date,
            cd.facility_id,
            cs.start_time AS template_start,
            cs.end_time AS template_end,
            COALESCE(cs.price_cents, (cs.price * 100)::INTEGER) AS price_cents,
            COALESCE(cs.slot_duration_minutes, 60) AS slot_duration_minutes,
            CASE WHEN cs.court_id IS NOT NULL THEN 'court' ELSE 'facility' END AS template_source,
            -- Priority for deduplication: court-specific > facility-wide
            CASE WHEN cs.court_id IS NOT NULL THEN 1 ELSE 0 END AS priority
        FROM court_dates cd
        JOIN court_slot cs ON (
            (cs.court_id = cd.court_id OR (cs.facility_id = cd.facility_id AND cs.court_id IS NULL))
            AND cs.day_of_week::TEXT = cd.day_of_week
            AND cs.is_available = TRUE
            AND (cs.valid_from IS NULL OR cs.valid_from <= cd.the_date)
            AND (cs.valid_until IS NULL OR cs.valid_until >= cd.the_date)
        )
        -- Only include if this court/date does NOT have one-time entries
        WHERE NOT EXISTS (
            SELECT 1 FROM one_time_check otc
            WHERE otc.court_id = cd.court_id AND otc.the_date = cd.the_date
        )
    ),
    -- Deduplicate recurring templates (court-specific overrides facility-wide)
    recurring_deduped AS (
        SELECT DISTINCT ON (court_id, the_date, template_start)
            court_id,
            the_date,
            facility_id,
            template_start,
            template_end,
            price_cents,
            slot_duration_minutes,
            template_source
        FROM recurring_templates
        ORDER BY court_id, the_date, template_start, priority DESC
    ),
    -- Combine one-time and recurring templates
    all_templates AS (
        SELECT court_id, the_date, facility_id, template_start, template_end, 
               price_cents, slot_duration_minutes, template_source
        FROM one_time_templates
        UNION ALL
        SELECT court_id, the_date, facility_id, template_start, template_end, 
               price_cents, slot_duration_minutes, template_source
        FROM recurring_deduped
    ),
    -- Generate individual slots from templates
    generated_slots AS (
        SELECT 
            t.court_id,
            t.the_date,
            t.facility_id,
            (t.template_start + (gs.slot_num * (t.slot_duration_minutes || ' minutes')::INTERVAL))::TIME AS slot_start,
            (t.template_start + ((gs.slot_num + 1) * (t.slot_duration_minutes || ' minutes')::INTERVAL))::TIME AS slot_end,
            t.price_cents,
            t.template_source
        FROM all_templates t
        CROSS JOIN LATERAL generate_series(
            0, 
            GREATEST(0, (EXTRACT(EPOCH FROM (t.template_end - t.template_start)) / 60 / t.slot_duration_minutes)::INTEGER - 1)
        ) AS gs(slot_num)
        WHERE (t.template_start + ((gs.slot_num + 1) * (t.slot_duration_minutes || ' minutes')::INTERVAL))::TIME <= t.template_end
    ),
    -- Get all bookings for these courts in the date range
    booked_times AS (
        SELECT b.court_id, b.booking_date, b.start_time, b.end_time
        FROM booking b
        WHERE b.court_id = ANY(p_court_ids)
            AND b.booking_date >= p_date_from
            AND b.booking_date <= p_date_to
            AND b.status NOT IN ('cancelled')
    ),
    -- Get all blocks for these courts/facilities in the date range
    blocked_times AS (
        SELECT 
            COALESCE(ab.court_id, cd.court_id) AS court_id,
            ab.block_date,
            ab.start_time,
            ab.end_time
        FROM availability_block ab
        JOIN court_dates cd ON (
            ab.block_date = cd.the_date
            AND (ab.court_id = cd.court_id OR (ab.court_id IS NULL AND ab.facility_id = cd.facility_id))
        )
        WHERE ab.block_date >= p_date_from AND ab.block_date <= p_date_to
    ),
    -- Get one-time blocked entries
    one_time_blocked AS (
        SELECT 
            COALESCE(ota.court_id, cd.court_id) AS court_id,
            ota.availability_date AS block_date,
            ota.start_time,
            ota.end_time
        FROM court_one_time_availability ota
        JOIN court_dates cd ON (
            ota.availability_date = cd.the_date
            AND (ota.court_id = cd.court_id OR (ota.court_id IS NULL AND ota.facility_id = cd.facility_id))
        )
        WHERE ota.is_available = FALSE
            AND ota.availability_date >= p_date_from 
            AND ota.availability_date <= p_date_to
    )
    -- Return available slots (excluding booked and blocked)
    SELECT 
        gs.court_id AS out_court_id,
        gs.the_date AS out_slot_date,
        gs.slot_start AS out_start_time,
        gs.slot_end AS out_end_time,
        -- Apply pricing rules if any match this slot
        COALESCE(
            (SELECT pr.price_cents 
             FROM pricing_rule pr 
             WHERE (pr.court_id = gs.court_id OR (pr.facility_id = gs.facility_id AND pr.court_id IS NULL))
                 AND gs.the_date >= COALESCE(pr.valid_from, '1900-01-01'::DATE)
                 AND gs.the_date <= COALESCE(pr.valid_until, '2100-01-01'::DATE)
                 AND EXTRACT(DOW FROM gs.the_date)::INTEGER = ANY(pr.days_of_week)
                 AND gs.slot_start >= pr.start_time
                 AND gs.slot_start < pr.end_time
                 AND pr.is_active = TRUE
             ORDER BY CASE WHEN pr.court_id IS NOT NULL THEN 1 ELSE 0 END DESC, pr.priority DESC
             LIMIT 1),
            gs.price_cents
        ) AS out_price_cents,
        gs.template_source AS out_template_source
    FROM generated_slots gs
    -- Exclude booked slots
    WHERE NOT EXISTS (
        SELECT 1 FROM booked_times bt
        WHERE bt.court_id = gs.court_id 
            AND bt.booking_date = gs.the_date
            AND (gs.slot_start, gs.slot_end) OVERLAPS (bt.start_time, bt.end_time)
    )
    -- Exclude blocked slots (from availability_block)
    AND NOT EXISTS (
        SELECT 1 FROM blocked_times bl
        WHERE bl.court_id = gs.court_id
            AND bl.block_date = gs.the_date
            AND (bl.start_time IS NULL OR (gs.slot_start, gs.slot_end) OVERLAPS (bl.start_time, bl.end_time))
    )
    -- Exclude one-time blocked slots
    AND NOT EXISTS (
        SELECT 1 FROM one_time_blocked otb
        WHERE otb.court_id = gs.court_id
            AND otb.block_date = gs.the_date
            AND (gs.slot_start, gs.slot_end) OVERLAPS (otb.start_time, otb.end_time)
    )
    ORDER BY gs.court_id, gs.the_date, gs.slot_start;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_available_slots_batch(UUID[], DATE, DATE) IS 
    'Batched version of get_available_slots for performance optimization.
     Accepts an array of court IDs and a date range, returning all available
     slots for all courts and dates in a single query.
     
     This reduces ~295 HTTP requests (month view with 10 courts) down to 1.
     
     Returns: court_id, slot_date, start_time, end_time, price_cents, template_source
     
     Logic:
     1. Generates all (court, date) combinations
     2. For each, checks if one-time availability exists (overrides recurring)
     3. Gets templates (one-time or recurring based on above)
     4. Generates individual slots from templates
     5. Excludes booked slots, availability blocks, and one-time blocks
     6. Applies pricing rules if defined';
