-- ============================================================================
-- Drop unused verification_code table
-- ============================================================================
-- The verification_code table was used by custom edge functions for email
-- verification that have been replaced with Supabase's native OTP flow.
-- ============================================================================

-- Drop the table and all associated objects
DROP TABLE IF EXISTS public.verification_code CASCADE;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Dropped unused verification_code table';
END $$;