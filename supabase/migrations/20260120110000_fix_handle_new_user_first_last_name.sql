-- Migration: Update handle_new_user to use first_name/last_name instead of full_name
-- Date: 2026-01-20
-- Description: The full_name column was split into first_name/last_name in migration
--              20260112100000, but the handle_new_user trigger function wasn't updated.
--              This fixes the trigger to use the new column structure.

-- Drop and recreate the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email text;
  user_first_name text;
  user_last_name text;
  user_display_name text;
  user_avatar_url text;
  is_social_auth boolean;
BEGIN
  -- Extract email
  user_email := new.email;

  -- Detect if this is a social auth signup (has provider data with identity info)
  is_social_auth := (
    new.raw_user_meta_data ? 'provider_id' OR 
    new.raw_user_meta_data ? 'iss' OR
    new.raw_user_meta_data ? 'sub'
  );

  -- Initialize values as NULL (will be populated for social auth, stay NULL for email OTP)
  user_first_name := NULL;
  user_last_name := NULL;
  user_display_name := NULL;
  user_avatar_url := NULL;

  -- Only extract profile data for social auth signups
  IF is_social_auth THEN
    -- Extract full_name from metadata and split into first/last
    DECLARE
      full_name_raw text;
    BEGIN
      full_name_raw := COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name'
      );
      
      IF full_name_raw IS NOT NULL THEN
        -- Split on first space
        IF position(' ' IN full_name_raw) > 0 THEN
          user_first_name := split_part(full_name_raw, ' ', 1);
          user_last_name := substring(full_name_raw FROM position(' ' IN full_name_raw) + 1);
        ELSE
          user_first_name := full_name_raw;
          user_last_name := NULL;
        END IF;
      END IF;
    END;

    -- Use display_name from metadata, fall back to email prefix
    user_display_name := COALESCE(
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'nickname'
    );

    -- Extract avatar URL
    user_avatar_url := COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    );
  END IF;

  -- For email OTP signups, first_name will be NULL initially.
  -- The profile will have NULL for first_name and display_name, which the user can fill in later.

  -- Upsert into profile table
  INSERT INTO public.profile (
    id,
    email,
    first_name,
    last_name,
    display_name,
    profile_picture_url,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    user_email,
    user_first_name,
    user_last_name,
    user_display_name,
    user_avatar_url,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NULLIF(EXCLUDED.email, ''), profile.email),
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profile.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), profile.last_name),
    display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), profile.display_name),
    profile_picture_url = COALESCE(EXCLUDED.profile_picture_url, profile.profile_picture_url),
    updated_at = NOW();

  -- Also ensure a player record exists (upsert with defaults)
  INSERT INTO public.player (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Handles new user signup by creating profile and player records. For social auth: extracts first_name, last_name (from full_name), display_name, and avatar from OAuth metadata. For email OTP: only populates email field, leaves names as NULL for user to fill in during onboarding.';

-- Also need to update the profile table to allow NULL first_name for email OTP signups
-- The user will fill this in during onboarding
ALTER TABLE profile ALTER COLUMN first_name DROP NOT NULL;
