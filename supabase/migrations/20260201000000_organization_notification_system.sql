-- ============================================================================
-- ORGANIZATION NOTIFICATION SYSTEM
-- ============================================================================
-- This migration adds organization-level notification support including:
-- 1. New notification types for organization events
-- 2. Organization notification preferences table
-- 3. Organization notification recipients table
-- 4. RLS policies for organization access control
-- ============================================================================

-- ============================================================================
-- PART 1: ADD ORGANIZATION NOTIFICATION TYPES
-- ============================================================================

-- Staff notifications (alerts for org admins/staff)
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'booking_created';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'booking_cancelled_by_player';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'booking_modified';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'new_member_joined';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'member_left';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'member_role_changed';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'payment_received';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'payment_failed';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'refund_processed';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'daily_summary';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'weekly_report';

-- Member notifications (sent to org members/players)
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'booking_confirmed';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'booking_reminder';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'booking_cancelled_by_org';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'membership_approved';
ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'org_announcement';

-- ============================================================================
-- PART 2: CREATE ORGANIZATION NOTIFICATION PREFERENCE TABLE
-- ============================================================================

-- Stores organization-level notification preferences per type and channel
-- Uses sparse storage: only explicit customizations are stored
-- Missing rows fall back to system defaults
CREATE TABLE IF NOT EXISTS organization_notification_preference (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    notification_type notification_type_enum NOT NULL,
    channel delivery_channel_enum NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    -- Which roles should receive this notification type (NULL = all org members)
    recipient_roles role_enum[] DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique constraint: one preference per org/type/channel combination
    CONSTRAINT uq_org_notification_preference UNIQUE (organization_id, notification_type, channel)
);

-- Indexes for efficient preference lookups
CREATE INDEX IF NOT EXISTS idx_org_notification_preference_org 
    ON organization_notification_preference(organization_id);

CREATE INDEX IF NOT EXISTS idx_org_notification_preference_org_type 
    ON organization_notification_preference(organization_id, notification_type);

-- ============================================================================
-- PART 3: CREATE ORGANIZATION NOTIFICATION RECIPIENT TABLE
-- ============================================================================

-- Override recipients for specific notification types
-- Allows organizations to designate specific users for certain notifications
CREATE TABLE IF NOT EXISTS organization_notification_recipient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    notification_type notification_type_enum NOT NULL,
    user_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique constraint: one entry per org/type/user combination
    CONSTRAINT uq_org_notification_recipient UNIQUE (organization_id, notification_type, user_id)
);

-- Indexes for efficient recipient lookups
CREATE INDEX IF NOT EXISTS idx_org_notification_recipient_org 
    ON organization_notification_recipient(organization_id);

CREATE INDEX IF NOT EXISTS idx_org_notification_recipient_org_type 
    ON organization_notification_recipient(organization_id, notification_type);

CREATE INDEX IF NOT EXISTS idx_org_notification_recipient_user 
    ON organization_notification_recipient(user_id);

-- ============================================================================
-- PART 4: ADD ORGANIZATION CONTEXT TO NOTIFICATION TABLE
-- ============================================================================

-- Add organization_id column to notification table for org-context notifications
ALTER TABLE notification 
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organization(id) ON DELETE CASCADE;

-- Index for efficient org notification queries
CREATE INDEX IF NOT EXISTS idx_notification_organization 
    ON notification(organization_id) 
    WHERE organization_id IS NOT NULL;

-- Composite index for org + user queries
CREATE INDEX IF NOT EXISTS idx_notification_org_user 
    ON notification(organization_id, user_id) 
    WHERE organization_id IS NOT NULL;

-- ============================================================================
-- PART 5: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE organization_notification_preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_notification_recipient ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- organization_notification_preference policies
-- ============================================================================

-- Org members can view their organization's notification preferences
CREATE POLICY "org_notification_preference_select_org_members"
    ON organization_notification_preference FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_notification_preference.organization_id
                AND om.user_id = auth.uid()
                AND om.left_at IS NULL
        )
    );

-- Only org admins/owners can insert notification preferences
CREATE POLICY "org_notification_preference_insert_org_admin"
    ON organization_notification_preference FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_notification_preference.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
                AND om.left_at IS NULL
        )
    );

-- Only org admins/owners can update notification preferences
CREATE POLICY "org_notification_preference_update_org_admin"
    ON organization_notification_preference FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_notification_preference.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
                AND om.left_at IS NULL
        )
    );

-- Only org admins/owners can delete notification preferences
CREATE POLICY "org_notification_preference_delete_org_admin"
    ON organization_notification_preference FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_notification_preference.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
                AND om.left_at IS NULL
        )
    );

-- ============================================================================
-- organization_notification_recipient policies
-- ============================================================================

-- Org members can view their organization's notification recipients
CREATE POLICY "org_notification_recipient_select_org_members"
    ON organization_notification_recipient FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_notification_recipient.organization_id
                AND om.user_id = auth.uid()
                AND om.left_at IS NULL
        )
    );

-- Only org admins/owners can insert notification recipients
CREATE POLICY "org_notification_recipient_insert_org_admin"
    ON organization_notification_recipient FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_notification_recipient.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
                AND om.left_at IS NULL
        )
    );

-- Only org admins/owners can update notification recipients
CREATE POLICY "org_notification_recipient_update_org_admin"
    ON organization_notification_recipient FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_notification_recipient.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
                AND om.left_at IS NULL
        )
    );

-- Only org admins/owners can delete notification recipients
CREATE POLICY "org_notification_recipient_delete_org_admin"
    ON organization_notification_recipient FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM organization_member om
            WHERE om.organization_id = organization_notification_recipient.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('admin', 'owner')
                AND om.left_at IS NULL
        )
    );

-- ============================================================================
-- PART 6: UPDATE NOTIFICATION TABLE RLS FOR ORG CONTEXT
-- ============================================================================

-- Add policy for org members to view org notifications they're recipients of
-- Note: The existing notification RLS allows users to see their own notifications
-- This adds support for the organization context in the payload
CREATE POLICY "notification_select_org_context"
    ON notification FOR SELECT
    USING (
        -- User is the direct recipient
        auth.uid() = user_id
        OR
        -- User is an org admin/owner and notification has org context
        (
            organization_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM organization_member om
                WHERE om.organization_id = notification.organization_id
                    AND om.user_id = auth.uid()
                    AND om.role IN ('admin', 'owner')
                    AND om.left_at IS NULL
            )
        )
    );

-- ============================================================================
-- PART 7: TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Create trigger for organization_notification_preference updated_at
CREATE TRIGGER update_org_notification_preference_updated_at
    BEFORE UPDATE ON organization_notification_preference
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for organization_notification_recipient updated_at
CREATE TRIGGER update_org_notification_recipient_updated_at
    BEFORE UPDATE ON organization_notification_recipient
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 8: GRANT PERMISSIONS
-- ============================================================================

-- Grant table access to authenticated users (RLS will handle row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_notification_preference TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_notification_recipient TO authenticated;

-- ============================================================================
-- PART 9: HELPER FUNCTIONS
-- ============================================================================

-- Function to get organization notification recipients for a given type
-- Returns user IDs who should receive the notification based on preferences
CREATE OR REPLACE FUNCTION get_org_notification_recipients(
    p_organization_id UUID,
    p_notification_type notification_type_enum,
    p_channel delivery_channel_enum DEFAULT 'email'
)
RETURNS TABLE (user_id UUID, email TEXT, full_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_preference_enabled BOOLEAN;
    v_recipient_roles role_enum[];
BEGIN
    -- Check if this notification type/channel is enabled for the org
    SELECT enabled, recipient_roles 
    INTO v_preference_enabled, v_recipient_roles
    FROM organization_notification_preference
    WHERE organization_id = p_organization_id
        AND notification_type = p_notification_type
        AND channel = p_channel;
    
    -- Default to enabled if no explicit preference exists
    IF v_preference_enabled IS NULL THEN
        v_preference_enabled := TRUE;
    END IF;
    
    -- If disabled, return empty
    IF NOT v_preference_enabled THEN
        RETURN;
    END IF;
    
    -- First check for explicit recipients
    IF EXISTS (
        SELECT 1 FROM organization_notification_recipient onr
        WHERE onr.organization_id = p_organization_id
            AND onr.notification_type = p_notification_type
            AND onr.enabled = TRUE
    ) THEN
        -- Return explicit recipients only
        RETURN QUERY
        SELECT p.id, p.email, p.full_name
        FROM organization_notification_recipient onr
        JOIN profile p ON p.id = onr.user_id
        WHERE onr.organization_id = p_organization_id
            AND onr.notification_type = p_notification_type
            AND onr.enabled = TRUE;
    ELSE
        -- Return org members based on role filter
        RETURN QUERY
        SELECT p.id, p.email, p.full_name
        FROM organization_member om
        JOIN profile p ON p.id = om.user_id
        WHERE om.organization_id = p_organization_id
            AND om.left_at IS NULL
            AND (
                v_recipient_roles IS NULL  -- No role filter = all members
                OR om.role = ANY(v_recipient_roles)
            );
    END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_org_notification_recipients(UUID, notification_type_enum, delivery_channel_enum) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_notification_recipients(UUID, notification_type_enum, delivery_channel_enum) TO service_role;

-- ============================================================================
-- PART 10: DEFAULT PREFERENCES FOR NEW ORGANIZATIONS
-- ============================================================================

-- Function to seed default notification preferences for an organization
CREATE OR REPLACE FUNCTION seed_org_notification_defaults(p_organization_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Staff notifications (admins/owners only, email enabled by default)
    INSERT INTO organization_notification_preference 
        (organization_id, notification_type, channel, enabled, recipient_roles)
    VALUES
        -- Booking notifications for staff
        (p_organization_id, 'booking_created', 'email', TRUE, ARRAY['admin', 'owner']::role_enum[]),
        (p_organization_id, 'booking_cancelled_by_player', 'email', TRUE, ARRAY['admin', 'owner']::role_enum[]),
        (p_organization_id, 'booking_modified', 'email', TRUE, ARRAY['admin', 'owner']::role_enum[]),
        -- Member notifications for staff
        (p_organization_id, 'new_member_joined', 'email', TRUE, ARRAY['admin', 'owner']::role_enum[]),
        (p_organization_id, 'member_left', 'email', TRUE, ARRAY['admin', 'owner']::role_enum[]),
        (p_organization_id, 'member_role_changed', 'email', TRUE, ARRAY['admin', 'owner']::role_enum[]),
        -- Payment notifications for owners only
        (p_organization_id, 'payment_received', 'email', TRUE, ARRAY['owner']::role_enum[]),
        (p_organization_id, 'payment_failed', 'email', TRUE, ARRAY['owner']::role_enum[]),
        (p_organization_id, 'refund_processed', 'email', TRUE, ARRAY['owner']::role_enum[]),
        -- Summary reports for admins/owners
        (p_organization_id, 'daily_summary', 'email', FALSE, ARRAY['admin', 'owner']::role_enum[]),
        (p_organization_id, 'weekly_report', 'email', TRUE, ARRAY['admin', 'owner']::role_enum[])
    ON CONFLICT (organization_id, notification_type, channel) DO NOTHING;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION seed_org_notification_defaults(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_org_notification_defaults(UUID) TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE organization_notification_preference IS 
    'Stores organization-level notification preferences per type and channel. Uses sparse storage where missing rows use system defaults.';

COMMENT ON COLUMN organization_notification_preference.notification_type IS 
    'The type of notification this preference applies to';

COMMENT ON COLUMN organization_notification_preference.channel IS 
    'The delivery channel (email, push, sms) this preference applies to';

COMMENT ON COLUMN organization_notification_preference.enabled IS 
    'Whether this notification type should be delivered via this channel';

COMMENT ON COLUMN organization_notification_preference.recipient_roles IS 
    'Array of roles that should receive this notification. NULL means all org members.';

COMMENT ON TABLE organization_notification_recipient IS 
    'Override recipients for specific notification types. When entries exist, only these users receive the notification instead of role-based filtering.';

COMMENT ON COLUMN notification.organization_id IS 
    'Organization context for org-related notifications. NULL for player-to-player notifications.';

COMMENT ON FUNCTION get_org_notification_recipients IS 
    'Returns list of users who should receive a notification for an organization based on preferences and role/recipient overrides.';

COMMENT ON FUNCTION seed_org_notification_defaults IS 
    'Seeds default notification preferences for a new organization. Called when organization is created.';
