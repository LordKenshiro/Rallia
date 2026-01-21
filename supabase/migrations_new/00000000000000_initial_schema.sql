-- ============================================================================
-- Rallia Database Schema - Consolidated Migration
-- Created: 2024-12-08
-- Description: Complete database schema for Rallia - sports matching platform
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "extensions";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Admin & User Roles
CREATE TYPE admin_role_enum AS ENUM ('super_admin', 'moderator', 'support');
CREATE TYPE app_role_enum AS ENUM ('player', 'organization_member', 'admin');
CREATE TYPE role_enum AS ENUM ('admin', 'staff', 'player', 'coach', 'owner');

-- Player Enums
CREATE TYPE gender_enum AS ENUM ('M', 'F', 'O', 'prefer_not_to_say');
CREATE TYPE playing_hand_enum AS ENUM ('right', 'left', 'both');

-- Time & Schedule
CREATE TYPE day_enum AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
CREATE TYPE period_enum AS ENUM ('morning', 'afternoon', 'evening');

-- Match Enums
CREATE TYPE match_duration_enum AS ENUM ('30', '60', '90', '120');
CREATE TYPE match_type_enum AS ENUM ('practice', 'competitive', 'both');

-- Rating Enums
CREATE TYPE rating_certification_method_enum AS ENUM ('external_rating', 'proof', 'referrals');
CREATE TYPE rating_request_status_enum AS ENUM ('pending', 'completed', 'declined', 'expired', 'cancelled');
CREATE TYPE proof_type_enum AS ENUM ('external_link', 'file');
CREATE TYPE proof_status_enum AS ENUM ('pending', 'approved', 'rejected');

-- File Enums
CREATE TYPE file_type_enum AS ENUM ('image', 'video', 'document', 'audio', 'other');

-- Organization & Facility Enums
CREATE TYPE organization_nature_enum AS ENUM ('public', 'private');
CREATE TYPE organization_type_enum AS ENUM ('club', 'municipality', 'city', 'association');
CREATE TYPE facility_type_enum AS ENUM ('park', 'club', 'indoor_center', 'private', 'municipal', 'university', 'school', 'community_center', 'other');
CREATE TYPE facility_contact_type_enum AS ENUM ('general', 'reservation', 'maintenance', 'other');
CREATE TYPE surface_type_enum AS ENUM ('hard', 'clay', 'grass', 'synthetic', 'carpet', 'concrete', 'asphalt');
CREATE TYPE availability_enum AS ENUM ('available', 'unavailable', 'maintenance', 'reserved', 'under_maintenance', 'closed');
CREATE TYPE country_enum AS ENUM ('Canada', 'United States');

-- Notification & Delivery Enums
CREATE TYPE notification_type_enum AS ENUM ('match_invitation', 'reminder', 'payment', 'support', 'chat', 'system');
CREATE TYPE delivery_channel_enum AS ENUM ('email', 'sms', 'push');
CREATE TYPE delivery_status_enum AS ENUM ('pending', 'success', 'failed');

-- Invitation Enums
CREATE TYPE invite_source_enum AS ENUM ('manual', 'auto_match', 'invite_list', 'mailing_list', 'growth_prompt');
CREATE TYPE invite_status_enum AS ENUM ('pending', 'sent', 'accepted', 'expired', 'bounced', 'cancelled');

-- ============================================================================
-- CORE TABLES - User & Profile
-- ============================================================================

-- Profile table (extends auth.users)
CREATE TABLE profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    display_name VARCHAR(100),
    avatar_url VARCHAR(255),
    birth_date DATE,
    phone VARCHAR(20),
    locale VARCHAR(10) DEFAULT 'en-CA' NOT NULL,
    timezone VARCHAR(50) DEFAULT 'America/Toronto' NOT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    last_active_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX uq_profile_email ON profile(email);

COMMENT ON TABLE profile IS 'User profiles linked to auth.users';

-- Admin table
CREATE TABLE admin (
    id UUID PRIMARY KEY REFERENCES profile(id) ON DELETE CASCADE,
    role admin_role_enum NOT NULL,
    permissions JSONB,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    notes TEXT
);

COMMENT ON TABLE admin IS 'Platform administrators';

-- Player table
CREATE TABLE player (
    id UUID PRIMARY KEY REFERENCES profile(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    bio TEXT,
    gender gender_enum,
    playing_hand playing_hand_enum,
    max_travel_distance INT,
    reputation_score DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    rating_count INT DEFAULT 0 NOT NULL,
    verified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE player IS 'Player-specific settings and preferences';

-- ============================================================================
-- SPORT SYSTEM
-- ============================================================================

-- Sport table
CREATE TABLE sport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    attributes JSONB,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE sport IS 'Sports available in the system (tennis, pickleball, etc.)';

-- Play Styles table
CREATE TABLE play_style (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id UUID NOT NULL REFERENCES sport(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_play_style_sport_name ON play_style(sport_id, name);

-- Play Attributes table
CREATE TABLE play_attribute (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id UUID REFERENCES sport(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_play_attribute_sport_name ON play_attribute(sport_id, name);

-- ============================================================================
-- RATING SYSTEM
-- ============================================================================

-- Rating Systems table
CREATE TABLE rating_system (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id UUID NOT NULL REFERENCES sport(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    min_value NUMERIC(5,2) NOT NULL,
    max_value NUMERIC(5,2) NOT NULL,
    step NUMERIC(5,2) DEFAULT 0.5 NOT NULL,
    default_initial_value NUMERIC(5,2),
    min_for_referral NUMERIC(5,2),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_rating_system_code ON rating_system(code);
CREATE INDEX idx_rating_system_sport_id ON rating_system(sport_id);

COMMENT ON TABLE rating_system IS 'Defines rating/level scales and configuration per sport (NTRP, DUPR, etc.)';

-- Rating Score table
CREATE TABLE rating_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rating_system_id UUID NOT NULL REFERENCES rating_system(id) ON DELETE CASCADE,
    value FLOAT,
    label VARCHAR(50) NOT NULL,
    min_value FLOAT,
    max_value FLOAT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX uq_rating_score_system_value ON rating_score(rating_system_id, value);
CREATE INDEX idx_rating_score_rating_system_id ON rating_score(rating_system_id);

-- ============================================================================
-- PLAYER PREFERENCES & RATINGS
-- ============================================================================

-- Player Sport (links players to sports with preferences)
CREATE TABLE player_sport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    sport_id UUID NOT NULL REFERENCES sport(id) ON DELETE CASCADE,
    preferred_match_duration match_duration_enum,
    preferred_match_type match_type_enum,
    preferred_play_style play_style_enum,
    preferred_play_attributes play_attribute_enum[],
    preferred_facility_id UUID,
    preferred_court VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, sport_id)
);

CREATE INDEX idx_player_sport_player_id ON player_sport(player_id);
CREATE INDEX idx_player_sport_sport_id ON player_sport(sport_id);

COMMENT ON TABLE player_sport IS 'Links players to sports with their preferences';

-- Player Rating Score
CREATE TABLE player_rating_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    rating_score_id UUID NOT NULL REFERENCES rating_score(id) ON DELETE RESTRICT,
    is_certified BOOLEAN DEFAULT FALSE NOT NULL,
    certified_via rating_certification_method_enum,
    certified_at TIMESTAMPTZ,
    external_rating_score_id UUID REFERENCES rating_score(id) ON DELETE SET NULL,
    referrals_count INT DEFAULT 0 NOT NULL,
    evaluations_count INT DEFAULT 0 NOT NULL,
    last_evaluated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    source VARCHAR(100),
    notes TEXT,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX uq_player_rating_score ON player_rating_score(player_id, rating_score_id);
CREATE INDEX idx_player_rating_score_player_id ON player_rating_score(player_id);

-- Player Availability table
CREATE TABLE player_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    day day_enum NOT NULL,
    period period_enum NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX uq_player_availability_player_day_period ON player_availability(player_id, day, period);
CREATE INDEX idx_player_availability_player_id ON player_availability(player_id);
CREATE INDEX idx_player_availability_day ON player_availability(day);
CREATE INDEX idx_player_availability_period ON player_availability(period);

-- ============================================================================
-- FILE MANAGEMENT
-- ============================================================================

-- Files table
CREATE TABLE file (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID NOT NULL REFERENCES profile(id) ON DELETE SET NULL,
    storage_key VARCHAR(500) UNIQUE NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    original_name VARCHAR(255) NOT NULL,
    file_type file_type_enum NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_file_uploaded_by ON file(uploaded_by);
CREATE INDEX idx_file_file_type ON file(file_type);
CREATE INDEX idx_file_is_deleted ON file(is_deleted);

-- Rating Proofs table
CREATE TABLE rating_proof (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_rating_score_id UUID NOT NULL REFERENCES player_rating_score(id) ON DELETE CASCADE,
    proof_type proof_type_enum NOT NULL,
    file_id UUID REFERENCES file(id) ON DELETE SET NULL,
    external_url TEXT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status proof_status_enum DEFAULT 'pending' NOT NULL,
    reviewed_by UUID REFERENCES profile(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_rating_proof_player_rating_score ON rating_proof(player_rating_score_id);
CREATE INDEX idx_rating_proof_status ON rating_proof(status);

-- ============================================================================
-- RATING REFERENCE & PEER REQUESTS
-- ============================================================================

-- Rating Reference Requests table
CREATE TABLE rating_reference_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    player_rating_score_id UUID NOT NULL REFERENCES player_rating_score(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    message TEXT,
    status rating_request_status_enum DEFAULT 'pending' NOT NULL,
    rating_supported BOOLEAN DEFAULT FALSE NOT NULL,
    response_message TEXT,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_rating_ref_request_requester ON rating_reference_request(requester_id);
CREATE INDEX idx_rating_ref_request_referee ON rating_reference_request(referee_id);
CREATE INDEX idx_rating_ref_request_status ON rating_reference_request(status);

-- Peer Rating Requests table
CREATE TABLE peer_rating_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    rating_system_id UUID NOT NULL REFERENCES rating_system(id) ON DELETE RESTRICT,
    message TEXT,
    status rating_request_status_enum DEFAULT 'pending' NOT NULL,
    assigned_rating_score_id UUID REFERENCES rating_score(id) ON DELETE SET NULL,
    response_message TEXT,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX uq_peer_rating_request ON peer_rating_request(requester_id, rating_system_id, evaluator_id);
CREATE INDEX idx_peer_rating_request_requester ON peer_rating_request(requester_id);
CREATE INDEX idx_peer_rating_request_evaluator ON peer_rating_request(evaluator_id);
CREATE INDEX idx_peer_rating_request_status ON peer_rating_request(status);

-- ============================================================================
-- ORGANIZATION & FACILITY SYSTEM
-- ============================================================================

-- Organization table
CREATE TABLE organization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES profile(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    nature organization_nature_enum NOT NULL,
    type organization_type_enum,
    slug VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    description TEXT,
    address VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country country_enum,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_organization_name ON organization(name);

COMMENT ON TABLE organization IS 'Organizations (clubs, municipalities, etc.)';

-- Organization Member table
CREATE TABLE organization_member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    role role_enum NOT NULL,
    permissions JSONB,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    left_at TIMESTAMPTZ,
    invited_by UUID REFERENCES profile(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_organization_member_user_org ON organization_member(user_id, organization_id);

-- Facility table
CREATE TABLE facility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    facility_type facility_type_enum,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    address VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country country_enum,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    location extensions.geography(Point,4326),
    attributes JSONB,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_facility_organization ON facility(organization_id);
CREATE INDEX idx_facility_slug ON facility(slug);
CREATE INDEX idx_facility_active ON facility(is_active);

COMMENT ON TABLE facility IS 'Physical facilities with courts';

-- Add FK constraint to player_sport for preferred_facility
ALTER TABLE player_sport
    ADD CONSTRAINT player_sport_preferred_facility_id_fkey
    FOREIGN KEY (preferred_facility_id) REFERENCES facility(id) ON DELETE SET NULL;

-- Facility Contact table
CREATE TABLE facility_contact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facility(id) ON DELETE CASCADE,
    sport_id UUID REFERENCES sport(id) ON DELETE SET NULL,
    phone VARCHAR(30),
    email VARCHAR(255),
    website VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE NOT NULL,
    contact_type facility_contact_type_enum NOT NULL,
    notes TEXT,
    attributes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_facility_contact_facility ON facility_contact(facility_id);
CREATE INDEX idx_facility_contact_primary ON facility_contact(is_primary);

-- Facility Image table
CREATE TABLE facility_image (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facility(id) ON DELETE CASCADE,
    storage_key VARCHAR(255) UNIQUE NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    description TEXT,
    display_order INT DEFAULT 0 NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    metadata JSONB,
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_facility_image_facility ON facility_image(facility_id);
CREATE INDEX idx_facility_image_order ON facility_image(facility_id, display_order);

-- Facility Sports junction table
CREATE TABLE facility_sport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facility(id) ON DELETE CASCADE,
    sport_id UUID NOT NULL REFERENCES sport(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX uq_facility_sport ON facility_sport(facility_id, sport_id);
CREATE INDEX idx_facility_sport_facility ON facility_sport(facility_id);
CREATE INDEX idx_facility_sport_sport ON facility_sport(sport_id);

-- Facility Files junction table
CREATE TABLE facility_file (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facility(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES file(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE
);

-- ============================================================================
-- COURT SYSTEM
-- ============================================================================

-- Court table
CREATE TABLE court (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facility(id) ON DELETE CASCADE,
    name VARCHAR(100),
    court_number INT,
    surface_type surface_type_enum,
    lighting BOOLEAN DEFAULT FALSE NOT NULL,
    indoor BOOLEAN DEFAULT FALSE NOT NULL,
    lines_marked_for_multiple_sports BOOLEAN DEFAULT FALSE NOT NULL,
    availability_status availability_enum DEFAULT 'available' NOT NULL,
    attributes JSONB,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX uq_court_facility_court_number ON court(facility_id, court_number);
CREATE INDEX idx_court_facility ON court(facility_id);
CREATE INDEX idx_court_availability ON court(availability_status);

COMMENT ON TABLE court IS 'Individual courts within facilities';

-- Court Sports junction table
CREATE TABLE court_sport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID NOT NULL REFERENCES court(id) ON DELETE CASCADE,
    sport_id UUID NOT NULL REFERENCES sport(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX uq_court_sport ON court_sport(court_id, sport_id);

-- ============================================================================
-- NOTIFICATION SYSTEM
-- ============================================================================

-- Notification table
CREATE TABLE notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
    type notification_type_enum NOT NULL,
    target_id UUID,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    payload JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notification_user ON notification(user_id);
CREATE INDEX idx_notification_user_read ON notification(user_id, read_at);
CREATE INDEX idx_notification_type ON notification(type);
CREATE INDEX idx_notification_expires ON notification(expires_at);

-- Delivery Attempts table
CREATE TABLE delivery_attempt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notification(id) ON DELETE SET NULL,
    invitation_id UUID,
    attempt_number INT NOT NULL,
    channel delivery_channel_enum NOT NULL,
    status delivery_status_enum NOT NULL,
    error_message TEXT,
    provider_response JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX uq_delivery_attempt_sequence ON delivery_attempt(notification_id, attempt_number);
CREATE INDEX idx_delivery_attempt_notification ON delivery_attempt(notification_id);

-- ============================================================================
-- INVITATION SYSTEM
-- ============================================================================

-- Invitation table
CREATE TABLE invitation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255),
    phone VARCHAR(30),
    token VARCHAR(255) UNIQUE NOT NULL,
    source invite_source_enum DEFAULT 'manual' NOT NULL,
    inviter_id UUID NOT NULL REFERENCES profile(id) ON DELETE SET NULL,
    invited_user_id UUID REFERENCES profile(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organization(id) ON DELETE CASCADE,
    role app_role_enum DEFAULT 'player' NOT NULL,
    admin_role admin_role_enum,
    status invite_status_enum DEFAULT 'pending' NOT NULL,
    metadata JSONB,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES profile(id) ON DELETE SET NULL,
    revoke_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_invitation_email ON invitation(email);
CREATE INDEX idx_invitation_status ON invitation(status);
CREATE INDEX idx_invitation_expires ON invitation(expires_at);
CREATE INDEX idx_invitation_inviter ON invitation(inviter_id);

-- Add FK for delivery_attempt -> invitation
ALTER TABLE delivery_attempt
    ADD CONSTRAINT delivery_attempt_invitation_id_fkey
    FOREIGN KEY (invitation_id) REFERENCES invitation(id) ON DELETE SET NULL;

-- ============================================================================
-- VERIFICATION SYSTEM
-- ============================================================================

-- Verification Code table
CREATE TABLE verification_code (
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

CREATE INDEX idx_verification_code_email ON verification_code(email);
CREATE INDEX idx_verification_code_lookup ON verification_code(email, code, used);
CREATE INDEX idx_verification_code_expires ON verification_code(expires_at);

COMMENT ON TABLE verification_code IS 'Email verification codes for user authentication';

-- ============================================================================
-- WAITLIST
-- ============================================================================

CREATE TABLE waitlist_signup (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    ip_address TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRIGGER FUNCTION: handle_new_user
-- ============================================================================
-- Creates a profile when a new user signs up.
-- For social auth (Google, Facebook, Apple, etc.): Extracts full_name, display_name, and avatar from OAuth metadata.
-- For email OTP signup: Only populates email field, leaves full_name and display_name as NULL for user to fill in later.

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
    provider text;
    user_full_name text;
    user_display_name text;
    user_avatar_url text;
    user_email text;
    is_social_auth boolean;
BEGIN
    -- Determine provider (defaults to 'email' for email/password or OTP)
    provider := COALESCE(new.raw_app_meta_data->>'provider', 'email');
    
    -- Check if this is a social auth provider
    is_social_auth := provider IN (
        'google', 'facebook', 'apple', 'azure', 'microsoft',
        'twitter', 'github', 'gitlab', 'linkedin', 'linkedin_oidc',
        'discord', 'slack', 'spotify', 'twitch', 'bitbucket', 'notion', 'zoom'
    );
    
    -- Default values - all NULL for email OTP signups
    user_full_name := NULL;
    user_display_name := NULL;
    user_avatar_url := NULL;
    user_email := new.email;
    
    -- Only extract OAuth metadata for social auth providers
    IF is_social_auth AND new.raw_user_meta_data IS NOT NULL THEN
        -- Extract full name from various possible fields
        user_full_name := COALESCE(
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'name'
        );
        
        -- Extract display name / username from various possible fields
        user_display_name := COALESCE(
            new.raw_user_meta_data->>'preferred_username',
            new.raw_user_meta_data->>'user_name',
            new.raw_user_meta_data->>'nickname',
            new.raw_user_meta_data->>'name'
        );
        
        -- Extract avatar URL from various possible fields
        user_avatar_url := COALESCE(
            new.raw_user_meta_data->>'avatar_url',
            new.raw_user_meta_data->>'picture'
        );
    END IF;
    
    -- NOTE: For email OTP signups, we intentionally do NOT set display_name to email.
    -- The profile will have NULL for full_name and display_name, which the user can fill in later.
    
    INSERT INTO public.profile (
        id, email, full_name, display_name, avatar_url,
        locale, timezone, two_factor_enabled, is_active,
        created_at, updated_at
    )
    VALUES (
        new.id, user_email, user_full_name, user_display_name, user_avatar_url,
        'en-CA', 'America/Toronto', false, true, now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, profile.email),
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profile.full_name),
        display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), profile.display_name),
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profile.avatar_url),
        updated_at = now();
    
    RETURN new;
EXCEPTION
    WHEN others THEN
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- TRIGGER FUNCTION: update_updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_profile_updated_at BEFORE UPDATE ON profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_player_updated_at BEFORE UPDATE ON player FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sport_updated_at BEFORE UPDATE ON sport FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_updated_at BEFORE UPDATE ON organization FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_facility_updated_at BEFORE UPDATE ON facility FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on main tables
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE player ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating_score ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_sport ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_rating_score ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_signup ENABLE ROW LEVEL SECURITY;

-- Profile policies
-- Note: Profiles are created automatically via the handle_new_user trigger (SECURITY DEFINER bypasses RLS)
CREATE POLICY "Users can view all active profiles" ON profile FOR SELECT USING (is_active = true);
CREATE POLICY "Users can update their own profile" ON profile FOR UPDATE USING (auth.uid() = id);

-- Player policies
CREATE POLICY "Players can view other players" ON player FOR SELECT USING (true);
CREATE POLICY "Players can update their own data" ON player FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Players can insert their own data" ON player FOR INSERT WITH CHECK (auth.uid() = id);

-- Sport policies (public read)
CREATE POLICY "Anyone can view active sports" ON sport FOR SELECT USING (is_active = true);

-- Rating system policies (public read)
CREATE POLICY "Anyone can view active rating systems" ON rating_system FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view rating scores" ON rating_score FOR SELECT USING (true);

-- Player sport policies
CREATE POLICY "Players can view player sports" ON player_sport FOR SELECT USING (true);
CREATE POLICY "Players can manage their own sports" ON player_sport FOR ALL USING (auth.uid() = player_id);

-- Player rating score policies
CREATE POLICY "Players can view rating scores" ON player_rating_score FOR SELECT USING (true);
CREATE POLICY "Players can manage their own rating scores" ON player_rating_score FOR ALL USING (auth.uid() = player_id);

-- Player availability policies
CREATE POLICY "Players can manage their own availability" ON player_availability FOR ALL USING (auth.uid() = player_id);

-- Notification policies
CREATE POLICY "Users can view their notifications" ON notification FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their notifications" ON notification FOR UPDATE USING (auth.uid() = user_id);

-- Verification code policies
CREATE POLICY "Allow anonymous insert" ON verification_code FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select by email" ON verification_code FOR SELECT USING (true);
CREATE POLICY "Allow update by email" ON verification_code FOR UPDATE USING (true) WITH CHECK (true);

-- Waitlist policies
CREATE POLICY "anonymous can insert waitlist" ON waitlist_signup FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "public can read waitlist" ON waitlist_signup FOR SELECT TO anon USING (true);

-- ============================================================================
-- PERMISSIONS / GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT ALL ON FUNCTION handle_new_user() TO anon;
GRANT ALL ON FUNCTION handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION handle_new_user() TO service_role;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Seed Sports
INSERT INTO sport (id, name, slug, display_name, description, icon_url, is_active) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'tennis', 'tennis', 'Tennis', 'Traditional tennis sport', 'images/tennis.jpg', true),
    ('550e8400-e29b-41d4-a716-446655440002', 'pickleball', 'pickleball', 'Pickleball', 'Fast-paced paddle sport', 'images/pickleball.jpg', true);

-- Seed Rating Systems
INSERT INTO rating_system (id, sport_id, code, name, description, min_value, max_value, step, default_initial_value, is_active) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'NTRP', 'NTRP', 'National Tennis Rating Program', 1.0, 7.0, 0.5, 3.0, true),
    ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'UTR', 'UTR', 'Universal Tennis Rating', 1.0, 16.5, 0.1, 5.0, true),
    ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'DUPR', 'DUPR', 'Dynamic Universal Pickleball Rating', 1.0, 8.0, 0.5, 3.5, true);

-- Seed NTRP Rating Scores (Tennis)
INSERT INTO rating_score (rating_system_id, value, label, description) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', 1.5, 'NTRP 1.5', 'Still working on getting consistent; errors, many focused on getting the ball into play.'),
    ('660e8400-e29b-41d4-a716-446655440001', 2.0, 'NTRP 2.0', 'Obvious stroke weaknesses for singles and doubles. Has clear stroke weaknesses and needs more court experience.'),
    ('660e8400-e29b-41d4-a716-446655440001', 2.5, 'NTRP 2.5', 'Starting to judge ball direction and sustain short rallies; limited court coverage.'),
    ('660e8400-e29b-41d4-a716-446655440001', 3.0, 'NTRP 3.0', 'Fairly consistent on medium paced shots but lacks control, depth and power with faster shots.'),
    ('660e8400-e29b-41d4-a716-446655440001', 3.5, 'NTRP 3.5', 'More reliable strokes with directional control. Improving net play, coverage, and teamwork.'),
    ('660e8400-e29b-41d4-a716-446655440001', 4.0, 'NTRP 4.0', 'Dependable strokes with control and depth; placement in point play shows teamwork.'),
    ('660e8400-e29b-41d4-a716-446655440001', 4.5, 'NTRP 4.5', 'Solid power and consistency. Controls depth and spin. Strategic shot placement.'),
    ('660e8400-e29b-41d4-a716-446655440001', 5.0, 'NTRP 5.0', 'Exceptional shot variety with pace and spin. Excellent footwork and court coverage.'),
    ('660e8400-e29b-41d4-a716-446655440001', 5.5, 'NTRP 5.5', 'Mastery of all shots. Exceptional consistency and power. Advanced tactics and mental game.'),
    ('660e8400-e29b-41d4-a716-446655440001', 6.0, 'NTRP 6.0+', 'Professional level play. National or international tournament experience.');

-- Seed DUPR Rating Scores (Pickleball)
INSERT INTO rating_score (rating_system_id, value, label, description) VALUES
    ('660e8400-e29b-41d4-a716-446655440004', 1.0, 'DUPR 1.0', 'Just starting out. Learning basic rules and stroke mechanics.'),
    ('660e8400-e29b-41d4-a716-446655440004', 2.0, 'DUPR 2.0', 'Just getting started. Short rallies (1-2 shots). Learning basic scoring knowledge.'),
    ('660e8400-e29b-41d4-a716-446655440004', 2.5, 'DUPR 2.5', 'Developing basic strokes. Can sustain short rallies. Learning court positioning.'),
    ('660e8400-e29b-41d4-a716-446655440004', 3.0, 'DUPR 3.0', 'Can sustain short rallies and serves. Beginning to dink. Learning positioning.'),
    ('660e8400-e29b-41d4-a716-446655440004', 3.5, 'DUPR 3.5', 'Developing third-shot drop. Can dink moderately. Avoids backhands.'),
    ('660e8400-e29b-41d4-a716-446655440004', 4.0, 'DUPR 4.0', 'Plays longer rallies with patience. Aware of positioning. Uses varied shots.'),
    ('660e8400-e29b-41d4-a716-446655440004', 4.5, 'DUPR 4.5', 'Strong consistency and power. Varied shots. Comfortable crashing near the kitchen.'),
    ('660e8400-e29b-41d4-a716-446655440004', 5.0, 'DUPR 5.0', 'Highest level of shot types. Rarely makes unforced errors. Plays competitively.'),
    ('660e8400-e29b-41d4-a716-446655440004', 5.5, 'DUPR 5.5', 'Exceptional skill level. Mastery of all shots. Tournament-level play.'),
    ('660e8400-e29b-41d4-a716-446655440004', 6.0, 'DUPR 6.0+', 'Professional level. National or international tournament play.');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    sport_count INT;
    rating_system_count INT;
    ntrp_count INT;
    dupr_count INT;
BEGIN
    SELECT COUNT(*) INTO sport_count FROM sport;
    SELECT COUNT(*) INTO rating_system_count FROM rating_system;
    SELECT COUNT(*) INTO ntrp_count FROM rating_score WHERE rating_system_id = '660e8400-e29b-41d4-a716-446655440001';
    SELECT COUNT(*) INTO dupr_count FROM rating_score WHERE rating_system_id = '660e8400-e29b-41d4-a716-446655440004';
    
    RAISE NOTICE '=== Seed Data Verification ===';
    RAISE NOTICE 'Sports: % (expected: 2)', sport_count;
    RAISE NOTICE 'Rating Systems: % (expected: 3)', rating_system_count;
    RAISE NOTICE 'NTRP Scores: % (expected: 10)', ntrp_count;
    RAISE NOTICE 'DUPR Scores: % (expected: 10)', dupr_count;
END $$;

