


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."admin_role_enum" AS ENUM (
    'super_admin',
    'moderator',
    'support'
);


ALTER TYPE "public"."admin_role_enum" OWNER TO "postgres";


CREATE TYPE "public"."app_role_enum" AS ENUM (
    'player',
    'organization_member',
    'admin'
);


ALTER TYPE "public"."app_role_enum" OWNER TO "postgres";


CREATE TYPE "public"."availability_enum" AS ENUM (
    'available',
    'unavailable',
    'maintenance',
    'reserved'
);


ALTER TYPE "public"."availability_enum" OWNER TO "postgres";


CREATE TYPE "public"."country_enum" AS ENUM (
    'Canada',
    'United States'
);


ALTER TYPE "public"."country_enum" OWNER TO "postgres";


CREATE TYPE "public"."delivery_channel_enum" AS ENUM (
    'email',
    'sms',
    'push'
);


ALTER TYPE "public"."delivery_channel_enum" OWNER TO "postgres";


CREATE TYPE "public"."delivery_status_enum" AS ENUM (
    'pending',
    'success',
    'failed'
);


ALTER TYPE "public"."delivery_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."facility_contact_type_enum" AS ENUM (
    'general',
    'reservation',
    'maintenance',
    'other'
);


ALTER TYPE "public"."facility_contact_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."facility_type_enum" AS ENUM (
    'park',
    'club',
    'indoor_center',
    'private',
    'other'
);


ALTER TYPE "public"."facility_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."invite_source_enum" AS ENUM (
    'manual',
    'auto_match',
    'invite_list',
    'mailing_list',
    'growth_prompt'
);


ALTER TYPE "public"."invite_source_enum" OWNER TO "postgres";


CREATE TYPE "public"."invite_status_enum" AS ENUM (
    'pending',
    'sent',
    'accepted',
    'expired',
    'bounced',
    'cancelled'
);


ALTER TYPE "public"."invite_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."notification_type_enum" AS ENUM (
    'match_invitation',
    'reminder',
    'payment',
    'support',
    'chat',
    'system'
);


ALTER TYPE "public"."notification_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."organization_nature_enum" AS ENUM (
    'public',
    'private'
);


ALTER TYPE "public"."organization_nature_enum" OWNER TO "postgres";


CREATE TYPE "public"."organization_type_enum" AS ENUM (
    'club',
    'municipality',
    'city',
    'association'
);


ALTER TYPE "public"."organization_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."role_enum" AS ENUM (
    'admin',
    'staff',
    'player',
    'coach',
    'owner'
);


ALTER TYPE "public"."role_enum" OWNER TO "postgres";


CREATE TYPE "public"."surface_type_enum" AS ENUM (
    'hard',
    'clay',
    'grass',
    'synthetic',
    'carpet',
    'concrete',
    'asphalt'
);


ALTER TYPE "public"."surface_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  provider text;
  full_name text;
  display_name text;
  avatar_url text;
BEGIN
  -- Determine provider (could be null for email/password)
  provider := COALESCE(new.raw_app_meta_data->>'provider', 'email');
  
  -- Default values
  full_name := NULL;
  display_name := NULL;
  avatar_url := NULL;
  
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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" NOT NULL,
    "role" "public"."admin_role_enum" NOT NULL,
    "permissions" "jsonb",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."court_sports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "court_id" "uuid" NOT NULL,
    "sport_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."court_sports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "surface_type" "public"."surface_type_enum",
    "lighting" boolean DEFAULT false NOT NULL,
    "indoor" boolean DEFAULT false NOT NULL,
    "name" character varying(100),
    "court_number" integer,
    "lines_marked_for_multiple_sports" boolean DEFAULT false NOT NULL,
    "availability_status" "public"."availability_enum" DEFAULT 'available'::"public"."availability_enum" NOT NULL,
    "attributes" "jsonb",
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."courts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_id" "uuid",
    "invitation_id" "uuid",
    "attempt_number" integer NOT NULL,
    "channel" "public"."delivery_channel_enum" NOT NULL,
    "status" "public"."delivery_status_enum" NOT NULL,
    "error_message" "text",
    "provider_response" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."delivery_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "facility_type" "public"."facility_type_enum",
    "slug" character varying(255) NOT NULL,
    "description" "text",
    "address" character varying(255),
    "city" character varying(100),
    "postal_code" character varying(20),
    "latitude" numeric(9,6),
    "longitude" numeric(9,6),
    "attributes" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archived_at" timestamp with time zone,
    "location" "extensions"."geography"(Point,4326),
    "country" "public"."country_enum"
);


ALTER TABLE "public"."facilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facility_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "phone" character varying(30),
    "email" character varying(255),
    "website" character varying(255),
    "is_primary" boolean DEFAULT false NOT NULL,
    "contact_type" "public"."facility_contact_type_enum" NOT NULL,
    "notes" "text",
    "attributes" "jsonb",
    "sport_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."facility_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facility_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "storage_key" character varying(255) NOT NULL,
    "url" "text" NOT NULL,
    "thumbnail_url" "text",
    "description" "text",
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "file_size" bigint,
    "mime_type" character varying(100),
    "metadata" "jsonb",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."facility_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facility_sports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "sport_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."facility_sports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255),
    "phone" character varying(30),
    "token" character varying(255) NOT NULL,
    "source" "public"."invite_source_enum" DEFAULT 'manual'::"public"."invite_source_enum" NOT NULL,
    "inviter_id" "uuid" NOT NULL,
    "invited_user_id" "uuid",
    "role" "public"."app_role_enum" DEFAULT 'player'::"public"."app_role_enum" NOT NULL,
    "admin_role" "public"."admin_role_enum",
    "status" "public"."invite_status_enum" DEFAULT 'pending'::"public"."invite_status_enum" NOT NULL,
    "expires_at" timestamp without time zone NOT NULL,
    "accepted_at" timestamp without time zone,
    "revoked_at" timestamp without time zone,
    "revoked_by" "uuid",
    "revoke_reason" "text",
    "metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "public"."notification_type_enum" NOT NULL,
    "target_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "body" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "read_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "role" "public"."role_enum" NOT NULL,
    "permissions" "jsonb",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "left_at" timestamp with time zone,
    "invited_by" "uuid"
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid",
    "name" character varying(255) NOT NULL,
    "nature" "public"."organization_nature_enum" NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(20),
    "slug" character varying(255) NOT NULL,
    "address" character varying(255),
    "city" character varying(100),
    "postal_code" character varying(20),
    "type" "public"."organization_type_enum",
    "description" "text",
    "website" character varying(255),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "country" "public"."country_enum"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" character varying(255),
    "display_name" character varying(100),
    "avatar_url" character varying(255),
    "birth_date" "date",
    "locale" character varying(10) DEFAULT 'en-CA'::character varying NOT NULL,
    "timezone" character varying(50) DEFAULT 'America/Toronto'::character varying NOT NULL,
    "two_factor_enabled" boolean DEFAULT false NOT NULL,
    "last_active_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "slug" character varying(100) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "attributes" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."waitlist_signups" (
    "id" bigint NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "ip_address" "text",
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."waitlist_signups" OWNER TO "postgres";


ALTER TABLE "public"."waitlist_signups" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."waitlist_signups_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."court_sports"
    ADD CONSTRAINT "court_sports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courts"
    ADD CONSTRAINT "courts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_attempts"
    ADD CONSTRAINT "delivery_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."facility_contacts"
    ADD CONSTRAINT "facility_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facility_images"
    ADD CONSTRAINT "facility_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facility_images"
    ADD CONSTRAINT "facility_images_storage_key_key" UNIQUE ("storage_key");



ALTER TABLE ONLY "public"."facility_sports"
    ADD CONSTRAINT "facility_sports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."waitlist_signups"
    ADD CONSTRAINT "waitlist_signups_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "idx_court_sports_unique" ON "public"."court_sports" USING "btree" ("court_id", "sport_id");



CREATE INDEX "idx_courts_availability" ON "public"."courts" USING "btree" ("availability_status");



CREATE INDEX "idx_courts_facility" ON "public"."courts" USING "btree" ("facility_id");



CREATE INDEX "idx_delivery_attempt_notification_id" ON "public"."delivery_attempts" USING "btree" ("notification_id");



CREATE INDEX "idx_facilities_active" ON "public"."facilities" USING "btree" ("is_active");



CREATE INDEX "idx_facilities_created_at" ON "public"."facilities" USING "btree" ("created_at");



CREATE INDEX "idx_facilities_org" ON "public"."facilities" USING "btree" ("organization_id");



CREATE INDEX "idx_facilities_slug" ON "public"."facilities" USING "btree" ("slug");



CREATE INDEX "idx_facility_contacts_facility" ON "public"."facility_contacts" USING "btree" ("facility_id");



CREATE INDEX "idx_facility_contacts_primary" ON "public"."facility_contacts" USING "btree" ("is_primary");



CREATE INDEX "idx_facility_images_facility" ON "public"."facility_images" USING "btree" ("facility_id");



CREATE INDEX "idx_facility_images_order" ON "public"."facility_images" USING "btree" ("facility_id", "display_order");



CREATE INDEX "idx_facility_sports_facility" ON "public"."facility_sports" USING "btree" ("facility_id");



CREATE INDEX "idx_facility_sports_sport" ON "public"."facility_sports" USING "btree" ("sport_id");



CREATE INDEX "idx_notifications_expires_at" ON "public"."notifications" USING "btree" ("expires_at");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user_id", "read_at");



CREATE INDEX "idx_organizations_name" ON "public"."organizations" USING "btree" ("name");



CREATE INDEX "idx_sports_is_active" ON "public"."sports" USING "btree" ("is_active");



CREATE INDEX "idx_sports_name" ON "public"."sports" USING "btree" ("name");



CREATE INDEX "invitations_email_idx" ON "public"."invitations" USING "btree" ("email");



CREATE INDEX "invitations_email_status_idx" ON "public"."invitations" USING "btree" ("email", "status");



CREATE INDEX "invitations_expires_at_idx" ON "public"."invitations" USING "btree" ("expires_at");



CREATE INDEX "invitations_inviter_id_idx" ON "public"."invitations" USING "btree" ("inviter_id");



CREATE INDEX "invitations_status_expires_at_idx" ON "public"."invitations" USING "btree" ("status", "expires_at");



CREATE INDEX "invitations_status_idx" ON "public"."invitations" USING "btree" ("status");



CREATE UNIQUE INDEX "invitations_token_idx" ON "public"."invitations" USING "btree" ("token");



CREATE UNIQUE INDEX "organization_members_user_id_organization_id_idx" ON "public"."organization_members" USING "btree" ("user_id", "organization_id");



CREATE UNIQUE INDEX "uq_courts_facility_court_number" ON "public"."courts" USING "btree" ("facility_id", "court_number");



CREATE UNIQUE INDEX "uq_delivery_attempt_sequence" ON "public"."delivery_attempts" USING "btree" ("notification_id", "attempt_number");



CREATE UNIQUE INDEX "uq_facility_images_storage_key" ON "public"."facility_images" USING "btree" ("storage_key");



CREATE UNIQUE INDEX "uq_facility_sports_facility_sport" ON "public"."facility_sports" USING "btree" ("facility_id", "sport_id");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."court_sports"
    ADD CONSTRAINT "court_sports_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id");



ALTER TABLE ONLY "public"."court_sports"
    ADD CONSTRAINT "court_sports_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id");



ALTER TABLE ONLY "public"."courts"
    ADD CONSTRAINT "courts_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id");



ALTER TABLE ONLY "public"."delivery_attempts"
    ADD CONSTRAINT "delivery_attempts_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id");



ALTER TABLE ONLY "public"."delivery_attempts"
    ADD CONSTRAINT "delivery_attempts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id");



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."facility_contacts"
    ADD CONSTRAINT "facility_contacts_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id");



ALTER TABLE ONLY "public"."facility_contacts"
    ADD CONSTRAINT "facility_contacts_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id");



ALTER TABLE ONLY "public"."facility_images"
    ADD CONSTRAINT "facility_images_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id");



ALTER TABLE ONLY "public"."facility_sports"
    ADD CONSTRAINT "facility_sports_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id");



ALTER TABLE ONLY "public"."facility_sports"
    ADD CONSTRAINT "facility_sports_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id");



CREATE POLICY "anonymous can insert waitlist" ON "public"."waitlist_signups" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "public can read waitlist" ON "public"."waitlist_signups" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."waitlist_signups" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


















































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

















































































GRANT ALL ON TABLE "public"."admins" TO "anon";
GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON TABLE "public"."court_sports" TO "anon";
GRANT ALL ON TABLE "public"."court_sports" TO "authenticated";
GRANT ALL ON TABLE "public"."court_sports" TO "service_role";



GRANT ALL ON TABLE "public"."courts" TO "anon";
GRANT ALL ON TABLE "public"."courts" TO "authenticated";
GRANT ALL ON TABLE "public"."courts" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_attempts" TO "anon";
GRANT ALL ON TABLE "public"."delivery_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."facilities" TO "anon";
GRANT ALL ON TABLE "public"."facilities" TO "authenticated";
GRANT ALL ON TABLE "public"."facilities" TO "service_role";



GRANT ALL ON TABLE "public"."facility_contacts" TO "anon";
GRANT ALL ON TABLE "public"."facility_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."facility_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."facility_images" TO "anon";
GRANT ALL ON TABLE "public"."facility_images" TO "authenticated";
GRANT ALL ON TABLE "public"."facility_images" TO "service_role";



GRANT ALL ON TABLE "public"."facility_sports" TO "anon";
GRANT ALL ON TABLE "public"."facility_sports" TO "authenticated";
GRANT ALL ON TABLE "public"."facility_sports" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."sports" TO "anon";
GRANT ALL ON TABLE "public"."sports" TO "authenticated";
GRANT ALL ON TABLE "public"."sports" TO "service_role";



GRANT ALL ON TABLE "public"."waitlist_signups" TO "anon";
GRANT ALL ON TABLE "public"."waitlist_signups" TO "authenticated";
GRANT ALL ON TABLE "public"."waitlist_signups" TO "service_role";



GRANT ALL ON SEQUENCE "public"."waitlist_signups_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."waitlist_signups_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."waitlist_signups_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Authenticated users can retrieve facility images 6mc4pu_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'facility-images'::text));



  create policy "Authenticated users can upload facility images 6mc4pu_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'facility-images'::text));



