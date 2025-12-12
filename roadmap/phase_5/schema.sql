-- ============================================================================
-- RALLIA DATABASE SCHEMA - END OF PHASE 5 (MVP COMPLETE)
-- Phase 5: Polish & Launch Prep (Mar 16 - Mar 27, 2026)
-- 
-- This schema represents the COMPLETE MVP database schema.
-- Phase 5 focuses on polish, testing, and launch prep with minimal schema changes.
-- 
-- This file includes:
-- - Everything from Phases 1-4
-- - Phase 5 additions: i18n support, audit logging, app store metadata
-- ============================================================================

-- ============================================================================
-- PHASE 5 ENUM TYPES
-- ============================================================================

CREATE TYPE "locale_enum" AS ENUM (
  'en-CA',
  'en-US',
  'fr-CA',
  'fr-FR'
);

CREATE TYPE "audit_action_enum" AS ENUM (
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'permission_change',
  'export',
  'admin_action'
);

-- ============================================================================
-- PHASE 5 TABLES: Internationalization
-- ============================================================================

-- User locale preferences (extends profiles)
-- Note: locale already exists in profiles, this adds detailed preferences
CREATE TABLE "user_locale_preference" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL UNIQUE,
  "preferred_locale" locale_enum NOT NULL DEFAULT 'en-CA',
  "email_locale" locale_enum,
  "sms_locale" locale_enum,
  "push_locale" locale_enum,
  "date_format" varchar(20) DEFAULT 'YYYY-MM-DD',
  "time_format" varchar(10) DEFAULT '24h',
  "first_day_of_week" day_enum DEFAULT 'sunday',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 5 TABLES: Audit & Compliance
-- ============================================================================

-- Audit log for admin actions and security
CREATE TABLE "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_id" uuid,
  "actor_type" varchar(20) NOT NULL,
  "action" audit_action_enum NOT NULL,
  "resource_type" varchar(50) NOT NULL,
  "resource_id" uuid,
  "old_values" jsonb,
  "new_values" jsonb,
  "ip_address" inet,
  "user_agent" text,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Data export requests (GDPR compliance)
CREATE TABLE "data_export_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "file_url" text,
  "file_expires_at" timestamptz,
  "requested_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz,
  "downloaded_at" timestamptz
);

-- Account deletion requests
CREATE TABLE "account_deletion_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "reason" text,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "scheduled_for" timestamptz NOT NULL,
  "cancelled_at" timestamptz,
  "completed_at" timestamptz,
  "requested_at" timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 5 TABLES: App Store & Versioning
-- ============================================================================

-- App versions tracking
CREATE TABLE "app_version" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "platform" varchar(20) NOT NULL,
  "version" varchar(20) NOT NULL,
  "build_number" int NOT NULL,
  "min_supported_version" varchar(20),
  "release_notes" text,
  "release_notes_fr" text,
  "is_required_update" boolean NOT NULL DEFAULT false,
  "released_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE(platform, version)
);

-- Feature announcements (for in-app notifications about new features)
CREATE TABLE "feature_announcement" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" varchar(255) NOT NULL,
  "title_fr" varchar(255),
  "message" text NOT NULL,
  "message_fr" text,
  "image_url" text,
  "action_url" text,
  "target_version" varchar(20),
  "target_platforms" varchar(20)[],
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz,
  "is_active" boolean NOT NULL DEFAULT true,
  "view_count" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Feature announcement views
CREATE TABLE "feature_announcement_view" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "announcement_id" uuid NOT NULL,
  "player_id" uuid NOT NULL,
  "viewed_at" timestamptz NOT NULL DEFAULT now(),
  "dismissed_at" timestamptz,
  UNIQUE(announcement_id, player_id)
);

-- ============================================================================
-- PHASE 5 TABLES: Terms & Consent
-- ============================================================================

-- Terms of service versions
CREATE TABLE "terms_version" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "version" varchar(20) NOT NULL UNIQUE,
  "content_url" text NOT NULL,
  "content_url_fr" text,
  "effective_date" date NOT NULL,
  "requires_re_acceptance" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- User consent tracking
CREATE TABLE "user_consent" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "terms_version_id" uuid NOT NULL,
  "accepted_at" timestamptz NOT NULL DEFAULT now(),
  "ip_address" inet,
  "user_agent" text,
  UNIQUE(player_id, terms_version_id)
);

-- Privacy policy versions
CREATE TABLE "privacy_policy_version" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "version" varchar(20) NOT NULL UNIQUE,
  "content_url" text NOT NULL,
  "content_url_fr" text,
  "effective_date" date NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 5 INDEXES
-- ============================================================================

CREATE INDEX "idx_user_locale_preference_player" ON "user_locale_preference" ("player_id");
CREATE INDEX "idx_audit_log_actor" ON "audit_log" ("actor_id");
CREATE INDEX "idx_audit_log_action" ON "audit_log" ("action");
CREATE INDEX "idx_audit_log_resource" ON "audit_log" ("resource_type", "resource_id");
CREATE INDEX "idx_audit_log_created" ON "audit_log" ("created_at");
CREATE INDEX "idx_data_export_request_player" ON "data_export_request" ("player_id");
CREATE INDEX "idx_data_export_request_status" ON "data_export_request" ("status");
CREATE INDEX "idx_account_deletion_request_player" ON "account_deletion_request" ("player_id");
CREATE INDEX "idx_account_deletion_request_status" ON "account_deletion_request" ("status");
CREATE INDEX "idx_app_version_platform" ON "app_version" ("platform");
CREATE INDEX "idx_feature_announcement_active" ON "feature_announcement" ("is_active", "starts_at", "ends_at");
CREATE INDEX "idx_feature_announcement_view_announcement" ON "feature_announcement_view" ("announcement_id");
CREATE INDEX "idx_feature_announcement_view_player" ON "feature_announcement_view" ("player_id");
CREATE INDEX "idx_terms_version_effective" ON "terms_version" ("effective_date");
CREATE INDEX "idx_user_consent_player" ON "user_consent" ("player_id");
CREATE INDEX "idx_privacy_policy_version_effective" ON "privacy_policy_version" ("effective_date");

-- ============================================================================
-- PHASE 5 FOREIGN KEYS
-- ============================================================================

ALTER TABLE "user_locale_preference" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "audit_log" ADD FOREIGN KEY ("actor_id") REFERENCES "profile" ("id") ON DELETE SET NULL;
ALTER TABLE "data_export_request" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "account_deletion_request" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "feature_announcement_view" ADD FOREIGN KEY ("announcement_id") REFERENCES "feature_announcement" ("id") ON DELETE CASCADE;
ALTER TABLE "feature_announcement_view" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "user_consent" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "user_consent" ADD FOREIGN KEY ("terms_version_id") REFERENCES "terms_version" ("id") ON DELETE RESTRICT;

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE "user_locale_preference" IS 'User preferences for language and date/time formatting.';
COMMENT ON TABLE "audit_log" IS 'Audit trail for admin actions and security events.';
COMMENT ON TABLE "data_export_request" IS 'GDPR data export requests from users.';
COMMENT ON TABLE "account_deletion_request" IS 'Account deletion requests with cooling-off period.';
COMMENT ON TABLE "app_version" IS 'App version tracking for forced updates.';
COMMENT ON TABLE "feature_announcement" IS 'In-app announcements for new features.';
COMMENT ON TABLE "feature_announcement_view" IS 'Tracking which users have seen announcements.';
COMMENT ON TABLE "terms_version" IS 'Version history of Terms of Service.';
COMMENT ON TABLE "user_consent" IS 'User acceptance of Terms of Service versions.';
COMMENT ON TABLE "privacy_policy_version" IS 'Version history of Privacy Policy.';

-- ============================================================================
-- COMPLETE MVP SCHEMA SUMMARY
-- ============================================================================
-- 
-- BASE TABLES: (29 tables)
-- auth_users, profiles, admins, organizations, organization_members,
-- players, player_availabilities, sports, play_styles, play_attributes,
-- player_sport_profiles, player_play_attributes, rating_systems, rating_scores,
-- player_rating_scores, files, rating_proofs, rating_reference_requests,
-- peer_rating_requests, facilities, facility_contacts, facility_images,
-- facility_files, facility_sports, courts, court_sports, invitations
--
-- PHASE 1 - Player Relations: (8 tables)
-- player_blocks, player_favorites, player_groups, group_members,
-- communities, community_members, private_contact_lists, private_contacts
--
-- PHASE 2 - Match System: (7 tables)
-- matches, match_invitations, match_participants, match_templates,
-- match_feedback, reputation_history, saved_match_filters
--
-- PHASE 3 - Calendar & Courts: (5 tables)
-- court_bookings, court_availability_slots, match_reminders,
-- calendar_exports, player_locations
--
-- PHASE 4 - Social & Growth: (14 tables)
-- conversations, conversation_participants, messages, message_read_receipts,
-- quick_responses, user_reports, blocked_words, player_badges, badge_definitions,
-- user_feedback, app_invitations, mailing_list, analytics_events, daily_digests
--
-- PHASE 5 - Polish & Launch: (10 tables)
-- user_locale_preferences, audit_logs, data_export_requests,
-- account_deletion_requests, app_versions, feature_announcements,
-- feature_announcement_views, terms_versions, user_consents, privacy_policy_versions
--
-- ============================================================================
-- TOTAL MVP TABLES: 73 tables
-- ============================================================================
--
-- ENUM TYPES SUMMARY:
-- Base: 18 enums
-- Phase 1: 1 enum (community_member_status_enum)
-- Phase 2: 6 enums (match visibility, validation, court status, expectation, status, invitation status, game type)
-- Phase 3: 3 enums (booking_status, calendar_event_type, reminder_type)
-- Phase 4: 7 enums (conversation_type, message_type, message_status, report_status, report_type, badge_type, feedback_status, feedback_category)
-- Phase 5: 2 enums (locale_enum, audit_action_enum)
-- TOTAL: 37 enum types
-- ============================================================================
