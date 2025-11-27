-- Add community_club to facility_type_enum
ALTER TYPE "public"."facility_type_enum" ADD VALUE 'community_club';

-- Add membership_required column to facilities table
ALTER TABLE "public"."facilities" ADD COLUMN "membership_required" boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN "public"."facilities"."membership_required" IS 'Indicates whether membership is required to use this facility';

