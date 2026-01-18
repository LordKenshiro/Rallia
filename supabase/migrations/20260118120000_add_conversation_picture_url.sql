-- Add picture_url column to conversation table for group chat images
-- This allows group chats (not linked to networks) to have their own profile picture

ALTER TABLE "public"."conversation" 
ADD COLUMN IF NOT EXISTS "picture_url" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "public"."conversation"."picture_url" IS 'Profile picture URL for group conversations not linked to a network';
