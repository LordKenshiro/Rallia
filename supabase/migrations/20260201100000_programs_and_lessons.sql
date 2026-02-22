-- =============================================================================
-- PROGRAMS & LESSONS FEATURE
-- =============================================================================
-- This migration adds support for multi-session programs (clinics, camps),
-- single lessons, instructor management, registration with payments, and waitlists.
-- =============================================================================

-- =============================================================================
-- ENUMS (create only if not exists for idempotency)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'program_type_enum') THEN
    CREATE TYPE program_type_enum AS ENUM ('program', 'lesson');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'program_status_enum') THEN
    CREATE TYPE program_status_enum AS ENUM ('draft', 'published', 'cancelled', 'completed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_status_enum') THEN
    CREATE TYPE registration_status_enum AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_plan_enum') THEN
    CREATE TYPE payment_plan_enum AS ENUM ('full', 'installment');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_payment_status_enum') THEN
    CREATE TYPE registration_payment_status_enum AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_type_enum') THEN
    CREATE TYPE booking_type_enum AS ENUM ('player', 'program_session', 'maintenance');
  END IF;
END$$;

-- =============================================================================
-- INSTRUCTOR PROFILE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS instructor_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  organization_member_id UUID REFERENCES organization_member(id) ON DELETE SET NULL,

  -- Profile info
  display_name VARCHAR(255) NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  email VARCHAR(255),
  phone VARCHAR(30),

  -- Rates and qualifications
  hourly_rate_cents INTEGER,
  currency VARCHAR(3) DEFAULT 'CAD',
  certifications JSONB DEFAULT '[]'::jsonb,
  specializations JSONB DEFAULT '[]'::jsonb,

  -- Status
  is_external BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_instructor_profile_org ON instructor_profile(organization_id);
CREATE INDEX IF NOT EXISTS idx_instructor_profile_member ON instructor_profile(organization_member_id);
CREATE INDEX IF NOT EXISTS idx_instructor_profile_active ON instructor_profile(organization_id, is_active);

-- Comments
COMMENT ON TABLE instructor_profile IS 'Instructor/coach profiles for organizations';
COMMENT ON COLUMN instructor_profile.organization_member_id IS 'Links to org member for internal instructors, NULL for external';
COMMENT ON COLUMN instructor_profile.is_external IS 'TRUE for guest/external instructors not part of the organization';
COMMENT ON COLUMN instructor_profile.certifications IS 'Array of certification objects: [{name, issuer, date, expires}]';
COMMENT ON COLUMN instructor_profile.specializations IS 'Array of specialization strings: ["tennis", "youth coaching"]';

-- =============================================================================
-- PROGRAM TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS program (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facility(id) ON DELETE SET NULL,
  sport_id UUID REFERENCES sport(id) ON DELETE SET NULL,

  -- Basic info
  type program_type_enum NOT NULL DEFAULT 'program',
  status program_status_enum NOT NULL DEFAULT 'draft',
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Schedule
  start_date DATE NOT NULL,
  end_date DATE,
  registration_opens_at TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,

  -- Capacity
  min_participants INTEGER DEFAULT 1,
  max_participants INTEGER,
  current_participants INTEGER NOT NULL DEFAULT 0,

  -- Pricing
  price_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'CAD',
  allow_installments BOOLEAN NOT NULL DEFAULT FALSE,
  installment_count INTEGER DEFAULT 1,
  deposit_cents INTEGER,

  -- Court blocking
  auto_block_courts BOOLEAN NOT NULL DEFAULT FALSE,

  -- Waitlist
  waitlist_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  waitlist_limit INTEGER,

  -- Eligibility
  age_min INTEGER,
  age_max INTEGER,
  skill_level_min VARCHAR(50),
  skill_level_max VARCHAR(50),

  -- Policy
  cancellation_policy JSONB DEFAULT '{
    "full_refund_days_before_start": 7,
    "partial_refund_days_before_start": 3,
    "partial_refund_percent": 50,
    "no_refund_after_start": true,
    "prorate_by_sessions_attended": true
  }'::jsonb,

  -- Metadata
  cover_image_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_program_org ON program(organization_id);
CREATE INDEX IF NOT EXISTS idx_program_facility ON program(facility_id);
CREATE INDEX IF NOT EXISTS idx_program_status ON program(status);
CREATE INDEX IF NOT EXISTS idx_program_dates ON program(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_program_org_status ON program(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_program_published ON program(organization_id, status, start_date) WHERE status = 'published';

-- Comments
COMMENT ON TABLE program IS 'Multi-session programs (clinics, camps) and single lessons';
COMMENT ON COLUMN program.type IS 'program = multi-session, lesson = single session';
COMMENT ON COLUMN program.current_participants IS 'Denormalized count, updated on registration changes';
COMMENT ON COLUMN program.auto_block_courts IS 'When TRUE, sessions automatically create bookings to block courts';
COMMENT ON COLUMN program.cancellation_policy IS 'JSON policy for refund calculations';

-- =============================================================================
-- PROGRAM SESSION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS program_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES program(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL DEFAULT 1,

  -- Schedule
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Location (off-site override only, courts are in junction table)
  location_override TEXT,

  -- Status
  notes TEXT,
  is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_session_times CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_program_session_program ON program_session(program_id);
CREATE INDEX IF NOT EXISTS idx_program_session_date ON program_session(date);
-- Only create if session_number exists (column removed in 20260202000000_remove_session_number)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'program_session' AND column_name = 'session_number'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_program_session_number ON program_session(program_id, session_number);
  END IF;
END $$;

-- Comments
COMMENT ON TABLE program_session IS 'Individual sessions within a program';
COMMENT ON COLUMN program_session.location_override IS 'Custom location text for off-site sessions';

-- =============================================================================
-- PROGRAM SESSION COURT (MANY-TO-MANY) - Supports multiple courts per session
-- =============================================================================

CREATE TABLE IF NOT EXISTS program_session_court (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES program_session(id) ON DELETE CASCADE,
  court_id UUID NOT NULL REFERENCES court(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES booking(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_session_court UNIQUE (session_id, court_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_program_session_court_session ON program_session_court(session_id);
CREATE INDEX IF NOT EXISTS idx_program_session_court_court ON program_session_court(court_id);
CREATE INDEX IF NOT EXISTS idx_program_session_court_booking ON program_session_court(booking_id);

-- Comments
COMMENT ON TABLE program_session_court IS 'Links program sessions to courts (supports multiple courts per session)';
COMMENT ON COLUMN program_session_court.booking_id IS 'Reference to booking created when auto_block_courts is enabled';

-- =============================================================================
-- PROGRAM INSTRUCTOR (MANY-TO-MANY)
-- =============================================================================

CREATE TABLE IF NOT EXISTS program_instructor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES program(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES instructor_profile(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_program_instructor UNIQUE (program_id, instructor_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_program_instructor_program ON program_instructor(program_id);
CREATE INDEX IF NOT EXISTS idx_program_instructor_instructor ON program_instructor(instructor_id);

-- Comments
COMMENT ON TABLE program_instructor IS 'Links programs to their assigned instructors';
COMMENT ON COLUMN program_instructor.is_primary IS 'Primary/lead instructor for the program';

-- =============================================================================
-- PROGRAM REGISTRATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS program_registration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES program(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  registered_by UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,

  -- Status
  status registration_status_enum NOT NULL DEFAULT 'pending',
  payment_plan payment_plan_enum NOT NULL DEFAULT 'full',

  -- Payment tracking
  total_amount_cents INTEGER NOT NULL,
  paid_amount_cents INTEGER NOT NULL DEFAULT 0,
  refund_amount_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'CAD',

  -- Stripe
  stripe_customer_id VARCHAR(255),

  -- Notes
  notes TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(30),

  -- Timestamps
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_program_player UNIQUE (program_id, player_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_program_registration_program ON program_registration(program_id);
CREATE INDEX IF NOT EXISTS idx_program_registration_player ON program_registration(player_id);
CREATE INDEX IF NOT EXISTS idx_program_registration_status ON program_registration(status);
CREATE INDEX IF NOT EXISTS idx_program_registration_program_status ON program_registration(program_id, status);

-- Comments
COMMENT ON TABLE program_registration IS 'Player registrations for programs';
COMMENT ON COLUMN program_registration.registered_by IS 'Profile who completed the registration (could be parent for child)';
COMMENT ON COLUMN program_registration.paid_amount_cents IS 'Total amount paid so far (for installment tracking)';

-- =============================================================================
-- REGISTRATION PAYMENT TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS registration_payment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES program_registration(id) ON DELETE CASCADE,

  -- Payment details
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'CAD',
  installment_number INTEGER NOT NULL DEFAULT 1,
  total_installments INTEGER NOT NULL DEFAULT 1,

  -- Stripe
  stripe_payment_intent_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),

  -- Status
  status registration_payment_status_enum NOT NULL DEFAULT 'pending',
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,

  -- Refund tracking
  refund_amount_cents INTEGER DEFAULT 0,
  refunded_at TIMESTAMPTZ,

  -- Retry tracking
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_registration_payment_registration ON registration_payment(registration_id);
CREATE INDEX IF NOT EXISTS idx_registration_payment_due ON registration_payment(due_date, status);
CREATE INDEX IF NOT EXISTS idx_registration_payment_status ON registration_payment(status);
CREATE INDEX IF NOT EXISTS idx_registration_payment_stripe ON registration_payment(stripe_payment_intent_id);

-- Comments
COMMENT ON TABLE registration_payment IS 'Payment records for program registrations (supports installments)';
COMMENT ON COLUMN registration_payment.installment_number IS '1 = first payment, 2 = second, etc.';
COMMENT ON COLUMN registration_payment.retry_count IS 'Number of failed payment attempts';

-- =============================================================================
-- PROGRAM WAITLIST TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS program_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES program(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,

  -- Position tracking
  position INTEGER NOT NULL,

  -- Promotion tracking
  promoted_at TIMESTAMPTZ,
  promotion_expires_at TIMESTAMPTZ,
  registration_id UUID REFERENCES program_registration(id) ON DELETE SET NULL,

  -- Contact
  notification_sent_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_waitlist_program_player UNIQUE (program_id, player_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_program_waitlist_program ON program_waitlist(program_id);
CREATE INDEX IF NOT EXISTS idx_program_waitlist_player ON program_waitlist(player_id);
CREATE INDEX IF NOT EXISTS idx_program_waitlist_position ON program_waitlist(program_id, position);
CREATE INDEX IF NOT EXISTS idx_program_waitlist_promotion ON program_waitlist(promotion_expires_at) WHERE promoted_at IS NOT NULL;

-- Comments
COMMENT ON TABLE program_waitlist IS 'Waitlist entries for full programs';
COMMENT ON COLUMN program_waitlist.position IS 'FIFO position in the waitlist';
COMMENT ON COLUMN program_waitlist.promotion_expires_at IS 'Deadline to claim spot after being promoted from waitlist';

-- =============================================================================
-- SESSION ATTENDANCE TABLE (OPTIONAL TRACKING)
-- =============================================================================

CREATE TABLE IF NOT EXISTS session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES program_session(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES program_registration(id) ON DELETE CASCADE,

  attended BOOLEAN,
  marked_at TIMESTAMPTZ,
  marked_by UUID REFERENCES profile(id) ON DELETE SET NULL,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_session_attendance UNIQUE (session_id, registration_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_attendance_session ON session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_registration ON session_attendance(registration_id);

-- Comments
COMMENT ON TABLE session_attendance IS 'Optional attendance tracking for program sessions';

-- =============================================================================
-- EXTEND BOOKING TABLE
-- =============================================================================

-- Add booking_type and metadata columns to existing booking table
ALTER TABLE booking
  ADD COLUMN IF NOT EXISTS booking_type booking_type_enum NOT NULL DEFAULT 'player',
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Index for querying program session bookings
CREATE INDEX IF NOT EXISTS idx_booking_type ON booking(booking_type);
CREATE INDEX IF NOT EXISTS idx_booking_metadata_program ON booking((metadata->>'program_id')) WHERE metadata->>'program_id' IS NOT NULL;

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (drop first for idempotency)
DROP TRIGGER IF EXISTS set_instructor_profile_updated_at ON instructor_profile;
CREATE TRIGGER set_instructor_profile_updated_at
  BEFORE UPDATE ON instructor_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_program_updated_at ON program;
CREATE TRIGGER set_program_updated_at
  BEFORE UPDATE ON program
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_program_session_updated_at ON program_session;
CREATE TRIGGER set_program_session_updated_at
  BEFORE UPDATE ON program_session
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_program_registration_updated_at ON program_registration;
CREATE TRIGGER set_program_registration_updated_at
  BEFORE UPDATE ON program_registration
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_registration_payment_updated_at ON registration_payment;
CREATE TRIGGER set_registration_payment_updated_at
  BEFORE UPDATE ON registration_payment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_program_waitlist_updated_at ON program_waitlist;
CREATE TRIGGER set_program_waitlist_updated_at
  BEFORE UPDATE ON program_waitlist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TRIGGER: UPDATE PROGRAM PARTICIPANT COUNT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_program_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE program SET current_participants = current_participants + 1
    WHERE id = NEW.program_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
      UPDATE program SET current_participants = current_participants + 1
      WHERE id = NEW.program_id;
    ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
      UPDATE program SET current_participants = GREATEST(current_participants - 1, 0)
      WHERE id = NEW.program_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    UPDATE program SET current_participants = GREATEST(current_participants - 1, 0)
    WHERE id = OLD.program_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_program_participants ON program_registration;
CREATE TRIGGER update_program_participants
  AFTER INSERT OR UPDATE OR DELETE ON program_registration
  FOR EACH ROW EXECUTE FUNCTION update_program_participant_count();

-- =============================================================================
-- TRIGGER: AUTO-ASSIGN WAITLIST POSITION
-- =============================================================================

CREATE OR REPLACE FUNCTION assign_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position IS NULL OR NEW.position = 0 THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO NEW.position
    FROM program_waitlist
    WHERE program_id = NEW.program_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_waitlist_position ON program_waitlist;
CREATE TRIGGER set_waitlist_position
  BEFORE INSERT ON program_waitlist
  FOR EACH ROW EXECUTE FUNCTION assign_waitlist_position();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE instructor_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE program ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_session_court ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_instructor ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- INSTRUCTOR PROFILE POLICIES (drop first for idempotency)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "org_members_view_instructors" ON instructor_profile;
DROP POLICY IF EXISTS "org_admins_manage_instructors" ON instructor_profile;
DROP POLICY IF EXISTS "instructors_view_own" ON instructor_profile;

-- Organization members can view instructors in their organization
CREATE POLICY "org_members_view_instructors" ON instructor_profile
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_member
      WHERE user_id = auth.uid()
    )
  );

-- Admin/owner can manage instructors
CREATE POLICY "org_admins_manage_instructors" ON instructor_profile
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_member
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Instructors can view their own profile
CREATE POLICY "instructors_view_own" ON instructor_profile
  FOR SELECT USING (
    organization_member_id IN (
      SELECT id FROM organization_member WHERE user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- PROGRAM POLICIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "public_view_published_programs" ON program;
DROP POLICY IF EXISTS "org_members_view_all_programs" ON program;
DROP POLICY IF EXISTS "org_staff_manage_programs" ON program;

-- Anyone can view published programs
CREATE POLICY "public_view_published_programs" ON program
  FOR SELECT USING (status = 'published');

-- Org members can view all programs (including drafts)
CREATE POLICY "org_members_view_all_programs" ON program
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_member
      WHERE user_id = auth.uid()
    )
  );

-- Staff can manage programs
CREATE POLICY "org_staff_manage_programs" ON program
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_member
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'staff')
    )
  );

-- -----------------------------------------------------------------------------
-- PROGRAM SESSION POLICIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "view_sessions" ON program_session;
DROP POLICY IF EXISTS "org_staff_manage_sessions" ON program_session;

-- View sessions for published programs or if org member
CREATE POLICY "view_sessions" ON program_session
  FOR SELECT USING (
    program_id IN (
      SELECT id FROM program WHERE status = 'published'
    )
    OR
    program_id IN (
      SELECT p.id FROM program p
      JOIN organization_member om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Staff can manage sessions
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

-- -----------------------------------------------------------------------------
-- PROGRAM SESSION COURT POLICIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "view_session_courts" ON program_session_court;
DROP POLICY IF EXISTS "org_staff_manage_session_courts" ON program_session_court;

-- View session courts for viewable sessions
CREATE POLICY "view_session_courts" ON program_session_court
  FOR SELECT USING (
    session_id IN (
      SELECT ps.id FROM program_session ps
      JOIN program p ON ps.program_id = p.id
      WHERE p.status = 'published'
    )
    OR
    session_id IN (
      SELECT ps.id FROM program_session ps
      JOIN program p ON ps.program_id = p.id
      JOIN organization_member om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Staff can manage session courts
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

-- -----------------------------------------------------------------------------
-- PROGRAM INSTRUCTOR POLICIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "view_program_instructors" ON program_instructor;
DROP POLICY IF EXISTS "org_staff_manage_program_instructors" ON program_instructor;

-- View instructor assignments for viewable programs
CREATE POLICY "view_program_instructors" ON program_instructor
  FOR SELECT USING (
    program_id IN (
      SELECT id FROM program WHERE status = 'published'
    )
    OR
    program_id IN (
      SELECT p.id FROM program p
      JOIN organization_member om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Staff can manage instructor assignments
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

-- -----------------------------------------------------------------------------
-- PROGRAM REGISTRATION POLICIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "players_view_own_registrations" ON program_registration;
DROP POLICY IF EXISTS "players_create_registrations" ON program_registration;
DROP POLICY IF EXISTS "players_cancel_own_registrations" ON program_registration;
DROP POLICY IF EXISTS "org_staff_view_registrations" ON program_registration;
DROP POLICY IF EXISTS "org_staff_manage_registrations" ON program_registration;

-- Players can view their own registrations
CREATE POLICY "players_view_own_registrations" ON program_registration
  FOR SELECT USING (
    player_id = auth.uid() OR registered_by = auth.uid()
  );

-- Players can create registrations
CREATE POLICY "players_create_registrations" ON program_registration
  FOR INSERT WITH CHECK (
    registered_by = auth.uid()
  );

-- Players can cancel their own registrations
CREATE POLICY "players_cancel_own_registrations" ON program_registration
  FOR UPDATE USING (
    (player_id = auth.uid() OR registered_by = auth.uid())
    AND status NOT IN ('refunded')
  );

-- Staff can view all registrations for their programs
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

-- Staff can manage registrations
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

-- -----------------------------------------------------------------------------
-- REGISTRATION PAYMENT POLICIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "players_view_own_payments" ON registration_payment;
DROP POLICY IF EXISTS "org_staff_manage_payments" ON registration_payment;

-- Players can view their own payments
CREATE POLICY "players_view_own_payments" ON registration_payment
  FOR SELECT USING (
    registration_id IN (
      SELECT id FROM program_registration
      WHERE player_id = auth.uid() OR registered_by = auth.uid()
    )
  );

-- Staff can view/manage all payments
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

-- -----------------------------------------------------------------------------
-- PROGRAM WAITLIST POLICIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "players_view_own_waitlist" ON program_waitlist;
DROP POLICY IF EXISTS "players_join_waitlist" ON program_waitlist;
DROP POLICY IF EXISTS "players_leave_waitlist" ON program_waitlist;
DROP POLICY IF EXISTS "org_staff_manage_waitlist" ON program_waitlist;

-- Players can view their own waitlist entries
CREATE POLICY "players_view_own_waitlist" ON program_waitlist
  FOR SELECT USING (player_id = auth.uid() OR added_by = auth.uid());

-- Players can join waitlist
CREATE POLICY "players_join_waitlist" ON program_waitlist
  FOR INSERT WITH CHECK (added_by = auth.uid());

-- Players can leave waitlist
CREATE POLICY "players_leave_waitlist" ON program_waitlist
  FOR DELETE USING (player_id = auth.uid() OR added_by = auth.uid());

-- Staff can view/manage all waitlist entries
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

-- -----------------------------------------------------------------------------
-- SESSION ATTENDANCE POLICIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "players_view_own_attendance" ON session_attendance;
DROP POLICY IF EXISTS "org_staff_manage_attendance" ON session_attendance;

-- Players can view their own attendance
CREATE POLICY "players_view_own_attendance" ON session_attendance
  FOR SELECT USING (
    registration_id IN (
      SELECT id FROM program_registration
      WHERE player_id = auth.uid() OR registered_by = auth.uid()
    )
  );

-- Staff can manage attendance
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

-- =============================================================================
-- RPC FUNCTIONS
-- =============================================================================

-- Function to update registration paid amount (used by payment processing)
CREATE OR REPLACE FUNCTION update_registration_paid_amount(p_registration_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_paid INTEGER;
BEGIN
  -- Calculate total paid from successful payments
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_paid
  FROM registration_payment
  WHERE registration_id = p_registration_id
  AND status = 'succeeded';

  -- Update registration
  UPDATE program_registration
  SET paid_amount_cents = v_total_paid
  WHERE id = p_registration_id;

  RETURN v_total_paid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SERVICE ROLE BYPASS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "service_role_all_instructor_profile" ON instructor_profile;
DROP POLICY IF EXISTS "service_role_all_program" ON program;
DROP POLICY IF EXISTS "service_role_all_program_session" ON program_session;
DROP POLICY IF EXISTS "service_role_all_program_session_court" ON program_session_court;
DROP POLICY IF EXISTS "service_role_all_program_instructor" ON program_instructor;
DROP POLICY IF EXISTS "service_role_all_program_registration" ON program_registration;
DROP POLICY IF EXISTS "service_role_all_registration_payment" ON registration_payment;
DROP POLICY IF EXISTS "service_role_all_program_waitlist" ON program_waitlist;
DROP POLICY IF EXISTS "service_role_all_session_attendance" ON session_attendance;

-- Allow service role to bypass RLS for cron jobs
CREATE POLICY "service_role_all_instructor_profile" ON instructor_profile
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_program" ON program
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_program_session" ON program_session
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_program_session_court" ON program_session_court
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_program_instructor" ON program_instructor
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_program_registration" ON program_registration
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_registration_payment" ON registration_payment
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_program_waitlist" ON program_waitlist
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_session_attendance" ON session_attendance
  FOR ALL TO service_role USING (true) WITH CHECK (true);
