-- Migration: Fix social auth profile creation
-- Created: 2026-02-13
-- Description: 
--   1. All OAuth: display_name (username) should NOT be pre-filled, should be NULL
--   2. Apple OAuth: Apple's JWT does NOT contain the user's name, so the trigger
--      cannot extract it from raw_user_meta_data. Name fields are populated
--      client-side after sign-in using the credential data Apple provides.
--      The trigger should NOT fall back to email prefix for Apple.
--   3. Google/Microsoft OAuth: extract first_name, last_name from JWT metadata as before

-- ============================================================================
-- UPDATE handle_new_user FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  provider text;
  full_name_raw text;
  first_name_val text;
  last_name_val text;
  display_name text;
  avatar_url text;
  user_email text;
BEGIN
  -- Determine provider (could be null for email/password)
  provider := COALESCE(new.raw_app_meta_data->>'provider', 'email');
  
  -- Default values
  full_name_raw := NULL;
  first_name_val := NULL;
  last_name_val := NULL;
  display_name := NULL;
  avatar_url := NULL;
  user_email := new.email;
  
  -- For Google/Microsoft OAuth: extract name fields from JWT metadata.
  -- Note: Apple is NOT included here because Apple's JWT token does NOT contain
  -- the user's name. For Apple, name fields are populated client-side after
  -- sign-in using the credential object from the native SDK.
  IF provider IN ('google', 'azure', 'microsoft') THEN
    IF new.raw_user_meta_data IS NOT NULL THEN
      full_name_raw := new.raw_user_meta_data->>'full_name';
      -- display_name (username) is NOT pre-filled — users set it during onboarding
      avatar_url := new.raw_user_meta_data->>'avatar_url';
      
      -- Try to get first_name and last_name from metadata
      first_name_val := new.raw_user_meta_data->>'given_name';
      last_name_val := new.raw_user_meta_data->>'family_name';
    END IF;
  END IF;
  
  -- If first_name not available from metadata, try to split full_name
  IF first_name_val IS NULL AND full_name_raw IS NOT NULL THEN
    IF position(' ' IN full_name_raw) > 0 THEN
      first_name_val := split_part(full_name_raw, ' ', 1);
      last_name_val := COALESCE(last_name_val, substring(full_name_raw FROM position(' ' IN full_name_raw) + 1));
    ELSE
      first_name_val := full_name_raw;
    END IF;
  END IF;
  
  -- For Google/Microsoft only: if we still don't have a first_name, use email prefix as last resort.
  -- For Apple and email signups: leave first_name NULL (Apple: set client-side; email: set during onboarding).
  IF provider IN ('google', 'azure', 'microsoft') AND (first_name_val IS NULL OR first_name_val = '') THEN
    first_name_val := COALESCE(
      NULLIF(split_part(new.email, '@', 1), ''),
      'User'
    );
  END IF;
  
  -- Insert into profile table
  -- Use ON CONFLICT to handle case where profile might already exist
  INSERT INTO public.profile (
    id,
    email,
    first_name,
    last_name,
    display_name,
    profile_picture_url,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    user_email,
    first_name_val,
    last_name_val,
    display_name,
    avatar_url,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profile.email),
    updated_at = now();
  
  RETURN new;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error in handle_new_user: % - SQLSTATE: %', SQLERRM, SQLSTATE;
    RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Handles new user signup by creating profile. Google/Microsoft OAuth: extracts first_name, last_name, and avatar from JWT metadata. Apple OAuth: only populates email (name data is not in the JWT; the client updates the profile directly after sign-in). Email OTP: only populates email. display_name (username) is always NULL — users set it during onboarding.';
