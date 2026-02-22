drop trigger if exists "trigger_update_network_member_count" on "public"."network_member";

drop policy "match_network_delete_policy" on "public"."match_network";

drop policy "Users can create recipients for their shares" on "public"."match_share_recipient";

drop policy "Users can delete recipients of their shares" on "public"."match_share_recipient";

drop policy "Users can update recipients of their shares" on "public"."match_share_recipient";

drop policy "Users can view recipients of their shares" on "public"."match_share_recipient";

drop policy "Users can create contacts in own lists" on "public"."shared_contact";

drop policy "Users can delete contacts in own lists" on "public"."shared_contact";

drop policy "Users can update contacts in own lists" on "public"."shared_contact";

drop policy "Users can view contacts in own lists" on "public"."shared_contact";

alter table "public"."organization_member" alter column "role" drop default;

-- Wrap table creation in exception handlers for tables that may already exist
DO $$ BEGIN
  create table "public"."feedback" (
    "id" uuid not null default gen_random_uuid(),
    "player_id" uuid,
    "category" text not null,
    "subject" text not null,
    "message" text not null,
    "app_version" text,
    "device_info" jsonb,
    "status" text not null default 'new'::text,
    "admin_notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "screenshot_urls" text[] default '{}'::text[]
      );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;


alter table "public"."feedback" enable row level security;

DO $$ BEGIN
  create table "public"."group_activity" (
    "id" uuid not null default gen_random_uuid(),
    "network_id" uuid not null,
    "player_id" uuid not null,
    "activity_type" character varying(50) not null,
    "related_entity_id" uuid,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;


alter table "public"."group_activity" enable row level security;

DO $$ BEGIN
  create table "public"."verification_code" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "code" text not null,
    "expires_at" timestamp with time zone not null,
    "used" boolean default false,
    "used_at" timestamp with time zone,
    "ip_address" text,
    "user_agent" text,
    "created_at" timestamp with time zone default now()
      );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;


alter table "public"."verification_code" enable row level security;

-- Wrap role column alteration in exception handler (policy dependency)
DO $$ BEGIN
  alter table "public"."organization_member" alter column role type "public"."member_role" using role::text::"public"."member_role";
EXCEPTION WHEN OTHERS THEN 
  RAISE NOTICE 'Could not alter organization_member.role column: %', SQLERRM;
END $$;

DO $$ BEGIN
  alter table "public"."organization_member" alter column "role" set default null;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Wrap add column statements for columns that may already exist
DO $$ BEGIN
  alter table "public"."match" add column "is_auto_generated" boolean default false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."network" add column "archived_at" timestamp with time zone;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."organization_member" alter column "role" set default 'member'::public.member_role;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."player" add column "postal_code_country" character varying;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."player" add column "postal_code_lat" numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."player" add column "postal_code_location" extensions.geography;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."player" add column "postal_code_long" numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS feedback_pkey ON public.feedback USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS group_activity_pkey ON public.group_activity USING btree (id);

CREATE INDEX IF NOT EXISTS idx_feedback_category ON public.feedback USING btree (category);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_player_id ON public.feedback USING btree (player_id);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback USING btree (status);

CREATE INDEX IF NOT EXISTS idx_group_activity_created_at ON public.group_activity USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_activity_network_id ON public.group_activity USING btree (network_id);

CREATE INDEX IF NOT EXISTS idx_group_activity_type ON public.group_activity USING btree (activity_type);

CREATE INDEX IF NOT EXISTS idx_match_is_auto_generated ON public.match USING btree (is_auto_generated);

CREATE INDEX IF NOT EXISTS idx_verification_code_email ON public.verification_code USING btree (email);

CREATE INDEX IF NOT EXISTS idx_verification_code_expires_at ON public.verification_code USING btree (expires_at);

CREATE INDEX IF NOT EXISTS idx_verification_code_lookup ON public.verification_code USING btree (email, code, used);

CREATE UNIQUE INDEX IF NOT EXISTS verification_code_pkey ON public.verification_code USING btree (id);

DO $$ BEGIN
  alter table "public"."feedback" add constraint "feedback_pkey" PRIMARY KEY using index "feedback_pkey";
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."group_activity" add constraint "group_activity_pkey" PRIMARY KEY using index "group_activity_pkey";
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."verification_code" add constraint "verification_code_pkey" PRIMARY KEY using index "verification_code_pkey";
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."feedback" add constraint "feedback_category_check" CHECK ((category = ANY (ARRAY['bug'::text, 'feature'::text, 'improvement'::text, 'other'::text]))) not valid;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."feedback" validate constraint "feedback_category_check";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."feedback" add constraint "feedback_player_id_fkey" FOREIGN KEY (player_id) REFERENCES public.player(id) ON DELETE SET NULL not valid;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."feedback" validate constraint "feedback_player_id_fkey";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."feedback" add constraint "feedback_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'reviewed'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text]))) not valid;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."feedback" validate constraint "feedback_status_check";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."group_activity" add constraint "group_activity_activity_type_check" CHECK (((activity_type)::text = ANY ((ARRAY['member_joined'::character varying, 'member_left'::character varying, 'member_promoted'::character varying, 'member_demoted'::character varying, 'match_created'::character varying, 'match_completed'::character varying, 'game_created'::character varying, 'message_sent'::character varying, 'group_updated'::character varying])::text[]))) not valid;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."group_activity" validate constraint "group_activity_activity_type_check";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."group_activity" add constraint "group_activity_network_id_fkey" FOREIGN KEY (network_id) REFERENCES public.network(id) ON DELETE CASCADE not valid;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."group_activity" validate constraint "group_activity_network_id_fkey";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."group_activity" add constraint "group_activity_player_id_fkey" FOREIGN KEY (player_id) REFERENCES public.player(id) ON DELETE CASCADE not valid;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  alter table "public"."group_activity" validate constraint "group_activity_player_id_fkey";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.auto_add_creator_as_moderator()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Insert creator as moderator member
  INSERT INTO public.network_member (
    network_id,
    player_id,
    role,
    status,
    joined_at
  )
  VALUES (
    NEW.id,
    NEW.created_by,
    'moderator',
    'active',
    NOW()
  )
  ON CONFLICT (network_id, player_id) DO NOTHING;
  
  -- Update member_count to 1
  UPDATE public.network
  SET member_count = 1
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_community_access(p_community_id uuid, p_player_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(can_access boolean, is_member boolean, membership_status text, membership_role text, is_public boolean, has_active_moderator boolean, access_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_community_exists BOOLEAN;
  v_is_public BOOLEAN;
  v_is_archived BOOLEAN;
  v_created_by UUID;
  v_membership_status TEXT;
  v_membership_role TEXT;
  v_has_moderator BOOLEAN;
BEGIN
  -- Check if community exists and get basic info
  SELECT 
    TRUE,
    NOT n.is_private,
    n.archived_at IS NOT NULL,
    n.created_by
  INTO 
    v_community_exists,
    v_is_public,
    v_is_archived,
    v_created_by
  FROM public.network n
  JOIN public.network_type nt ON nt.id = n.network_type_id
  WHERE n.id = p_community_id
    AND nt.name = 'community';
  
  -- If community doesn't exist, return no access
  IF NOT v_community_exists THEN
    RETURN QUERY SELECT 
      FALSE,
      FALSE,
      NULL::TEXT,
      NULL::TEXT,
      FALSE,
      FALSE,
      'Community not found'::TEXT;
    RETURN;
  END IF;
  
  -- If archived, return no access
  IF v_is_archived THEN
    RETURN QUERY SELECT 
      FALSE,
      FALSE,
      NULL::TEXT,
      NULL::TEXT,
      v_is_public,
      FALSE,
      'Community is archived'::TEXT;
    RETURN;
  END IF;
  
  -- Check if there's an active moderator
  SELECT EXISTS (
    SELECT 1 FROM public.network_member
    WHERE network_id = p_community_id
      AND role = 'moderator'
      AND status = 'active'
  ) INTO v_has_moderator;
  
  -- If no player_id provided, return public info only
  IF p_player_id IS NULL THEN
    RETURN QUERY SELECT 
      v_is_public,
      FALSE,
      NULL::TEXT,
      NULL::TEXT,
      v_is_public,
      v_has_moderator,
      CASE 
        WHEN v_is_public THEN 'Public community - view access'
        ELSE 'Login required for access'
      END::TEXT;
    RETURN;
  END IF;
  
  -- Get membership info (cast to TEXT to avoid type mismatch)
  SELECT 
    nm.status::TEXT,
    nm.role::TEXT
  INTO v_membership_status, v_membership_role
  FROM public.network_member nm
  WHERE nm.network_id = p_community_id AND nm.player_id = p_player_id;
  
  -- Check if player is the creator (always has access)
  IF p_player_id = v_created_by THEN
    RETURN QUERY SELECT 
      TRUE,
      COALESCE(v_membership_status = 'active', FALSE),
      v_membership_status,
      v_membership_role,
      v_is_public,
      v_has_moderator,
      'Creator has full access'::TEXT;
    RETURN;
  END IF;
  
  -- If player is an active member, grant access
  IF v_membership_status = 'active' THEN
    RETURN QUERY SELECT 
      TRUE,
      TRUE,
      v_membership_status,
      v_membership_role,
      v_is_public,
      v_has_moderator,
      'Active member'::TEXT;
    RETURN;
  END IF;
  
  -- If player has a pending request
  IF v_membership_status = 'pending' THEN
    RETURN QUERY SELECT 
      FALSE,
      FALSE,
      v_membership_status,
      v_membership_role,
      v_is_public,
      v_has_moderator,
      'Membership request pending'::TEXT;
    RETURN;
  END IF;
  
  -- Player is not a member
  RETURN QUERY SELECT 
    FALSE,
    FALSE,
    NULL::TEXT,
    NULL::TEXT,
    v_is_public,
    v_has_moderator,
    CASE 
      WHEN NOT v_has_moderator THEN 'Community has no active moderator'
      ELSE 'Membership required'
    END::TEXT;
  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_weekly_matches_for_all_players(p_target_match_count_per_player integer DEFAULT 10)
 RETURNS TABLE(player_id uuid, player_name text, matches_created integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_player RECORD;
  v_match_count INT;
BEGIN
  -- Loop through all active players with completed onboarding
  FOR v_player IN
    SELECT 
      p.id,
      pr.display_name
    FROM player p
    JOIN profile pr ON pr.id = p.id
    WHERE pr.is_active = TRUE
      -- Only generate for players who have sport profiles
      AND EXISTS (
        SELECT 1 FROM player_sport_profile psp 
        WHERE psp.player_id = p.id AND psp.is_active = TRUE
      )
      -- Only generate for players who have availabilities
      AND EXISTS (
        SELECT 1 FROM player_availability pa 
        WHERE pa.player_id = p.id AND pa.is_active = TRUE
      )
  LOOP
    -- Generate matches for this player
    SELECT COUNT(*) INTO v_match_count
    FROM generate_weekly_matches_for_player(v_player.id, p_target_match_count_per_player);
    
    player_id := v_player.id;
    player_name := v_player.display_name;
    matches_created := v_match_count;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_weekly_matches_for_player(p_player_id uuid, p_target_match_count integer DEFAULT 10)
 RETURNS TABLE(match_id uuid, match_date date, start_time time without time zone, end_time time without time zone, sport_name text, facility_name text, host_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_sport RECORD;
  v_availability RECORD;
  v_compatible_player RECORD;
  v_duration_minutes INT;
  v_possible_times TIME[];
  v_start_time TIME;
  v_match_date DATE;
  v_match_id UUID;
  v_matches_created INT := 0;
  v_day_offset INT;
BEGIN
  -- Loop through player's sports
  FOR v_sport IN
    SELECT 
      psp.sport_id,
      s.name AS sport_name,
      psp.preferred_match_duration,
      psp.preferred_match_type
    FROM player_sport_profile psp
    JOIN sport s ON s.id = psp.sport_id
    WHERE psp.player_id = p_player_id
      AND psp.is_active = TRUE
  LOOP
    -- Get duration in minutes
    v_duration_minutes := parse_match_duration_to_minutes(v_sport.preferred_match_duration::TEXT);
    
    -- Loop through player's availabilities
    FOR v_availability IN
      SELECT pa.day_of_week, pa.time_period
      FROM player_availability pa
      WHERE pa.player_id = p_player_id
        AND pa.is_active = TRUE
    LOOP
      -- Exit if we've created enough matches
      IF v_matches_created >= p_target_match_count THEN
        EXIT;
      END IF;
      
      -- Calculate the date for this day in the upcoming week
      v_day_offset := CASE v_availability.day_of_week::TEXT
        WHEN 'monday' THEN 1
        WHEN 'tuesday' THEN 2
        WHEN 'wednesday' THEN 3
        WHEN 'thursday' THEN 4
        WHEN 'friday' THEN 5
        WHEN 'saturday' THEN 6
        WHEN 'sunday' THEN 7
      END;
      
      -- Get next occurrence of this day
      v_match_date := CURRENT_DATE + ((v_day_offset - EXTRACT(ISODOW FROM CURRENT_DATE)::INT + 7) % 7);
      IF v_match_date <= CURRENT_DATE THEN
        v_match_date := v_match_date + 7;
      END IF;
      
      -- Get possible start times for this period
      v_possible_times := get_time_slot_starts(v_availability.time_period::TEXT, v_duration_minutes);
      
      -- Pick a random start time
      IF array_length(v_possible_times, 1) > 0 THEN
        v_start_time := v_possible_times[1 + floor(random() * array_length(v_possible_times, 1))::INT];
      ELSE
        v_start_time := '09:00'::TIME;
      END IF;
      
      -- Find a compatible player to be the host
      FOR v_compatible_player IN
        SELECT * FROM get_compatible_players(p_player_id, v_sport.sport_id, 1.0, 5)
        ORDER BY RANDOM()
        LIMIT 1
      LOOP
        -- Create the match with the compatible player as host
        INSERT INTO match (
          sport_id,
          created_by,
          match_date,
          start_time,
          end_time,
          timezone,
          match_type,
          format,
          player_expectation,
          duration,
          location_type,
          facility_id,
          location_name,
          is_court_free,
          visibility,
          join_mode,
          notes,
          is_auto_generated
        ) VALUES (
          v_sport.sport_id,
          v_compatible_player.player_id,
          v_match_date,
          v_start_time,
          v_start_time + (v_duration_minutes || ' minutes')::INTERVAL,
          'America/Montreal',
          'casual'::match_type_enum,  -- Default casual match
          'singles'::match_format_enum,  -- Default singles
          CASE 
            WHEN v_sport.preferred_match_type::TEXT = 'both' THEN 'casual'::match_type_enum
            ELSE v_sport.preferred_match_type::match_type_enum
          END,
          v_duration_minutes::TEXT,
          CASE 
            WHEN v_compatible_player.facility_id IS NOT NULL THEN 'facility'::location_type_enum
            ELSE 'tbd'::location_type_enum
          END,
          v_compatible_player.facility_id,
          v_compatible_player.facility_name,
          TRUE,  -- Assume free court for auto-generated
          'public'::match_visibility_enum,
          'request'::match_join_mode_enum,  -- Users must request to join
          'Auto-generated match based on your preferences',
          TRUE
        )
        RETURNING id INTO v_match_id;
        
        -- Add the host as a participant
        INSERT INTO match_participant (
          match_id,
          player_id,
          status,
          is_host
        ) VALUES (
          v_match_id,
          v_compatible_player.player_id,
          'joined'::match_participant_status_enum,
          TRUE
        );
        
        v_matches_created := v_matches_created + 1;
        
        RETURN QUERY
        SELECT 
          v_match_id,
          v_match_date,
          v_start_time,
          v_start_time + (v_duration_minutes || ' minutes')::INTERVAL,
          v_sport.sport_name,
          v_compatible_player.facility_name,
          v_compatible_player.display_name;
          
      END LOOP;
      
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_compatible_players(p_player_id uuid, p_sport_id uuid, p_rating_tolerance numeric DEFAULT 1.0, p_max_results integer DEFAULT 20)
 RETURNS TABLE(player_id uuid, display_name text, rating_value numeric, rating_difference numeric, facility_id uuid, facility_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_player_rating NUMERIC;
  v_player_city TEXT;
BEGIN
  -- Get the requesting player's rating for this sport
  SELECT rs.value INTO v_player_rating
  FROM player_rating_score prs
  JOIN rating_score rs ON rs.id = prs.rating_score_id
  JOIN rating_system rsys ON rsys.id = rs.rating_system_id
  WHERE prs.player_id = p_player_id
    AND rsys.sport_id = p_sport_id
  ORDER BY prs.created_at DESC
  LIMIT 1;
  
  -- Get the requesting player's city
  SELECT pr.city INTO v_player_city
  FROM profile pr
  WHERE pr.id = p_player_id;
  
  -- If player has no rating, use a default middle value
  IF v_player_rating IS NULL THEN
    v_player_rating := 3.5;
  END IF;
  
  RETURN QUERY
  SELECT DISTINCT
    p.id AS player_id,
    pr.display_name,
    COALESCE(rs.value, 3.5) AS rating_value,
    ABS(COALESCE(rs.value, 3.5) - v_player_rating) AS rating_difference,
    pff.facility_id,
    f.name AS facility_name
  FROM player p
  JOIN profile pr ON pr.id = p.id
  JOIN player_sport_profile psp ON psp.player_id = p.id AND psp.sport_id = p_sport_id
  LEFT JOIN player_rating_score prs ON prs.player_id = p.id
  LEFT JOIN rating_score rs ON rs.id = prs.rating_score_id
  LEFT JOIN rating_system rsys ON rsys.id = rs.rating_system_id AND rsys.sport_id = p_sport_id
  LEFT JOIN player_favorite_facility pff ON pff.player_id = p.id
  LEFT JOIN facility f ON f.id = pff.facility_id
  WHERE p.id != p_player_id
    AND psp.is_active = TRUE
    -- Rating within tolerance
    AND ABS(COALESCE(rs.value, 3.5) - v_player_rating) <= p_rating_tolerance
    -- Prefer same city if available
    AND (v_player_city IS NULL OR pr.city IS NULL OR pr.city = v_player_city)
  ORDER BY 
    rating_difference ASC,
    RANDOM()
  LIMIT p_max_results;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_group_activity(p_network_id uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, network_id uuid, player_id uuid, activity_type character varying, related_entity_id uuid, metadata jsonb, created_at timestamp with time zone, player_first_name character varying, player_last_name character varying, player_avatar_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ga.id,
    ga.network_id,
    ga.player_id,
    ga.activity_type,
    ga.related_entity_id,
    ga.metadata,
    ga.created_at,
    p.first_name AS player_first_name,
    p.last_name AS player_last_name,
    p.avatar_url AS player_avatar_url
  FROM public.group_activity ga
  LEFT JOIN public.player p ON p.id = ga.player_id
  WHERE ga.network_id = p_network_id
  ORDER BY ga.created_at DESC
  LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_time_slot_starts(p_period text, p_duration_minutes integer)
 RETURNS time without time zone[]
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_start_hour INT;
  v_end_hour INT;
  v_times TIME[];
  v_current_time TIME;
BEGIN
  -- Define time ranges for each period
  CASE p_period
    WHEN 'morning' THEN
      v_start_hour := 6;
      v_end_hour := 12;
    WHEN 'afternoon' THEN
      v_start_hour := 12;
      v_end_hour := 18;
    WHEN 'evening' THEN
      v_start_hour := 18;
      v_end_hour := 22;
    ELSE
      v_start_hour := 6;
      v_end_hour := 22;
  END CASE;
  
  -- Generate possible start times (every 30 minutes)
  v_times := ARRAY[]::TIME[];
  v_current_time := (v_start_hour || ':00')::TIME;
  
  WHILE v_current_time + (p_duration_minutes || ' minutes')::INTERVAL <= (v_end_hour || ':00')::TIME LOOP
    v_times := array_append(v_times, v_current_time);
    v_current_time := v_current_time + INTERVAL '30 minutes';
  END LOOP;
  
  RETURN v_times;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_orphaned_community()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If member_count goes to 0, mark as archived
  IF NEW.member_count = 0 AND (OLD.member_count IS NULL OR OLD.member_count > 0) THEN
    NEW.archived_at := NOW();
  END IF;
  
  -- If member_count increases from 0, unarchive
  IF NEW.member_count > 0 AND OLD.member_count = 0 AND OLD.archived_at IS NOT NULL THEN
    NEW.archived_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_member_joined_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO public.group_activity (network_id, player_id, activity_type, metadata)
    VALUES (
      NEW.network_id, 
      NEW.player_id, 
      'member_joined',
      jsonb_build_object('joined_at', NEW.joined_at)
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_member_left_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if member status changed from active to removed/blocked
  IF OLD.status = 'active' AND (NEW.status = 'removed' OR NEW.status = 'blocked') THEN
    INSERT INTO public.group_activity (network_id, player_id, activity_type, metadata)
    VALUES (
      OLD.network_id, 
      OLD.player_id, 
      'member_left',
      jsonb_build_object('left_at', NOW())
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_member_role_change_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only log if the role actually changed and member is still active
  IF OLD.role IS DISTINCT FROM NEW.role AND NEW.status = 'active' THEN
    IF NEW.role = 'moderator' AND OLD.role = 'member' THEN
      -- Member was promoted
      INSERT INTO public.group_activity (network_id, player_id, activity_type, related_entity_id, metadata)
      VALUES (
        NEW.network_id, 
        NEW.player_id, 
        'member_promoted',
        NEW.player_id,
        jsonb_build_object('promoted_at', NOW(), 'new_role', NEW.role, 'old_role', OLD.role)
      );
    ELSIF NEW.role = 'member' AND OLD.role = 'moderator' THEN
      -- Member was demoted
      INSERT INTO public.group_activity (network_id, player_id, activity_type, related_entity_id, metadata)
      VALUES (
        NEW.network_id, 
        NEW.player_id, 
        'member_demoted',
        NEW.player_id,
        jsonb_build_object('demoted_at', NOW(), 'new_role', NEW.role, 'old_role', OLD.role)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_network_created_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.group_activity (
    network_id,
    player_id,
    activity_type,
    metadata
  )
  VALUES (
    NEW.id,
    NEW.created_by,
    'group_updated',
    jsonb_build_object(
      'action', 'created',
      'network_name', NEW.name,
      'created_at', NEW.created_at
    )
  );
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_admin_new_feedback()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    payload JSONB;
BEGIN
    -- Build the payload
    payload := jsonb_build_object(
        'feedback_id', NEW.id,
        'category', NEW.category,
        'subject', NEW.subject,
        'message', NEW.message,
        'player_id', NEW.player_id,
        'created_at', NEW.created_at
    );
    
    -- Call the Edge Function via pg_net (if available) or http extension
    -- This is a placeholder - the actual email will be sent via Edge Function
    -- triggered by database webhook or called directly from the app
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.parse_match_duration_to_minutes(p_duration text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
  CASE p_duration
    WHEN '30' THEN RETURN 30;
    WHEN '60' THEN RETURN 60;
    WHEN '90' THEN RETURN 90;
    WHEN '120' THEN RETURN 120;
    WHEN '1h' THEN RETURN 60;
    WHEN '1.5h' THEN RETURN 90;
    WHEN '2h' THEN RETURN 120;
    ELSE RETURN 60; -- default 1 hour
  END CASE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_weekly_match_generation(p_target_match_count integer DEFAULT 10)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_results JSON;
BEGIN
  SELECT json_agg(row_to_json(r))
  INTO v_results
  FROM generate_weekly_matches_for_all_players(p_target_match_count) r;
  
  RETURN COALESCE(v_results, '[]'::JSON);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.approve_community_member(p_community_id uuid, p_member_id uuid, p_approver_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_approver_id UUID;
  v_is_moderator BOOLEAN;
  v_target_player_id UUID;
BEGIN
  -- Use provided approver_id or get from auth
  v_approver_id := COALESCE(p_approver_id, auth.uid());
  
  IF v_approver_id IS NULL THEN
    RAISE EXCEPTION 'Approver ID is required';
  END IF;
  
  -- Verify the approver is a moderator
  SELECT is_network_moderator(p_community_id, v_approver_id) INTO v_is_moderator;
  
  IF NOT v_is_moderator THEN
    RAISE EXCEPTION 'Only moderators can approve members';
  END IF;
  
  -- Get target player ID
  SELECT player_id INTO v_target_player_id
  FROM public.network_member
  WHERE id = p_member_id AND network_id = p_community_id AND status = 'pending';
  
  IF v_target_player_id IS NULL THEN
    RAISE EXCEPTION 'Pending membership not found';
  END IF;
  
  -- Approve the membership
  UPDATE public.network_member
  SET status = 'active', joined_at = NOW()
  WHERE id = p_member_id;
  
  -- Log activity
  INSERT INTO public.network_activity (
    network_id,
    activity_type,
    actor_id,
    target_id,
    metadata
  ) VALUES (
    p_community_id,
    'member_joined',
    v_approver_id,
    v_target_player_id,
    jsonb_build_object('status', 'approved', 'approved_by', v_approver_id)
  );
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_network_conversation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_conversation_id UUID;
  group_type_id UUID;
  community_type_id UUID;
BEGIN
  -- Get type IDs for player_group and community
  SELECT id INTO group_type_id FROM public.network_type WHERE name = 'player_group';
  SELECT id INTO community_type_id FROM public.network_type WHERE name = 'community';
  
  -- Create conversation for player groups OR communities
  IF (NEW.network_type_id = group_type_id OR NEW.network_type_id = community_type_id) 
     AND NEW.conversation_id IS NULL THEN
    -- Create the group/community conversation
    INSERT INTO public.conversation (conversation_type, title, created_by)
    VALUES ('group', NEW.name, NEW.created_by)
    RETURNING id INTO new_conversation_id;
    
    -- Update the network with the conversation id
    NEW.conversation_id := new_conversation_id;
    
    -- Add the creator as a participant
    INSERT INTO public.conversation_participant (conversation_id, player_id)
    VALUES (new_conversation_id, NEW.created_by);
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.debug_check_conversation_participant(p_conversation_id uuid, p_player_id uuid)
 RETURNS TABLE(is_participant boolean, participant_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS (
      SELECT 1 FROM conversation_participant cp
      WHERE cp.conversation_id = p_conversation_id
      AND cp.player_id = p_player_id
    ) as is_participant,
    (SELECT COUNT(*) FROM conversation_participant WHERE conversation_id = p_conversation_id) as participant_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_network_max_members()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
  network_type_name TEXT;
BEGIN
  -- Only check on insert or when status changes to active
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') THEN
    -- Get network info including type
    SELECT n.member_count, n.max_members, nt.name 
    INTO current_count, max_allowed, network_type_name
    FROM public.network n
    JOIN public.network_type nt ON n.network_type_id = nt.id
    WHERE n.id = NEW.network_id;
    
    -- Skip limit check for communities (unlimited members)
    IF network_type_name = 'community' THEN
      RETURN NEW;
    END IF;
    
    -- Enforce limit for other network types (like player_group)
    IF max_allowed IS NOT NULL AND current_count >= max_allowed THEN
      RAISE EXCEPTION 'Cannot add member: group has reached maximum capacity of % members', max_allowed;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pending_community_members(p_community_id uuid, p_moderator_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, player_id uuid, request_type public.network_member_request_type, added_by uuid, created_at timestamp with time zone, player_name text, player_profile_picture text, referrer_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_moderator_id UUID;
  v_is_moderator BOOLEAN;
BEGIN
  -- Use provided moderator_id or get from auth
  v_moderator_id := COALESCE(p_moderator_id, auth.uid());
  
  IF v_moderator_id IS NULL THEN
    RAISE EXCEPTION 'Moderator ID is required';
  END IF;
  
  -- Verify the user is a moderator
  SELECT is_network_moderator(p_community_id, v_moderator_id) INTO v_is_moderator;
  
  IF NOT v_is_moderator THEN
    RAISE EXCEPTION 'Only moderators can view pending members';
  END IF;
  
  RETURN QUERY
  SELECT 
    nm.id,
    nm.player_id,
    nm.request_type,
    nm.added_by,
    nm.created_at,
    COALESCE(p.display_name, p.first_name || ' ' || COALESCE(p.last_name, '')) as player_name,
    p.profile_picture_url as player_profile_picture,
    COALESCE(r.display_name, r.first_name || ' ' || COALESCE(r.last_name, '')) as referrer_name
  FROM public.network_member nm
  JOIN public.profile p ON p.id = nm.player_id
  LEFT JOIN public.profile r ON r.id = nm.added_by AND nm.request_type = 'member_referral'
  WHERE nm.network_id = p_community_id
    AND nm.status = 'pending'
  ORDER BY nm.created_at ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_player_communities(p_player_id uuid)
 RETURNS TABLE(id uuid, name text, description text, cover_image_url text, is_private boolean, member_count integer, created_by uuid, created_at timestamp with time zone, membership_status text, membership_role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.name,
    n.description,
    n.cover_image_url,
    n.is_private,
    n.member_count,
    n.created_by,
    n.created_at,
    nm.status::TEXT as membership_status,
    nm.role::TEXT as membership_role
  FROM public.network n
  JOIN public.network_type nt ON n.network_type_id = nt.id
  JOIN public.network_member nm ON nm.network_id = n.id AND nm.player_id = p_player_id
  WHERE nt.name = 'community'
  ORDER BY n.name ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_communities(p_player_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, name text, description text, cover_image_url text, member_count integer, created_by uuid, created_at timestamp with time zone, is_member boolean, membership_status text, membership_role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    BEGIN
      RETURN QUERY
      SELECT 
        n.id,
        n.name,
        n.description,
        n.cover_image_url,
        n.member_count,
        n.created_by,
        n.created_at,
        CASE WHEN nm.id IS NOT NULL THEN true ELSE false END as is_member,
        nm.status::TEXT as membership_status,
        nm.role::TEXT as membership_role
      FROM public.network n
      JOIN public.network_type nt ON n.network_type_id = nt.id
      LEFT JOIN public.network_member nm ON nm.network_id = n.id 
        AND nm.player_id = COALESCE(p_player_id, auth.uid())
      WHERE nt.name = 'community'
        AND n.is_private = false
        AND n.member_count > 0
        AND n.archived_at IS NULL
      ORDER BY n.member_count DESC, n.created_at DESC;
    END;
    $function$
;

CREATE OR REPLACE FUNCTION public.is_network_creator(network_id_param uuid, user_id_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
      SELECT 1 FROM public.network
      WHERE id = network_id_param
      AND created_by = user_id_param
    );
  $function$
;

CREATE OR REPLACE FUNCTION public.is_network_member(network_id_param uuid, user_id_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.network_member
    WHERE network_id = network_id_param
    AND player_id = user_id_param
    AND status = 'active'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_network_moderator(network_id_param uuid, user_id_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
      SELECT 1 FROM public.network_member
      WHERE network_id = network_id_param
      AND player_id = user_id_param
      AND role = 'moderator'
      AND status = 'active'
    );
  $function$
;

CREATE OR REPLACE FUNCTION public.refer_player_to_community(p_community_id uuid, p_referred_player_id uuid, p_referrer_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_referrer_id UUID;
  v_is_referrer_member BOOLEAN;
  v_existing_member UUID;
  v_member_id UUID;
BEGIN
  -- Use provided referrer_id or get from auth
  v_referrer_id := COALESCE(p_referrer_id, auth.uid());
  
  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION 'Referrer ID is required';
  END IF;
  
  -- Verify the referrer is an active member
  SELECT EXISTS(
    SELECT 1 FROM public.network_member
    WHERE network_id = p_community_id 
      AND player_id = v_referrer_id 
      AND status = 'active'
  ) INTO v_is_referrer_member;
  
  IF NOT v_is_referrer_member THEN
    RAISE EXCEPTION 'Only active members can refer other players';
  END IF;
  
  -- Check if player is already a member or has pending request
  SELECT id INTO v_existing_member
  FROM public.network_member
  WHERE network_id = p_community_id AND player_id = p_referred_player_id;
  
  IF v_existing_member IS NOT NULL THEN
    RAISE EXCEPTION 'Player is already a member or has a pending request';
  END IF;
  
  -- Create pending membership referral
  INSERT INTO public.network_member (
    network_id, 
    player_id, 
    status, 
    role, 
    request_type,
    added_by
  )
  VALUES (
    p_community_id, 
    p_referred_player_id, 
    'pending', 
    'member', 
    'member_referral',
    v_referrer_id
  )
  RETURNING id INTO v_member_id;
  
  -- Log activity
  INSERT INTO public.network_activity (
    network_id,
    activity_type,
    actor_id,
    target_id,
    metadata
  ) VALUES (
    p_community_id,
    'member_joined',
    v_referrer_id,
    p_referred_player_id,
    jsonb_build_object('status', 'pending', 'request_type', 'member_referral')
  );
  
  RETURN v_member_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reject_community_member(p_community_id uuid, p_member_id uuid, p_rejector_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_rejector_id UUID;
  v_is_moderator BOOLEAN;
  v_target_player_id UUID;
BEGIN
  -- Use provided rejector_id or get from auth
  v_rejector_id := COALESCE(p_rejector_id, auth.uid());
  
  IF v_rejector_id IS NULL THEN
    RAISE EXCEPTION 'Rejector ID is required';
  END IF;
  
  -- Verify the rejector is a moderator
  SELECT is_network_moderator(p_community_id, v_rejector_id) INTO v_is_moderator;
  
  IF NOT v_is_moderator THEN
    RAISE EXCEPTION 'Only moderators can reject members';
  END IF;
  
  -- Get target player ID
  SELECT player_id INTO v_target_player_id
  FROM public.network_member
  WHERE id = p_member_id AND network_id = p_community_id AND status = 'pending';
  
  IF v_target_player_id IS NULL THEN
    RAISE EXCEPTION 'Pending membership not found';
  END IF;
  
  -- Delete the membership request
  DELETE FROM public.network_member
  WHERE id = p_member_id;
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.request_to_join_community(p_community_id uuid, p_player_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_player_id UUID;
  v_network_type TEXT;
  v_is_private BOOLEAN;
  v_existing_member UUID;
  v_member_id UUID;
BEGIN
  -- Use provided player_id or get from auth
  v_player_id := COALESCE(p_player_id, auth.uid());
  
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Player ID is required';
  END IF;
  
  -- Verify this is a public community
  SELECT nt.name, n.is_private INTO v_network_type, v_is_private
  FROM public.network n
  JOIN public.network_type nt ON n.network_type_id = nt.id
  WHERE n.id = p_community_id;
  
  IF v_network_type IS NULL THEN
    RAISE EXCEPTION 'Community not found';
  END IF;
  
  IF v_network_type != 'community' THEN
    RAISE EXCEPTION 'This is not a community';
  END IF;
  
  IF v_is_private = true THEN
    RAISE EXCEPTION 'Cannot request to join a private community';
  END IF;
  
  -- Check if already a member or has pending request
  SELECT id INTO v_existing_member
  FROM public.network_member
  WHERE network_id = p_community_id AND player_id = v_player_id;
  
  IF v_existing_member IS NOT NULL THEN
    RAISE EXCEPTION 'Already a member or have a pending request';
  END IF;
  
  -- Create pending membership request
  INSERT INTO public.network_member (
    network_id, 
    player_id, 
    status, 
    role, 
    request_type,
    added_by
  )
  VALUES (
    p_community_id, 
    v_player_id, 
    'pending', 
    'member', 
    'join_request',
    v_player_id  -- Self-requested
  )
  RETURNING id INTO v_member_id;
  
  -- Log activity
  INSERT INTO public.network_activity (
    network_id,
    activity_type,
    actor_id,
    target_id,
    metadata
  ) VALUES (
    p_community_id,
    'member_joined',
    v_player_id,
    v_player_id,
    jsonb_build_object('status', 'pending', 'request_type', 'join_request')
  );
  
  RETURN v_member_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_network_member_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.network 
    SET member_count = member_count + 1 
    WHERE id = NEW.network_id;
  -- Handle DELETE
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.network 
    SET member_count = GREATEST(0, member_count - 1) 
    WHERE id = OLD.network_id;
  -- Handle UPDATE (status change)
  ELSIF TG_OP = 'UPDATE' THEN
    -- Became active
    IF NEW.status = 'active' AND OLD.status != 'active' THEN
      UPDATE public.network 
      SET member_count = member_count + 1 
      WHERE id = NEW.network_id;
    -- Became inactive
    ELSIF NEW.status != 'active' AND OLD.status = 'active' THEN
      UPDATE public.network 
      SET member_count = GREATEST(0, member_count - 1) 
      WHERE id = NEW.network_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

grant delete on table "public"."feedback" to "anon";

grant insert on table "public"."feedback" to "anon";

grant references on table "public"."feedback" to "anon";

grant select on table "public"."feedback" to "anon";

grant trigger on table "public"."feedback" to "anon";

grant truncate on table "public"."feedback" to "anon";

grant update on table "public"."feedback" to "anon";

grant delete on table "public"."feedback" to "authenticated";

grant insert on table "public"."feedback" to "authenticated";

grant references on table "public"."feedback" to "authenticated";

grant select on table "public"."feedback" to "authenticated";

grant trigger on table "public"."feedback" to "authenticated";

grant truncate on table "public"."feedback" to "authenticated";

grant update on table "public"."feedback" to "authenticated";

grant delete on table "public"."feedback" to "service_role";

grant insert on table "public"."feedback" to "service_role";

grant references on table "public"."feedback" to "service_role";

grant select on table "public"."feedback" to "service_role";

grant trigger on table "public"."feedback" to "service_role";

grant truncate on table "public"."feedback" to "service_role";

grant update on table "public"."feedback" to "service_role";

grant delete on table "public"."group_activity" to "anon";

grant insert on table "public"."group_activity" to "anon";

grant references on table "public"."group_activity" to "anon";

grant select on table "public"."group_activity" to "anon";

grant trigger on table "public"."group_activity" to "anon";

grant truncate on table "public"."group_activity" to "anon";

grant update on table "public"."group_activity" to "anon";

grant delete on table "public"."group_activity" to "authenticated";

grant insert on table "public"."group_activity" to "authenticated";

grant references on table "public"."group_activity" to "authenticated";

grant select on table "public"."group_activity" to "authenticated";

grant trigger on table "public"."group_activity" to "authenticated";

grant truncate on table "public"."group_activity" to "authenticated";

grant update on table "public"."group_activity" to "authenticated";

grant delete on table "public"."group_activity" to "service_role";

grant insert on table "public"."group_activity" to "service_role";

grant references on table "public"."group_activity" to "service_role";

grant select on table "public"."group_activity" to "service_role";

grant trigger on table "public"."group_activity" to "service_role";

grant truncate on table "public"."group_activity" to "service_role";

grant update on table "public"."group_activity" to "service_role";

grant delete on table "public"."verification_code" to "anon";

grant insert on table "public"."verification_code" to "anon";

grant references on table "public"."verification_code" to "anon";

grant select on table "public"."verification_code" to "anon";

grant trigger on table "public"."verification_code" to "anon";

grant truncate on table "public"."verification_code" to "anon";

grant update on table "public"."verification_code" to "anon";

grant delete on table "public"."verification_code" to "authenticated";

grant insert on table "public"."verification_code" to "authenticated";

grant references on table "public"."verification_code" to "authenticated";

grant select on table "public"."verification_code" to "authenticated";

grant trigger on table "public"."verification_code" to "authenticated";

grant truncate on table "public"."verification_code" to "authenticated";

grant update on table "public"."verification_code" to "authenticated";

grant delete on table "public"."verification_code" to "service_role";

grant insert on table "public"."verification_code" to "service_role";

grant references on table "public"."verification_code" to "service_role";

grant select on table "public"."verification_code" to "service_role";

grant trigger on table "public"."verification_code" to "service_role";

grant truncate on table "public"."verification_code" to "service_role";

grant update on table "public"."verification_code" to "service_role";


  create policy "Anonymous feedback submission"
  on "public"."feedback"
  as permissive
  for insert
  to authenticated
with check ((player_id IS NULL));



  create policy "Service role full access"
  on "public"."feedback"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Users can submit feedback"
  on "public"."feedback"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = player_id) OR (player_id IS NULL)));



  create policy "Users can view own feedback"
  on "public"."feedback"
  as permissive
  for select
  to authenticated
using ((auth.uid() = player_id));



  create policy "Members can view group activity"
  on "public"."group_activity"
  as permissive
  for select
  to public
using (((network_id IN ( SELECT network_member.network_id
   FROM public.network_member
  WHERE ((network_member.player_id = auth.uid()) AND (network_member.status = 'active'::public.network_member_status)))) OR (network_id IN ( SELECT network.id
   FROM public.network
  WHERE (network.created_by = auth.uid())))));



  create policy "System can insert group activity"
  on "public"."group_activity"
  as permissive
  for insert
  to public
with check (((network_id IN ( SELECT network_member.network_id
   FROM public.network_member
  WHERE ((network_member.player_id = auth.uid()) AND (network_member.status = 'active'::public.network_member_status)))) OR (network_id IN ( SELECT network.id
   FROM public.network
  WHERE (network.created_by = auth.uid())))));



  create policy "Participants can send messages"
  on "public"."message"
  as permissive
  for insert
  to public
with check (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM public.conversation_participant cp
  WHERE ((cp.conversation_id = message.conversation_id) AND (cp.player_id = auth.uid()))))));



  create policy "Senders can delete own messages"
  on "public"."message"
  as permissive
  for delete
  to public
using ((auth.uid() = sender_id));



  create policy "Senders can update own messages"
  on "public"."message"
  as permissive
  for update
  to public
using ((auth.uid() = sender_id));



  create policy "Allow anonymous insert"
  on "public"."verification_code"
  as permissive
  for insert
  to public
with check (true);



  create policy "Allow select by email"
  on "public"."verification_code"
  as permissive
  for select
  to public
using (true);



  create policy "Allow update by email"
  on "public"."verification_code"
  as permissive
  for update
  to public
using (true)
with check (true);



  create policy "match_network_delete_policy"
  on "public"."match_network"
  as permissive
  for delete
  to public
using ((posted_by = auth.uid()));



  create policy "Users can create recipients for their shares"
  on "public"."match_share_recipient"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.match_share ms
  WHERE ((ms.id = match_share_recipient.share_id) AND (ms.shared_by = auth.uid())))));



  create policy "Users can delete recipients of their shares"
  on "public"."match_share_recipient"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.match_share ms
  WHERE ((ms.id = match_share_recipient.share_id) AND (ms.shared_by = auth.uid())))));



  create policy "Users can update recipients of their shares"
  on "public"."match_share_recipient"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.match_share ms
  WHERE ((ms.id = match_share_recipient.share_id) AND (ms.shared_by = auth.uid())))));



  create policy "Users can view recipients of their shares"
  on "public"."match_share_recipient"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.match_share ms
  WHERE ((ms.id = match_share_recipient.share_id) AND (ms.shared_by = auth.uid())))));



  create policy "Users can create contacts in own lists"
  on "public"."shared_contact"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.shared_contact_list scl
  WHERE ((scl.id = shared_contact.list_id) AND (scl.player_id = auth.uid())))));



  create policy "Users can delete contacts in own lists"
  on "public"."shared_contact"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.shared_contact_list scl
  WHERE ((scl.id = shared_contact.list_id) AND (scl.player_id = auth.uid())))));



  create policy "Users can update contacts in own lists"
  on "public"."shared_contact"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.shared_contact_list scl
  WHERE ((scl.id = shared_contact.list_id) AND (scl.player_id = auth.uid())))));



  create policy "Users can view contacts in own lists"
  on "public"."shared_contact"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.shared_contact_list scl
  WHERE ((scl.id = shared_contact.list_id) AND (scl.player_id = auth.uid())))));


CREATE TRIGGER trigger_feedback_updated_at BEFORE UPDATE ON public.feedback FOR EACH ROW EXECUTE FUNCTION public.update_feedback_updated_at();

CREATE TRIGGER trigger_notify_new_feedback AFTER INSERT ON public.feedback FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_feedback();

CREATE TRIGGER trigger_auto_add_creator AFTER INSERT ON public.network FOR EACH ROW EXECUTE FUNCTION public.auto_add_creator_as_moderator();

CREATE TRIGGER trigger_handle_orphaned_community BEFORE UPDATE OF member_count ON public.network FOR EACH ROW EXECUTE FUNCTION public.handle_orphaned_community();

CREATE TRIGGER trigger_log_network_created AFTER INSERT ON public.network FOR EACH ROW EXECUTE FUNCTION public.log_network_created_activity();

CREATE TRIGGER trigger_log_member_joined AFTER INSERT ON public.network_member FOR EACH ROW EXECUTE FUNCTION public.log_member_joined_activity();

CREATE TRIGGER trigger_log_member_left AFTER UPDATE ON public.network_member FOR EACH ROW EXECUTE FUNCTION public.log_member_left_activity();

CREATE TRIGGER trigger_log_member_role_change AFTER UPDATE ON public.network_member FOR EACH ROW EXECUTE FUNCTION public.log_member_role_change_activity();

CREATE TRIGGER trigger_update_network_member_count_delete AFTER DELETE ON public.network_member FOR EACH ROW EXECUTE FUNCTION public.update_network_member_count();

CREATE TRIGGER trigger_update_network_member_count_insert AFTER INSERT ON public.network_member FOR EACH ROW EXECUTE FUNCTION public.update_network_member_count();

CREATE TRIGGER trigger_update_network_member_count_update AFTER UPDATE ON public.network_member FOR EACH ROW EXECUTE FUNCTION public.update_network_member_count();

-- Wrap storage policies in exception handlers (shadow DB has permission issues)
DO $$ BEGIN
  create policy "Authenticated users can delete facility files"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'facility-files'::text));
EXCEPTION WHEN insufficient_privilege OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  create policy "Authenticated users can update facility files"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'facility-files'::text))
with check ((bucket_id = 'facility-files'::text));
EXCEPTION WHEN insufficient_privilege OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  create policy "Authenticated users can upload facility files"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'facility-files'::text));
EXCEPTION WHEN insufficient_privilege OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  create policy "Feedback screenshots are publicly accessible"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'feedback-screenshots'::text));
EXCEPTION WHEN insufficient_privilege OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  create policy "Public facility files are publicly accessible"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'facility-files'::text));
EXCEPTION WHEN insufficient_privilege OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  create policy "Users can delete their own feedback screenshots"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'feedback-screenshots'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
EXCEPTION WHEN insufficient_privilege OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  create policy "Users can update their own feedback screenshots"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'feedback-screenshots'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
with check (((bucket_id = 'feedback-screenshots'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
EXCEPTION WHEN insufficient_privilege OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  create policy "Users can upload feedback screenshots"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'feedback-screenshots'::text));
EXCEPTION WHEN insufficient_privilege OR duplicate_object THEN NULL;
END $$;

-- Wrap storage triggers (may not exist on shadow DB)
DO $$ BEGIN
  CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


