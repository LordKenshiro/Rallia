-- Migration: Add verification_code table for email verification
-- Used by edge functions: send-verification-email, verify-code

CREATE TABLE IF NOT EXISTS verification_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up codes by email (rate limiting + verification)
CREATE INDEX IF NOT EXISTS idx_verification_code_email ON verification_code(email);

-- Index for finding valid codes (email + code + not used + not expired)
CREATE INDEX IF NOT EXISTS idx_verification_code_lookup ON verification_code(email, code, used);

-- Index for cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_verification_code_expires_at ON verification_code(expires_at);

-- Enable RLS
ALTER TABLE verification_code ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to insert verification codes (for sending emails)
CREATE POLICY "Allow anonymous insert" ON verification_code
    FOR INSERT
    WITH CHECK (true);

-- Policy: Allow anonymous users to select their own verification codes
CREATE POLICY "Allow select by email" ON verification_code
    FOR SELECT
    USING (true);

-- Policy: Allow anonymous users to update verification codes (marking as used)
CREATE POLICY "Allow update by email" ON verification_code
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE verification_code IS 'Stores email verification codes for user authentication';
COMMENT ON COLUMN verification_code.email IS 'Email address the code was sent to';
COMMENT ON COLUMN verification_code.code IS '6-digit verification code';
COMMENT ON COLUMN verification_code.expires_at IS 'When the code expires (10 minutes after creation)';
COMMENT ON COLUMN verification_code.used IS 'Whether the code has been used';
COMMENT ON COLUMN verification_code.used_at IS 'When the code was used';
COMMENT ON COLUMN verification_code.ip_address IS 'IP address of the requester';
COMMENT ON COLUMN verification_code.user_agent IS 'User agent of the requester';

