-- ============================================================================
-- RALLIA DATABASE SCHEMA - END OF PHASE 1
-- Phase 1: Core Player Features (Dec 9 - Dec 27, 2025)
-- 
-- This schema includes:
-- - Base schema (auth, profiles, players, sports, ratings, facilities, etc.)
-- - Phase 1 additions: Player home address fields, Player rating score history, Player relations (blocks, favorites, groups, communities, private contacts)
-- - OPTIONAL: External Rating API Integration (USTA, DUPR, UTR) - requires third-party API access
-- ============================================================================

-- ============================================================================
-- ENUM TYPES (Base)
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

-- ============================================================================
-- PHASE 1 ENUM TYPES
-- ============================================================================

CREATE TYPE "community_member_status_enum" AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- Provider enum for external rating systems (OPTIONAL - requires API access)
CREATE TYPE "external_rating_provider_enum" AS ENUM (
  'usta',   -- USTA Connect (NTRP ratings for tennis)
  'dupr',   -- DUPR (Pickleball & Tennis)
  'utr'     -- Universal Tennis Rating
);

-- Sync status for external rating accounts (OPTIONAL - requires API access)
CREATE TYPE "external_sync_status_enum" AS ENUM (
  'pending',    -- Account linked, awaiting first sync
  'syncing',    -- Sync in progress
  'synced',     -- Successfully synced
  'failed',     -- Sync failed (see error_message)
  'expired'     -- Tokens expired, re-auth required
);

-- ============================================================================
-- BASE TABLES
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
  "home_address" varchar(255),
  "home_city" varchar(100),
  "home_postal_code" varchar(20),
  "home_country" country_enum,
  "home_latitude" decimal(9,6),
  "home_longitude" decimal(9,6),
  "home_location" geography(Point,4326),
  "home_location_disclosed" boolean NOT NULL DEFAULT false
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

CREATE TABLE "player_sport_profile" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "player_id" uuid NOT NULL,
  "sport_id" uuid NOT NULL,
  "preferred_match_duration" match_duration_enum NOT NULL,
  "preferred_match_type" match_type_enum NOT NULL,
  "play_style_id" uuid,
  "preferred_facility_id" uuid,
  "preferred_court_surface" surface_type_enum,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "player_play_attribute" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "player_sport_profile_id" uuid NOT NULL,
  "play_attribute_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT (now())
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

-- Player rating score history (for tracking rating evolution over time)
CREATE TABLE "player_rating_score_history" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "player_rating_score_id" uuid NOT NULL,
  "player_id" uuid NOT NULL,
  "rating_score_id" uuid NOT NULL,
  "previous_rating_score_id" uuid,
  "rating_value" float,
  "is_certified" boolean NOT NULL DEFAULT false,
  "certified_via" rating_certification_method_enum,
  "referrals_count" int NOT NULL DEFAULT 0,
  "evaluations_count" int NOT NULL DEFAULT 0,
  "source" varchar(100),
  "change_reason" varchar(255),
  "changed_by" uuid,
  "recorded_at" timestamptz NOT NULL DEFAULT (now())
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

-- Player blocks
CREATE TABLE "player_block" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "blocker_id" uuid NOT NULL,
  "blocked_id" uuid NOT NULL,
  "reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Player favorites
CREATE TABLE "player_favorite" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "favorite_id" uuid NOT NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, favorite_id)
);

-- Player groups (max 10 members, private)
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

-- Communities (public, larger groups with approval)
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

-- Private contact lists (for non-app users)
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
-- PHASE 1 TABLES: External Rating API Integration (OPTIONAL)
-- Requires API access from USTA, DUPR, and/or UTR
-- ============================================================================

-- External rating accounts (links player to external rating providers)
CREATE TABLE "external_rating_account" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "provider" external_rating_provider_enum NOT NULL,

  -- External identity
  "external_user_id" varchar(100) NOT NULL,  -- UAID for USTA, user ID for DUPR/UTR
  "external_username" varchar(150),          -- Display name from provider
  "external_profile_url" text,               -- Link to profile on provider's site

  -- OAuth tokens (encrypted at rest via Supabase Vault)
  "access_token" text,
  "refresh_token" text,
  "token_expires_at" timestamptz,

  -- Sync status
  "last_synced_at" timestamptz,
  "next_sync_after" timestamptz,             -- Rate limiting / scheduling
  "sync_status" external_sync_status_enum NOT NULL DEFAULT 'pending',
  "sync_error_message" text,
  "sync_attempt_count" int NOT NULL DEFAULT 0,

  -- Raw API response (for debugging and data integrity)
  "last_api_response" jsonb,

  -- Account status
  "is_active" boolean NOT NULL DEFAULT true,
  "linked_at" timestamptz NOT NULL DEFAULT now(),
  "unlinked_at" timestamptz,

  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  UNIQUE(player_id, provider)
);

-- ============================================================================
-- INDEXES (Base)
-- ============================================================================

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
CREATE INDEX "idx_player_sport_profile_player_id" ON "player_sport_profile" ("player_id");
CREATE INDEX "idx_player_sport_profile_sport_id" ON "player_sport_profile" ("sport_id");
CREATE UNIQUE INDEX "uq_player_sport_profile_player_sport" ON "player_sport_profile" ("player_id", "sport_id");
CREATE UNIQUE INDEX ON "player_play_attribute" ("player_sport_profile_id", "play_attribute_id");
CREATE INDEX "idx_rating_system_code" ON "rating_system" ("code");
CREATE UNIQUE INDEX "uq_rating_score_system_value" ON "rating_score" ("rating_system_id", "value");
CREATE UNIQUE INDEX "uq_player_rating_score" ON "player_rating_score" ("player_id", "rating_score_id");
CREATE INDEX "idx_player_rating_score_player" ON "player_rating_score" ("player_id");
CREATE INDEX "idx_player_rating_score_history_player_rating" ON "player_rating_score_history" ("player_rating_score_id");
CREATE INDEX "idx_player_rating_score_history_player" ON "player_rating_score_history" ("player_id");
CREATE INDEX "idx_player_rating_score_history_recorded" ON "player_rating_score_history" ("player_id", "recorded_at");
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

-- ============================================================================
-- PHASE 1 INDEXES
-- ============================================================================

CREATE INDEX "idx_player_home_location_geo" ON "player" USING GIST ("home_location");
CREATE INDEX "idx_player_home_location_disclosed" ON "player" ("home_location_disclosed") WHERE "home_location_disclosed" = true;

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

-- External Rating Accounts (OPTIONAL)
CREATE INDEX "idx_external_rating_account_player" ON "external_rating_account" ("player_id");
CREATE INDEX "idx_external_rating_account_provider" ON "external_rating_account" ("provider");
CREATE INDEX "idx_external_rating_account_sync_status" ON "external_rating_account" ("sync_status")
  WHERE "is_active" = true;
CREATE INDEX "idx_external_rating_account_next_sync" ON "external_rating_account" ("next_sync_after")
  WHERE "is_active" = true AND "sync_status" != 'expired';

-- ============================================================================
-- FOREIGN KEYS (Base)
-- ============================================================================

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
ALTER TABLE "player_sport_profile" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "player_sport_profile" ADD FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE RESTRICT;
ALTER TABLE "player_sport_profile" ADD FOREIGN KEY ("play_style_id") REFERENCES "play_style" ("id") ON DELETE SET NULL;
ALTER TABLE "player_sport_profile" ADD FOREIGN KEY ("preferred_facility_id") REFERENCES "facility" ("id") ON DELETE SET NULL;
ALTER TABLE "player_play_attribute" ADD FOREIGN KEY ("player_sport_profile_id") REFERENCES "player_sport_profile" ("id") ON DELETE CASCADE;
ALTER TABLE "player_play_attribute" ADD FOREIGN KEY ("play_attribute_id") REFERENCES "play_attribute" ("id") ON DELETE CASCADE;
ALTER TABLE "rating_system" ADD FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE RESTRICT;
ALTER TABLE "rating_score" ADD FOREIGN KEY ("rating_system_id") REFERENCES "rating_system" ("id") ON DELETE CASCADE;
ALTER TABLE "player_rating_score" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "player_rating_score" ADD FOREIGN KEY ("rating_score_id") REFERENCES "rating_score" ("id") ON DELETE RESTRICT;
ALTER TABLE "player_rating_score" ADD FOREIGN KEY ("external_rating_score_id") REFERENCES "rating_score" ("id") ON DELETE SET NULL;
ALTER TABLE "player_rating_score_history" ADD FOREIGN KEY ("player_rating_score_id") REFERENCES "player_rating_score" ("id") ON DELETE CASCADE;
ALTER TABLE "player_rating_score_history" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "player_rating_score_history" ADD FOREIGN KEY ("rating_score_id") REFERENCES "rating_score" ("id") ON DELETE RESTRICT;
ALTER TABLE "player_rating_score_history" ADD FOREIGN KEY ("previous_rating_score_id") REFERENCES "rating_score" ("id") ON DELETE SET NULL;
ALTER TABLE "player_rating_score_history" ADD FOREIGN KEY ("changed_by") REFERENCES "profile" ("id") ON DELETE SET NULL;
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

-- ============================================================================
-- PHASE 1 FOREIGN KEYS
-- ============================================================================

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

-- External Rating Accounts (OPTIONAL)
ALTER TABLE "external_rating_account" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to automatically record rating score history when ratings change
CREATE OR REPLACE FUNCTION record_player_rating_score_history()
RETURNS TRIGGER AS $$
DECLARE
  previous_rating_score_id UUID;
  rating_value FLOAT;
BEGIN
  -- Get the previous rating_score_id if this is an update
  IF TG_OP = 'UPDATE' THEN
    previous_rating_score_id := OLD.rating_score_id;
    
    -- Only record history if the rating_score_id actually changed
    IF OLD.rating_score_id = NEW.rating_score_id THEN
      RETURN NEW;
    END IF;
  ELSE
    -- For INSERT, there's no previous rating
    previous_rating_score_id := NULL;
  END IF;

  -- Get the rating value from the rating_score table
  SELECT rs.value INTO rating_value
  FROM rating_score rs
  WHERE rs.id = NEW.rating_score_id;

  -- Insert history record
  INSERT INTO player_rating_score_history (
    player_rating_score_id,
    player_id,
    rating_score_id,
    previous_rating_score_id,
    rating_value,
    is_certified,
    certified_via,
    referrals_count,
    evaluations_count,
    source,
    change_reason,
    changed_by,
    recorded_at
  ) VALUES (
    NEW.id,
    NEW.player_id,
    NEW.rating_score_id,
    previous_rating_score_id,
    rating_value,
    NEW.is_certified,
    NEW.certified_via,
    NEW.referrals_count,
    NEW.evaluations_count,
    NEW.source,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Initial rating assignment'
      WHEN TG_OP = 'UPDATE' THEN 'Rating updated'
    END,
    auth.uid(), -- Current user ID from Supabase auth
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically record history on INSERT or UPDATE
CREATE TRIGGER trigger_record_player_rating_score_history
  AFTER INSERT OR UPDATE OF rating_score_id, is_certified, certified_via, referrals_count, evaluations_count, source
  ON player_rating_score
  FOR EACH ROW
  EXECUTE FUNCTION record_player_rating_score_history();

-- ============================================================================
-- TRIGGERS AND FUNCTIONS: External Rating API Integration (OPTIONAL)
-- ============================================================================

-- Function to update player_rating_scores when external rating is synced
CREATE OR REPLACE FUNCTION sync_external_rating_to_player()
RETURNS TRIGGER AS $$
DECLARE
  v_rating_system_id UUID;
  v_rating_score_id UUID;
  v_external_rating NUMERIC;
BEGIN
  -- Only process successful syncs with API response data
  IF NEW.sync_status != 'synced' OR NEW.last_api_response IS NULL THEN
    RETURN NEW;
  END IF;

  -- Extract rating value based on provider
  CASE NEW.provider
    WHEN 'usta' THEN
      v_external_rating := (NEW.last_api_response->>'ntrpRating')::NUMERIC;
      SELECT id INTO v_rating_system_id FROM rating_system WHERE code = 'NTRP';
    WHEN 'dupr' THEN
      -- Use singles rating by default, could be configurable
      v_external_rating := (NEW.last_api_response->>'singles')::NUMERIC;
      SELECT id INTO v_rating_system_id FROM rating_system WHERE code = 'DUPR';
    WHEN 'utr' THEN
      v_external_rating := (NEW.last_api_response->>'rating')::NUMERIC;
      SELECT id INTO v_rating_system_id FROM rating_system WHERE code = 'UTR';
  END CASE;

  -- Find the closest rating_score for this value
  IF v_rating_system_id IS NOT NULL AND v_external_rating IS NOT NULL THEN
    SELECT id INTO v_rating_score_id
    FROM rating_score
    WHERE rating_system_id = v_rating_system_id
    ORDER BY ABS(value - v_external_rating)
    LIMIT 1;

    -- Upsert player_rating_score with API verification
    IF v_rating_score_id IS NOT NULL THEN
      INSERT INTO player_rating_score (
        player_id,
        rating_score_id,
        is_certified,
        certified_via,
        certified_at,
        source,
        expires_at,
        notes
      ) VALUES (
        NEW.player_id,
        v_rating_score_id,
        true,
        'external_rating',
        now(),
        NEW.provider || '_api',
        CASE NEW.provider
          WHEN 'usta' THEN (NEW.last_api_response->>'ratingExpiration')::TIMESTAMPTZ
          ELSE now() + INTERVAL '1 year'
        END,
        'Auto-imported from ' || UPPER(NEW.provider::TEXT) || ' API'
      )
      ON CONFLICT (player_id, rating_score_id)
      DO UPDATE SET
        is_certified = true,
        certified_via = 'external_rating',
        certified_at = now(),
        source = NEW.provider || '_api',
        expires_at = EXCLUDED.expires_at,
        notes = EXCLUDED.notes,
        updated_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-sync ratings when external account is updated
CREATE TRIGGER trigger_sync_external_rating
  AFTER UPDATE OF sync_status, last_api_response ON external_rating_account
  FOR EACH ROW
  WHEN (NEW.sync_status = 'synced')
  EXECUTE FUNCTION sync_external_rating_to_player();

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE "auth_users" IS 'This table is managed by Supabase; do not write to it directly.';
COMMENT ON COLUMN "player"."home_location" IS 'Player home location for radius-based match searches. Supports both home location and current location as search center points.';
COMMENT ON COLUMN "player"."home_location_disclosed" IS 'Whether the player has chosen to disclose their home location to other players.';
COMMENT ON TABLE "player_rating_score_history" IS 'Historical snapshots of player rating scores for tracking evolution over time. Records are created automatically when ratings change.';
COMMENT ON TABLE "player_block" IS 'Players can block other players to prevent interactions.';
COMMENT ON TABLE "player_favorite" IS 'Players can favorite other players for quick access.';
COMMENT ON TABLE "player_group" IS 'Private groups of up to 10 players for organizing matches.';
COMMENT ON TABLE "group_member" IS 'Members of player groups with moderator designation.';
COMMENT ON TABLE "community" IS 'Public or semi-public communities of players with approval-based membership.';
COMMENT ON TABLE "community_member" IS 'Members of communities with approval status tracking.';
COMMENT ON TABLE "private_contact_list" IS 'Lists of non-app contacts for inviting to matches.';
COMMENT ON TABLE "private_contact" IS 'Individual contacts within private contact lists.';

-- External Rating API Integration (OPTIONAL)
COMMENT ON TABLE "external_rating_account" IS 'Links players to external rating providers (USTA, DUPR, UTR) for verified rating imports. OPTIONAL: Requires API access from providers.';
COMMENT ON COLUMN "external_rating_account"."external_user_id" IS 'Unique identifier on the external platform (UAID for USTA, user ID for DUPR/UTR)';
COMMENT ON COLUMN "external_rating_account"."last_api_response" IS 'Raw JSON response from last successful API call for auditing and data integrity';
COMMENT ON COLUMN "external_rating_account"."next_sync_after" IS 'Rate limiting / scheduling - do not sync before this timestamp';
COMMENT ON FUNCTION sync_external_rating_to_player() IS 'Automatically syncs external ratings to player_rating_score when an external account sync completes successfully';
