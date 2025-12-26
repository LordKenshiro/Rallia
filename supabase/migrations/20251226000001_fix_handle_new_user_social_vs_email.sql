-- Migration: Fix handle_new_user to differentiate between social auth and email OTP signups
-- Created: 2024-12-26
-- Description: 
--   - For social auth (Google, Facebook, Apple, Microsoft, etc.): Extract and use full_name,
--     display_name, and avatar_url from the OAuth provider metadata
--   - For email OTP signup: Only populate email field, leave full_name and display_name as NULL
--     since there's no external information available

-- ============================================================================
-- UPDATE handle_new_user FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  provider text;
  user_full_name text;
  user_display_name text;
  user_avatar_url text;
  user_email text;
  is_social_auth boolean;
BEGIN
  -- Determine provider (defaults to 'email' for email/password or OTP)
  provider := COALESCE(new.raw_app_meta_data->>'provider', 'email');
  
  -- Check if this is a social auth provider
  -- Supabase social auth providers: google, facebook, apple, azure, twitter, github, gitlab, linkedin, etc.
  is_social_auth := provider IN (
    'google', 
    'facebook', 
    'apple', 
    'azure', 
    'microsoft',
    'twitter',
    'github',
    'gitlab',
    'linkedin',
    'linkedin_oidc',
    'discord',
    'slack',
    'spotify',
    'twitch',
    'bitbucket',
    'notion',
    'zoom'
  );
  
  -- Default values - all NULL for email OTP signups
  user_full_name := NULL;
  user_display_name := NULL;
  user_avatar_url := NULL;
  user_email := new.email;
  
  -- Only extract OAuth metadata for social auth providers
  IF is_social_auth AND new.raw_user_meta_data IS NOT NULL THEN
    -- Extract full name from various possible fields
    user_full_name := COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    );
    
    -- Extract display name / username from various possible fields
    user_display_name := COALESCE(
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'nickname',
      new.raw_user_meta_data->>'name'
    );
    
    -- Extract avatar URL from various possible fields
    user_avatar_url := COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    );
  END IF;
  
  -- NOTE: For email OTP signups, we intentionally do NOT set display_name to email.
  -- The profile will have NULL for full_name and display_name, which the user can fill in later.
  -- Only email is populated since that's the verified identifier.
  
  -- Insert into profile table
  -- Use ON CONFLICT to handle case where profile might already exist
  INSERT INTO public.profile (
    id,
    email,
    full_name,
    display_name,
    profile_picture_url,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    user_email,
    user_full_name,      -- NULL for email OTP, extracted value for social auth
    user_display_name,   -- NULL for email OTP, extracted value for social auth
    user_avatar_url,     -- NULL for email OTP, extracted value for social auth
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profile.email),
    -- For social auth, update profile info if user signs in with social after email
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profile.full_name),
    display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), profile.display_name),
    profile_picture_url = COALESCE(NULLIF(EXCLUDED.profile_picture_url, ''), profile.profile_picture_url),
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

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify function was updated correctly
DO $$
DECLARE
  func_source text;
BEGIN
  SELECT prosrc INTO func_source
  FROM pg_proc
  WHERE proname = 'handle_new_user';
  
  IF func_source LIKE '%is_social_auth%' THEN
    RAISE NOTICE 'Function successfully updated with social auth differentiation';
  ELSE
    RAISE WARNING 'Function may not have been updated correctly. Please verify.';
  END IF;
  
  IF func_source NOT LIKE '%full_name := COALESCE(display_name%' THEN
    RAISE NOTICE 'Confirmed: full_name fallback to email has been removed';
  ELSE
    RAISE WARNING 'Warning: Old full_name fallback logic may still exist';
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION handle_new_user() IS 
'Trigger function that creates a profile when a new user signs up.
For social auth (Google, Facebook, Apple, etc.): Extracts full_name, display_name, and avatar from OAuth metadata.
For email OTP signup: Only populates email field, leaves full_name and display_name as NULL for user to fill in later.';

