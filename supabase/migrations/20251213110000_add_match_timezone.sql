-- Add timezone column to match table
-- Stores IANA timezone string (e.g., "America/New_York", "Europe/Paris")
-- This allows us to store local time + timezone for accurate scheduling

ALTER TABLE match ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Add a comment for documentation
COMMENT ON COLUMN match.timezone IS 'IANA timezone identifier (e.g., America/New_York) for the match location';

-- Create an index for potential timezone-based queries
CREATE INDEX IF NOT EXISTS idx_match_timezone ON match(timezone);

