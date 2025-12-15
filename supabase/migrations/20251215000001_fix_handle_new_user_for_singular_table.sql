-- Migration: Fix handle_new_user function for singular table name
-- Created: 2024-12-15
-- Description: Updates handle_new_user function to use 'profile' (singular) instead of 'profiles' (plural)
--              and updates column names to match the consolidated schema

-- ============================================================================
-- UPDATE handle_new_user FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  provider text;
  full_name text;
  display_name text;
  avatar_url text;
  user_email text;
BEGIN
  -- Determine provider (could be null for email/password)
  provider := COALESCE(new.raw_app_meta_data->>'provider', 'email');
  
  -- Default values
  full_name := NULL;
  display_name := NULL;
  avatar_url := NULL;
  user_email := new.email;
  
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
  
  -- Ensure full_name is not NULL (required by table schema)
  -- Use display_name or email as fallback
  IF full_name IS NULL THEN
    full_name := COALESCE(display_name, new.email, 'User');
  END IF;
  
  -- Insert into profile table (singular, not profiles)
  -- Use ON CONFLICT to handle case where profile might already exist
  INSERT INTO public.profile (
    id,
    email,
    full_name,
    display_name,
    profile_picture_url,  -- Changed from avatar_url to profile_picture_url
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    user_email,
    full_name,
    display_name,
    avatar_url,  -- Map avatar_url variable to profile_picture_url column
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profile.email),  -- Changed from profiles.email to profile.email
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
-- VERIFY TRIGGER EXISTS
-- ============================================================================

-- Ensure the trigger exists (it should already exist from previous migrations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created 
    AFTER INSERT ON auth.users 
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();
    
    RAISE NOTICE 'Created trigger on_auth_user_created';
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created already exists';
  END IF;
END $$;

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
  
  IF func_source LIKE '%INSERT INTO public.profile%' THEN
    RAISE NOTICE 'Function successfully updated to use profile (singular) table';
  ELSE
    RAISE WARNING 'Function may still reference old table name. Please verify.';
  END IF;
END $$;

