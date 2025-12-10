-- Verification Codes Table Migration
-- Used for email verification during authentication flow

CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only allow service role to manage verification codes
-- (verification codes are managed server-side, not directly by users)
CREATE POLICY "Service role can manage verification codes"
  ON verification_codes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE verification_codes IS 'Stores temporary verification codes for email authentication';
COMMENT ON COLUMN verification_codes.email IS 'Email address the code was sent to';
COMMENT ON COLUMN verification_codes.code IS 'The verification code';
COMMENT ON COLUMN verification_codes.expires_at IS 'When the code expires';
COMMENT ON COLUMN verification_codes.used IS 'Whether the code has been used';
COMMENT ON COLUMN verification_codes.used_at IS 'When the code was used';
COMMENT ON COLUMN verification_codes.ip_address IS 'IP address of the request';
COMMENT ON COLUMN verification_codes.user_agent IS 'User agent of the request';
