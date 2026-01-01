-- Rallia Database Schema Migration
-- Created: 2024-11-24
-- Description: Complete database schema for Rallia app with all entities, enums, and relationships

-- ============================================
-- ENUM TYPES
-- ============================================

-- User and Profile Enums
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE user_role AS ENUM ('player', 'admin', 'super_admin');
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'deleted', 'pending_verification');
CREATE TYPE playing_hand AS ENUM ('left', 'right', 'both');

-- Match and Booking Enums
CREATE TYPE match_type AS ENUM ('casual', 'competitive', 'both');
CREATE TYPE match_duration AS ENUM ('1h', '1.5h', '2h');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('credit_card', 'debit_card', 'paypal', 'cash', 'bank_transfer');

-- Organization and Facility Enums
CREATE TYPE organization_type AS ENUM ('club', 'facility', 'league', 'academy', 'association');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'manager', 'staff', 'member');
CREATE TYPE member_status AS ENUM ('active', 'inactive', 'pending', 'suspended');
CREATE TYPE court_surface AS ENUM ('hard', 'clay', 'grass', 'carpet', 'synthetic');
CREATE TYPE court_type AS ENUM ('indoor', 'outdoor', 'covered');

-- Availability and Time Enums
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
CREATE TYPE time_period AS ENUM ('morning', 'afternoon', 'evening', 'night');

-- Rating and Skill Enums
CREATE TYPE rating_type AS ENUM ('ntrp', 'utr', 'dupr', 'self_assessment');
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'professional');

-- Network Enums
CREATE TYPE network_visibility AS ENUM ('public', 'private', 'friends', 'club');
CREATE TYPE network_member_status AS ENUM ('active', 'pending', 'blocked', 'removed');

-- Messaging Enums
CREATE TYPE conversation_type AS ENUM ('direct', 'group', 'match', 'announcement');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed');

-- Notification Enums
CREATE TYPE notification_type AS ENUM ('match_request', 'match_confirmation', 'match_cancellation', 'message', 'friend_request', 'system');
CREATE TYPE notification_status AS ENUM ('unread', 'read', 'archived');

-- Review and Report Enums
CREATE TYPE report_status AS ENUM ('pending', 'under_review', 'resolved', 'dismissed');
CREATE TYPE report_reason AS ENUM ('inappropriate_behavior', 'harassment', 'spam', 'cheating', 'other');

-- ============================================
-- CORE TABLES
-- ============================================

-- Profile Table (extends Supabase auth.users)
CREATE TABLE profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    display_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    profile_picture_url TEXT,
    birth_date DATE,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    province TEXT,
    country TEXT DEFAULT 'Canada',
    bio TEXT,
    account_status account_status DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player Table (extends Profile)
CREATE TABLE player (
    id UUID PRIMARY KEY REFERENCES profile(id) ON DELETE CASCADE,
    gender gender_type,
    playing_hand playing_hand,
    max_travel_distance INTEGER CHECK (max_travel_distance >= 1 AND max_travel_distance <= 50),
    privacy_show_age BOOLEAN DEFAULT TRUE,
    privacy_show_location BOOLEAN DEFAULT TRUE,
    privacy_show_stats BOOLEAN DEFAULT TRUE,
    notification_match_requests BOOLEAN DEFAULT TRUE,
    notification_messages BOOLEAN DEFAULT TRUE,
    notification_reminders BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Table (extends Profile)
CREATE TABLE admin (
    id UUID PRIMARY KEY REFERENCES profile(id) ON DELETE CASCADE,
    role user_role DEFAULT 'admin',
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SPORT SYSTEM
-- ============================================

-- Sport Table (Master data for all sports)
CREATE TABLE sport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PlayerSport Junction Table (Player preferences per sport)
CREATE TABLE player_sport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    sport_id UUID NOT NULL REFERENCES sport(id) ON DELETE CASCADE,
    preferred_match_duration match_duration,
    preferred_match_type match_type,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, sport_id)
);

-- ============================================
-- RATING SYSTEM
-- ============================================

-- Rating Table (Rating types for each sport)
CREATE TABLE rating (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id UUID NOT NULL REFERENCES sport(id) ON DELETE CASCADE,
    rating_type rating_type NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    min_value NUMERIC,
    max_value NUMERIC,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sport_id, rating_type)
);

-- RatingScore Table (Specific score values for each rating type)
CREATE TABLE rating_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rating_id UUID NOT NULL REFERENCES rating(id) ON DELETE CASCADE,
    score_value NUMERIC NOT NULL,
    display_label TEXT NOT NULL,
    skill_level skill_level,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(rating_id, score_value)
);

-- PlayerRatingScore Table (Player's rating for each sport)
CREATE TABLE player_rating_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    rating_score_id UUID NOT NULL REFERENCES rating_score(id) ON DELETE CASCADE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES admin(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, rating_score_id)
);

-- ============================================
-- AVAILABILITY SYSTEM
-- ============================================

-- PlayerAvailability Table (When players are available)
CREATE TABLE player_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    sport_id UUID REFERENCES sport(id) ON DELETE SET NULL,
    day_of_week day_of_week NOT NULL,
    time_period time_period NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, sport_id, day_of_week, time_period)
);

-- ============================================
-- ORGANIZATION & FACILITY SYSTEM
-- ============================================

-- Organization Table (Clubs, facilities, leagues, etc.)
CREATE TABLE organization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    organization_type organization_type NOT NULL,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    province TEXT,
    country TEXT DEFAULT 'Canada',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OrganizationMember Table (Members of organizations)
CREATE TABLE organization_member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    role member_role DEFAULT 'member',
    status member_status DEFAULT 'active',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, player_id)
);

-- Facility Table (Physical locations with courts)
CREATE TABLE facility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organization(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    postal_code TEXT,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    country TEXT DEFAULT 'Canada',
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    phone TEXT,
    email TEXT,
    website TEXT,
    description TEXT,
    amenities JSONB DEFAULT '[]',
    parking_available BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Court Table (Individual courts at facilities)
CREATE TABLE court (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facility(id) ON DELETE CASCADE,
    sport_id UUID NOT NULL REFERENCES sport(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    court_number TEXT,
    surface_type court_surface NOT NULL,
    court_type court_type NOT NULL,
    has_lights BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CourtSlot Table (Available time slots for courts)
CREATE TABLE court_slot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID NOT NULL REFERENCES court(id) ON DELETE CASCADE,
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price NUMERIC(10, 2),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BOOKING SYSTEM
-- ============================================

-- Booking Table (Court bookings)
CREATE TABLE booking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_slot_id UUID NOT NULL REFERENCES court_slot(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status booking_status DEFAULT 'pending',
    total_price NUMERIC(10, 2),
    payment_status payment_status DEFAULT 'pending',
    payment_method payment_method,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MATCH SYSTEM
-- ============================================

-- Match Table (Scheduled matches between players)
CREATE TABLE match (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id UUID NOT NULL REFERENCES sport(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES booking(id) ON DELETE SET NULL,
    match_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    match_type match_type NOT NULL,
    location_name TEXT,
    location_address TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MatchParticipant Table (Players in a match)
CREATE TABLE match_participant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES match(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    team_number INTEGER CHECK (team_number IN (1, 2)),
    is_host BOOLEAN DEFAULT FALSE,
    invitation_status member_status DEFAULT 'pending',
    score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, player_id)
);

-- MatchResult Table (Final results of completed matches)
CREATE TABLE match_result (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID UNIQUE NOT NULL REFERENCES match(id) ON DELETE CASCADE,
    winning_team INTEGER CHECK (winning_team IN (1, 2)),
    team1_score INTEGER,
    team2_score INTEGER,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NETWORK SYSTEM
-- ============================================

-- NetworkType Table (Types of networks)
CREATE TABLE network_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Network Table (Player networks/groups)
CREATE TABLE network (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_type_id UUID NOT NULL REFERENCES network_type(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NetworkMember Table (Members of networks)
CREATE TABLE network_member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID NOT NULL REFERENCES network(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    status network_member_status DEFAULT 'active',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(network_id, player_id)
);

-- ============================================
-- MESSAGING SYSTEM
-- ============================================

-- Conversation Table (Chat conversations)
CREATE TABLE conversation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_type conversation_type NOT NULL,
    title TEXT,
    match_id UUID REFERENCES match(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ConversationParticipant Table (Participants in conversations)
CREATE TABLE conversation_participant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ,
    is_muted BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, player_id)
);

-- Message Table (Individual messages)
CREATE TABLE message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status message_status DEFAULT 'sent',
    read_by JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATION SYSTEM
-- ============================================

-- Notification Table (User notifications)
CREATE TABLE notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status notification_status DEFAULT 'unread',
    related_match_id UUID REFERENCES match(id) ON DELETE SET NULL,
    related_player_id UUID REFERENCES player(id) ON DELETE SET NULL,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- ============================================
-- REVIEW SYSTEM
-- ============================================

-- PlayerReview Table (Reviews between players)
CREATE TABLE player_review (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES match(id) ON DELETE SET NULL,
    reviewer_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    reviewed_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, reviewer_id, reviewed_id)
);

-- Report Table (User reports)
CREATE TABLE report (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    match_id UUID REFERENCES match(id) ON DELETE SET NULL,
    reason report_reason NOT NULL,
    description TEXT,
    status report_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES admin(id),
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Profile indexes
CREATE INDEX idx_profile_email ON profile(email);
CREATE INDEX idx_profile_account_status ON profile(account_status);
CREATE INDEX idx_profile_onboarding_completed ON profile(onboarding_completed);

-- Player indexes
CREATE INDEX idx_player_gender ON player(gender);
CREATE INDEX idx_player_playing_hand ON player(playing_hand);

-- PlayerSport indexes
CREATE INDEX idx_player_sport_player_id ON player_sport(player_id);
CREATE INDEX idx_player_sport_sport_id ON player_sport(sport_id);

-- Rating indexes
CREATE INDEX idx_rating_sport_id ON rating(sport_id);
CREATE INDEX idx_player_rating_score_player_id ON player_rating_score(player_id);

-- Availability indexes
CREATE INDEX idx_player_availability_player_id ON player_availability(player_id);
CREATE INDEX idx_player_availability_sport_id ON player_availability(sport_id);
CREATE INDEX idx_player_availability_day_time ON player_availability(day_of_week, time_period);

-- Match indexes
CREATE INDEX idx_match_sport_id ON match(sport_id);
CREATE INDEX idx_match_date ON match(match_date);
CREATE INDEX idx_match_created_by ON match(created_by);
CREATE INDEX idx_match_participant_match_id ON match_participant(match_id);
CREATE INDEX idx_match_participant_player_id ON match_participant(player_id);

-- Booking indexes
CREATE INDEX idx_booking_player_id ON booking(player_id);
CREATE INDEX idx_booking_date ON booking(booking_date);
CREATE INDEX idx_booking_status ON booking(status);

-- Facility indexes
CREATE INDEX idx_facility_city ON facility(city);
CREATE INDEX idx_facility_postal_code ON facility(postal_code);
CREATE INDEX idx_court_facility_id ON court(facility_id);
CREATE INDEX idx_court_sport_id ON court(sport_id);

-- Notification indexes
CREATE INDEX idx_notification_player_id ON notification(player_id);
CREATE INDEX idx_notification_status ON notification(status);
CREATE INDEX idx_notification_created_at ON notification(created_at DESC);

-- Message indexes
CREATE INDEX idx_message_conversation_id ON message(conversation_id);
CREATE INDEX idx_message_sender_id ON message(sender_id);
CREATE INDEX idx_message_created_at ON message(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE player ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_sport ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_rating_score ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE match ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participant ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Users can view their own profile"
    ON profile FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profile FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can view other profiles"
    ON profile FOR SELECT
    USING (account_status = 'active');

-- Player policies
CREATE POLICY "Players can view their own data"
    ON player FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Players can update their own data"
    ON player FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Players can view other players"
    ON player FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profile
            WHERE profile.id = player.id
            AND profile.account_status = 'active'
        )
    );

-- PlayerSport policies
CREATE POLICY "Players can manage their sport preferences"
    ON player_sport FOR ALL
    USING (auth.uid() = player_id);

-- PlayerRatingScore policies
CREATE POLICY "Players can manage their ratings"
    ON player_rating_score FOR ALL
    USING (auth.uid() = player_id);

-- PlayerAvailability policies
CREATE POLICY "Players can manage their availability"
    ON player_availability FOR ALL
    USING (auth.uid() = player_id);

-- Match policies
CREATE POLICY "Players can view matches they're part of"
    ON match FOR SELECT
    USING (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM match_participant
            WHERE match_participant.match_id = match.id
            AND match_participant.player_id = auth.uid()
        )
    );

CREATE POLICY "Players can create matches"
    ON match FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Match creators can update their matches"
    ON match FOR UPDATE
    USING (auth.uid() = created_by);

-- MatchParticipant policies
CREATE POLICY "Players can view match participants"
    ON match_participant FOR SELECT
    USING (
        auth.uid() = player_id
        OR EXISTS (
            SELECT 1 FROM match
            WHERE match.id = match_participant.match_id
            AND match.created_by = auth.uid()
        )
    );

-- Notification policies
CREATE POLICY "Players can view their notifications"
    ON notification FOR SELECT
    USING (auth.uid() = player_id);

CREATE POLICY "Players can update their notifications"
    ON notification FOR UPDATE
    USING (auth.uid() = player_id);

-- Message policies
CREATE POLICY "Participants can view conversation messages"
    ON message FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participant
            WHERE conversation_participant.conversation_id = message.conversation_id
            AND conversation_participant.player_id = auth.uid()
        )
    );

CREATE POLICY "Participants can send messages"
    ON message FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM conversation_participant
            WHERE conversation_participant.conversation_id = message.conversation_id
            AND conversation_participant.player_id = auth.uid()
        )
    );

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_profile_updated_at BEFORE UPDATE ON profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_updated_at BEFORE UPDATE ON player
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_updated_at BEFORE UPDATE ON admin
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sport_updated_at BEFORE UPDATE ON sport
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_sport_updated_at BEFORE UPDATE ON player_sport
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_updated_at BEFORE UPDATE ON organization
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facility_updated_at BEFORE UPDATE ON facility
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_updated_at BEFORE UPDATE ON match
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert initial sports
INSERT INTO sport (id, name, display_name, description, icon_url, is_active) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'tennis', 'Tennis', 'Traditional tennis sport', 'images/tennis.jpg', true),
    ('550e8400-e29b-41d4-a716-446655440002', 'pickleball', 'Pickleball', 'Fast-paced paddle sport', 'images/pickleball.jpg', true);

-- Insert rating types for Tennis
INSERT INTO rating (id, sport_id, rating_type, display_name, description, min_value, max_value, is_active) VALUES
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'ntrp', 'NTRP', 'National Tennis Rating Program', 1.0, 7.0, true),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'utr', 'UTR', 'Universal Tennis Rating', 1.0, 16.5, true),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'self_assessment', 'Self Assessment', 'Player self-assessed skill level', 1.0, 10.0, true);

-- Insert rating types for Pickleball
INSERT INTO rating (id, sport_id, rating_type, display_name, description, min_value, max_value, is_active) VALUES
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'dupr', 'DUPR', 'Dynamic Universal Pickleball Rating', 1.0, 8.0, true),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'self_assessment', 'Self Assessment', 'Player self-assessed skill level', 1.0, 10.0, true);

-- Insert network types
INSERT INTO network_type (name, display_name, description, is_active) VALUES
    ('public', 'Public', 'Open to all players', true),
    ('private', 'Private', 'Invite-only network', true),
    ('friends', 'Friends', 'Personal friend network', true),
    ('club', 'Club', 'Club member network', true);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE profile IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE player IS 'Player-specific data and preferences';
COMMENT ON TABLE sport IS 'Master table for all sports (tennis, pickleball, etc.)';
COMMENT ON TABLE player_sport IS 'Junction table linking players to sports with preferences';
COMMENT ON TABLE rating IS 'Rating systems available for each sport (NTRP, UTR, DUPR, etc.)';
COMMENT ON TABLE player_rating_score IS 'Player ratings for each sport and rating type';
COMMENT ON TABLE player_availability IS 'When players are available to play';
COMMENT ON TABLE match IS 'Scheduled matches between players';
COMMENT ON TABLE match_participant IS 'Players participating in a match';

COMMENT ON COLUMN player.max_travel_distance IS 'Maximum distance (km) player willing to travel';
COMMENT ON COLUMN player_sport.preferred_match_duration IS 'Preferred match duration for this sport';
COMMENT ON COLUMN player_sport.preferred_match_type IS 'Preferred match type (casual/competitive/both) for this sport';
COMMENT ON COLUMN player_sport.is_primary IS 'Whether this is the player primary sport';
