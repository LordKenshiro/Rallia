-- ============================================
-- BOOKING TABLE UPDATES AND RLS POLICIES
-- ============================================
-- This migration:
-- 1. Makes court_slot_id nullable (now using court_id as primary reference)
-- 2. Adds Row Level Security policies for the booking table
-- ============================================

-- ============================================
-- SCHEMA UPDATES
-- ============================================

-- Make court_slot_id nullable since we now use court_id for direct booking
ALTER TABLE booking ALTER COLUMN court_slot_id DROP NOT NULL;

-- Make player_id nullable to support guest bookings
ALTER TABLE booking ALTER COLUMN player_id DROP NOT NULL;

-- ============================================
-- SELECT POLICIES
-- ============================================

-- Players can view their own bookings
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'booking' 
        AND policyname = 'booking_select_own'
    ) THEN
        CREATE POLICY "booking_select_own" ON booking
            FOR SELECT USING (
                player_id IS NOT NULL AND player_id = auth.uid()
            );
    END IF;
END $$;

-- Organization staff can view all bookings for courts at their facilities
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'booking' 
        AND policyname = 'booking_select_org_staff'
    ) THEN
        CREATE POLICY "booking_select_org_staff" ON booking
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM court c
                    JOIN facility f ON f.id = c.facility_id
                    JOIN organization_member om ON om.organization_id = f.organization_id
                    WHERE c.id = booking.court_id
                        AND om.user_id = auth.uid()
                        AND om.left_at IS NULL
                )
            );
    END IF;
END $$;

-- ============================================
-- INSERT POLICIES
-- ============================================

-- Players can create bookings for themselves
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'booking' 
        AND policyname = 'booking_insert_own'
    ) THEN
        CREATE POLICY "booking_insert_own" ON booking
            FOR INSERT WITH CHECK (
                player_id IS NOT NULL AND player_id = auth.uid()
            );
    END IF;
END $$;

-- Organization staff can create bookings for any player at their facilities
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'booking' 
        AND policyname = 'booking_insert_org_staff'
    ) THEN
        CREATE POLICY "booking_insert_org_staff" ON booking
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM court c
                    JOIN facility f ON f.id = c.facility_id
                    JOIN organization_member om ON om.organization_id = f.organization_id
                    WHERE c.id = booking.court_id
                        AND om.user_id = auth.uid()
                        AND om.left_at IS NULL
                        AND om.role IN ('owner', 'admin', 'staff')
                )
            );
    END IF;
END $$;

-- ============================================
-- UPDATE POLICIES
-- ============================================

-- Players can update their own bookings (limited to certain fields via app logic)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'booking' 
        AND policyname = 'booking_update_own'
    ) THEN
        CREATE POLICY "booking_update_own" ON booking
            FOR UPDATE USING (
                player_id IS NOT NULL AND player_id = auth.uid()
            );
    END IF;
END $$;

-- Organization staff can update bookings at their facilities
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'booking' 
        AND policyname = 'booking_update_org_staff'
    ) THEN
        CREATE POLICY "booking_update_org_staff" ON booking
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM court c
                    JOIN facility f ON f.id = c.facility_id
                    JOIN organization_member om ON om.organization_id = f.organization_id
                    WHERE c.id = booking.court_id
                        AND om.user_id = auth.uid()
                        AND om.left_at IS NULL
                        AND om.role IN ('owner', 'admin', 'staff')
                )
            );
    END IF;
END $$;

-- ============================================
-- DELETE POLICIES
-- ============================================

-- Only organization admins can delete bookings (soft delete via status preferred)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'booking' 
        AND policyname = 'booking_delete_org_admin'
    ) THEN
        CREATE POLICY "booking_delete_org_admin" ON booking
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM court c
                    JOIN facility f ON f.id = c.facility_id
                    JOIN organization_member om ON om.organization_id = f.organization_id
                    WHERE c.id = booking.court_id
                        AND om.user_id = auth.uid()
                        AND om.left_at IS NULL
                        AND om.role IN ('owner', 'admin')
                )
            );
    END IF;
END $$;
