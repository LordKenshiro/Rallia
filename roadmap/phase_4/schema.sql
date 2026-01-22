-- ============================================================================
-- RALLIA DATABASE SCHEMA - END OF PHASE 4
-- Phase 4: Social & Growth Features (Feb 23 - Mar 13, 2026)
-- 
-- This schema includes:
-- - Everything from Phase 1 (Base + Player Relations)
-- - Everything from Phase 2 (Match System + Reputation)
-- - Everything from Phase 3 (Calendar, Bookings, Locations)
-- - Phase 4 additions: Chat system, feedback/suggestions, badges, analytics events
-- ============================================================================

-- ============================================================================
-- This file extends Phase 3 schema with Phase 4 additions
-- For complete Phase 1-3 tables, see previous phase schemas
-- ============================================================================

-- ============================================================================
-- PHASE 4 ENUM TYPES
-- ============================================================================

CREATE TYPE "conversation_type_enum" AS ENUM (
  'direct',
  'match',
  'group',
  'community'
);

CREATE TYPE "message_type_enum" AS ENUM (
  'text',
  'quick_response',
  'system',
  'image',
  'match_share'
);

CREATE TYPE "message_status_enum" AS ENUM (
  'sent',
  'delivered',
  'read',
  'failed'
);

CREATE TYPE "report_status_enum" AS ENUM (
  'pending',
  'under_review',
  'resolved',
  'dismissed'
);

CREATE TYPE "report_type_enum" AS ENUM (
  'inappropriate_content',
  'harassment',
  'spam',
  'fake_profile',
  'other'
);

CREATE TYPE "badge_type_enum" AS ENUM (
  'most_wanted_player',
  'high_reputation',
  'certified_level',
  'early_adopter',
  'community_leader',
  'match_maker'
);

CREATE TYPE "feedback_status_enum" AS ENUM (
  'new',
  'read',
  'in_progress',
  'resolved',
  'archived'
);

CREATE TYPE "feedback_category_enum" AS ENUM (
  'bug',
  'feature_request',
  'improvement',
  'complaint',
  'praise',
  'other'
);

-- ============================================================================
-- PHASE 4 TABLES: Chat System
-- ============================================================================

-- Conversations
CREATE TABLE "conversation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" conversation_type_enum NOT NULL DEFAULT 'direct',
  "name" varchar(150),
  "match_id" uuid,
  "group_id" uuid,
  "community_id" uuid,
  "last_message_at" timestamptz,
  "last_message_preview" text,
  "message_count" int NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Conversation participants
CREATE TABLE "conversation_participant" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL,
  "player_id" uuid NOT NULL,
  "joined_at" timestamptz NOT NULL DEFAULT now(),
  "left_at" timestamptz,
  "is_muted" boolean NOT NULL DEFAULT false,
  "muted_until" timestamptz,
  "last_read_at" timestamptz,
  "unread_count" int NOT NULL DEFAULT 0,
  "is_admin" boolean NOT NULL DEFAULT false,
  "notifications_enabled" boolean NOT NULL DEFAULT true,
  UNIQUE(conversation_id, player_id)
);

-- Messages
CREATE TABLE "message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL,
  "sender_id" uuid NOT NULL,
  "content" text NOT NULL,
  "message_type" message_type_enum NOT NULL DEFAULT 'text',
  "reply_to_id" uuid,
  "metadata" jsonb,
  "is_edited" boolean NOT NULL DEFAULT false,
  "edited_at" timestamptz,
  "is_deleted" boolean NOT NULL DEFAULT false,
  "deleted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Message read receipts
CREATE TABLE "message_read_receipt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id" uuid NOT NULL,
  "player_id" uuid NOT NULL,
  "read_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, player_id)
);

-- Quick responses (pre-written messages)
CREATE TABLE "quick_response" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid,
  "text" varchar(100) NOT NULL,
  "emoji" varchar(10),
  "category" varchar(50),
  "is_system" boolean NOT NULL DEFAULT false,
  "sort_order" int NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "use_count" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 4 TABLES: Moderation & Reporting
-- ============================================================================

-- User reports
CREATE TABLE "user_report" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reporter_id" uuid NOT NULL,
  "reported_player_id" uuid,
  "reported_message_id" uuid,
  "reported_match_id" uuid,
  "report_type" report_type_enum NOT NULL,
  "description" text,
  "evidence_urls" text[],
  "status" report_status_enum NOT NULL DEFAULT 'pending',
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "resolution_notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Blocked words (for content moderation)
CREATE TABLE "blocked_word" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "word" varchar(100) NOT NULL,
  "is_regex" boolean NOT NULL DEFAULT false,
  "severity" int NOT NULL DEFAULT 1,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 4 TABLES: Badges & Achievements
-- ============================================================================

-- Player badges
CREATE TABLE "player_badge" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "badge_type" badge_type_enum NOT NULL,
  "sport_id" uuid,
  "earned_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz,
  "is_active" boolean NOT NULL DEFAULT true,
  "metadata" jsonb,
  UNIQUE(player_id, badge_type, sport_id)
);

-- Badge definitions
CREATE TABLE "badge_definition" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "badge_type" badge_type_enum NOT NULL UNIQUE,
  "name" varchar(100) NOT NULL,
  "description" text,
  "icon_url" text,
  "criteria" jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 4 TABLES: Feedback & Suggestions
-- ============================================================================

-- User feedback (suggestion box)
CREATE TABLE "user_feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid,
  "email" varchar(255),
  "category" feedback_category_enum NOT NULL DEFAULT 'other',
  "subject" varchar(255),
  "message" text NOT NULL,
  "app_version" varchar(20),
  "platform" varchar(20),
  "device_info" jsonb,
  "status" feedback_status_enum NOT NULL DEFAULT 'new',
  "assigned_to" uuid,
  "response" text,
  "responded_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 4 TABLES: Growth & Invitations
-- ============================================================================

-- App invitations (growth hacks)
CREATE TABLE "app_invitation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "inviter_id" uuid NOT NULL,
  "invitee_email" varchar(255),
  "invitee_phone" varchar(30),
  "invitee_name" varchar(150),
  "channel" varchar(20) NOT NULL,
  "message" text,
  "token" varchar(255) UNIQUE NOT NULL,
  "status" invite_status_enum NOT NULL DEFAULT 'pending',
  "sent_at" timestamptz,
  "opened_at" timestamptz,
  "accepted_at" timestamptz,
  "accepted_by" uuid,
  "match_id" uuid,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Mailing list (for non-users)
CREATE TABLE "mailing_list" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar(255),
  "phone" varchar(30),
  "name" varchar(150),
  "source" varchar(50) NOT NULL,
  "source_player_id" uuid,
  "source_match_id" uuid,
  "opted_in" boolean NOT NULL DEFAULT true,
  "opted_out_at" timestamptz,
  "converted_to_user_id" uuid,
  "converted_at" timestamptz,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email),
  UNIQUE(phone)
);

-- ============================================================================
-- PHASE 4 TABLES: Analytics Events
-- ============================================================================

-- Analytics events (for custom tracking beyond PostHog)
CREATE TABLE "analytics_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid,
  "session_id" varchar(100),
  "event_type" varchar(100) NOT NULL,
  "event_data" jsonb,
  "screen" varchar(100),
  "platform" varchar(20),
  "app_version" varchar(20),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Daily email digests tracking
CREATE TABLE "daily_digest" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "digest_date" date NOT NULL,
  "digest_type" varchar(50) NOT NULL,
  "recipient_count" int NOT NULL DEFAULT 0,
  "data" jsonb,
  "sent_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE(digest_date, digest_type)
);

-- ============================================================================
-- PHASE 4 INDEXES
-- ============================================================================

-- Chat indexes
CREATE INDEX "idx_conversation_type" ON "conversation" ("type");
CREATE INDEX "idx_conversation_match" ON "conversation" ("match_id");
CREATE INDEX "idx_conversation_group" ON "conversation" ("group_id");
CREATE INDEX "idx_conversation_community" ON "conversation" ("community_id");
CREATE INDEX "idx_conversation_last_message" ON "conversation" ("last_message_at" DESC);
CREATE INDEX "idx_conversation_participant_conv" ON "conversation_participant" ("conversation_id");
CREATE INDEX "idx_conversation_participant_player" ON "conversation_participant" ("player_id");
CREATE INDEX "idx_conversation_participant_unread" ON "conversation_participant" ("player_id", "unread_count") WHERE unread_count > 0;
CREATE INDEX "idx_message_conversation" ON "message" ("conversation_id");
CREATE INDEX "idx_message_sender" ON "message" ("sender_id");
CREATE INDEX "idx_message_created" ON "message" ("created_at" DESC);
CREATE INDEX "idx_message_conv_created" ON "message" ("conversation_id", "created_at" DESC);
CREATE INDEX "idx_message_read_receipt_message" ON "message_read_receipt" ("message_id");
CREATE INDEX "idx_quick_response_player" ON "quick_response" ("player_id");
CREATE INDEX "idx_quick_response_system" ON "quick_response" ("is_system");

-- Moderation indexes
CREATE INDEX "idx_user_report_reporter" ON "user_report" ("reporter_id");
CREATE INDEX "idx_user_report_reported_player" ON "user_report" ("reported_player_id");
CREATE INDEX "idx_user_report_status" ON "user_report" ("status");
CREATE INDEX "idx_blocked_word_active" ON "blocked_word" ("is_active");

-- Badge indexes
CREATE INDEX "idx_player_badge_player" ON "player_badge" ("player_id");
CREATE INDEX "idx_player_badge_type" ON "player_badge" ("badge_type");
CREATE INDEX "idx_player_badge_active" ON "player_badge" ("is_active");

-- Feedback indexes
CREATE INDEX "idx_user_feedback_player" ON "user_feedback" ("player_id");
CREATE INDEX "idx_user_feedback_status" ON "user_feedback" ("status");
CREATE INDEX "idx_user_feedback_category" ON "user_feedback" ("category");

-- Growth indexes
CREATE INDEX "idx_app_invitation_inviter" ON "app_invitation" ("inviter_id");
CREATE INDEX "idx_app_invitation_status" ON "app_invitation" ("status");
CREATE INDEX "idx_app_invitation_token" ON "app_invitation" ("token");
CREATE INDEX "idx_mailing_list_source" ON "mailing_list" ("source");
CREATE INDEX "idx_mailing_list_opted_in" ON "mailing_list" ("opted_in");

-- Analytics indexes
CREATE INDEX "idx_analytics_event_player" ON "analytics_event" ("player_id");
CREATE INDEX "idx_analytics_event_type" ON "analytics_event" ("event_type");
CREATE INDEX "idx_analytics_event_created" ON "analytics_event" ("created_at");
CREATE INDEX "idx_daily_digest_date" ON "daily_digest" ("digest_date");

-- ============================================================================
-- PHASE 4 FOREIGN KEYS
-- ============================================================================

-- Chat foreign keys
ALTER TABLE "conversation" ADD FOREIGN KEY ("match_id") REFERENCES "match" ("id") ON DELETE SET NULL;
ALTER TABLE "conversation" ADD FOREIGN KEY ("group_id") REFERENCES "player_group" ("id") ON DELETE CASCADE;
ALTER TABLE "conversation" ADD FOREIGN KEY ("community_id") REFERENCES "community" ("id") ON DELETE CASCADE;
ALTER TABLE "conversation_participant" ADD FOREIGN KEY ("conversation_id") REFERENCES "conversation" ("id") ON DELETE CASCADE;
ALTER TABLE "conversation_participant" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "message" ADD FOREIGN KEY ("conversation_id") REFERENCES "conversation" ("id") ON DELETE CASCADE;
ALTER TABLE "message" ADD FOREIGN KEY ("sender_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "message" ADD FOREIGN KEY ("reply_to_id") REFERENCES "message" ("id") ON DELETE SET NULL;
ALTER TABLE "message_read_receipt" ADD FOREIGN KEY ("message_id") REFERENCES "message" ("id") ON DELETE CASCADE;
ALTER TABLE "message_read_receipt" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "quick_response" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;

-- Moderation foreign keys
ALTER TABLE "user_report" ADD FOREIGN KEY ("reporter_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "user_report" ADD FOREIGN KEY ("reported_player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "user_report" ADD FOREIGN KEY ("reported_message_id") REFERENCES "message" ("id") ON DELETE SET NULL;
ALTER TABLE "user_report" ADD FOREIGN KEY ("reported_match_id") REFERENCES "match" ("id") ON DELETE SET NULL;
ALTER TABLE "user_report" ADD FOREIGN KEY ("reviewed_by") REFERENCES "admin" ("id") ON DELETE SET NULL;

-- Badge foreign keys
ALTER TABLE "player_badge" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "player_badge" ADD FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE SET NULL;

-- Feedback foreign keys
ALTER TABLE "user_feedback" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE SET NULL;
ALTER TABLE "user_feedback" ADD FOREIGN KEY ("assigned_to") REFERENCES "admin" ("id") ON DELETE SET NULL;

-- Growth foreign keys
ALTER TABLE "app_invitation" ADD FOREIGN KEY ("inviter_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "app_invitation" ADD FOREIGN KEY ("accepted_by") REFERENCES "player" ("id") ON DELETE SET NULL;
ALTER TABLE "app_invitation" ADD FOREIGN KEY ("match_id") REFERENCES "match" ("id") ON DELETE SET NULL;
ALTER TABLE "mailing_list" ADD FOREIGN KEY ("source_player_id") REFERENCES "player" ("id") ON DELETE SET NULL;
ALTER TABLE "mailing_list" ADD FOREIGN KEY ("source_match_id") REFERENCES "match" ("id") ON DELETE SET NULL;
ALTER TABLE "mailing_list" ADD FOREIGN KEY ("converted_to_user_id") REFERENCES "profile" ("id") ON DELETE SET NULL;

-- Analytics foreign keys
ALTER TABLE "analytics_event" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE SET NULL;

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE "conversation" IS 'Chat conversations between players, for matches, groups, or communities.';
COMMENT ON TABLE "conversation_participant" IS 'Players participating in conversations with read tracking.';
COMMENT ON TABLE "message" IS 'Individual messages within conversations.';
COMMENT ON TABLE "message_read_receipt" IS 'Read receipt tracking for messages.';
COMMENT ON TABLE "quick_response" IS 'Pre-written quick response messages.';
COMMENT ON TABLE "user_report" IS 'Reports submitted by users for moderation.';
COMMENT ON TABLE "blocked_word" IS 'Words blocked by content moderation.';
COMMENT ON TABLE "player_badge" IS 'Badges earned by players.';
COMMENT ON TABLE "badge_definition" IS 'Definition and criteria for badges.';
COMMENT ON TABLE "user_feedback" IS 'Feedback and suggestions submitted by users.';
COMMENT ON TABLE "app_invitation" IS 'Invitations sent to non-users for growth.';
COMMENT ON TABLE "mailing_list" IS 'Email/phone list of potential users for marketing.';
COMMENT ON TABLE "analytics_event" IS 'Custom analytics events for tracking.';
COMMENT ON TABLE "daily_digest" IS 'Tracking of daily email digests sent.';

-- ============================================================================
-- FULL SCHEMA SUMMARY (End of Phase 4)
-- ============================================================================
-- 
-- BASE TABLES: (29 tables)
-- auth_users, profiles, admins, organizations, organization_members,
-- players, player_availabilities, player_sport, sports, play_styles, play_attributes,
-- rating_systems, rating_scores,
-- player_rating_scores, files, rating_proofs, rating_reference_requests,
-- peer_rating_requests, facilities, facility_contacts, facility_images,
-- facility_files, facility_sports, courts, court_sports, invitations
--
-- PHASE 1 TABLES: (8 tables)
-- player_blocks, player_favorites, player_groups, group_members,
-- communities, community_members, private_contact_lists, private_contacts
--
-- PHASE 2 TABLES: (7 tables)
-- matches, match_invitations, match_participants, match_templates,
-- match_feedback, reputation_history, saved_match_filters
--
-- PHASE 3 TABLES: (5 tables)
-- court_bookings, court_availability_slots, match_reminders,
-- calendar_exports, player_locations
--
-- PHASE 4 TABLES: (13 tables)
-- conversations, conversation_participants, messages, message_read_receipts,
-- quick_responses, user_reports, blocked_words, player_badges, badge_definitions,
-- user_feedback, app_invitations, mailing_list, analytics_events, daily_digests
--
-- TOTAL: 62 tables
-- ============================================================================
