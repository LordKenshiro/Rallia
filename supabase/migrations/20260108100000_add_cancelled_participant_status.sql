-- Add 'cancelled' status to match_participant_status_enum
-- This status represents: "host revoked an invitation they previously sent"

ALTER TYPE match_participant_status_enum ADD VALUE 'cancelled';
