-- ============================================
-- FIX ORGANIZATION_MEMBER ROLE ENUM
-- ============================================
-- This migration changes the organization_member.role column
-- from role_enum to member_role enum, which has the correct values:
-- owner, admin, manager, staff, member
-- ============================================

-- ============================================
-- Step 1: Drop all dependent RLS policies
-- ============================================

-- availability_block policies
DROP POLICY IF EXISTS "availability_block_insert_org_staff" ON availability_block;
DROP POLICY IF EXISTS "availability_block_update_org_staff" ON availability_block;
DROP POLICY IF EXISTS "availability_block_delete_org_staff" ON availability_block;

-- organization_stripe_account policies
DROP POLICY IF EXISTS "org_stripe_insert_org_owner" ON organization_stripe_account;
DROP POLICY IF EXISTS "org_stripe_update_org_owner" ON organization_stripe_account;

-- pricing_rule policies
DROP POLICY IF EXISTS "pricing_rule_insert_org_staff" ON pricing_rule;
DROP POLICY IF EXISTS "pricing_rule_update_org_staff" ON pricing_rule;
DROP POLICY IF EXISTS "pricing_rule_delete_org_staff" ON pricing_rule;

-- cancellation_policy policies
DROP POLICY IF EXISTS "cancellation_policy_insert_org_owner" ON cancellation_policy;
DROP POLICY IF EXISTS "cancellation_policy_update_org_staff" ON cancellation_policy;

-- organization_player_block policies
DROP POLICY IF EXISTS "org_player_block_select_org_staff" ON organization_player_block;
DROP POLICY IF EXISTS "org_player_block_insert_org_staff" ON organization_player_block;
DROP POLICY IF EXISTS "org_player_block_update_org_staff" ON organization_player_block;

-- organization_settings policies
DROP POLICY IF EXISTS "org_settings_insert_org_owner" ON organization_settings;
DROP POLICY IF EXISTS "org_settings_update_org_staff" ON organization_settings;

-- booking policies
DROP POLICY IF EXISTS "booking_insert_org_staff" ON booking;
DROP POLICY IF EXISTS "booking_update_org_staff" ON booking;
DROP POLICY IF EXISTS "booking_delete_org_admin" ON booking;

-- Policies on tables from later migrations (drop only if table exists, for idempotency)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'court_one_time_availability') THEN
    DROP POLICY IF EXISTS "one_time_availability_insert_org_staff" ON court_one_time_availability;
    DROP POLICY IF EXISTS "one_time_availability_update_org_staff" ON court_one_time_availability;
    DROP POLICY IF EXISTS "one_time_availability_delete_org_staff" ON court_one_time_availability;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_notification_preference') THEN
    DROP POLICY IF EXISTS "org_notification_preference_insert_org_admin" ON organization_notification_preference;
    DROP POLICY IF EXISTS "org_notification_preference_update_org_admin" ON organization_notification_preference;
    DROP POLICY IF EXISTS "org_notification_preference_delete_org_admin" ON organization_notification_preference;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_notification_recipient') THEN
    DROP POLICY IF EXISTS "org_notification_recipient_insert_org_admin" ON organization_notification_recipient;
    DROP POLICY IF EXISTS "org_notification_recipient_update_org_admin" ON organization_notification_recipient;
    DROP POLICY IF EXISTS "org_notification_recipient_delete_org_admin" ON organization_notification_recipient;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification') THEN
    DROP POLICY IF EXISTS "notification_select_org_context" ON notification;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profile') THEN
    DROP POLICY IF EXISTS "org_admins_manage_instructors" ON instructor_profile;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program') THEN
    DROP POLICY IF EXISTS "org_staff_manage_programs" ON program;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_session') THEN
    DROP POLICY IF EXISTS "org_staff_manage_sessions" ON program_session;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_session_court') THEN
    DROP POLICY IF EXISTS "org_staff_manage_session_courts" ON program_session_court;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_instructor') THEN
    DROP POLICY IF EXISTS "org_staff_manage_program_instructors" ON program_instructor;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_registration') THEN
    DROP POLICY IF EXISTS "org_staff_view_registrations" ON program_registration;
    DROP POLICY IF EXISTS "org_staff_manage_registrations" ON program_registration;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registration_payment') THEN
    DROP POLICY IF EXISTS "org_staff_manage_payments" ON registration_payment;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_waitlist') THEN
    DROP POLICY IF EXISTS "org_staff_manage_waitlist" ON program_waitlist;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_attendance') THEN
    DROP POLICY IF EXISTS "org_staff_manage_attendance" ON session_attendance;
  END IF;
END $$;

-- ============================================
-- Step 2: Migrate the column type
-- ============================================

-- Add a temporary column with the new type (IF NOT EXISTS for idempotency)
ALTER TABLE organization_member
    ADD COLUMN IF NOT EXISTS role_new member_role;

-- Migrate existing data, mapping old values to new values
-- role_enum: admin, staff, player, coach, owner
-- member_role: owner, admin, manager, staff, member
UPDATE organization_member SET role_new =
    CASE role::text
        WHEN 'owner' THEN 'owner'::member_role
        WHEN 'admin' THEN 'admin'::member_role
        WHEN 'staff' THEN 'staff'::member_role
        WHEN 'player' THEN 'member'::member_role
        WHEN 'coach' THEN 'staff'::member_role  -- map coach to staff
        ELSE 'member'::member_role
    END;

-- Drop the old column
ALTER TABLE organization_member DROP COLUMN role;

-- Rename the new column to role
ALTER TABLE organization_member RENAME COLUMN role_new TO role;

-- Set NOT NULL constraint and default
ALTER TABLE organization_member
    ALTER COLUMN role SET NOT NULL,
    ALTER COLUMN role SET DEFAULT 'member'::member_role;

-- ============================================
-- Step 3: Recreate all RLS policies
-- ============================================

-- availability_block policies
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

-- booking policies
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

-- Add comment for documentation
COMMENT ON COLUMN organization_member.role IS 'Member role within the organization (owner, admin, manager, staff, member)';

-- ============================================
-- Step 4: Recreate policies dropped in Step 1 (tables from later migrations)
-- Only runs when those tables exist (e.g. re-run after later migrations applied)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'court_one_time_availability') THEN
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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_notification_preference') THEN
    CREATE POLICY "org_notification_preference_insert_org_admin" ON organization_notification_preference
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_member om
          WHERE om.organization_id = organization_notification_preference.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
            AND om.left_at IS NULL
        )
      );
    CREATE POLICY "org_notification_preference_update_org_admin" ON organization_notification_preference
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM organization_member om
          WHERE om.organization_id = organization_notification_preference.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
            AND om.left_at IS NULL
        )
      );
    CREATE POLICY "org_notification_preference_delete_org_admin" ON organization_notification_preference
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM organization_member om
          WHERE om.organization_id = organization_notification_preference.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
            AND om.left_at IS NULL
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_notification_recipient') THEN
    CREATE POLICY "org_notification_recipient_insert_org_admin" ON organization_notification_recipient
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_member om
          WHERE om.organization_id = organization_notification_recipient.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
            AND om.left_at IS NULL
        )
      );
    CREATE POLICY "org_notification_recipient_update_org_admin" ON organization_notification_recipient
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM organization_member om
          WHERE om.organization_id = organization_notification_recipient.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
            AND om.left_at IS NULL
        )
      );
    CREATE POLICY "org_notification_recipient_delete_org_admin" ON organization_notification_recipient
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM organization_member om
          WHERE om.organization_id = organization_notification_recipient.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
            AND om.left_at IS NULL
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification') THEN
    CREATE POLICY "notification_select_org_context" ON notification
      FOR SELECT USING (
        auth.uid() = user_id
        OR (
          organization_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = notification.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('admin', 'owner')
              AND om.left_at IS NULL
          )
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profile') THEN
    CREATE POLICY "org_admins_manage_instructors" ON instructor_profile
      FOR ALL USING (
        organization_id IN (
          SELECT organization_id FROM organization_member
          WHERE user_id = auth.uid()
          AND role IN ('admin', 'owner')
        )
      );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program') THEN
    CREATE POLICY "org_staff_manage_programs" ON program
      FOR ALL USING (
        organization_id IN (
          SELECT organization_id FROM organization_member
          WHERE user_id = auth.uid()
          AND role IN ('admin', 'owner', 'staff')
        )
      );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_session') THEN
    CREATE POLICY "org_staff_manage_sessions" ON program_session
      FOR ALL USING (
        program_id IN (
          SELECT id FROM program WHERE organization_id IN (
            SELECT organization_id FROM organization_member
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner', 'staff')
          )
        )
      );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_session_court') THEN
    CREATE POLICY "org_staff_manage_session_courts" ON program_session_court
      FOR ALL USING (
        session_id IN (
          SELECT ps.id FROM program_session ps
          JOIN program p ON ps.program_id = p.id
          WHERE p.organization_id IN (
            SELECT organization_id FROM organization_member
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner', 'staff')
          )
        )
      );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_instructor') THEN
    CREATE POLICY "org_staff_manage_program_instructors" ON program_instructor
      FOR ALL USING (
        program_id IN (
          SELECT id FROM program WHERE organization_id IN (
            SELECT organization_id FROM organization_member
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner', 'staff')
          )
        )
      );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_registration') THEN
    CREATE POLICY "org_staff_view_registrations" ON program_registration
      FOR SELECT USING (
        program_id IN (
          SELECT id FROM program WHERE organization_id IN (
            SELECT organization_id FROM organization_member
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner', 'staff')
          )
        )
      );
    CREATE POLICY "org_staff_manage_registrations" ON program_registration
      FOR ALL USING (
        program_id IN (
          SELECT id FROM program WHERE organization_id IN (
            SELECT organization_id FROM organization_member
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner', 'staff')
          )
        )
      );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registration_payment') THEN
    CREATE POLICY "org_staff_manage_payments" ON registration_payment
      FOR ALL USING (
        registration_id IN (
          SELECT pr.id FROM program_registration pr
          JOIN program p ON pr.program_id = p.id
          WHERE p.organization_id IN (
            SELECT organization_id FROM organization_member
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner', 'staff')
          )
        )
      );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_waitlist') THEN
    CREATE POLICY "org_staff_manage_waitlist" ON program_waitlist
      FOR ALL USING (
        program_id IN (
          SELECT id FROM program WHERE organization_id IN (
            SELECT organization_id FROM organization_member
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner', 'staff')
          )
        )
      );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_attendance') THEN
    CREATE POLICY "org_staff_manage_attendance" ON session_attendance
      FOR ALL USING (
        session_id IN (
          SELECT ps.id FROM program_session ps
          JOIN program p ON ps.program_id = p.id
          WHERE p.organization_id IN (
            SELECT organization_id FROM organization_member
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner', 'staff')
          )
        )
      );
  END IF;
END $$;
