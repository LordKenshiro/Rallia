-- Migration: Add player, rating, and file management tables
-- This migration adds support for player profiles, rating systems, file storage,
-- and peer rating/reference request functionality.

-- ============================================================================
-- PART 1: NEW ENUMS
-- ============================================================================

CREATE TYPE "public"."gender_enum" AS ENUM (
  'M',
  'F',
  'O',
  'prefer_not_to_say'
);

CREATE TYPE "public"."playing_hand_enum" AS ENUM (
  'right',
  'left',
  'both'
);

CREATE TYPE "public"."day_enum" AS ENUM (
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
);

CREATE TYPE "public"."period_enum" AS ENUM (
  'morning',
  'afternoon',
  'evening'
);

CREATE TYPE "public"."match_duration_enum" AS ENUM (
  '30',
  '60',
  '90',
  '120'
);

CREATE TYPE "public"."match_type_enum" AS ENUM (
  'practice',
  'competitive',
  'both'
);

CREATE TYPE "public"."rating_certification_method_enum" AS ENUM (
  'external_rating',
  'proof',
  'referrals'
);

CREATE TYPE "public"."file_type_enum" AS ENUM (
  'image',
  'video',
  'document',
  'audio',
  'other'
);

CREATE TYPE "public"."proof_type_enum" AS ENUM (
  'external_link',
  'file'
);

CREATE TYPE "public"."proof_status_enum" AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE "public"."rating_request_status_enum" AS ENUM (
  'pending',
  'completed',
  'declined',
  'expired',
  'cancelled'
);

-- ============================================================================
-- PART 2: MODIFY EXISTING ENUMS
-- ============================================================================

-- Add missing values to facility_type_enum
ALTER TYPE "public"."facility_type_enum" ADD VALUE IF NOT EXISTS 'municipal';
ALTER TYPE "public"."facility_type_enum" ADD VALUE IF NOT EXISTS 'university';
ALTER TYPE "public"."facility_type_enum" ADD VALUE IF NOT EXISTS 'school';
ALTER TYPE "public"."facility_type_enum" ADD VALUE IF NOT EXISTS 'community_center';

-- Note: availability_enum has different values in the new schema
-- Current: 'available', 'unavailable', 'maintenance', 'reserved'
-- New:     'available', 'under_maintenance', 'closed', 'reserved'
-- Adding the new values (can't remove old ones without recreating the enum)
ALTER TYPE "public"."availability_enum" ADD VALUE IF NOT EXISTS 'under_maintenance';
ALTER TYPE "public"."availability_enum" ADD VALUE IF NOT EXISTS 'closed';

-- ============================================================================
-- PART 3: MODIFY EXISTING TABLES
-- ============================================================================

-- Add email and phone columns to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'profiles' 
                 AND column_name = 'email') THEN
    ALTER TABLE "public"."profiles" ADD COLUMN "email" varchar(255);
    
    -- Populate email from auth.users for existing profiles
    UPDATE "public"."profiles" p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id AND u.email IS NOT NULL;
    
    -- Make it NOT NULL after populating
    ALTER TABLE "public"."profiles" ALTER COLUMN "email" SET NOT NULL;
    
    -- Add unique index
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_profiles_email" ON "public"."profiles" ("email");
    
    COMMENT ON COLUMN "public"."profiles"."email" IS 'Gets initialized by trigger on sign up, should not be modifiable';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'profiles' 
                 AND column_name = 'phone') THEN
    ALTER TABLE "public"."profiles" ADD COLUMN "phone" varchar(20);
  END IF;
END $$;

-- Add organization_id to invitations if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invitations' 
                 AND column_name = 'organization_id') THEN
    ALTER TABLE "public"."invitations" ADD COLUMN "organization_id" uuid;
    ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_organization_id_fkey" 
      FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
    COMMENT ON COLUMN "public"."invitations"."organization_id" IS 'If inviting to join an organization';
  END IF;
END $$;

-- Fix invitations timestamp columns to use timestamptz
ALTER TABLE "public"."invitations" 
  ALTER COLUMN "expires_at" TYPE timestamptz USING "expires_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "accepted_at" TYPE timestamptz USING "accepted_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "revoked_at" TYPE timestamptz USING "revoked_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC';

-- ============================================================================
-- PART 4: NEW TABLES
-- ============================================================================

-- Players table
CREATE TABLE IF NOT EXISTS "public"."players" (
  "id" uuid PRIMARY KEY,
  "username" varchar(50) UNIQUE NOT NULL,
  "bio" text,
  "gender" "public"."gender_enum",
  "playing_hand" "public"."playing_hand_enum",
  "max_travel_distance" int,
  "reputation_score" decimal(5,2) NOT NULL DEFAULT 0.00,
  "rating_count" int NOT NULL DEFAULT 0,
  "verified" boolean NOT NULL DEFAULT false
);

COMMENT ON COLUMN "public"."players"."id" IS 'References profiles.id';

ALTER TABLE "public"."players" ADD CONSTRAINT "players_id_fkey" 
  FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Player availabilities table
CREATE TABLE IF NOT EXISTS "public"."player_availabilities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "day" "public"."day_enum" NOT NULL,
  "period" "public"."period_enum" NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE "public"."player_availabilities" IS 'Stores player availabilities for scheduling matches.';

CREATE INDEX IF NOT EXISTS "idx_player_availabilities_player" ON "public"."player_availabilities" ("player_id");
CREATE INDEX IF NOT EXISTS "idx_player_availabilities_day" ON "public"."player_availabilities" ("day");
CREATE INDEX IF NOT EXISTS "idx_player_availabilities_period" ON "public"."player_availabilities" ("period");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_player_availabilities_player_day_period" ON "public"."player_availabilities" ("player_id", "day", "period");

ALTER TABLE "public"."player_availabilities" ADD CONSTRAINT "player_availabilities_player_id_fkey" 
  FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;

-- Play styles table
CREATE TABLE IF NOT EXISTS "public"."play_styles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sport_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

COMMENT ON COLUMN "public"."play_styles"."name" IS 'e.g. Banger, Dinker';

CREATE UNIQUE INDEX IF NOT EXISTS "uq_play_styles_sport_name" ON "public"."play_styles" ("sport_id", "name");

ALTER TABLE "public"."play_styles" ADD CONSTRAINT "play_styles_sport_id_fkey" 
  FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE CASCADE;

-- Play attributes table
CREATE TABLE IF NOT EXISTS "public"."play_attributes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sport_id" uuid,
  "name" varchar(100) NOT NULL,
  "description" text,
  "category" varchar(100),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

COMMENT ON COLUMN "public"."play_attributes"."sport_id" IS 'Optional restriction to a sport';
COMMENT ON COLUMN "public"."play_attributes"."category" IS 'Optional grouping, e.g., Physical, Mental, Tactical';

CREATE UNIQUE INDEX IF NOT EXISTS "uq_play_attributes_sport_name" ON "public"."play_attributes" ("sport_id", "name");

ALTER TABLE "public"."play_attributes" ADD CONSTRAINT "play_attributes_sport_id_fkey" 
  FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE SET NULL;

-- Player sport profiles table
CREATE TABLE IF NOT EXISTS "public"."player_sport_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "sport_id" uuid NOT NULL,
  "preferred_match_duration" "public"."match_duration_enum" NOT NULL,
  "preferred_match_type" "public"."match_type_enum" NOT NULL,
  "play_style_id" uuid,
  "preferred_facility_id" uuid,
  "preferred_court_surface" "public"."surface_type_enum",
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE "public"."player_sport_profiles" IS 'Links players to the sports they play and stores sport-specific preferences.';
COMMENT ON COLUMN "public"."player_sport_profiles"."id" IS 'Primary key';
COMMENT ON COLUMN "public"."player_sport_profiles"."player_id" IS 'Foreign key referencing player';
COMMENT ON COLUMN "public"."player_sport_profiles"."sport_id" IS 'Foreign key referencing sport';
COMMENT ON COLUMN "public"."player_sport_profiles"."preferred_match_duration" IS 'Preferred match duration for this sport';
COMMENT ON COLUMN "public"."player_sport_profiles"."preferred_match_type" IS 'Preferred match type for this sport (e.g., practice, match, both)';
COMMENT ON COLUMN "public"."player_sport_profiles"."play_style_id" IS 'Foreign key referencing play style';
COMMENT ON COLUMN "public"."player_sport_profiles"."created_at" IS 'Record creation timestamp';
COMMENT ON COLUMN "public"."player_sport_profiles"."updated_at" IS 'Last update timestamp';

CREATE INDEX IF NOT EXISTS "idx_player_sport_profiles_player_id" ON "public"."player_sport_profiles" ("player_id");
CREATE INDEX IF NOT EXISTS "idx_player_sport_profiles_sport_id" ON "public"."player_sport_profiles" ("sport_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_player_sport_profiles_player_sport" ON "public"."player_sport_profiles" ("player_id", "sport_id");

ALTER TABLE "public"."player_sport_profiles" ADD CONSTRAINT "player_sport_profiles_player_id_fkey" 
  FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;
ALTER TABLE "public"."player_sport_profiles" ADD CONSTRAINT "player_sport_profiles_sport_id_fkey" 
  FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."player_sport_profiles" ADD CONSTRAINT "player_sport_profiles_play_style_id_fkey" 
  FOREIGN KEY ("play_style_id") REFERENCES "public"."play_styles"("id") ON DELETE SET NULL;
ALTER TABLE "public"."player_sport_profiles" ADD CONSTRAINT "player_sport_profiles_preferred_facility_id_fkey" 
  FOREIGN KEY ("preferred_facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;

-- Player play attributes junction table
CREATE TABLE IF NOT EXISTS "public"."player_play_attributes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_sport_profile_id" uuid NOT NULL,
  "play_attribute_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_player_play_attributes" ON "public"."player_play_attributes" ("player_sport_profile_id", "play_attribute_id");

ALTER TABLE "public"."player_play_attributes" ADD CONSTRAINT "player_play_attributes_player_sport_profile_id_fkey" 
  FOREIGN KEY ("player_sport_profile_id") REFERENCES "public"."player_sport_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "public"."player_play_attributes" ADD CONSTRAINT "player_play_attributes_play_attribute_id_fkey" 
  FOREIGN KEY ("play_attribute_id") REFERENCES "public"."play_attributes"("id") ON DELETE CASCADE;

-- Rating systems table
CREATE TABLE IF NOT EXISTS "public"."rating_systems" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE "public"."rating_systems" IS 'Defines rating/level scales and configuration per sport.';
COMMENT ON COLUMN "public"."rating_systems"."code" IS 'Short code, e.g. ''NTRP'', ''DUPR''';
COMMENT ON COLUMN "public"."rating_systems"."min_value" IS 'Lower bound of the scale (e.g. 1.0)';
COMMENT ON COLUMN "public"."rating_systems"."max_value" IS 'Upper bound of the scale (e.g. 7.0)';
COMMENT ON COLUMN "public"."rating_systems"."step" IS 'Allowed increment step (e.g. 0.5 or 0.1)';
COMMENT ON COLUMN "public"."rating_systems"."default_initial_value" IS 'Suggested onboarding default';
COMMENT ON COLUMN "public"."rating_systems"."min_for_referral" IS 'Minimum level at which referrals are encouraged (e.g. 3.0 or 3.5)';

CREATE INDEX IF NOT EXISTS "idx_rating_system_code" ON "public"."rating_systems" ("code");

ALTER TABLE "public"."rating_systems" ADD CONSTRAINT "rating_systems_sport_id_fkey" 
  FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE RESTRICT;

-- Rating scores table
CREATE TABLE IF NOT EXISTS "public"."rating_scores" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rating_system_id" uuid NOT NULL,
  "value" float,
  "label" varchar(50) NOT NULL,
  "min_value" float,
  "max_value" float,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_rating_score_system_value" ON "public"."rating_scores" ("rating_system_id", "value");

ALTER TABLE "public"."rating_scores" ADD CONSTRAINT "rating_scores_rating_system_id_fkey" 
  FOREIGN KEY ("rating_system_id") REFERENCES "public"."rating_systems"("id") ON DELETE CASCADE;

-- Player rating scores table
CREATE TABLE IF NOT EXISTS "public"."player_rating_scores" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "rating_score_id" uuid NOT NULL,
  "is_certified" boolean NOT NULL DEFAULT false,
  "certified_via" "public"."rating_certification_method_enum",
  "certified_at" timestamptz,
  "external_rating_score_id" uuid,
  "referrals_count" int NOT NULL DEFAULT 0,
  "evaluations_count" int NOT NULL DEFAULT 0,
  "last_evaluated_at" timestamptz,
  "expires_at" timestamptz,
  "source" varchar(100),
  "notes" text,
  "assigned_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN "public"."player_rating_scores"."referrals_count" IS 'Number of valid referrals currently held';
COMMENT ON COLUMN "public"."player_rating_scores"."evaluations_count" IS 'Number of evaluations included in computation (e.g. M5 count)';

CREATE UNIQUE INDEX IF NOT EXISTS "uq_player_rating_score" ON "public"."player_rating_scores" ("player_id", "rating_score_id");
CREATE INDEX IF NOT EXISTS "idx_player_rating_scores_player" ON "public"."player_rating_scores" ("player_id");

ALTER TABLE "public"."player_rating_scores" ADD CONSTRAINT "player_rating_scores_player_id_fkey" 
  FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;
ALTER TABLE "public"."player_rating_scores" ADD CONSTRAINT "player_rating_scores_rating_score_id_fkey" 
  FOREIGN KEY ("rating_score_id") REFERENCES "public"."rating_scores"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."player_rating_scores" ADD CONSTRAINT "player_rating_scores_external_rating_score_id_fkey" 
  FOREIGN KEY ("external_rating_score_id") REFERENCES "public"."rating_scores"("id") ON DELETE SET NULL;

-- Files table
CREATE TABLE IF NOT EXISTS "public"."files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "uploaded_by" uuid NOT NULL,
  "storage_key" varchar(500) UNIQUE NOT NULL,
  "url" text NOT NULL,
  "thumbnail_url" text,
  "original_name" varchar(255) NOT NULL,
  "file_type" "public"."file_type_enum" NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "file_size" bigint NOT NULL,
  "metadata" jsonb DEFAULT '{}',
  "is_deleted" boolean NOT NULL DEFAULT false,
  "deleted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE "public"."files" IS 'General-purpose file storage for images, videos, documents, etc.';
COMMENT ON COLUMN "public"."files"."uploaded_by" IS 'User who uploaded the file';
COMMENT ON COLUMN "public"."files"."storage_key" IS 'Cloud storage key (S3/Supabase Storage)';
COMMENT ON COLUMN "public"."files"."url" IS 'Public or signed accessible URL';
COMMENT ON COLUMN "public"."files"."thumbnail_url" IS 'Thumbnail URL for images/videos';
COMMENT ON COLUMN "public"."files"."original_name" IS 'Original file name at upload';
COMMENT ON COLUMN "public"."files"."mime_type" IS 'e.g. image/jpeg, application/pdf';
COMMENT ON COLUMN "public"."files"."file_size" IS 'File size in bytes';
COMMENT ON COLUMN "public"."files"."metadata" IS 'Flexible metadata: dimensions, duration, etc.';
COMMENT ON COLUMN "public"."files"."is_deleted" IS 'Soft delete flag';

CREATE INDEX IF NOT EXISTS "idx_files_uploaded_by" ON "public"."files" ("uploaded_by");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_files_storage_key" ON "public"."files" ("storage_key");
CREATE INDEX IF NOT EXISTS "idx_files_file_type" ON "public"."files" ("file_type");
CREATE INDEX IF NOT EXISTS "idx_files_is_deleted" ON "public"."files" ("is_deleted");

ALTER TABLE "public"."files" ADD CONSTRAINT "files_uploaded_by_fkey" 
  FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

-- Rating proofs table
CREATE TABLE IF NOT EXISTS "public"."rating_proofs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_rating_score_id" uuid NOT NULL,
  "proof_type" "public"."proof_type_enum" NOT NULL,
  "file_id" uuid,
  "external_url" text,
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" "public"."proof_status_enum" NOT NULL DEFAULT 'pending',
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "review_notes" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE "public"."rating_proofs" IS 'Proofs uploaded by players to certify their self-declared ratings.';
COMMENT ON COLUMN "public"."rating_proofs"."player_rating_score_id" IS 'Which player rating this proof supports';
COMMENT ON COLUMN "public"."rating_proofs"."file_id" IS 'Reference to uploaded file (if proof_type = file)';
COMMENT ON COLUMN "public"."rating_proofs"."external_url" IS 'External URL (if proof_type = external_link)';
COMMENT ON COLUMN "public"."rating_proofs"."title" IS 'Brief title describing the proof';
COMMENT ON COLUMN "public"."rating_proofs"."description" IS 'Detailed description or context';
COMMENT ON COLUMN "public"."rating_proofs"."reviewed_by" IS 'Admin who reviewed the proof';
COMMENT ON COLUMN "public"."rating_proofs"."review_notes" IS 'Admin notes on approval/rejection';

CREATE INDEX IF NOT EXISTS "idx_rating_proofs_player_rating_score" ON "public"."rating_proofs" ("player_rating_score_id");
CREATE INDEX IF NOT EXISTS "idx_rating_proofs_status" ON "public"."rating_proofs" ("status");
CREATE INDEX IF NOT EXISTS "idx_rating_proofs_score_status" ON "public"."rating_proofs" ("player_rating_score_id", "status");

ALTER TABLE "public"."rating_proofs" ADD CONSTRAINT "rating_proofs_player_rating_score_id_fkey" 
  FOREIGN KEY ("player_rating_score_id") REFERENCES "public"."player_rating_scores"("id") ON DELETE CASCADE;
ALTER TABLE "public"."rating_proofs" ADD CONSTRAINT "rating_proofs_file_id_fkey" 
  FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE SET NULL;
ALTER TABLE "public"."rating_proofs" ADD CONSTRAINT "rating_proofs_reviewed_by_fkey" 
  FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

-- Rating reference requests table
CREATE TABLE IF NOT EXISTS "public"."rating_reference_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "requester_id" uuid NOT NULL,
  "player_rating_score_id" uuid NOT NULL,
  "referee_id" uuid NOT NULL,
  "message" text,
  "status" "public"."rating_request_status_enum" NOT NULL DEFAULT 'pending',
  "rating_supported" boolean NOT NULL DEFAULT false,
  "response_message" text,
  "responded_at" timestamptz,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE "public"."rating_reference_requests" IS 'Requests for fellow players to validate (yes/no) a declared rating.';
COMMENT ON COLUMN "public"."rating_reference_requests"."requester_id" IS 'Player requesting the reference';
COMMENT ON COLUMN "public"."rating_reference_requests"."player_rating_score_id" IS 'The rating score to be validated';
COMMENT ON COLUMN "public"."rating_reference_requests"."referee_id" IS 'Player being asked to validate';
COMMENT ON COLUMN "public"."rating_reference_requests"."message" IS 'Optional message from requester to referee';
COMMENT ON COLUMN "public"."rating_reference_requests"."response_message" IS 'Optional message from referee';
COMMENT ON COLUMN "public"."rating_reference_requests"."expires_at" IS 'Request expiration (typically 14 days)';

CREATE INDEX IF NOT EXISTS "idx_rating_ref_requests_requester" ON "public"."rating_reference_requests" ("requester_id");
CREATE INDEX IF NOT EXISTS "idx_rating_ref_requests_referee" ON "public"."rating_reference_requests" ("referee_id");
CREATE INDEX IF NOT EXISTS "idx_rating_ref_requests_score" ON "public"."rating_reference_requests" ("player_rating_score_id");
CREATE INDEX IF NOT EXISTS "idx_rating_ref_requests_status" ON "public"."rating_reference_requests" ("status");
CREATE INDEX IF NOT EXISTS "idx_rating_ref_requests_expires" ON "public"."rating_reference_requests" ("expires_at");

ALTER TABLE "public"."rating_reference_requests" ADD CONSTRAINT "rating_reference_requests_requester_id_fkey" 
  FOREIGN KEY ("requester_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;
ALTER TABLE "public"."rating_reference_requests" ADD CONSTRAINT "rating_reference_requests_player_rating_score_id_fkey" 
  FOREIGN KEY ("player_rating_score_id") REFERENCES "public"."player_rating_scores"("id") ON DELETE CASCADE;
ALTER TABLE "public"."rating_reference_requests" ADD CONSTRAINT "rating_reference_requests_referee_id_fkey" 
  FOREIGN KEY ("referee_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;

-- Peer rating requests table
CREATE TABLE IF NOT EXISTS "public"."peer_rating_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "requester_id" uuid NOT NULL,
  "evaluator_id" uuid NOT NULL,
  "rating_system_id" uuid NOT NULL,
  "message" text,
  "status" "public"."rating_request_status_enum" NOT NULL DEFAULT 'pending',
  "assigned_rating_score_id" uuid,
  "response_message" text,
  "responded_at" timestamptz,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE "public"."peer_rating_requests" IS 'Requests for fellow players to assign a rating score to the requester.';
COMMENT ON COLUMN "public"."peer_rating_requests"."requester_id" IS 'Player requesting to be rated';
COMMENT ON COLUMN "public"."peer_rating_requests"."evaluator_id" IS 'Player being asked to assign a rating';
COMMENT ON COLUMN "public"."peer_rating_requests"."rating_system_id" IS 'Which rating system to use';
COMMENT ON COLUMN "public"."peer_rating_requests"."message" IS 'Optional message from requester';
COMMENT ON COLUMN "public"."peer_rating_requests"."assigned_rating_score_id" IS 'Rating score assigned by evaluator';
COMMENT ON COLUMN "public"."peer_rating_requests"."response_message" IS 'Optional comments from evaluator';
COMMENT ON COLUMN "public"."peer_rating_requests"."expires_at" IS 'Request expiration (typically 14 days)';

CREATE INDEX IF NOT EXISTS "idx_peer_rating_requests_requester" ON "public"."peer_rating_requests" ("requester_id");
CREATE INDEX IF NOT EXISTS "idx_peer_rating_requests_evaluator" ON "public"."peer_rating_requests" ("evaluator_id");
CREATE INDEX IF NOT EXISTS "idx_peer_rating_requests_system" ON "public"."peer_rating_requests" ("rating_system_id");
CREATE INDEX IF NOT EXISTS "idx_peer_rating_requests_status" ON "public"."peer_rating_requests" ("status");
CREATE INDEX IF NOT EXISTS "idx_peer_rating_requests_expires" ON "public"."peer_rating_requests" ("expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_peer_rating_request" ON "public"."peer_rating_requests" ("requester_id", "rating_system_id", "evaluator_id");

ALTER TABLE "public"."peer_rating_requests" ADD CONSTRAINT "peer_rating_requests_requester_id_fkey" 
  FOREIGN KEY ("requester_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;
ALTER TABLE "public"."peer_rating_requests" ADD CONSTRAINT "peer_rating_requests_evaluator_id_fkey" 
  FOREIGN KEY ("evaluator_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;
ALTER TABLE "public"."peer_rating_requests" ADD CONSTRAINT "peer_rating_requests_rating_system_id_fkey" 
  FOREIGN KEY ("rating_system_id") REFERENCES "public"."rating_systems"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."peer_rating_requests" ADD CONSTRAINT "peer_rating_requests_assigned_rating_score_id_fkey" 
  FOREIGN KEY ("assigned_rating_score_id") REFERENCES "public"."rating_scores"("id") ON DELETE SET NULL;

-- Facility files junction table (for generic file storage)
CREATE TABLE IF NOT EXISTS "public"."facility_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "facility_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "display_order" int DEFAULT 0,
  "is_primary" boolean DEFAULT false
);

ALTER TABLE "public"."facility_files" ADD CONSTRAINT "facility_files_facility_id_fkey" 
  FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;
ALTER TABLE "public"."facility_files" ADD CONSTRAINT "facility_files_file_id_fkey" 
  FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE CASCADE;

-- Add unique constraint to court_sports if not exists
CREATE UNIQUE INDEX IF NOT EXISTS "uq_court_sports_court_sport" ON "public"."court_sports" ("court_id", "sport_id");

-- ============================================================================
-- PART 5: UPDATE HANDLE_NEW_USER TRIGGER
-- ============================================================================

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  provider text;
  full_name text;
  display_name text;
  avatar_url text;
  user_email text;
BEGIN
  -- Determine provider (could be null for email/password)
  provider := COALESCE(new.raw_app_meta_data->>'provider', 'email');
  
  -- Default values
  full_name := NULL;
  display_name := NULL;
  avatar_url := NULL;
  user_email := new.email;
  
  -- If user came from OAuth (Google or Microsoft), try to populate fields
  IF provider IN ('google', 'azure', 'microsoft') THEN
    IF new.raw_user_meta_data IS NOT NULL THEN
      full_name := new.raw_user_meta_data->>'full_name';
      display_name := COALESCE(
        new.raw_user_meta_data->>'preferred_username',
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'email'
      );
      avatar_url := new.raw_user_meta_data->>'avatar_url';
    END IF;
  END IF;
  
  -- For email OTP, use email as display_name if available
  IF display_name IS NULL AND new.email IS NOT NULL THEN
    display_name := new.email;
  END IF;
  
  -- Insert into profiles table
  -- Use ON CONFLICT to handle case where profile might already exist
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    display_name,
    avatar_url,
    locale,
    timezone,
    two_factor_enabled,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    user_email,
    full_name,
    display_name,
    avatar_url,
    'en-CA',
    'America/Toronto',
    false,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = now();
  
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log the error (you can check Supabase logs)
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    -- Still return new to allow auth user creation to proceed
    RETURN new;
END;
$$;

-- ============================================================================
-- PART 6: GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";

GRANT ALL ON TABLE "public"."player_availabilities" TO "anon";
GRANT ALL ON TABLE "public"."player_availabilities" TO "authenticated";
GRANT ALL ON TABLE "public"."player_availabilities" TO "service_role";

GRANT ALL ON TABLE "public"."play_styles" TO "anon";
GRANT ALL ON TABLE "public"."play_styles" TO "authenticated";
GRANT ALL ON TABLE "public"."play_styles" TO "service_role";

GRANT ALL ON TABLE "public"."play_attributes" TO "anon";
GRANT ALL ON TABLE "public"."play_attributes" TO "authenticated";
GRANT ALL ON TABLE "public"."play_attributes" TO "service_role";

GRANT ALL ON TABLE "public"."player_sport_profiles" TO "anon";
GRANT ALL ON TABLE "public"."player_sport_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."player_sport_profiles" TO "service_role";

GRANT ALL ON TABLE "public"."player_play_attributes" TO "anon";
GRANT ALL ON TABLE "public"."player_play_attributes" TO "authenticated";
GRANT ALL ON TABLE "public"."player_play_attributes" TO "service_role";

GRANT ALL ON TABLE "public"."rating_systems" TO "anon";
GRANT ALL ON TABLE "public"."rating_systems" TO "authenticated";
GRANT ALL ON TABLE "public"."rating_systems" TO "service_role";

GRANT ALL ON TABLE "public"."rating_scores" TO "anon";
GRANT ALL ON TABLE "public"."rating_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."rating_scores" TO "service_role";

GRANT ALL ON TABLE "public"."player_rating_scores" TO "anon";
GRANT ALL ON TABLE "public"."player_rating_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."player_rating_scores" TO "service_role";

GRANT ALL ON TABLE "public"."files" TO "anon";
GRANT ALL ON TABLE "public"."files" TO "authenticated";
GRANT ALL ON TABLE "public"."files" TO "service_role";

GRANT ALL ON TABLE "public"."rating_proofs" TO "anon";
GRANT ALL ON TABLE "public"."rating_proofs" TO "authenticated";
GRANT ALL ON TABLE "public"."rating_proofs" TO "service_role";

GRANT ALL ON TABLE "public"."rating_reference_requests" TO "anon";
GRANT ALL ON TABLE "public"."rating_reference_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."rating_reference_requests" TO "service_role";

GRANT ALL ON TABLE "public"."peer_rating_requests" TO "anon";
GRANT ALL ON TABLE "public"."peer_rating_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."peer_rating_requests" TO "service_role";

GRANT ALL ON TABLE "public"."facility_files" TO "anon";
GRANT ALL ON TABLE "public"."facility_files" TO "authenticated";
GRANT ALL ON TABLE "public"."facility_files" TO "service_role";

