-- =============================================================================
-- Add program_session_court junction table and migrate from single-court schema
-- =============================================================================

-- Create program_session_court table if it doesn't exist
CREATE TABLE IF NOT EXISTS program_session_court (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES program_session(id) ON DELETE CASCADE,
  court_id UUID NOT NULL REFERENCES court(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES booking(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_session_court UNIQUE (session_id, court_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_program_session_court_session ON program_session_court(session_id);
CREATE INDEX IF NOT EXISTS idx_program_session_court_court ON program_session_court(court_id);
CREATE INDEX IF NOT EXISTS idx_program_session_court_booking ON program_session_court(booking_id);

-- Migrate existing data from program_session.court_id to program_session_court
-- Only migrate if court_id column exists and there's data to migrate
DO $$
BEGIN
  -- Check if court_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'program_session' 
    AND column_name = 'court_id'
  ) THEN
    -- Migrate existing court assignments
    INSERT INTO program_session_court (session_id, court_id, booking_id, created_at)
    SELECT id, court_id, booking_id, created_at
    FROM program_session
    WHERE court_id IS NOT NULL
    ON CONFLICT (session_id, court_id) DO NOTHING;
    
    -- Drop old indexes if they exist
    DROP INDEX IF EXISTS idx_program_session_court;
    DROP INDEX IF EXISTS idx_program_session_booking;
    
    -- Drop old columns
    ALTER TABLE program_session DROP COLUMN IF EXISTS court_id;
    ALTER TABLE program_session DROP COLUMN IF EXISTS booking_id;
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE program_session_court IS 'Links program sessions to courts (supports multiple courts per session)';
COMMENT ON COLUMN program_session_court.booking_id IS 'Reference to booking created when auto_block_courts is enabled';

-- Enable RLS if not already enabled
ALTER TABLE program_session_court ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  -- View session courts policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'program_session_court' 
    AND policyname = 'view_session_courts'
  ) THEN
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
  END IF;

  -- Staff manage session courts policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'program_session_court' 
    AND policyname = 'org_staff_manage_session_courts'
  ) THEN
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

  -- Service role bypass policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'program_session_court' 
    AND policyname = 'service_role_all_program_session_court'
  ) THEN
    CREATE POLICY "service_role_all_program_session_court" ON program_session_court
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
