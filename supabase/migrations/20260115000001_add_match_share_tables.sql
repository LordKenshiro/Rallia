-- Migration: Add match sharing tables for external (non-user) invitations
-- This allows users to share matches with contacts who are not app users

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Share channel for tracking how the share was sent
CREATE TYPE share_channel_enum AS ENUM ('sms', 'email', 'whatsapp', 'share_sheet', 'copy_link');

-- Share status for tracking the invitation lifecycle
CREATE TYPE share_status_enum AS ENUM ('pending', 'sent', 'viewed', 'accepted', 'expired', 'cancelled');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Match share records - tracks each share action
CREATE TABLE match_share (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES match(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    share_channel share_channel_enum NOT NULL,
    share_link_token VARCHAR(64) UNIQUE, -- Unique token for the share link
    expires_at TIMESTAMPTZ, -- When the share link expires
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual contact shares - who received the share
CREATE TABLE match_share_recipient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID NOT NULL REFERENCES match_share(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES shared_contact(id) ON DELETE SET NULL, -- Link to shared_contact if from a list
    contact_list_id UUID REFERENCES shared_contact_list(id) ON DELETE SET NULL, -- Which list the contact was from
    recipient_name VARCHAR(150) NOT NULL,
    recipient_phone VARCHAR(30),
    recipient_email VARCHAR(255),
    status share_status_enum NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    response_note TEXT, -- Any response message from recipient
    converted_player_id UUID REFERENCES player(id) ON DELETE SET NULL, -- If recipient signed up
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_match_share_match_id ON match_share(match_id);
CREATE INDEX idx_match_share_shared_by ON match_share(shared_by);
CREATE INDEX idx_match_share_token ON match_share(share_link_token);
CREATE INDEX idx_match_share_recipient_share_id ON match_share_recipient(share_id);
CREATE INDEX idx_match_share_recipient_contact_id ON match_share_recipient(contact_id);
CREATE INDEX idx_match_share_recipient_status ON match_share_recipient(status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE match_share ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_share_recipient ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own shares
CREATE POLICY "Users can view their own match shares"
    ON match_share FOR SELECT
    USING (auth.uid() = shared_by);

CREATE POLICY "Users can create match shares"
    ON match_share FOR INSERT
    WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Users can update their own match shares"
    ON match_share FOR UPDATE
    USING (auth.uid() = shared_by);

CREATE POLICY "Users can delete their own match shares"
    ON match_share FOR DELETE
    USING (auth.uid() = shared_by);

-- Users can manage recipients of their shares
CREATE POLICY "Users can view recipients of their shares"
    ON match_share_recipient FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM match_share
        WHERE match_share.id = match_share_recipient.share_id
        AND match_share.shared_by = auth.uid()
    ));

CREATE POLICY "Users can create recipients for their shares"
    ON match_share_recipient FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM match_share
        WHERE match_share.id = match_share_recipient.share_id
        AND match_share.shared_by = auth.uid()
    ));

CREATE POLICY "Users can update recipients of their shares"
    ON match_share_recipient FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM match_share
        WHERE match_share.id = match_share_recipient.share_id
        AND match_share.shared_by = auth.uid()
    ));

CREATE POLICY "Users can delete recipients of their shares"
    ON match_share_recipient FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM match_share
        WHERE match_share.id = match_share_recipient.share_id
        AND match_share.shared_by = auth.uid()
    ));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_match_share_updated_at
    BEFORE UPDATE ON match_share
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_share_recipient_updated_at
    BEFORE UPDATE ON match_share_recipient
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE match_share IS 'Records of matches shared with external contacts';
COMMENT ON TABLE match_share_recipient IS 'Individual recipients of match shares';
COMMENT ON COLUMN match_share.share_link_token IS 'Unique token for generating shareable links';
COMMENT ON COLUMN match_share_recipient.converted_player_id IS 'If the recipient signed up for the app';
