-- Migration Part 1: Add 'casual' to match_type_enum (if not already present)
-- Note: PostgreSQL requires a commit between adding an enum value and using it,
-- so this is split into two migrations. This one only adds the value.
-- Since match_type_enum is now created with 'casual' from the start, this migration
-- ensures 'casual' exists (idempotent operation).

ALTER TYPE match_type_enum ADD VALUE IF NOT EXISTS 'casual';

