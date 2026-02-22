-- =============================================================================
-- Remove session_number column from program_session table
-- =============================================================================

-- Drop the unique index first
DROP INDEX IF EXISTS idx_program_session_number;

-- Drop the column
ALTER TABLE program_session DROP COLUMN IF EXISTS session_number;
