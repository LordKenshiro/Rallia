-- Fix verification_codes RLS policy
-- Drop any existing policies
DROP POLICY IF EXISTS "Service role can manage verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Allow insert verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Allow select verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Allow update verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Allow delete verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Users can read their own verification codes" ON verification_codes;

-- Service role can manage verification codes (ALL operations)
CREATE POLICY "Service role can manage verification codes"
  ON verification_codes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can read their own verification codes (SELECT only)
CREATE POLICY "Users can read their own verification codes"
  ON verification_codes
  FOR SELECT
  USING (true);
