-- ============================================================================
-- PHASE 1 SCHEMA SYNC MIGRATION
-- This migration syncs the database to match Phase 1 schema requirements
-- Generated based on comparison with current database state
--
-- This migration is idempotent and can be run multiple times safely.
-- It will:
--   1. Create missing enum types
--   2. Add missing columns to existing tables
--   3. Create missing tables
--   4. Create indexes
--   5. Create foreign key constraints
--   6. Create triggers and functions
--
-- IMPORTANT NOTES:
--   - The username column is added as nullable. To make it NOT NULL, populate
--     all existing rows first, then run: ALTER TABLE "player" ALTER COLUMN "username" SET NOT NULL;
--   - External rating tables are optional and can be skipped if not needed
-- ============================================================================

-- ============================================================================
-- CREATE MISSING ENUMS
-- ============================================================================

-- NOTE: The following enums need to be updated if they already exist:
--   1. gender_enum: Update values from ('M', 'F', 'O', 'prefer_not_to_say') 
--      to ('male', 'female', 'other', 'prefer_not_to_say')
--   2. facility_type_enum: Add values ('park', 'indoor_center', 'private', 'other')
--   3. availability_enum: Rename to court_status_enum and update values to
--      ('available', 'unavailable', 'maintenance', 'reserved', 'under_maintenance', 'closed')
-- 
-- These updates require careful migration as PostgreSQL doesn't allow direct enum modification.
-- See enum migration section below for details.

-- Community member status enum
DO $$ BEGIN
  CREATE TYPE "community_member_status_enum" AS ENUM (
    'pending',
    'approved',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- External rating provider enum (OPTIONAL)
DO $$ BEGIN
  CREATE TYPE "external_rating_provider_enum" AS ENUM (
    'usta',   -- USTA Connect (NTRP ratings for tennis)
    'dupr',   -- DUPR (Pickleball & Tennis)
    'utr'     -- Universal Tennis Rating
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- External sync status enum (OPTIONAL)
DO $$ BEGIN
  CREATE TYPE "external_sync_status_enum" AS ENUM (
    'pending',    -- Account linked, awaiting first sync
    'syncing',    -- Sync in progress
    'synced',     -- Successfully synced
    'failed',     -- Sync failed (see error_message)
    'expired'     -- Tokens expired, re-auth required
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add missing columns to profile table
DO $$ BEGIN
  -- Add locale column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profile' 
    AND column_name = 'locale'
  ) THEN
    ALTER TABLE "profile" ADD COLUMN "locale" varchar(10) NOT NULL DEFAULT 'en-CA';
  END IF;

  -- Add timezone column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profile' 
    AND column_name = 'timezone'
  ) THEN
    ALTER TABLE "profile" ADD COLUMN "timezone" varchar(50) NOT NULL DEFAULT 'America/Toronto';
  END IF;

  -- Add two_factor_enabled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profile' 
    AND column_name = 'two_factor_enabled'
  ) THEN
    ALTER TABLE "profile" ADD COLUMN "two_factor_enabled" boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add missing columns to player table
DO $$ BEGIN
  -- Add username column (nullable initially - can be made NOT NULL after populating)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player' 
    AND column_name = 'username'
  ) THEN
    ALTER TABLE "player" ADD COLUMN "username" varchar(50);
    -- Create unique index after adding column (only for non-null values)
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_player_username" ON "player" ("username") WHERE "username" IS NOT NULL;
    -- Note: To make username NOT NULL, first populate all existing rows, then run:
    -- ALTER TABLE "player" ALTER COLUMN "username" SET NOT NULL;
  END IF;

  -- Add bio column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player' 
    AND column_name = 'bio'
  ) THEN
    ALTER TABLE "player" ADD COLUMN "bio" text;
  END IF;

  -- Add reputation_score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player' 
    AND column_name = 'reputation_score'
  ) THEN
    ALTER TABLE "player" ADD COLUMN "reputation_score" decimal(5,2) NOT NULL DEFAULT 100;
  END IF;

  -- Add rating_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player' 
    AND column_name = 'rating_count'
  ) THEN
    ALTER TABLE "player" ADD COLUMN "rating_count" int NOT NULL DEFAULT 0;
  END IF;

  -- Add verified column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player' 
    AND column_name = 'verified'
  ) THEN
    ALTER TABLE "player" ADD COLUMN "verified" boolean NOT NULL DEFAULT false;
  END IF;

  -- Add calendar_is_public column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player' 
    AND column_name = 'calendar_is_public'
  ) THEN
    ALTER TABLE "player" ADD COLUMN "calendar_is_public" boolean NOT NULL DEFAULT false;
  END IF;

  -- Add home address columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player' 
    AND column_name = 'home_address'
  ) THEN
    ALTER TABLE "player" ADD COLUMN "home_address" varchar(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player' 
    AND column_name = 'home_city'
  ) THEN
    ALTER TABLE "player" ADD COLUMN "home_city" varchar(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player' 
    AND column_name = 'home_postal_code'
  ) THEN
    ALTER TABLE "player" ADD COLUMN "home_postal_code" varchar(20);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player' 
    AND column_name = 'home_country'
  ) THEN
    ALTER TABLE "player" ADD COLUMN "home_country" country_enum;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player' 
    AND column_name = 'home_latitude'
  ) THEN
    ALTER TABLE "player" ADD COLUMN "home_latitude" decimal(9,6);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player' 
    AND column_name = 'home_longitude'
  ) THEN
    ALTER TABLE "player" ADD COLUMN "home_longitude" decimal(9,6);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player' 
    AND column_name = 'home_location'
  ) THEN
    ALTER TABLE "player" ADD COLUMN "home_location" geography(Point,4326);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player' 
    AND column_name = 'home_location_disclosed'
  ) THEN
    ALTER TABLE "player" ADD COLUMN "home_location_disclosed" boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- CREATE MISSING TABLES
-- ============================================================================

-- Player rating score history table
CREATE TABLE IF NOT EXISTS "player_rating_score_history" (
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

-- Player block table
CREATE TABLE IF NOT EXISTS "player_block" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "blocker_id" uuid NOT NULL,
  "blocked_id" uuid NOT NULL,
  "reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Player favorite table
CREATE TABLE IF NOT EXISTS "player_favorite" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "favorite_id" uuid NOT NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, favorite_id)
);

-- Player group table
CREATE TABLE IF NOT EXISTS "player_group" (
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

-- Group member table
CREATE TABLE IF NOT EXISTS "group_member" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "group_id" uuid NOT NULL,
  "player_id" uuid NOT NULL,
  "is_moderator" boolean NOT NULL DEFAULT false,
  "added_by" uuid,
  "joined_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, player_id)
);

-- Community table
CREATE TABLE IF NOT EXISTS "community" (
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

-- Community member table
CREATE TABLE IF NOT EXISTS "community_member" (
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

-- Private contact list table
CREATE TABLE IF NOT EXISTS "private_contact_list" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "contact_count" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Private contact table
CREATE TABLE IF NOT EXISTS "private_contact" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "list_id" uuid NOT NULL,
  "name" varchar(150) NOT NULL,
  "phone" varchar(30),
  "email" varchar(255),
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- External rating account table (OPTIONAL)
CREATE TABLE IF NOT EXISTS "external_rating_account" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL,
  "provider" external_rating_provider_enum NOT NULL,

  -- External identity
  "external_user_id" varchar(100) NOT NULL,
  "external_username" varchar(150),
  "external_profile_url" text,

  -- OAuth tokens (encrypted at rest via Supabase Vault)
  "access_token" text,
  "refresh_token" text,
  "token_expires_at" timestamptz,

  -- Sync status
  "last_synced_at" timestamptz,
  "next_sync_after" timestamptz,
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
-- CREATE INDEXES
-- ============================================================================

-- Player home location indexes (on player table)
CREATE INDEX IF NOT EXISTS "idx_player_home_location_geo" ON "player" USING GIST ("home_location");
CREATE INDEX IF NOT EXISTS "idx_player_home_location_disclosed" ON "player" ("home_location_disclosed") WHERE "home_location_disclosed" = true;

-- Player rating score history indexes
CREATE INDEX IF NOT EXISTS "idx_player_rating_score_history_player_rating" ON "player_rating_score_history" ("player_rating_score_id");
CREATE INDEX IF NOT EXISTS "idx_player_rating_score_history_player" ON "player_rating_score_history" ("player_id");
CREATE INDEX IF NOT EXISTS "idx_player_rating_score_history_recorded" ON "player_rating_score_history" ("player_id", "recorded_at");

-- Player block indexes
CREATE INDEX IF NOT EXISTS "idx_player_block_blocker" ON "player_block" ("blocker_id");
CREATE INDEX IF NOT EXISTS "idx_player_block_blocked" ON "player_block" ("blocked_id");

-- Player favorite indexes
CREATE INDEX IF NOT EXISTS "idx_player_favorite_player" ON "player_favorite" ("player_id");
CREATE INDEX IF NOT EXISTS "idx_player_favorite_favorite" ON "player_favorite" ("favorite_id");

-- Player group indexes
CREATE INDEX IF NOT EXISTS "idx_player_group_created_by" ON "player_group" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_player_group_sport" ON "player_group" ("sport_id");

-- Group member indexes
CREATE INDEX IF NOT EXISTS "idx_group_member_group" ON "group_member" ("group_id");
CREATE INDEX IF NOT EXISTS "idx_group_member_player" ON "group_member" ("player_id");

-- Community indexes
CREATE INDEX IF NOT EXISTS "idx_community_created_by" ON "community" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_community_sport" ON "community" ("sport_id");
CREATE INDEX IF NOT EXISTS "idx_community_public" ON "community" ("is_public");

-- Community member indexes
CREATE INDEX IF NOT EXISTS "idx_community_member_community" ON "community_member" ("community_id");
CREATE INDEX IF NOT EXISTS "idx_community_member_player" ON "community_member" ("player_id");
CREATE INDEX IF NOT EXISTS "idx_community_member_status" ON "community_member" ("status");

-- Private contact list indexes
CREATE INDEX IF NOT EXISTS "idx_private_contact_list_player" ON "private_contact_list" ("player_id");
CREATE INDEX IF NOT EXISTS "idx_private_contact_list" ON "private_contact" ("list_id");

-- External rating account indexes (OPTIONAL)
CREATE INDEX IF NOT EXISTS "idx_external_rating_account_player" ON "external_rating_account" ("player_id");
CREATE INDEX IF NOT EXISTS "idx_external_rating_account_provider" ON "external_rating_account" ("provider");
CREATE INDEX IF NOT EXISTS "idx_external_rating_account_sync_status" ON "external_rating_account" ("sync_status")
  WHERE "is_active" = true;
CREATE INDEX IF NOT EXISTS "idx_external_rating_account_next_sync" ON "external_rating_account" ("next_sync_after")
  WHERE "is_active" = true AND "sync_status" != 'expired';

-- ============================================================================
-- CREATE FOREIGN KEYS
-- ============================================================================

-- Player rating score history foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'player_rating_score_history_player_rating_score_id_fkey'
  ) THEN
    ALTER TABLE "player_rating_score_history" ADD CONSTRAINT "player_rating_score_history_player_rating_score_id_fkey" 
      FOREIGN KEY ("player_rating_score_id") REFERENCES "player_rating_score" ("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'player_rating_score_history_player_id_fkey'
  ) THEN
    ALTER TABLE "player_rating_score_history" ADD CONSTRAINT "player_rating_score_history_player_id_fkey" 
      FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'player_rating_score_history_rating_score_id_fkey'
  ) THEN
    ALTER TABLE "player_rating_score_history" ADD CONSTRAINT "player_rating_score_history_rating_score_id_fkey" 
      FOREIGN KEY ("rating_score_id") REFERENCES "rating_score" ("id") ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'player_rating_score_history_previous_rating_score_id_fkey'
  ) THEN
    ALTER TABLE "player_rating_score_history" ADD CONSTRAINT "player_rating_score_history_previous_rating_score_id_fkey" 
      FOREIGN KEY ("previous_rating_score_id") REFERENCES "rating_score" ("id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'player_rating_score_history_changed_by_fkey'
  ) THEN
    ALTER TABLE "player_rating_score_history" ADD CONSTRAINT "player_rating_score_history_changed_by_fkey" 
      FOREIGN KEY ("changed_by") REFERENCES "profile" ("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Player block foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'player_block_blocker_id_fkey'
  ) THEN
    ALTER TABLE "player_block" ADD CONSTRAINT "player_block_blocker_id_fkey" 
      FOREIGN KEY ("blocker_id") REFERENCES "player" ("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'player_block_blocked_id_fkey'
  ) THEN
    ALTER TABLE "player_block" ADD CONSTRAINT "player_block_blocked_id_fkey" 
      FOREIGN KEY ("blocked_id") REFERENCES "player" ("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Player favorite foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'player_favorite_player_id_fkey'
  ) THEN
    ALTER TABLE "player_favorite" ADD CONSTRAINT "player_favorite_player_id_fkey" 
      FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'player_favorite_favorite_id_fkey'
  ) THEN
    ALTER TABLE "player_favorite" ADD CONSTRAINT "player_favorite_favorite_id_fkey" 
      FOREIGN KEY ("favorite_id") REFERENCES "player" ("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Player group foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'player_group_created_by_fkey'
  ) THEN
    ALTER TABLE "player_group" ADD CONSTRAINT "player_group_created_by_fkey" 
      FOREIGN KEY ("created_by") REFERENCES "player" ("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'player_group_sport_id_fkey'
  ) THEN
    ALTER TABLE "player_group" ADD CONSTRAINT "player_group_sport_id_fkey" 
      FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Group member foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'group_member_group_id_fkey'
  ) THEN
    ALTER TABLE "group_member" ADD CONSTRAINT "group_member_group_id_fkey" 
      FOREIGN KEY ("group_id") REFERENCES "player_group" ("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'group_member_player_id_fkey'
  ) THEN
    ALTER TABLE "group_member" ADD CONSTRAINT "group_member_player_id_fkey" 
      FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'group_member_added_by_fkey'
  ) THEN
    ALTER TABLE "group_member" ADD CONSTRAINT "group_member_added_by_fkey" 
      FOREIGN KEY ("added_by") REFERENCES "player" ("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Community foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'community_created_by_fkey'
  ) THEN
    ALTER TABLE "community" ADD CONSTRAINT "community_created_by_fkey" 
      FOREIGN KEY ("created_by") REFERENCES "player" ("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'community_sport_id_fkey'
  ) THEN
    ALTER TABLE "community" ADD CONSTRAINT "community_sport_id_fkey" 
      FOREIGN KEY ("sport_id") REFERENCES "sport" ("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Community member foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'community_member_community_id_fkey'
  ) THEN
    ALTER TABLE "community_member" ADD CONSTRAINT "community_member_community_id_fkey" 
      FOREIGN KEY ("community_id") REFERENCES "community" ("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'community_member_player_id_fkey'
  ) THEN
    ALTER TABLE "community_member" ADD CONSTRAINT "community_member_player_id_fkey" 
      FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'community_member_approved_by_fkey'
  ) THEN
    ALTER TABLE "community_member" ADD CONSTRAINT "community_member_approved_by_fkey" 
      FOREIGN KEY ("approved_by") REFERENCES "player" ("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Private contact list foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'private_contact_list_player_id_fkey'
  ) THEN
    ALTER TABLE "private_contact_list" ADD CONSTRAINT "private_contact_list_player_id_fkey" 
      FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Private contact foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'private_contact_list_id_fkey'
  ) THEN
    ALTER TABLE "private_contact" ADD CONSTRAINT "private_contact_list_id_fkey" 
      FOREIGN KEY ("list_id") REFERENCES "private_contact_list" ("id") ON DELETE CASCADE;
  END IF;
END $$;

-- External rating account foreign keys (OPTIONAL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'external_rating_account_player_id_fkey'
  ) THEN
    ALTER TABLE "external_rating_account" ADD CONSTRAINT "external_rating_account_player_id_fkey" 
      FOREIGN KEY ("player_id") REFERENCES "player" ("id") ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- CREATE TRIGGERS AND FUNCTIONS
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
DROP TRIGGER IF EXISTS trigger_record_player_rating_score_history ON player_rating_score;
CREATE TRIGGER trigger_record_player_rating_score_history
  AFTER INSERT OR UPDATE OF rating_score_id, is_certified, certified_via, referrals_count, evaluations_count, source
  ON player_rating_score
  FOR EACH ROW
  EXECUTE FUNCTION record_player_rating_score_history();

-- Function to update player_rating_scores when external rating is synced (OPTIONAL)
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

-- Trigger to auto-sync ratings when external account is updated (OPTIONAL)
DROP TRIGGER IF EXISTS trigger_sync_external_rating ON external_rating_account;
CREATE TRIGGER trigger_sync_external_rating
  AFTER UPDATE OF sync_status, last_api_response ON external_rating_account
  FOR EACH ROW
  WHEN (NEW.sync_status = 'synced')
  EXECUTE FUNCTION sync_external_rating_to_player();

-- ============================================================================
-- ADD TABLE COMMENTS
-- ============================================================================

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
COMMENT ON TABLE "external_rating_account" IS 'Links players to external rating providers (USTA, DUPR, UTR) for verified rating imports. OPTIONAL: Requires API access from providers.';
COMMENT ON COLUMN "external_rating_account"."external_user_id" IS 'Unique identifier on the external platform (UAID for USTA, user ID for DUPR/UTR)';
COMMENT ON COLUMN "external_rating_account"."last_api_response" IS 'Raw JSON response from last successful API call for auditing and data integrity';
COMMENT ON COLUMN "external_rating_account"."next_sync_after" IS 'Rate limiting / scheduling - do not sync before this timestamp';
COMMENT ON FUNCTION sync_external_rating_to_player() IS 'Automatically syncs external ratings to player_rating_score when an external account sync completes successfully';

-- ============================================================================
-- ENUM MIGRATIONS (Manual steps required)
-- ============================================================================
--
-- The following enum changes require manual migration as PostgreSQL doesn't
-- allow direct modification of enum values. These should be done carefully:
--
-- 1. gender_enum: Update values from ('M', 'F', 'O') to ('male', 'female', 'other')
--    Steps:
--    a. Create new enum: CREATE TYPE gender_enum_new AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
--    b. Alter columns: ALTER TABLE player ALTER COLUMN gender TYPE gender_enum_new USING ...
--    c. Drop old enum and rename new one
--
-- 2. facility_type_enum: Add values ('park', 'indoor_center', 'private', 'other')
--    Steps:
--    a. ALTER TYPE facility_type_enum ADD VALUE 'park';
--    b. ALTER TYPE facility_type_enum ADD VALUE 'indoor_center';
--    c. ALTER TYPE facility_type_enum ADD VALUE 'private';
--    d. ALTER TYPE facility_type_enum ADD VALUE 'other';
--
-- 3. availability_enum -> court_status_enum: Rename and update values
--    Steps:
--    a. Create new enum: CREATE TYPE court_status_enum AS ENUM ('available', 'unavailable', 'maintenance', 'reserved', 'under_maintenance', 'closed');
--    b. Alter column: ALTER TABLE court ALTER COLUMN availability_status TYPE court_status_enum USING ...
--    c. Drop old availability_enum
--
-- NOTE: These migrations should be tested in a development environment first.

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

