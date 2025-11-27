-- Enable pg_net extension for HTTP requests from PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create or replace the function that sends invitation emails via edge function
-- Uses internal Docker network hostname to reach Kong API gateway
CREATE OR REPLACE FUNCTION public.notify_new_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_id bigint;
  BEGIN
    -- Use internal Docker network URL for local development
    -- In production, this would be the Supabase project URL
    SELECT INTO request_id net.http_post(
      url := 'http://supabase_kong_next-rallia:8000/functions/v1/send-email',
      body := jsonb_build_object(
        'id', new.id,
        'email', new.email,
        'phone', new.phone,
        'role', new.role,
        'admin_role', new.admin_role,
        'token', new.token,
        'status', new.status,
        'inviter_id', new.inviter_id,
        'invited_user_id', new.invited_user_id,
        'source', new.source,
        'expires_at', new.expires_at,
        'metadata', new.metadata,
        'emailType', 'invitation'
      ),
      headers := '{
        "Content-Type": "application/json"
      }'::jsonb,
      timeout_milliseconds := 5000
    );

    RAISE NOTICE 'Edge function called with request_id: %', request_id;
    RETURN new;
  EXCEPTION
    WHEN others THEN
      RAISE WARNING 'Error calling edge function: %', SQLERRM;
      RETURN new;
  END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_invitation_insert ON public.invitations;
CREATE TRIGGER on_invitation_insert
  BEFORE INSERT ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_invitation();

COMMENT ON FUNCTION public.notify_new_invitation() IS 'Calls send-email edge function when a new invitation is created';

