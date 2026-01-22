-- ============================================================================
-- RALLIA DATABASE SCHEMA - END OF PHASE 3
-- Phase 3: Calendar, Map & Court Features (Jan 27 - Feb 20, 2026)
-- 
-- This schema includes:
-- - Everything from Phase 1 (Base + Player Relations)
-- - Everything from Phase 2 (Match System + Reputation)
-- - Phase 3 additions: Calendar events, bookings (no new tables - uses existing)
-- 
-- NOTE: Phase 3 primarily adds UI features (calendar views, map integration)
-- using existing tables. The only additions are supporting tables for 
-- court bookings and calendar sync.
-- ============================================================================

-- ============================================================================
-- This file extends Phase 2 schema with Phase 3 additions
-- For complete Phase 1 & 2 tables, see phase_2/schema.sql
-- ============================================================================

-- ============================================================================
-- PHASE 3 ENUM TYPES
-- ============================================================================

CREATE TYPE "booking_status_enum" AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show'
);

CREATE TYPE "calendar_event_type_enum" AS ENUM (
  'match',
  'match_invitation',
  'availability',
  'booking',
  'reminder'
);

CREATE TYPE "reminder_type_enum" AS ENUM (
  'day_before',
  'same_day',
  'hour_before',
  'custom'
);

-- ============================================================================
-- PHASE 3 TABLES
-- ============================================================================

-- Court bookings (for in-app booking with clubs)
CREATE TABLE "court_booking" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "court_id" uuid NOT NULL,
  "player_id" uuid NOT NULL,
  "match_id" uuid,
  
  -- Booking details
  "booking_date" date NOT NULL,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "duration_minutes" int NOT NULL,
  
  -- Pricing
  "price" decimal(10,2),
  "currency" varchar(3) DEFAULT 'CAD',
  "payment_status" varchar(20) DEFAULT 'pending',
  "payment_intent_id" varchar(255),
  
  -- Status
  "status" booking_status_enum NOT NULL DEFAULT 'pending',
  "confirmed_at" timestamptz,
  "cancelled_at" timestamptz,
  "cancellation_reason" text,
  "cancelled_by" uuid,
  
  -- Club tracking
  "no_show_reported" boolean DEFAULT false,
  "no_show_reported_at" timestamptz,
  "no_show_reported_by" uuid,
  
  -- Timestamps
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Court availability slots (defined by clubs)
CREATE TABLE "court_availability_slot" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "court_id" uuid NOT NULL,
  "day_of_week" day_enum,
  "specific_date" date,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "price_per_hour" decimal(10,2),
  "is_recurring" boolean NOT NULL DEFAULT false,
  "max_bookings" int DEFAULT 1,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Match reminders
CREATE TABLE "match_reminder" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "match_id" uuid NOT NULL,
  "player_id" uuid NOT NULL,
  "reminder_type" reminder_type_enum NOT NULL,
  "scheduled_for" timestamptz NOT NULL,
  "sent_at" timestamptz,
  "is_sent" boolean NOT NULL DEFAULT false,
  "channel" varchar(20) DEFAULT 'push',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Calendar exports (ICS file tracking)
CREATE TABLE "calendar_export" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "match_id" uuid NOT NULL,
  "export_type" varchar(20) NOT NULL DEFAULT 'ics',
  "calendar_provider" varchar(20),
  "exported_at" timestamptz NOT NULL DEFAULT now()
);

-- Player location (for map features, privacy-respecting)
CREATE TABLE "player_location" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL UNIQUE,
  "latitude" decimal(9,6),
  "longitude" decimal(9,6),
  "location" geography(Point,4326),
  "city" varchar(100),
  "accuracy_meters" int,
  "is_approximate" boolean NOT NULL DEFAULT true,
  "show_on_map" boolean NOT NULL DEFAULT false,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 3 INDEXES
-- ============================================================================

CREATE INDEX "idx_court_booking_court" ON "court_booking" ("court_id");
CREATE INDEX "idx_court_booking_player" ON "court_booking" ("player_id");
CREATE INDEX "idx_court_booking_match" ON "court_booking" ("match_id");
CREATE INDEX "idx_court_booking_date" ON "court_booking" ("booking_date");
CREATE INDEX "idx_court_booking_status" ON "court_booking" ("status");
CREATE INDEX "idx_court_booking_date_status" ON "court_booking" ("booking_date", "status");
CREATE INDEX "idx_court_availability_court" ON "court_availability_slot" ("court_id");
CREATE INDEX "idx_court_availability_day" ON "court_availability_slot" ("day_of_week");
CREATE INDEX "idx_court_availability_date" ON "court_availability_slot" ("specific_date");
CREATE INDEX "idx_match_reminder_match" ON "match_reminder" ("match_id");
CREATE INDEX "idx_match_reminder_player" ON "match_reminder" ("player_id");
CREATE INDEX "idx_match_reminder_scheduled" ON "match_reminder" ("scheduled_for");
CREATE INDEX "idx_match_reminder_unsent" ON "match_reminder" ("is_sent", "scheduled_for");
CREATE INDEX "idx_calendar_export_player" ON "calendar_export" ("player_id");
CREATE INDEX "idx_calendar_export_match" ON "calendar_export" ("match_id");
CREATE INDEX "idx_player_location_player" ON "player_location" ("player_id");
CREATE INDEX "idx_player_location_show" ON "player_location" ("show_on_map");

-- Spatial index for location-based queries
CREATE INDEX "idx_player_location_geo" ON "player_location" USING GIST ("location");
CREATE INDEX "idx_facility_geo" ON "facility" USING GIST ("location");

-- ============================================================================
-- PHASE 3 FOREIGN KEYS
-- ============================================================================

ALTER TABLE "court_booking" ADD FOREIGN KEY ("court_id") REFERENCES "court" ("id") ON DELETE CASCADE;
ALTER TABLE "court_booking" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "court_booking" ADD FOREIGN KEY ("match_id") REFERENCES "match" ("id") ON DELETE SET NULL;
ALTER TABLE "court_booking" ADD FOREIGN KEY ("cancelled_by") REFERENCES "profile" ("id") ON DELETE SET NULL;
ALTER TABLE "court_booking" ADD FOREIGN KEY ("no_show_reported_by") REFERENCES "profile" ("id") ON DELETE SET NULL;
ALTER TABLE "court_availability_slot" ADD FOREIGN KEY ("court_id") REFERENCES "court" ("id") ON DELETE CASCADE;
ALTER TABLE "match_reminder" ADD FOREIGN KEY ("match_id") REFERENCES "match" ("id") ON DELETE CASCADE;
ALTER TABLE "match_reminder" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "calendar_export" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "calendar_export" ADD FOREIGN KEY ("match_id") REFERENCES "match" ("id") ON DELETE CASCADE;
ALTER TABLE "player_location" ADD FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE "court_booking" IS 'Court reservations made through the app by players.';
COMMENT ON TABLE "court_availability_slot" IS 'Available time slots defined by clubs for court bookings.';
COMMENT ON TABLE "match_reminder" IS 'Scheduled reminders for upcoming matches.';
COMMENT ON TABLE "calendar_export" IS 'Tracking of calendar exports (ICS files) for matches.';
COMMENT ON TABLE "player_location" IS 'Approximate player locations for map display (privacy-respecting).';

-- ============================================================================
-- FULL SCHEMA SUMMARY (End of Phase 3)
-- ============================================================================
-- 
-- BASE TABLES:
-- - auth_users, profiles, admins
-- - organizations, organization_members
-- - players, player_availabilities, player_sport
-- - sports, play_styles, play_attributes
-- - rating_systems, rating_scores, player_rating_scores
-- - files, rating_proofs
-- - rating_reference_requests, peer_rating_requests
-- - facilities, facility_contacts, facility_images, facility_files, facility_sports
-- - courts, court_sports
-- - invitations
--
-- PHASE 1 TABLES:
-- - player_blocks, player_favorites
-- - player_groups, group_members
-- - communities, community_members
-- - private_contact_lists, private_contacts
--
-- PHASE 2 TABLES:
-- - matches, match_invitations, match_participants
-- - match_templates, match_feedback
-- - reputation_history, saved_match_filters
--
-- PHASE 3 TABLES:
-- - court_bookings, court_availability_slots
-- - match_reminders, calendar_exports
-- - player_locations
-- ============================================================================
