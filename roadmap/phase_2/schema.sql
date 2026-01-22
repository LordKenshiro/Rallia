-- ============================================================================
-- RALLIA DATABASE SCHEMA - END OF PHASE 2
-- Phase 2: Match System (Dec 30, 2025 - Jan 24, 2026)
-- 
-- This schema includes:
-- - Everything from Phase 1 (Base + Player Relations)
-- - Phase 2 additions: Matches, invitations, participants, templates, feedback, reputation
-- ============================================================================

-- ============================================================================
-- ENUM TYPES (Base + Phase 1)
-- ============================================================================

CREATE TYPE "admin_role_enum" AS ENUM (
  'super_admin',
  'moderator',
  'support'
);

CREATE TYPE "organization_nature_enum" AS ENUM (
  'public',
  'private'
);

CREATE TYPE "organization_type_enum" AS ENUM (
  'club',
  'municipality',
  'city',
  'association'
);

CREATE TYPE "country_enum" AS ENUM (
  'Canada',
  'United States'
);

CREATE TYPE "role_enum" AS ENUM (
  'admin',
  'staff',
  'player',
  'coach',
  'owner'
);

CREATE TYPE "gender_enum" AS ENUM (
  'male',
  'female',
  'other',
  'prefer_not_to_say'
);

CREATE TYPE "playing_hand_enum" AS ENUM (
  'right',
  'left',
  'both'
);

CREATE TYPE "day_enum" AS ENUM (
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
);

CREATE TYPE "period_enum" AS ENUM (
  'morning',
  'afternoon',
  'evening'
);

CREATE TYPE "match_duration_enum" AS ENUM (
  '30',
  '60',
  '90',
  '120'
);

CREATE TYPE "match_type_enum" AS ENUM (
  'practice',
  'competitive',
  'both'
);

CREATE TYPE "surface_type_enum" AS ENUM (
  'hard',
  'clay',
  'grass',
  'synthetic',
  'carpet',
  'asphalt',
  'concrete'
);

CREATE TYPE "rating_certification_method_enum" AS ENUM (
  'external_rating',
  'proof',
  'referrals'
);

CREATE TYPE "file_type_enum" AS ENUM (
  'image',
  'video',
  'document',
  'audio',
  'other'
);

CREATE TYPE "proof_type_enum" AS ENUM (
  'external_link',
  'file'
);

CREATE TYPE "proof_status_enum" AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE "rating_request_status_enum" AS ENUM (
  'pending',
  'completed',
  'declined',
  'expired',
  'cancelled'
);

CREATE TYPE "facility_contact_type_enum" AS ENUM (
  'general',
  'reservation',
  'maintenance',
  'other'
);

CREATE TYPE "facility_type_enum" AS ENUM (
  'municipal',
  'university',
  'club',
  'school',
  'community_club',
  'community_center',
  'park',
  'indoor_center',
  'private',
  'other'
);

CREATE TYPE "court_status_enum" AS ENUM (
  'available',
  'unavailable',
  'maintenance',
  'reserved',
  'under_maintenance',
  'closed'
);

CREATE TYPE "invite_source_enum" AS ENUM (
  'manual',
  'auto_match',
  'invite_list',
  'mailing_list',
  'growth_prompt'
);

CREATE TYPE "invite_status_enum" AS ENUM (
  'pending',
  'sent',
  'accepted',
  'expired',
  'bounced',
  'cancelled'
);

CREATE TYPE "app_role_enum" AS ENUM (
  'player',
  'organization_member',
  'admin'
);

CREATE TYPE "community_member_status_enum" AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- ============================================================================
-- PHASE 2 ENUM TYPES
-- ============================================================================

CREATE TYPE "match_visibility_enum" AS ENUM (
  'public',
  'private'
);

CREATE TYPE "match_validation_enum" AS ENUM (
  'auto',
  'manual'
);

CREATE TYPE "match_court_status_enum" AS ENUM (
  'reserved',
  'to_reserve'
);

CREATE TYPE "match_expectation_enum" AS ENUM (
  'practice',
  'competitive',
  'both'
);

CREATE TYPE "match_status_enum" AS ENUM (
  'open',
  'filled',
  'cancelled',
  'completed',
  'expired'
);

CREATE TYPE "match_invitation_status_enum" AS ENUM (
  'pending',
  'accepted',
  'declined',
  'expired'
);

CREATE TYPE "game_type_enum" AS ENUM (
  'singles',
  'doubles'
);

-- ============================================================================
-- BASE TABLES (Same as Phase 1)
-- ============================================================================

CREATE TABLE "auth_users" (
  "id" uuid PRIMARY KEY,
  "aud" varchar(255),
  "role" varchar(50),
  "email" varchar(255),
  "email_confirmed_at" timestamptz,
  "phone" varchar(20),
  "phone_confirmed_at" timestamptz,
  "confirmed_at" timestamptz,
  "last_sign_in_at" timestamptz,
  "app_metadata" jsonb,
  "user_metadata" jsonb,
  "identities" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  "is_anonymous" boolean NOT NULL DEFAULT false
);

CREATE TABLE "profile" (
  "id" uuid PRIMARY KEY,
  "email" varchar(255) NOT NULL,
  "full_name" varchar(255),
  "display_name" varchar(100),
  "profile_picture_url" varchar(255),
  "birth_date" date,
  "phone" varchar(20),
  "locale" varchar(10) NOT NULL DEFAULT 'en-CA',
  "timezone" varchar(50) NOT NULL DEFAULT 'America/Toronto',
  "two_factor_enabled" boolean NOT NULL DEFAULT false,
  "last_active_at" timestamptz,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "admin" (
  "id" uuid PRIMARY KEY,
  "role" admin_role_enum NOT NULL,
  "permissions" jsonb,
  "assigned_at" timestamptz NOT NULL DEFAULT (now()),
  "notes" text
);

CREATE TABLE "organization" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "owner_id" uuid,
  "name" varchar(255) NOT NULL,
  "nature" organization_nature_enum NOT NULL,
  "email" varchar(255) UNIQUE NOT NULL,
  "phone" varchar(20),
  "slug" varchar(255) UNIQUE NOT NULL,
  "address" varchar(255),
  "city" varchar(100),
  "country" country_enum,
  "postal_code" varchar(20),
  "type" organization_type_enum,
  "description" text,
  "website" varchar(255),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "organization_member" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "role" role_enum NOT NULL,
  "permissions" jsonb,
  "joined_at" timestamptz NOT NULL DEFAULT (now()),
  "left_at" timestamptz,
  "invited_by" uuid
);

CREATE TABLE "player" (
  "id" uuid PRIMARY KEY,
  "username" varchar(50) UNIQUE NOT NULL,
  "bio" text,
  "gender" gender_enum,
  "playing_hand" playing_hand_enum,
  "max_travel_distance" int,
  "reputation_score" decimal(5,2) NOT NULL DEFAULT 100,
  "rating_count" int NOT NULL DEFAULT 0,
  "verified" boolean NOT NULL DEFAULT false,
  "calendar_is_public" boolean NOT NULL DEFAULT false,
  "matches_played" int NOT NULL DEFAULT 0,
  "reputation_calculated_at" timestamptz
);

CREATE TABLE "player_availability" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "player_id" uuid NOT NULL,
  "day" day_enum NOT NULL,
  "period" period_enum NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "sport" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "name" varchar(100) UNIQUE NOT NULL,
  "slug" varchar(100) UNIQUE NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "attributes" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "play_style" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "sport_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "play_attribute" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "sport_id" uuid,
  "name" varchar(100) NOT NULL,
  "description" text,
  "category" varchar(100),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "player_sport" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "player_id" uuid NOT NULL,
  "sport_id" uuid NOT NULL,
  "preferred_match_duration" match_duration_enum,
  "preferred_match_type" match_type_enum,
  "preferred_play_style" play_style_enum,
  "preferred_play_attributes" play_attribute_enum[],
  "preferred_facility_id" uuid,
  "preferred_court" varchar(100),
  "is_primary" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now()),
  UNIQUE("player_id", "sport_id")
);

CREATE TABLE "rating_system" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "sport_id" uuid NOT NULL,
  "code" varchar(50) UNIQUE NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "min_value" numeric(5,2) NOT NULL,
  "max_value" numeric(5,2) NOT NULL,
  "step" numeric(5,2) NOT NULL DEFAULT 0.5,
  "default_initial_value" numeric(5,2),
  "min_for_referral" numeric(5,2),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "rating_score" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "rating_system_id" uuid NOT NULL,
  "value" float,
  "label" varchar(50) NOT NULL,
  "min_value" float,
  "max_value" float,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "player_rating_score" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "player_id" uuid NOT NULL,
  "rating_score_id" uuid NOT NULL,
  "is_certified" boolean NOT NULL DEFAULT false,
  "certified_via" rating_certification_method_enum,
  "certified_at" timestamptz,
  "external_rating_score_id" uuid,
  "referrals_count" int NOT NULL DEFAULT 0,
  "evaluations_count" int NOT NULL DEFAULT 0,
  "last_evaluated_at" timestamptz,
  "expires_at" timestamptz,
  "source" varchar(100),
  "notes" text,
  "assigned_at" timestamptz NOT NULL DEFAULT (now()),
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "file" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "uploaded_by" uuid NOT NULL,
  "storage_key" varchar(500) UNIQUE NOT NULL,
  "url" text NOT NULL,
  "thumbnail_url" text,
  "original_name" varchar(255) NOT NULL,
  "file_type" file_type_enum NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "file_size" bigint NOT NULL,
  "metadata" jsonb DEFAULT ('{}'),
  "is_deleted" boolean NOT NULL DEFAULT false,
  "deleted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "rating_proof" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "player_rating_score_id" uuid NOT NULL,
  "proof_type" proof_type_enum NOT NULL,
  "file_id" uuid,
  "external_url" text,
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" proof_status_enum NOT NULL DEFAULT 'pending',
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "review_notes" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "rating_reference_request" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "requester_id" uuid NOT NULL,
  "player_rating_score_id" uuid NOT NULL,
  "referee_id" uuid NOT NULL,
  "message" text,
  "status" rating_request_status_enum NOT NULL DEFAULT 'pending',
  "rating_supported" boolean NOT NULL DEFAULT false,
  "response_message" text,
  "responded_at" timestamptz,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "peer_rating_request" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "requester_id" uuid NOT NULL,
  "evaluator_id" uuid NOT NULL,
  "rating_system_id" uuid NOT NULL,
  "message" text,
  "status" rating_request_status_enum NOT NULL DEFAULT 'pending',
  "assigned_rating_score_id" uuid,
  "response_message" text,
  "responded_at" timestamptz,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "facility" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "organization_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "facility_type" facility_type_enum,
  "slug" varchar(255) UNIQUE NOT NULL,
  "description" text,
  "address" varchar(255),
  "city" varchar(100),
  "country" country_enum,
  "postal_code" varchar(20),
  "membership_required" boolean NOT NULL DEFAULT false,
  "location" geography(Point,4326),
  "latitude" decimal(9,6),
  "longitude" decimal(9,6),
  "attributes" jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  "archived_at" timestamptz
);

CREATE TABLE "facility_contact" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "facility_id" uuid NOT NULL,
  "phone" varchar(30),
  "email" varchar(255),
  "website" varchar(255),
  "is_primary" boolean NOT NULL DEFAULT false,
  "contact_type" facility_contact_type_enum NOT NULL,
  "notes" text,
  "attributes" jsonb,
  "sport_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "facility_image" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "facility_id" uuid NOT NULL,
  "storage_key" varchar(255) UNIQUE NOT NULL,
  "url" text NOT NULL,
  "thumbnail_url" text,
  "description" text,
  "display_order" int NOT NULL DEFAULT 0,
  "is_primary" boolean NOT NULL DEFAULT false,
  "file_size" bigint,
  "mime_type" varchar(100),
  "metadata" jsonb,
  "uploaded_at" timestamptz NOT NULL DEFAULT (now()),
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "facility_file" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "facility_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "display_order" int DEFAULT 0,
  "is_primary" boolean DEFAULT false
);

CREATE TABLE "facility_sport" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "facility_id" uuid NOT NULL,
  "sport_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "court" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "facility_id" uuid NOT NULL,
  "surface_type" surface_type_enum,
  "lighting" boolean NOT NULL DEFAULT false,
  "indoor" boolean NOT NULL DEFAULT false,
  "name" varchar(100),
  "court_number" int,
  "lines_marked_for_multiple_sports" boolean NOT NULL DEFAULT false,
  "availability_status" court_status_enum NOT NULL DEFAULT 'available',
  "attributes" jsonb,
  "notes" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "court_sport" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "court_id" uuid NOT NULL,
  "sport_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "invitation" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "email" varchar(255),
  "phone" varchar(30),
  "token" varchar(255) UNIQUE NOT NULL,
  "source" invite_source_enum NOT NULL DEFAULT 'manual',
  "inviter_id" uuid NOT NULL,
  "invited_user_id" uuid,
  "organization_id" uuid,
  "role" app_role_enum NOT NULL DEFAULT 'player',
  "admin_role" admin_role_enum,
  "status" invite_status_enum NOT NULL DEFAULT 'pending',
  "expires_at" timestamptz NOT NULL,
  "accepted_at" timestamptz,
  "revoked_at" timestamptz,
  "revoked_by" uuid,
  "revoke_reason" text,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

-- ============================================================================
-- PHASE 1 TABLES: Player Relations
-- ============================================================================

CREATE TABLE "player_block" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "blocker_id" uuid NOT NULL,
  "blocked_id" uuid NOT NULL,
  "reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE "player_favorite" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "favorite_id" uuid NOT NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, favorite_id)
);

CREATE TABLE "player_group" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) NOT NULL,
  "description" text,
  "created_by" uuid NOT NULL,
  "sport_id" uuid,
  "max_members" int NOT NULL DEFAULT 10,
  "member_count" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "group_member" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "group_id" uuid NOT NULL,
  "player_id" uuid NOT NULL,
  "is_moderator" boolean NOT NULL DEFAULT false,
  "added_by" uuid,
  "joined_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, player_id)
);

CREATE TABLE "community" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(150) NOT NULL,
  "description" text,
  "cover_image_url" text,
  "created_by" uuid NOT NULL,
  "sport_id" uuid,
  "is_public" boolean NOT NULL DEFAULT true,
  "requires_approval" boolean NOT NULL DEFAULT true,
  "member_count" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "community_member" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "community_id" uuid NOT NULL,
  "player_id" uuid NOT NULL,
  "is_moderator" boolean NOT NULL DEFAULT false,
  "status" community_member_status_enum NOT NULL DEFAULT 'pending',
  "joined_at" timestamptz,
  "requested_at" timestamptz NOT NULL DEFAULT now(),
  "approved_by" uuid,
  UNIQUE(community_id, player_id)
);

CREATE TABLE "private_contact_list" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "contact_count" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "private_contact" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "list_id" uuid NOT NULL,
  "name" varchar(150) NOT NULL,
  "phone" varchar(30),
  "email" varchar(255),
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 2 TABLES: Match System
-- ============================================================================

-- Matches
CREATE TABLE "match" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_by" uuid NOT NULL,
  "sport_id" uuid NOT NULL,
  
  -- Scheduling
  "match_date" date NOT NULL,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "duration_minutes" int NOT NULL,
  
  -- Location
  "facility_id" uuid,
  "court_id" uuid,
  "location_name" varchar(255),
  "location_address" text,
  "location_latitude" decimal(9,6),
  "location_longitude" decimal(9,6),
  "search_radius_km" int,
  
  -- Court status
  "court_status" match_court_status_enum NOT NULL DEFAULT 'to_reserve',
  "court_cost" decimal(10,2),
  "cost_split_50_50" boolean DEFAULT true,
  
  -- Match settings
  "game_type" game_type_enum NOT NULL DEFAULT 'singles',
  "min_level_required" decimal(3,1),
  "max_level_allowed" decimal(3,1),
  "target_gender" varchar(20),
  "expectations" match_expectation_enum NOT NULL DEFAULT 'both',
  
  -- Visibility & validation
  "visibility" match_visibility_enum NOT NULL DEFAULT 'public',
  "validation_type" match_validation_enum NOT NULL DEFAULT 'auto',
  
  -- Status
  "status" match_status_enum NOT NULL DEFAULT 'open',
  
  -- Additional info
  "description" text,
  "max_participants" int NOT NULL DEFAULT 2,
  
  -- Timestamps
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz,
  "completed_at" timestamptz,
  "cancelled_at" timestamptz,
  "cancellation_reason" text
);

-- Match invitations (for private matches or public with specific invites)
CREATE TABLE "match_invitation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "match_id" uuid NOT NULL,
  "invited_player_id" uuid,
  "invited_group_id" uuid,
  "invited_community_id" uuid,
  "invited_contact_id" uuid,
  "status" match_invitation_status_enum NOT NULL DEFAULT 'pending',
  "responded_at" timestamptz,
  "response_message" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Match participants (confirmed players)
CREATE TABLE "match_participant" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "match_id" uuid NOT NULL,
  "player_id" uuid NOT NULL,
  "team_number" int,
  "is_creator" boolean NOT NULL DEFAULT false,
  "joined_at" timestamptz NOT NULL DEFAULT now(),
  "cancelled_at" timestamptz,
  "cancellation_reason" text,
  "last_minute_cancellation" boolean DEFAULT false,
  UNIQUE(match_id, player_id)
);

-- Match templates for quick creation
CREATE TABLE "match_template" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "template_data" jsonb NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "use_count" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Match feedback (post-match reviews)
CREATE TABLE "match_feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "match_id" uuid NOT NULL,
  "reviewer_id" uuid NOT NULL,
  "reviewed_id" uuid NOT NULL,
  
  -- Feedback data
  "opponent_showed" boolean NOT NULL,
  "match_occurred" boolean NOT NULL,
  "opponent_late" boolean NOT NULL DEFAULT false,
  "satisfaction_rating" int NOT NULL CHECK (satisfaction_rating BETWEEN 1 AND 5),
  "skill_rating_value" decimal(3,1),
  "skill_rating_score_id" uuid,
  "comments" text,
  
  -- Timestamps
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, reviewer_id, reviewed_id)
);

-- Reputation history for tracking changes
CREATE TABLE "reputation_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "match_id" uuid,
  "feedback_id" uuid,
  "previous_score" decimal(5,2) NOT NULL,
  "new_score" decimal(5,2) NOT NULL,
  "change_amount" decimal(5,2) NOT NULL,
  "change_reason" text,
  "change_details" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Saved match filters
CREATE TABLE "saved_match_filter" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "filter_data" jsonb NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES (All phases)
-- ============================================================================

-- Base indexes
CREATE UNIQUE INDEX "uq_profile_email" ON "profile" ("email");
CREATE INDEX "idx_org_name" ON "organization" ("name");
CREATE UNIQUE INDEX ON "organization_member" ("user_id", "organization_id");
CREATE INDEX "idx_player_availability_player" ON "player_availability" ("player_id");
CREATE INDEX "idx_player_availability_day" ON "player_availability" ("day");
CREATE INDEX "idx_player_availability_period" ON "player_availability" ("period");
CREATE UNIQUE INDEX "uq_player_availability_player_day_period" ON "player_availability" ("player_id", "day", "period");
CREATE INDEX "idx_sport_name" ON "sport" ("name");
CREATE INDEX "idx_sport_is_active" ON "sport" ("is_active");
CREATE UNIQUE INDEX ON "play_style" ("sport_id", "name");
CREATE UNIQUE INDEX ON "play_attribute" ("sport_id", "name");
CREATE INDEX "idx_player_sport_player_id" ON "player_sport" ("player_id");
CREATE INDEX "idx_player_sport_sport_id" ON "player_sport" ("sport_id");
CREATE INDEX "idx_rating_system_code" ON "rating_system" ("code");
CREATE UNIQUE INDEX "uq_rating_score_system_value" ON "rating_score" ("rating_system_id", "value");
CREATE UNIQUE INDEX "uq_player_rating_score" ON "player_rating_score" ("player_id", "rating_score_id");
CREATE INDEX "idx_player_rating_score_player" ON "player_rating_score" ("player_id");
CREATE INDEX "idx_file_uploaded_by" ON "file" ("uploaded_by");
CREATE UNIQUE INDEX "uq_file_storage_key" ON "file" ("storage_key");
CREATE INDEX "idx_file_file_type" ON "file" ("file_type");
CREATE INDEX "idx_file_is_deleted" ON "file" ("is_deleted");
CREATE INDEX "idx_rating_proof_player_rating_score" ON "rating_proof" ("player_rating_score_id");
CREATE INDEX "idx_rating_proof_status" ON "rating_proof" ("status");
CREATE INDEX "idx_rating_proof_score_status" ON "rating_proof" ("player_rating_score_id", "status");
CREATE INDEX "idx_rating_ref_requests_requester" ON "rating_reference_request" ("requester_id");
CREATE INDEX "idx_rating_ref_requests_referee" ON "rating_reference_request" ("referee_id");
CREATE INDEX "idx_rating_ref_requests_score" ON "rating_reference_request" ("player_rating_score_id");
CREATE INDEX "idx_rating_ref_requests_status" ON "rating_reference_request" ("status");
CREATE INDEX "idx_rating_ref_requests_expires" ON "rating_reference_request" ("expires_at");
CREATE INDEX "idx_peer_rating_request_requester" ON "peer_rating_request" ("requester_id");
CREATE INDEX "idx_peer_rating_request_evaluator" ON "peer_rating_request" ("evaluator_id");
CREATE INDEX "idx_peer_rating_request_system" ON "peer_rating_request" ("rating_system_id");
CREATE INDEX "idx_peer_rating_request_status" ON "peer_rating_request" ("status");
CREATE INDEX "idx_peer_rating_request_expires" ON "peer_rating_request" ("expires_at");
CREATE UNIQUE INDEX "uq_peer_rating_request" ON "peer_rating_request" ("requester_id", "rating_system_id", "evaluator_id");
CREATE INDEX "idx_facility_slug" ON "facility" ("slug");
CREATE INDEX "idx_facility_org" ON "facility" ("organization_id");
CREATE INDEX "idx_facility_active" ON "facility" ("is_active");
CREATE INDEX "idx_facility_created_at" ON "facility" ("created_at");
CREATE INDEX "idx_facility_contact_facility" ON "facility_contact" ("facility_id");
CREATE INDEX "idx_facility_contact_primary" ON "facility_contact" ("is_primary");
CREATE INDEX "idx_facility_image_facility" ON "facility_image" ("facility_id");
CREATE INDEX "idx_facility_image_order" ON "facility_image" ("facility_id", "display_order");
CREATE UNIQUE INDEX "uq_facility_image_storage_key" ON "facility_image" ("storage_key");
CREATE INDEX "idx_facility_sport_facility" ON "facility_sport" ("facility_id");
CREATE INDEX "idx_facility_sport_sport" ON "facility_sport" ("sport_id");
CREATE UNIQUE INDEX "uq_facility_sport_facility_sport" ON "facility_sport" ("facility_id", "sport_id");
CREATE INDEX "idx_court_facility" ON "court" ("facility_id");
CREATE INDEX "idx_court_availability" ON "court" ("availability_status");
CREATE UNIQUE INDEX "uq_court_facility_court_number" ON "court" ("facility_id", "court_number");
CREATE INDEX "idx_court_sport_court" ON "court_sport" ("court_id");
CREATE INDEX "idx_court_sport_sport" ON "court_sport" ("sport_id");
CREATE UNIQUE INDEX "uq_court_sport_court_sport" ON "court_sport" ("court_id", "sport_id");
CREATE UNIQUE INDEX ON "invitation" ("token");
CREATE INDEX ON "invitation" ("email");
CREATE INDEX ON "invitation" ("inviter_id");
CREATE INDEX ON "invitation" ("status");
CREATE INDEX ON "invitation" ("expires_at");
CREATE INDEX ON "invitation" ("email", "status");
CREATE INDEX ON "invitation" ("status", "expires_at");

-- Phase 1 indexes
CREATE INDEX "idx_player_block_blocker" ON "player_block" ("blocker_id");
CREATE INDEX "idx_player_block_blocked" ON "player_block" ("blocked_id");
CREATE INDEX "idx_player_favorite_player" ON "player_favorite" ("player_id");
CREATE INDEX "idx_player_favorite_favorite" ON "player_favorite" ("favorite_id");
CREATE INDEX "idx_player_group_created_by" ON "player_group" ("created_by");
CREATE INDEX "idx_player_group_sport" ON "player_group" ("sport_id");
CREATE INDEX "idx_group_member_group" ON "group_member" ("group_id");
CREATE INDEX "idx_group_member_player" ON "group_member" ("player_id");
CREATE INDEX "idx_community_created_by" ON "community" ("created_by");
CREATE INDEX "idx_community_sport" ON "community" ("sport_id");
CREATE INDEX "idx_community_public" ON "community" ("is_public");
CREATE INDEX "idx_community_member_community" ON "community_member" ("community_id");
CREATE INDEX "idx_community_member_player" ON "community_member" ("player_id");
CREATE INDEX "idx_community_member_status" ON "community_member" ("status");
CREATE INDEX "idx_private_contact_list_player" ON "private_contact_list" ("player_id");
CREATE INDEX "idx_private_contact_list" ON "private_contact" ("list_id");

-- Phase 2 indexes
CREATE INDEX "idx_match_created_by" ON "match" ("created_by");
CREATE INDEX "idx_match_sport" ON "match" ("sport_id");
CREATE INDEX "idx_match_date" ON "match" ("match_date");
CREATE INDEX "idx_match_status" ON "match" ("status");
CREATE INDEX "idx_match_visibility" ON "match" ("visibility");
CREATE INDEX "idx_match_facility" ON "match" ("facility_id");
CREATE INDEX "idx_match_court" ON "match" ("court_id");
CREATE INDEX "idx_match_expires" ON "match" ("expires_at");
CREATE INDEX "idx_match_date_status" ON "match" ("match_date", "status");
CREATE INDEX "idx_match_invitation_match" ON "match_invitation" ("match_id");
CREATE INDEX "idx_match_invitation_player" ON "match_invitation" ("invited_player_id");
CREATE INDEX "idx_match_invitation_group" ON "match_invitation" ("invited_group_id");
CREATE INDEX "idx_match_invitation_community" ON "match_invitation" ("invited_community_id");
CREATE INDEX "idx_match_invitation_status" ON "match_invitation" ("status");
CREATE INDEX "idx_match_participant_match" ON "match_participant" ("match_id");
CREATE INDEX "idx_match_participant_player" ON "match_participant" ("player_id");
CREATE INDEX "idx_match_template_player" ON "match_template" ("player_id");
CREATE INDEX "idx_match_feedback_match" ON "match_feedback" ("match_id");
CREATE INDEX "idx_match_feedback_reviewer" ON "match_feedback" ("reviewer_id");
CREATE INDEX "idx_match_feedback_reviewed" ON "match_feedback" ("reviewed_id");
CREATE INDEX "idx_reputation_history_player" ON "reputation_history" ("player_id");
CREATE INDEX "idx_reputation_history_match" ON "reputation_history" ("match_id");
CREATE INDEX "idx_reputation_history_created" ON "reputation_history" ("created_at");
CREATE INDEX "idx_saved_match_filter_player" ON "saved_match_filter" ("player_id");

-- ============================================================================
-- FOREIGN KEYS (All phases)
-- ============================================================================

-- Base foreign keys
ALTER TABLE "profile" ADD FOREIGN KEY ("id") REFERENCES "auth_users" ("id") ON DELETE CASCADE;
ALTER TABLE "admin" ADD FOREIGN KEY ("id") REFERENCES "profile" ("id") ON DELETE CASCADE;
ALTER TABLE "organization" ADD FOREIGN KEY ("owner_id") REFERENCES "profile" ("id") ON DELETE SET NULL;
ALTER TABLE "organization_member" ADD FOREIGN KEY ("user_id") REFERENCES "profile" ("id") ON DELETE CASCADE;
ALTER TABLE "organization_member" ADD FOREIGN KEY ("organization_id") REFERENCES "organization" ("id") ON DELETE CASCADE;
ALTER TABLE "organization_member" ADD FOREIGN KEY ("invited_by") REFERENCES "profile" ("id") ON DELETE SET NULL;
ALTER TABLE "player" ADD FOREIGN KEY ("id") REFERENCES "profile" ("id") ON DELETE CASCADE;
ALTER TABLE "player_availability" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "play_style" ADD FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE CASCADE;
ALTER TABLE "play_attribute" ADD FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE SET NULL;
ALTER TABLE "player_sport" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "player_sport" ADD FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE CASCADE;
ALTER TABLE "player_sport" ADD FOREIGN KEY ("preferred_facility_id") REFERENCES "facility" ("id") ON DELETE SET NULL;
ALTER TABLE "rating_system" ADD FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE RESTRICT;
ALTER TABLE "rating_score" ADD FOREIGN KEY ("rating_system_id") REFERENCES "rating_system" ("id") ON DELETE CASCADE;
ALTER TABLE "player_rating_score" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "player_rating_score" ADD FOREIGN KEY ("rating_score_id") REFERENCES "rating_score" ("id") ON DELETE RESTRICT;
ALTER TABLE "player_rating_score" ADD FOREIGN KEY ("external_rating_score_id") REFERENCES "rating_score" ("id") ON DELETE SET NULL;
ALTER TABLE "file" ADD FOREIGN KEY ("uploaded_by") REFERENCES "profile" ("id") ON DELETE SET NULL;
ALTER TABLE "rating_proof" ADD FOREIGN KEY ("player_rating_score_id") REFERENCES "player_rating_score" ("id") ON DELETE CASCADE;
ALTER TABLE "rating_proof" ADD FOREIGN KEY ("file_id") REFERENCES "file" ("id") ON DELETE SET NULL;
ALTER TABLE "rating_proof" ADD FOREIGN KEY ("reviewed_by") REFERENCES "profile" ("id") ON DELETE SET NULL;
ALTER TABLE "rating_reference_request" ADD FOREIGN KEY ("requester_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "rating_reference_request" ADD FOREIGN KEY ("player_rating_score_id") REFERENCES "player_rating_score" ("id") ON DELETE CASCADE;
ALTER TABLE "rating_reference_request" ADD FOREIGN KEY ("referee_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "peer_rating_request" ADD FOREIGN KEY ("requester_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "peer_rating_request" ADD FOREIGN KEY ("evaluator_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "peer_rating_request" ADD FOREIGN KEY ("rating_system_id") REFERENCES "rating_system" ("id") ON DELETE RESTRICT;
ALTER TABLE "peer_rating_request" ADD FOREIGN KEY ("assigned_rating_score_id") REFERENCES "rating_score" ("id") ON DELETE SET NULL;
ALTER TABLE "facility" ADD FOREIGN KEY ("organization_id") REFERENCES "organization" ("id") ON DELETE CASCADE;
ALTER TABLE "facility_contact" ADD FOREIGN KEY ("facility_id") REFERENCES "facility" ("id") ON DELETE CASCADE;
ALTER TABLE "facility_contact" ADD FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE SET NULL;
ALTER TABLE "facility_image" ADD FOREIGN KEY ("facility_id") REFERENCES "facility" ("id") ON DELETE CASCADE;
ALTER TABLE "facility_file" ADD FOREIGN KEY ("facility_id") REFERENCES "facility" ("id") ON DELETE CASCADE;
ALTER TABLE "facility_file" ADD FOREIGN KEY ("file_id") REFERENCES "file" ("id") ON DELETE CASCADE;
ALTER TABLE "facility_sport" ADD FOREIGN KEY ("facility_id") REFERENCES "facility" ("id") ON DELETE CASCADE;
ALTER TABLE "facility_sport" ADD FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE RESTRICT;
ALTER TABLE "court" ADD FOREIGN KEY ("facility_id") REFERENCES "facility" ("id") ON DELETE CASCADE;
ALTER TABLE "court_sport" ADD FOREIGN KEY ("court_id") REFERENCES "court" ("id") ON DELETE CASCADE;
ALTER TABLE "court_sport" ADD FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE RESTRICT;
ALTER TABLE "invitation" ADD FOREIGN KEY ("inviter_id") REFERENCES "profile" ("id") ON DELETE SET NULL;
ALTER TABLE "invitation" ADD FOREIGN KEY ("invited_user_id") REFERENCES "profile" ("id") ON DELETE SET NULL;
ALTER TABLE "invitation" ADD FOREIGN KEY ("organization_id") REFERENCES "organization" ("id") ON DELETE CASCADE;
ALTER TABLE "invitation" ADD FOREIGN KEY ("revoked_by") REFERENCES "profile" ("id") ON DELETE SET NULL;

-- Phase 1 foreign keys
ALTER TABLE "player_block" ADD FOREIGN KEY ("blocker_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "player_block" ADD FOREIGN KEY ("blocked_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "player_favorite" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "player_favorite" ADD FOREIGN KEY ("favorite_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "player_group" ADD FOREIGN KEY ("created_by") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "player_group" ADD FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE SET NULL;
ALTER TABLE "group_member" ADD FOREIGN KEY ("group_id") REFERENCES "player_group" ("id") ON DELETE CASCADE;
ALTER TABLE "group_member" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "group_member" ADD FOREIGN KEY ("added_by") REFERENCES "player" ("id") ON DELETE SET NULL;
ALTER TABLE "community" ADD FOREIGN KEY ("created_by") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "community" ADD FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE SET NULL;
ALTER TABLE "community_member" ADD FOREIGN KEY ("community_id") REFERENCES "community" ("id") ON DELETE CASCADE;
ALTER TABLE "community_member" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "community_member" ADD FOREIGN KEY ("approved_by") REFERENCES "player" ("id") ON DELETE SET NULL;
ALTER TABLE "private_contact_list" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "private_contact" ADD FOREIGN KEY ("list_id") REFERENCES "private_contact_list" ("id") ON DELETE CASCADE;

-- Phase 2 foreign keys
ALTER TABLE "match" ADD FOREIGN KEY ("created_by") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "match" ADD FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE RESTRICT;
ALTER TABLE "match" ADD FOREIGN KEY ("facility_id") REFERENCES "facility" ("id") ON DELETE SET NULL;
ALTER TABLE "match" ADD FOREIGN KEY ("court_id") REFERENCES "court" ("id") ON DELETE SET NULL;
ALTER TABLE "match_invitation" ADD FOREIGN KEY ("match_id") REFERENCES "match" ("id") ON DELETE CASCADE;
ALTER TABLE "match_invitation" ADD FOREIGN KEY ("invited_player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "match_invitation" ADD FOREIGN KEY ("invited_group_id") REFERENCES "player_group" ("id") ON DELETE CASCADE;
ALTER TABLE "match_invitation" ADD FOREIGN KEY ("invited_community_id") REFERENCES "community" ("id") ON DELETE CASCADE;
ALTER TABLE "match_invitation" ADD FOREIGN KEY ("invited_contact_id") REFERENCES "private_contact" ("id") ON DELETE CASCADE;
ALTER TABLE "match_participant" ADD FOREIGN KEY ("match_id") REFERENCES "match" ("id") ON DELETE CASCADE;
ALTER TABLE "match_participant" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "match_template" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "match_feedback" ADD FOREIGN KEY ("match_id") REFERENCES "match" ("id") ON DELETE CASCADE;
ALTER TABLE "match_feedback" ADD FOREIGN KEY ("reviewer_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "match_feedback" ADD FOREIGN KEY ("reviewed_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "match_feedback" ADD FOREIGN KEY ("skill_rating_score_id") REFERENCES "rating_score" ("id") ON DELETE SET NULL;
ALTER TABLE "reputation_history" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "reputation_history" ADD FOREIGN KEY ("match_id") REFERENCES "match" ("id") ON DELETE SET NULL;
ALTER TABLE "reputation_history" ADD FOREIGN KEY ("feedback_id") REFERENCES "match_feedback" ("id") ON DELETE SET NULL;
ALTER TABLE "saved_match_filter" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE "match" IS 'Match proposals created by players, can be public or private.';
COMMENT ON TABLE "match_invitation" IS 'Invitations sent for private matches or to specific recipients.';
COMMENT ON TABLE "match_participant" IS 'Confirmed participants in a match.';
COMMENT ON TABLE "match_template" IS 'Saved match templates for quick creation.';
COMMENT ON TABLE "match_feedback" IS 'Post-match feedback and ratings between players.';
COMMENT ON TABLE "reputation_history" IS 'Historical record of reputation score changes.';
COMMENT ON TABLE "saved_match_filter" IS 'User-saved filter combinations for finding matches.';

