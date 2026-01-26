-- =============================================================================
-- Migration: Add role and added_by columns to network_member
-- Description: Adds moderator role support and tracking for who added members
-- =============================================================================

-- =============================================================================
-- CREATE TYPE: network_member_role_enum
-- Values: 'member' (default), 'moderator'
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_member_role_enum') THEN
        CREATE TYPE network_member_role_enum AS ENUM ('member', 'moderator');
    END IF;
END $$;

-- =============================================================================
-- ALTER TABLE: Add role column to network_member
-- Values: 'member' (default), 'moderator'
-- =============================================================================
ALTER TABLE public.network_member 
ADD COLUMN IF NOT EXISTS role network_member_role_enum DEFAULT 'member';

-- =============================================================================
-- ALTER TABLE: Add added_by column to network_member
-- Tracks who invited/added the member (NULL if self-joined or creator)
-- =============================================================================
ALTER TABLE public.network_member 
ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES player(id) ON DELETE SET NULL;

-- =============================================================================
-- Set network creators as moderators
-- The person who created the network should automatically be a moderator
-- =============================================================================
UPDATE public.network_member nm
SET role = 'moderator'
FROM public.network n
WHERE nm.network_id = n.id
  AND nm.player_id = n.created_by
  AND nm.role = 'member';

-- =============================================================================
-- Add index for role lookups
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_network_member_role 
ON public.network_member(network_id, role) 
WHERE role = 'moderator';

-- =============================================================================
-- Add comments
-- =============================================================================
COMMENT ON COLUMN public.network_member.role IS 'Member role: member (default) or moderator';
COMMENT ON COLUMN public.network_member.added_by IS 'Player ID of who added this member (NULL for self-join or creator)';
