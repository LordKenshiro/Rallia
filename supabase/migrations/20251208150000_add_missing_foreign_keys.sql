-- Migration: Add Missing Foreign Key Constraints
-- This migration adds foreign key constraints that are missing from the database schema
-- to ensure referential integrity across all relations

-- ============================================
-- CLEANUP: Remove orphaned data before adding constraints
-- ============================================

-- Only perform cleanup if the tables exist
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Remove orphaned rating records that reference non-existent sports
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rating') THEN
        DELETE FROM rating 
        WHERE sport_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM sport WHERE sport.id = rating.sport_id
        );
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE 'Deleted % orphaned rating records', deleted_count;
        END IF;
    END IF;

    -- Remove orphaned player_sport records that reference non-existent sports
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_sport') THEN
        DELETE FROM player_sport 
        WHERE sport_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM sport WHERE sport.id = player_sport.sport_id
        );
    END IF;

    -- Remove orphaned match records that reference non-existent sports
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match') THEN
        DELETE FROM match 
        WHERE sport_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM sport WHERE sport.id = match.sport_id
        );
    END IF;

    -- Remove orphaned court_slot records that reference non-existent courts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'court_slot') THEN
        DELETE FROM court_slot 
        WHERE court_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM court WHERE court.id = court_slot.court_id
        );
    END IF;

    -- Remove orphaned file records that reference non-existent profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file') THEN
        DELETE FROM file 
        WHERE uploaded_by IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM profile WHERE profile.id = file.uploaded_by
        );
    END IF;

    -- Remove orphaned invitation records (check each column separately)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitation') THEN
        -- Check inviter_id column
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitation' AND column_name = 'inviter_id') THEN
            UPDATE invitation SET inviter_id = NULL 
            WHERE inviter_id IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM profile WHERE profile.id = invitation.inviter_id);
        END IF;
        -- Check invited_user_id column
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitation' AND column_name = 'invited_user_id') THEN
            UPDATE invitation SET invited_user_id = NULL 
            WHERE invited_user_id IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM profile WHERE profile.id = invitation.invited_user_id);
        END IF;
        -- Check organization_id column - delete invitations to non-existent orgs
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitation' AND column_name = 'organization_id') THEN
            DELETE FROM invitation 
            WHERE organization_id IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM organization WHERE organization.id = invitation.organization_id);
        END IF;
        -- Check revoked_by column
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitation' AND column_name = 'revoked_by') THEN
            UPDATE invitation SET revoked_by = NULL 
            WHERE revoked_by IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM profile WHERE profile.id = invitation.revoked_by);
        END IF;
    END IF;

    -- Remove orphaned notification records (check which column exists first)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification') THEN
        -- Check if user_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification' AND column_name = 'user_id') THEN
            DELETE FROM notification 
            WHERE user_id IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM profile WHERE profile.id = notification.user_id);
        END IF;
        -- Check if player_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification' AND column_name = 'player_id') THEN
            DELETE FROM notification 
            WHERE player_id IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM player WHERE player.id = notification.player_id);
        END IF;
    END IF;

    -- Remove orphaned organization records that reference non-existent profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization') THEN
        UPDATE organization 
        SET owner_id = NULL 
        WHERE owner_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM profile WHERE profile.id = organization.owner_id
        );
    END IF;

    -- Remove orphaned organization_member records (check each column separately)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_member') THEN
        -- Check user_id column
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_member' AND column_name = 'user_id') THEN
            DELETE FROM organization_member 
            WHERE user_id IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM profile WHERE profile.id = organization_member.user_id);
        END IF;
        -- Check organization_id column
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_member' AND column_name = 'organization_id') THEN
            DELETE FROM organization_member 
            WHERE organization_id IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM organization WHERE organization.id = organization_member.organization_id);
        END IF;
        -- Check invited_by column
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_member' AND column_name = 'invited_by') THEN
            UPDATE organization_member 
            SET invited_by = NULL 
            WHERE invited_by IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM profile WHERE profile.id = organization_member.invited_by);
        END IF;
    END IF;

    -- Remove orphaned player_availability records
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_availability') THEN
        DELETE FROM player_availability 
        WHERE player_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM player WHERE player.id = player_availability.player_id
        );
    END IF;

    -- Remove orphaned rating_proof records
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rating_proof') THEN
        UPDATE rating_proof 
        SET reviewed_by = NULL 
        WHERE reviewed_by IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM profile WHERE profile.id = rating_proof.reviewed_by
        );
    END IF;
END $$;

-- ============================================
-- PLAYER_SPORT TABLE
-- ============================================

-- Add missing sport_id foreign key to player_sport
-- This was defined in the initial schema but may have been lost during migrations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'player_sport_sport_id_fkey'
        AND table_name = 'player_sport'
    ) THEN
        ALTER TABLE player_sport
        ADD CONSTRAINT player_sport_sport_id_fkey
        FOREIGN KEY (sport_id) REFERENCES sport(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- COURT_SLOT TABLE
-- ============================================

-- Add missing court_id foreign key to court_slot
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'court_slot_court_id_fkey'
        AND table_name = 'court_slot'
    ) THEN
        ALTER TABLE court_slot
        ADD CONSTRAINT court_slot_court_id_fkey
        FOREIGN KEY (court_id) REFERENCES court(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- RATING TABLE
-- ============================================

-- Add missing sport_id foreign key to rating
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'rating_sport_id_fkey'
        AND table_name = 'rating'
    ) THEN
        ALTER TABLE rating
        ADD CONSTRAINT rating_sport_id_fkey
        FOREIGN KEY (sport_id) REFERENCES sport(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- MATCH TABLE
-- ============================================

-- Add missing sport_id foreign key to match
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'match_sport_id_fkey'
        AND table_name = 'match'
    ) THEN
        ALTER TABLE match
        ADD CONSTRAINT match_sport_id_fkey
        FOREIGN KEY (sport_id) REFERENCES sport(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- FILE TABLE
-- ============================================

-- Add missing uploaded_by foreign key to file
-- References profile(id) as files can be uploaded by any user
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'file_uploaded_by_fkey'
        AND table_name = 'file'
    ) THEN
        ALTER TABLE file
        ADD CONSTRAINT file_uploaded_by_fkey
        FOREIGN KEY (uploaded_by) REFERENCES profile(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- INVITATION TABLE
-- ============================================

-- Add missing inviter_id foreign key to invitation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'invitation_inviter_id_fkey'
        AND table_name = 'invitation'
    ) THEN
        ALTER TABLE invitation
        ADD CONSTRAINT invitation_inviter_id_fkey
        FOREIGN KEY (inviter_id) REFERENCES profile(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add missing invited_user_id foreign key to invitation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'invitation_invited_user_id_fkey'
        AND table_name = 'invitation'
    ) THEN
        ALTER TABLE invitation
        ADD CONSTRAINT invitation_invited_user_id_fkey
        FOREIGN KEY (invited_user_id) REFERENCES profile(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add missing organization_id foreign key to invitation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'invitation_organization_id_fkey'
        AND table_name = 'invitation'
    ) THEN
        ALTER TABLE invitation
        ADD CONSTRAINT invitation_organization_id_fkey
        FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add missing revoked_by foreign key to invitation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'invitation_revoked_by_fkey'
        AND table_name = 'invitation'
    ) THEN
        ALTER TABLE invitation
        ADD CONSTRAINT invitation_revoked_by_fkey
        FOREIGN KEY (revoked_by) REFERENCES profile(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- NOTIFICATION TABLE
-- ============================================

-- Add missing user_id foreign key to notification
-- Note: The initial schema uses player_id, but current schema shows user_id
-- We'll check which column exists and add the appropriate foreign key
DO $$
BEGIN
    -- Check if user_id column exists (newer schema)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification' 
        AND column_name = 'user_id'
    ) THEN
        -- Add foreign key for user_id (references profile)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'notification_user_id_fkey'
            AND table_name = 'notification'
        ) THEN
            ALTER TABLE notification
            ADD CONSTRAINT notification_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES profile(id) ON DELETE CASCADE;
        END IF;
    -- Check if player_id column exists (older schema)
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification' 
        AND column_name = 'player_id'
    ) THEN
        -- Add foreign key for player_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'notification_player_id_fkey'
            AND table_name = 'notification'
        ) THEN
            ALTER TABLE notification
            ADD CONSTRAINT notification_player_id_fkey
            FOREIGN KEY (player_id) REFERENCES player(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- ============================================
-- ORGANIZATION TABLE
-- ============================================

-- Add missing owner_id foreign key to organization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_owner_id_fkey'
        AND table_name = 'organization'
    ) THEN
        ALTER TABLE organization
        ADD CONSTRAINT organization_owner_id_fkey
        FOREIGN KEY (owner_id) REFERENCES profile(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- ORGANIZATION_MEMBER TABLE
-- ============================================

-- Add missing user_id foreign key to organization_member
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_member_user_id_fkey'
        AND table_name = 'organization_member'
    ) THEN
        ALTER TABLE organization_member
        ADD CONSTRAINT organization_member_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES profile(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add missing organization_id foreign key to organization_member
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_member_organization_id_fkey'
        AND table_name = 'organization_member'
    ) THEN
        ALTER TABLE organization_member
        ADD CONSTRAINT organization_member_organization_id_fkey
        FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add missing invited_by foreign key to organization_member
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_member_invited_by_fkey'
        AND table_name = 'organization_member'
    ) THEN
        ALTER TABLE organization_member
        ADD CONSTRAINT organization_member_invited_by_fkey
        FOREIGN KEY (invited_by) REFERENCES profile(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- PLAYER_AVAILABILITY TABLE
-- ============================================

-- Add missing player_id foreign key to player_availability
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'player_availability_player_id_fkey'
        AND table_name = 'player_availability'
    ) THEN
        ALTER TABLE player_availability
        ADD CONSTRAINT player_availability_player_id_fkey
        FOREIGN KEY (player_id) REFERENCES player(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- RATING_PROOF TABLE
-- ============================================

-- Add missing reviewed_by foreign key to rating_proof
-- This references profile(id) as admins are also profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name IN ('rating_proof_reviewed_by_fkey', 'rating_proofs_reviewed_by_fkey')
        AND table_name = 'rating_proof'
    ) THEN
        ALTER TABLE rating_proof
        ADD CONSTRAINT rating_proof_reviewed_by_fkey
        FOREIGN KEY (reviewed_by) REFERENCES profile(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON CONSTRAINT player_sport_sport_id_fkey ON player_sport IS 'Foreign key reference to sport table';
COMMENT ON CONSTRAINT court_slot_court_id_fkey ON court_slot IS 'Foreign key reference to court table';
COMMENT ON CONSTRAINT rating_sport_id_fkey ON rating IS 'Foreign key reference to sport table';
COMMENT ON CONSTRAINT match_sport_id_fkey ON match IS 'Foreign key reference to sport table';
COMMENT ON CONSTRAINT file_uploaded_by_fkey ON file IS 'Foreign key reference to profile table (user who uploaded the file)';
COMMENT ON CONSTRAINT invitation_inviter_id_fkey ON invitation IS 'Foreign key reference to profile table (user who sent the invitation)';
COMMENT ON CONSTRAINT invitation_invited_user_id_fkey ON invitation IS 'Foreign key reference to profile table (user who accepted the invitation)';
COMMENT ON CONSTRAINT invitation_organization_id_fkey ON invitation IS 'Foreign key reference to organization table';
COMMENT ON CONSTRAINT invitation_revoked_by_fkey ON invitation IS 'Foreign key reference to profile table (user who revoked the invitation)';
COMMENT ON CONSTRAINT organization_owner_id_fkey ON organization IS 'Foreign key reference to profile table (organization owner)';
COMMENT ON CONSTRAINT organization_member_user_id_fkey ON organization_member IS 'Foreign key reference to profile table';
COMMENT ON CONSTRAINT organization_member_organization_id_fkey ON organization_member IS 'Foreign key reference to organization table';
COMMENT ON CONSTRAINT organization_member_invited_by_fkey ON organization_member IS 'Foreign key reference to profile table (user who invited the member)';
COMMENT ON CONSTRAINT player_availability_player_id_fkey ON player_availability IS 'Foreign key reference to player table';
COMMENT ON CONSTRAINT rating_proof_reviewed_by_fkey ON rating_proof IS 'Foreign key reference to profile table (admin who reviewed the proof)';

