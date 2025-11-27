-- Make organization email nullable
ALTER TABLE "public"."organizations" ALTER COLUMN "email" DROP NOT NULL;

