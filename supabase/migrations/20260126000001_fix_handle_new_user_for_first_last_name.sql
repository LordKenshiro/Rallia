-- Migration: Fix handle_new_user function for first_name/last_name columns
-- Created: 2026-01-26
-- Description: Updates handle_new_user function to use first_name and last_name instead of full_name
--              The profile table was updated in 20260112000000 to split full_name into first_name/last_name

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
  
  -- If user came from OAuth (Google or Microsoft), try to populate fields
  IF provider IN ('google', 'azure', 'microsoft') THEN
    IF new.raw_user_meta_data IS NOT NULL THEN
      full_name_raw := new.raw_user_meta_data->>'full_name';
      display_name := COALESCE(
        new.raw_user_meta_data->>'preferred_username',
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'email'
      );
      avatar_url := new.raw_user_meta_data->>'avatar_url';
      
      -- Try to get first_name and last_name from metadata if available
      first_name_val := new.raw_user_meta_data->>'given_name';
      last_name_val := new.raw_user_meta_data->>'family_name';
    END IF;
  END IF;
  
  -- For email OTP, use email as display_name if available
  IF display_name IS NULL AND new.email IS NOT NULL THEN
    display_name := new.email;
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
  
  -- Ensure first_name is not NULL (required by table schema)
  -- Use display_name, email prefix, or 'User' as fallback
  IF first_name_val IS NULL OR first_name_val = '' THEN
    first_name_val := COALESCE(
      NULLIF(display_name, ''),
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
    -- Log the error (you can check Supabase logs)
    RAISE WARNING 'Error in handle_new_user: % - SQLSTATE: %', SQLERRM, SQLSTATE;
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
  
  IF func_source LIKE '%first_name%' AND func_source LIKE '%last_name%' THEN
    RAISE NOTICE 'Function successfully updated to use first_name and last_name columns';
  ELSE
    RAISE WARNING 'Function may still reference old column names. Please verify.';
  END IF;
END $$;
