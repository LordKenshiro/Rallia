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
  'M',
  'F',
  'O',
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
  'community_center'
);

CREATE TYPE "availability_enum" AS ENUM (
  'available',
  'under_maintenance',
  'closed',
  'reserved'
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

CREATE TABLE "profiles" (
  "id" uuid PRIMARY KEY,
  "email" varchar(255) NOT NULL,
  "full_name" varchar(255),
  "display_name" varchar(100),
  "avatar_url" varchar(255),
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

CREATE TABLE "admins" (
  "id" uuid PRIMARY KEY,
  "role" admin_role_enum NOT NULL,
  "permissions" jsonb,
  "assigned_at" timestamptz NOT NULL DEFAULT (now()),
  "notes" text
);

CREATE TABLE "organizations" (
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

CREATE TABLE "organization_members" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "role" role_enum NOT NULL,
  "permissions" jsonb,
  "joined_at" timestamptz NOT NULL DEFAULT (now()),
  "left_at" timestamptz,
  "invited_by" uuid
);

CREATE TABLE "players" (
  "id" uuid PRIMARY KEY,
  "username" varchar(50) UNIQUE NOT NULL,
  "bio" text,
  "gender" gender_enum,
  "playing_hand" playing_hand_enum,
  "max_travel_distance" int,
  "reputation_score" decimal(5,2) NOT NULL DEFAULT 0,
  "rating_count" int NOT NULL DEFAULT 0,
  "verified" boolean NOT NULL DEFAULT false
);

CREATE TABLE "player_availabilities" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "player_id" uuid NOT NULL,
  "day" day_enum NOT NULL,
  "period" period_enum NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "sports" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "name" varchar(100) UNIQUE NOT NULL,
  "slug" varchar(100) UNIQUE NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "attributes" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "play_styles" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "sport_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "play_attributes" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "sport_id" uuid,
  "name" varchar(100) NOT NULL,
  "description" text,
  "category" varchar(100),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "player_sport_profiles" (
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

CREATE TABLE "player_play_attributes" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "player_sport_profile_id" uuid NOT NULL,
  "play_attribute_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "rating_systems" (
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

CREATE TABLE "rating_scores" (
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

CREATE TABLE "player_rating_scores" (
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

CREATE TABLE "files" (
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

CREATE TABLE "rating_proofs" (
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

CREATE TABLE "rating_reference_requests" (
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

CREATE TABLE "peer_rating_requests" (
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

CREATE TABLE "facilities" (
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
  "location" "geography(Point,4326)",
  "latitude" decimal(9,6),
  "longitude" decimal(9,6),
  "attributes" jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  "archived_at" timestamptz
);

CREATE TABLE "facility_contacts" (
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

CREATE TABLE "facility_images" (
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

CREATE TABLE "facility_files" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "facility_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "display_order" int DEFAULT 0,
  "is_primary" boolean DEFAULT false
);

CREATE TABLE "facility_sports" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "facility_id" uuid NOT NULL,
  "sport_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "courts" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "facility_id" uuid NOT NULL,
  "surface_type" surface_type_enum,
  "lighting" boolean NOT NULL DEFAULT false,
  "indoor" boolean NOT NULL DEFAULT false,
  "name" varchar(100),
  "court_number" int,
  "lines_marked_for_multiple_sports" boolean NOT NULL DEFAULT false,
  "availability_status" availability_enum NOT NULL DEFAULT 'available',
  "attributes" jsonb,
  "notes" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "court_sports" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "court_id" uuid NOT NULL,
  "sport_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "invitations" (
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

CREATE UNIQUE INDEX "uq_profiles_email" ON "profiles" ("email");

CREATE INDEX "idx_org_name" ON "organizations" ("name");

CREATE UNIQUE INDEX ON "organization_members" ("user_id", "organization_id");

CREATE INDEX "idx_player_availabilities_player" ON "player_availabilities" ("player_id");

CREATE INDEX "idx_player_availabilities_day" ON "player_availabilities" ("day");

CREATE INDEX "idx_player_availabilities_period" ON "player_availabilities" ("period");

CREATE UNIQUE INDEX "uq_player_availabilities_player_day_period" ON "player_availabilities" ("player_id", "day", "period");

CREATE INDEX "idx_sports_name" ON "sports" ("name");

CREATE INDEX "idx_sports_is_active" ON "sports" ("is_active");

CREATE UNIQUE INDEX ON "play_styles" ("sport_id", "name");

CREATE UNIQUE INDEX ON "play_attributes" ("sport_id", "name");

CREATE INDEX "idx_player_sport_profiles_player_id" ON "player_sport_profiles" ("player_id");

CREATE INDEX "idx_player_sport_profiles_sport_id" ON "player_sport_profiles" ("sport_id");

CREATE UNIQUE INDEX "uq_player_sport_profiles_player_sport" ON "player_sport_profiles" ("player_id", "sport_id");

CREATE UNIQUE INDEX ON "player_play_attributes" ("player_sport_profile_id", "play_attribute_id");

CREATE INDEX "idx_rating_system_code" ON "rating_systems" ("code");

CREATE UNIQUE INDEX "uq_rating_score_system_value" ON "rating_scores" ("rating_system_id", "value");

CREATE UNIQUE INDEX "uq_player_rating_score" ON "player_rating_scores" ("player_id", "rating_score_id");

CREATE INDEX "idx_player_rating_scores_player" ON "player_rating_scores" ("player_id");

CREATE INDEX "idx_files_uploaded_by" ON "files" ("uploaded_by");

CREATE UNIQUE INDEX "uq_files_storage_key" ON "files" ("storage_key");

CREATE INDEX "idx_files_file_type" ON "files" ("file_type");

CREATE INDEX "idx_files_is_deleted" ON "files" ("is_deleted");

CREATE INDEX "idx_rating_proofs_player_rating_score" ON "rating_proofs" ("player_rating_score_id");

CREATE INDEX "idx_rating_proofs_status" ON "rating_proofs" ("status");

CREATE INDEX "idx_rating_proofs_score_status" ON "rating_proofs" ("player_rating_score_id", "status");

CREATE INDEX "idx_rating_ref_requests_requester" ON "rating_reference_requests" ("requester_id");

CREATE INDEX "idx_rating_ref_requests_referee" ON "rating_reference_requests" ("referee_id");

CREATE INDEX "idx_rating_ref_requests_score" ON "rating_reference_requests" ("player_rating_score_id");

CREATE INDEX "idx_rating_ref_requests_status" ON "rating_reference_requests" ("status");

CREATE INDEX "idx_rating_ref_requests_expires" ON "rating_reference_requests" ("expires_at");

CREATE INDEX "idx_peer_rating_requests_requester" ON "peer_rating_requests" ("requester_id");

CREATE INDEX "idx_peer_rating_requests_evaluator" ON "peer_rating_requests" ("evaluator_id");

CREATE INDEX "idx_peer_rating_requests_system" ON "peer_rating_requests" ("rating_system_id");

CREATE INDEX "idx_peer_rating_requests_status" ON "peer_rating_requests" ("status");

CREATE INDEX "idx_peer_rating_requests_expires" ON "peer_rating_requests" ("expires_at");

CREATE UNIQUE INDEX "uq_peer_rating_request" ON "peer_rating_requests" ("requester_id", "rating_system_id", "evaluator_id");

CREATE INDEX "idx_facilities_slug" ON "facilities" ("slug");

CREATE INDEX "idx_facilities_org" ON "facilities" ("organization_id");

CREATE INDEX "idx_facilities_active" ON "facilities" ("is_active");

CREATE INDEX "idx_facilities_created_at" ON "facilities" ("created_at");

CREATE INDEX "idx_facility_contacts_facility" ON "facility_contacts" ("facility_id");

CREATE INDEX "idx_facility_contacts_primary" ON "facility_contacts" ("is_primary");

CREATE INDEX "idx_facility_images_facility" ON "facility_images" ("facility_id");

CREATE INDEX "idx_facility_images_order" ON "facility_images" ("facility_id", "display_order");

CREATE UNIQUE INDEX "uq_facility_images_storage_key" ON "facility_images" ("storage_key");

CREATE INDEX "idx_facility_sports_facility" ON "facility_sports" ("facility_id");

CREATE INDEX "idx_facility_sports_sport" ON "facility_sports" ("sport_id");

CREATE UNIQUE INDEX "uq_facility_sports_facility_sport" ON "facility_sports" ("facility_id", "sport_id");

CREATE INDEX "idx_courts_facility" ON "courts" ("facility_id");

CREATE INDEX "idx_courts_availability" ON "courts" ("availability_status");

CREATE UNIQUE INDEX "uq_courts_facility_court_number" ON "courts" ("facility_id", "court_number");

CREATE INDEX "idx_court_sports_court" ON "court_sports" ("court_id");

CREATE INDEX "idx_court_sports_sport" ON "court_sports" ("sport_id");

CREATE UNIQUE INDEX "uq_court_sports_court_sport" ON "court_sports" ("court_id", "sport_id");

CREATE UNIQUE INDEX ON "invitations" ("token");

CREATE INDEX ON "invitations" ("email");

CREATE INDEX ON "invitations" ("inviter_id");

CREATE INDEX ON "invitations" ("status");

CREATE INDEX ON "invitations" ("expires_at");

CREATE INDEX ON "invitations" ("email", "status");

CREATE INDEX ON "invitations" ("status", "expires_at");

COMMENT ON TABLE "auth_users" IS 'This table is managed by Supabase; do not write to it directly.';

COMMENT ON COLUMN "auth_users"."id" IS 'Unique ID of the user in Supabase Auth';

COMMENT ON COLUMN "auth_users"."aud" IS 'Audience claim';

COMMENT ON COLUMN "auth_users"."role" IS 'Role claim for RLS policies';

COMMENT ON COLUMN "auth_users"."email" IS 'User email address';

COMMENT ON COLUMN "auth_users"."app_metadata" IS 'Includes provider info: { provider, providers[] }';

COMMENT ON COLUMN "auth_users"."user_metadata" IS 'Custom editable user metadata';

COMMENT ON COLUMN "auth_users"."identities" IS 'List of linked provider identities';

COMMENT ON COLUMN "profiles"."id" IS 'References Supabase auth.users.id';

COMMENT ON COLUMN "profiles"."email" IS 'Gets initialized by trigger on sign up, should not be modifiable';

COMMENT ON COLUMN "profiles"."avatar_url" IS 'URL to the user''s avatar';

COMMENT ON COLUMN "admins"."id" IS 'References profiles.id';

COMMENT ON COLUMN "organizations"."owner_id" IS 'Primary account owner';

COMMENT ON COLUMN "organizations"."nature" IS 'public vs privée';

COMMENT ON COLUMN "organizations"."slug" IS 'URL-friendly identifier';

COMMENT ON COLUMN "players"."id" IS 'References profiles.id';

COMMENT ON TABLE "player_availabilities" IS 'Stores player availabilities for scheduling matches.';

COMMENT ON TABLE "sports" IS 'Defines supported sports within the application.';

COMMENT ON COLUMN "sports"."attributes" IS 'Optional metadata (e.g., common court dimensions, tags)';

COMMENT ON COLUMN "play_styles"."name" IS 'e.g. Banger, Dinker, ';

COMMENT ON COLUMN "play_attributes"."sport_id" IS 'Optional restriction to a sport';

COMMENT ON COLUMN "play_attributes"."category" IS 'Optional grouping, e.g., Physical, Mental, Tactical';

COMMENT ON TABLE "player_sport_profiles" IS 'Links players to the sports they play and stores sport-specific preferences.';

COMMENT ON COLUMN "player_sport_profiles"."id" IS 'Primary key';

COMMENT ON COLUMN "player_sport_profiles"."player_id" IS 'Foreign key referencing player';

COMMENT ON COLUMN "player_sport_profiles"."sport_id" IS 'Foreign key referencing sport';

COMMENT ON COLUMN "player_sport_profiles"."preferred_match_duration" IS 'Preferred match duration for this sport';

COMMENT ON COLUMN "player_sport_profiles"."preferred_match_type" IS 'Preferred match type for this sport (e.g., practice, match, both)';

COMMENT ON COLUMN "player_sport_profiles"."play_style_id" IS 'Foreign key referencing play style';

COMMENT ON COLUMN "player_sport_profiles"."created_at" IS 'Record creation timestamp';

COMMENT ON COLUMN "player_sport_profiles"."updated_at" IS 'Last update timestamp';

COMMENT ON TABLE "rating_systems" IS 'Defines rating/level scales and configuration per sport.';

COMMENT ON COLUMN "rating_systems"."code" IS 'Short code, e.g. ''NTRP'', ''DUPR''';

COMMENT ON COLUMN "rating_systems"."min_value" IS 'Lower bound of the scale (e.g. 1.0)';

COMMENT ON COLUMN "rating_systems"."max_value" IS 'Upper bound of the scale (e.g. 7.0)';

COMMENT ON COLUMN "rating_systems"."step" IS 'Allowed increment step (e.g. 0.5 or 0.1)';

COMMENT ON COLUMN "rating_systems"."default_initial_value" IS 'Suggested onboarding default';

COMMENT ON COLUMN "rating_systems"."min_for_referral" IS 'Minimum level at which referrals are encouraged (e.g. 3.0 or 3.5)';

COMMENT ON COLUMN "player_rating_scores"."referrals_count" IS 'Number of valid referrals currently held';

COMMENT ON COLUMN "player_rating_scores"."evaluations_count" IS 'Number of evaluations included in computation (e.g. M5 count)';

COMMENT ON TABLE "files" IS 'General-purpose file storage for images, videos, documents, etc.';

COMMENT ON COLUMN "files"."uploaded_by" IS 'User who uploaded the file';

COMMENT ON COLUMN "files"."storage_key" IS 'Cloud storage key (S3/Supabase Storage)';

COMMENT ON COLUMN "files"."url" IS 'Public or signed accessible URL';

COMMENT ON COLUMN "files"."thumbnail_url" IS 'Thumbnail URL for images/videos';

COMMENT ON COLUMN "files"."original_name" IS 'Original file name at upload';

COMMENT ON COLUMN "files"."mime_type" IS 'e.g. image/jpeg, application/pdf';

COMMENT ON COLUMN "files"."file_size" IS 'File size in bytes';

COMMENT ON COLUMN "files"."metadata" IS 'Flexible metadata: dimensions, duration, etc.';

COMMENT ON COLUMN "files"."is_deleted" IS 'Soft delete flag';

COMMENT ON TABLE "rating_proofs" IS 'Proofs uploaded by players to certify their self-declared ratings.';

COMMENT ON COLUMN "rating_proofs"."player_rating_score_id" IS 'Which player rating this proof supports';

COMMENT ON COLUMN "rating_proofs"."file_id" IS 'Reference to uploaded file (if proof_type = file)';

COMMENT ON COLUMN "rating_proofs"."external_url" IS 'External URL (if proof_type = external_link)';

COMMENT ON COLUMN "rating_proofs"."title" IS 'Brief title describing the proof';

COMMENT ON COLUMN "rating_proofs"."description" IS 'Detailed description or context';

COMMENT ON COLUMN "rating_proofs"."reviewed_by" IS 'Admin who reviewed the proof';

COMMENT ON COLUMN "rating_proofs"."review_notes" IS 'Admin notes on approval/rejection';

COMMENT ON TABLE "rating_reference_requests" IS 'Requests for fellow players to validate (yes/no) a declared rating.';

COMMENT ON COLUMN "rating_reference_requests"."requester_id" IS 'Player requesting the reference';

COMMENT ON COLUMN "rating_reference_requests"."player_rating_score_id" IS 'The rating score to be validated';

COMMENT ON COLUMN "rating_reference_requests"."referee_id" IS 'Player being asked to validate';

COMMENT ON COLUMN "rating_reference_requests"."message" IS 'Optional message from requester to referee';

COMMENT ON COLUMN "rating_reference_requests"."response_message" IS 'Optional message from referee';

COMMENT ON COLUMN "rating_reference_requests"."expires_at" IS 'Request expiration (typically 14 days)';

COMMENT ON TABLE "peer_rating_requests" IS 'Requests for fellow players to assign a rating score to the requester.';

COMMENT ON COLUMN "peer_rating_requests"."requester_id" IS 'Player requesting to be rated';

COMMENT ON COLUMN "peer_rating_requests"."evaluator_id" IS 'Player being asked to assign a rating';

COMMENT ON COLUMN "peer_rating_requests"."rating_system_id" IS 'Which rating system to use';

COMMENT ON COLUMN "peer_rating_requests"."message" IS 'Optional message from requester';

COMMENT ON COLUMN "peer_rating_requests"."assigned_rating_score_id" IS 'Rating score assigned by evaluator';

COMMENT ON COLUMN "peer_rating_requests"."response_message" IS 'Optional comments from evaluator';

COMMENT ON COLUMN "peer_rating_requests"."expires_at" IS 'Request expiration (typically 14 days)';

COMMENT ON TABLE "facilities" IS 'Facilities are physical sites with courts; use attributes for extensible metadata.';

COMMENT ON COLUMN "facilities"."name" IS 'Site name, e.g. Parc Jeanne-Mance';

COMMENT ON COLUMN "facilities"."slug" IS 'URL-friendly identifier (consider scoping to organization if you allow same names)';

COMMENT ON COLUMN "facilities"."location" IS 'Use PostGIS geography for fast geo-queries (lat/lon).';

COMMENT ON COLUMN "facilities"."latitude" IS 'Optional: keep for back-compatibility; populate from location';

COMMENT ON COLUMN "facilities"."longitude" IS 'Optional: keep for back-compatibility; populate from location';

COMMENT ON COLUMN "facilities"."attributes" IS 'Flexible: opening_hours, amenities, pricing, accessibility, notes';

COMMENT ON TABLE "facility_contacts" IS 'Contacts for a facility (general, reservation, sport-specific, etc.). Decoupled from sports for flexibility.';

COMMENT ON COLUMN "facility_contacts"."is_primary" IS 'True if this is the main contact for the facility';

COMMENT ON COLUMN "facility_contacts"."attributes" IS 'Flexible metadata: hours, preferred contact method, languages, etc.';

COMMENT ON TABLE "facility_images" IS 'Images for facilities; use storage_key to dedupe and manage cloud storage lifecycle.';

COMMENT ON COLUMN "facility_images"."storage_key" IS 'Stable cloud storage key (S3/Supabase)';

COMMENT ON COLUMN "facility_images"."url" IS 'Accessible URL (may be signed)';

COMMENT ON TABLE "facility_sports" IS 'Links facilities to the sports they support. Attributes can hold sport-specific contact or scheduling details.';

COMMENT ON TABLE "courts" IS 'Individual courts/rinks/fields within a facility.';

COMMENT ON COLUMN "courts"."court_number" IS 'Unique per facility (optional)';

COMMENT ON COLUMN "courts"."attributes" IS 'Court-specific metadata: dimensions, nets, wall height, booking rules';

COMMENT ON TABLE "court_sports" IS 'Links courts to the sports they support.';

COMMENT ON TABLE "invitations" IS 'Stores user invitation requests with expiration and tracking';

COMMENT ON COLUMN "invitations"."token" IS 'Secure random token for invitation link';

COMMENT ON COLUMN "invitations"."invited_user_id" IS 'Set when invitation is accepted';

COMMENT ON COLUMN "invitations"."organization_id" IS 'If inviting to join an organization';

COMMENT ON COLUMN "invitations"."expires_at" IS 'Typically 7 days from creation';

COMMENT ON COLUMN "invitations"."metadata" IS 'Additional context like department, team, etc.';

ALTER TABLE "profiles" ADD FOREIGN KEY ("id") REFERENCES "auth_users" ("id") ON DELETE CASCADE;

ALTER TABLE "admins" ADD FOREIGN KEY ("id") REFERENCES "profiles" ("id") ON DELETE CASCADE;

ALTER TABLE "organizations" ADD FOREIGN KEY ("owner_id") REFERENCES "profiles" ("id") ON DELETE SET NULL;

ALTER TABLE "organization_members" ADD FOREIGN KEY ("user_id") REFERENCES "profiles" ("id") ON DELETE CASCADE;

ALTER TABLE "organization_members" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;

ALTER TABLE "organization_members" ADD FOREIGN KEY ("invited_by") REFERENCES "profiles" ("id") ON DELETE SET NULL;

ALTER TABLE "players" ADD FOREIGN KEY ("id") REFERENCES "profiles" ("id") ON DELETE CASCADE;

ALTER TABLE "player_availabilities" ADD FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE;

ALTER TABLE "play_styles" ADD FOREIGN KEY ("sport_id") REFERENCES "sports" ("id") ON DELETE CASCADE;

ALTER TABLE "play_attributes" ADD FOREIGN KEY ("sport_id") REFERENCES "sports" ("id") ON DELETE SET NULL;

ALTER TABLE "player_sport_profiles" ADD FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE;

ALTER TABLE "player_sport_profiles" ADD FOREIGN KEY ("sport_id") REFERENCES "sports" ("id") ON DELETE RESTRICT;

ALTER TABLE "player_sport_profiles" ADD FOREIGN KEY ("play_style_id") REFERENCES "play_styles" ("id") ON DELETE SET NULL;

ALTER TABLE "player_sport_profiles" ADD FOREIGN KEY ("preferred_facility_id") REFERENCES "facilities" ("id") ON DELETE SET NULL;

ALTER TABLE "player_play_attributes" ADD FOREIGN KEY ("player_sport_profile_id") REFERENCES "player_sport_profiles" ("id") ON DELETE CASCADE;

ALTER TABLE "player_play_attributes" ADD FOREIGN KEY ("play_attribute_id") REFERENCES "play_attributes" ("id") ON DELETE CASCADE;

ALTER TABLE "rating_systems" ADD FOREIGN KEY ("sport_id") REFERENCES "sports" ("id") ON DELETE RESTRICT;

ALTER TABLE "rating_scores" ADD FOREIGN KEY ("rating_system_id") REFERENCES "rating_systems" ("id") ON DELETE CASCADE;

ALTER TABLE "player_rating_scores" ADD FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE;

ALTER TABLE "player_rating_scores" ADD FOREIGN KEY ("rating_score_id") REFERENCES "rating_scores" ("id") ON DELETE RESTRICT;

ALTER TABLE "player_rating_scores" ADD FOREIGN KEY ("external_rating_score_id") REFERENCES "rating_scores" ("id") ON DELETE SET NULL;

ALTER TABLE "files" ADD FOREIGN KEY ("uploaded_by") REFERENCES "profiles" ("id") ON DELETE SET NULL;

ALTER TABLE "rating_proofs" ADD FOREIGN KEY ("player_rating_score_id") REFERENCES "player_rating_scores" ("id") ON DELETE CASCADE;

ALTER TABLE "rating_proofs" ADD FOREIGN KEY ("file_id") REFERENCES "files" ("id") ON DELETE SET NULL;

ALTER TABLE "rating_proofs" ADD FOREIGN KEY ("reviewed_by") REFERENCES "profiles" ("id") ON DELETE SET NULL;

ALTER TABLE "rating_reference_requests" ADD FOREIGN KEY ("requester_id") REFERENCES "players" ("id") ON DELETE CASCADE;

ALTER TABLE "rating_reference_requests" ADD FOREIGN KEY ("player_rating_score_id") REFERENCES "player_rating_scores" ("id") ON DELETE CASCADE;

ALTER TABLE "rating_reference_requests" ADD FOREIGN KEY ("referee_id") REFERENCES "players" ("id") ON DELETE CASCADE;

ALTER TABLE "peer_rating_requests" ADD FOREIGN KEY ("requester_id") REFERENCES "players" ("id") ON DELETE CASCADE;

ALTER TABLE "peer_rating_requests" ADD FOREIGN KEY ("evaluator_id") REFERENCES "players" ("id") ON DELETE CASCADE;

ALTER TABLE "peer_rating_requests" ADD FOREIGN KEY ("rating_system_id") REFERENCES "rating_systems" ("id") ON DELETE RESTRICT;

ALTER TABLE "peer_rating_requests" ADD FOREIGN KEY ("assigned_rating_score_id") REFERENCES "rating_scores" ("id") ON DELETE SET NULL;

ALTER TABLE "facilities" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;

ALTER TABLE "facility_contacts" ADD FOREIGN KEY ("facility_id") REFERENCES "facilities" ("id") ON DELETE CASCADE;

ALTER TABLE "facility_contacts" ADD FOREIGN KEY ("sport_id") REFERENCES "sports" ("id") ON DELETE SET NULL;

ALTER TABLE "facility_images" ADD FOREIGN KEY ("facility_id") REFERENCES "facilities" ("id") ON DELETE CASCADE;

ALTER TABLE "facility_files" ADD FOREIGN KEY ("facility_id") REFERENCES "facilities" ("id") ON DELETE CASCADE;

ALTER TABLE "facility_files" ADD FOREIGN KEY ("file_id") REFERENCES "files" ("id") ON DELETE CASCADE;

ALTER TABLE "facility_sports" ADD FOREIGN KEY ("facility_id") REFERENCES "facilities" ("id") ON DELETE CASCADE;

ALTER TABLE "facility_sports" ADD FOREIGN KEY ("sport_id") REFERENCES "sports" ("id") ON DELETE RESTRICT;

ALTER TABLE "courts" ADD FOREIGN KEY ("facility_id") REFERENCES "facilities" ("id") ON DELETE CASCADE;

ALTER TABLE "court_sports" ADD FOREIGN KEY ("court_id") REFERENCES "courts" ("id") ON DELETE CASCADE;

ALTER TABLE "court_sports" ADD FOREIGN KEY ("sport_id") REFERENCES "sports" ("id") ON DELETE RESTRICT;

ALTER TABLE "invitations" ADD FOREIGN KEY ("inviter_id") REFERENCES "profiles" ("id") ON DELETE SET NULL;

ALTER TABLE "invitations" ADD FOREIGN KEY ("invited_user_id") REFERENCES "profiles" ("id") ON DELETE SET NULL;

ALTER TABLE "invitations" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;

ALTER TABLE "invitations" ADD FOREIGN KEY ("revoked_by") REFERENCES "profiles" ("id") ON DELETE SET NULL;
