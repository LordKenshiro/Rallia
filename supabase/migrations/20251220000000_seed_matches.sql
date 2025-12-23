-- ============================================================================
-- Migration: Seed Matches for Local Development
-- Created: 2025-12-20
-- Description: Seeds realistic match data with various configurations
-- NOTE: This migration runs AFTER match creation fields are added (20251213)
-- ============================================================================

-- ============================================================================
-- 1. CREATE SEED USERS (auth.users, profile, player)
-- ============================================================================

DO $$
DECLARE
  user_ids UUID[] := ARRAY[]::UUID[];
  new_user_id UUID;
  profile_names TEXT[] := ARRAY['Alex Martinez', 'Sarah Kim', 'David Lee', 'Chris Rodriguez', 'Maria Garcia', 'James Foster', 'Pat Miller', 'Emma Wilson'];
  profile_emails TEXT[] := ARRAY['alex@test.local', 'sarah@test.local', 'david@test.local', 'chris@test.local', 'maria@test.local', 'james@test.local', 'pat@test.local', 'emma@test.local'];
  profile_displays TEXT[] := ARRAY['AlexM', 'SarahK', 'DavidL', 'ChrisR', 'MariaG', 'JamesF', 'PatM', 'EmmaW'];
  i INTEGER;
  existing_count INTEGER;
BEGIN
  -- Check if we already have seed users
  SELECT COUNT(*) INTO existing_count FROM auth.users WHERE email LIKE '%@test.local';
  
  IF existing_count >= 8 THEN
    RAISE NOTICE 'Seed users already exist (% found). Skipping user creation.', existing_count;
    RETURN;
  END IF;

  -- Create 8 test users
  FOR i IN 1..8 LOOP
    -- Generate a new UUID for this user
    new_user_id := gen_random_uuid();
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    )
    VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      profile_emails[i],
      crypt('password123', gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('email', profile_emails[i], 'email_verified', true),
      'authenticated',
      'authenticated',
      NOW() - (i || ' days')::INTERVAL,
      NOW(),
      '',
      ''
    );
    
    -- Create identity for this user
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', profile_emails[i]),
      'email',
      new_user_id::text,
      NOW(),
      NOW(),
      NOW()
    );
    
    -- Create profile for this user (use full_name instead of assuming columns)
    INSERT INTO profile (
      id,
      full_name,
      display_name,
      email,
      profile_picture_url,
      birth_date,
      onboarding_completed,
      account_status,
      email_verified
    )
    VALUES (
      new_user_id,
      profile_names[i],
      profile_displays[i],
      profile_emails[i],
      'https://i.pravatar.cc/150?u=' || profile_displays[i],
      ('1990-01-01'::DATE + (i * 365 || ' days')::INTERVAL)::DATE,
      true,
      'active',
      true
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create player record for this user
    INSERT INTO player (
      id,
      gender,
      playing_hand,
      max_travel_distance,
      notification_match_requests,
      notification_messages,
      notification_reminders,
      privacy_show_age,
      privacy_show_location,
      privacy_show_stats
    )
    VALUES (
      new_user_id,
      (CASE WHEN i IN (2, 5, 8) THEN 'female' ELSE 'male' END)::gender_type,
      'right'::playing_hand,
      25,
      true,
      true,
      true,
      true,
      true,
      true
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Store the user ID for later use
    user_ids := array_append(user_ids, new_user_id);
    
    RAISE NOTICE 'Created seed user: % (%)', profile_names[i], profile_emails[i];
  END LOOP;
  
  RAISE NOTICE 'Successfully created % seed users', array_length(user_ids, 1);
END $$;

-- ============================================================================
-- 2. SEED TENNIS AND PICKLEBALL MATCHES (with all columns)
-- ============================================================================

DO $$
DECLARE
  -- Sports
  tennis_sport_id UUID;
  pickleball_sport_id UUID;
  
  -- Facilities (use existing seeded facilities from 20251214000001)
  facility_1_id UUID;  -- Parc Jarry
  facility_2_id UUID;  -- Parc La Fontaine
  facility_3_id UUID;  -- Parc Jeanne-Mance
  
  -- Rating scores (may be NULL if not seeded)
  tennis_rating_35_id UUID;
  tennis_rating_40_id UUID;
  pickleball_rating_30_id UUID;
  pickleball_rating_40_id UUID;
  
  -- Time variables
  now_time TIMESTAMPTZ := NOW();
  today_date DATE := CURRENT_DATE;
  tomorrow_date DATE := CURRENT_DATE + INTERVAL '1 day';
  next_week_date DATE := CURRENT_DATE + INTERVAL '5 days';
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  
  -- User IDs (fetched from seed users)
  creator_ids UUID[];
  creator_1_id UUID;
  creator_2_id UUID;
  creator_3_id UUID;
  creator_4_id UUID;
  creator_5_id UUID;
  creator_6_id UUID;
  creator_7_id UUID;
  creator_8_id UUID;
  
  -- Match IDs
  match_id UUID;
BEGIN
  -- Get creator user IDs from seed users
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO creator_ids 
  FROM profile 
  WHERE email LIKE '%@test.local'
  LIMIT 8;
  
  -- If no seed users exist, skip match seeding
  IF creator_ids IS NULL OR array_length(creator_ids, 1) < 1 THEN
    RAISE NOTICE 'No seed users found. Skipping match seeding.';
    RETURN;
  END IF;
  
  -- Assign creator IDs
  creator_1_id := creator_ids[1];
  creator_2_id := creator_ids[LEAST(2, array_length(creator_ids, 1))];
  creator_3_id := creator_ids[LEAST(3, array_length(creator_ids, 1))];
  creator_4_id := creator_ids[LEAST(4, array_length(creator_ids, 1))];
  creator_5_id := creator_ids[LEAST(5, array_length(creator_ids, 1))];
  creator_6_id := creator_ids[LEAST(6, array_length(creator_ids, 1))];
  creator_7_id := creator_ids[LEAST(7, array_length(creator_ids, 1))];
  creator_8_id := creator_ids[LEAST(8, array_length(creator_ids, 1))];
  
  -- Get sport IDs
  SELECT id INTO tennis_sport_id FROM sport WHERE name = 'tennis' LIMIT 1;
  SELECT id INTO pickleball_sport_id FROM sport WHERE name = 'pickleball' LIMIT 1;
  
  -- Get facility IDs (using Montreal facilities seeded in 20251214000001)
  SELECT id INTO facility_1_id FROM facility WHERE slug = 'parc-jarry-tennis' LIMIT 1;
  SELECT id INTO facility_2_id FROM facility WHERE slug = 'parc-la-fontaine-tennis' LIMIT 1;
  SELECT id INTO facility_3_id FROM facility WHERE slug = 'parc-jeanne-mance-tennis' LIMIT 1;
  
  -- Log facility status for debugging
  IF facility_1_id IS NULL THEN
    RAISE NOTICE 'Parc Jarry facility not found - matches will use custom location';
  END IF;
  
  -- Get tennis rating score IDs (NTRP) - may be NULL if not seeded
  SELECT rs.id INTO tennis_rating_35_id FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    WHERE rs.label ILIKE '%3.5%' AND rsys.code = 'ntrp' LIMIT 1;
  SELECT rs.id INTO tennis_rating_40_id FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    WHERE rs.label ILIKE '%4.0%' AND rsys.code = 'ntrp' LIMIT 1;
  
  -- Get pickleball rating score IDs (DUPR) - may be NULL if not seeded
  SELECT rs.id INTO pickleball_rating_30_id FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    WHERE rs.label ILIKE '%3.0%' AND rsys.code = 'dupr' LIMIT 1;
  SELECT rs.id INTO pickleball_rating_40_id FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    WHERE rs.label ILIKE '%4.0%' AND rsys.code = 'dupr' LIMIT 1;
  
  -- ============================================================================
  -- TENNIS MATCHES
  -- ============================================================================
  
  -- Tennis Match 1: Today in 2 hours - Singles, Open, Competitive
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type, estimated_cost, min_rating_score_id,
    visibility, join_mode, notes, status,
    created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, creator_1_id, today_date,
    TO_CHAR(now_time + INTERVAL '2 hours', 'HH24:MI')::TIME,
    TO_CHAR(now_time + INTERVAL '4 hours', 'HH24:MI')::TIME,
    'America/Montreal', 'casual', 'singles', 'competitive', '120',
    CASE WHEN facility_1_id IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    facility_1_id, 'Parc Jarry Tennis Courts', '285 Rue Faillon O, Montreal',
    false, 'split_equal', 40.00, tennis_rating_35_id,
    'public', 'direct', 'Looking for a competitive singles match!', 'scheduled',
    now_time - INTERVAL '5 days', now_time - INTERVAL '5 days'
  );
  
  -- Tennis Match 2: Today in 5 hours - Singles, Full, Practice, Free court
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type, visibility, join_mode, notes, status,
    created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, creator_2_id, today_date,
    TO_CHAR(now_time + INTERVAL '5 hours', 'HH24:MI')::TIME,
    TO_CHAR(now_time + INTERVAL '7 hours', 'HH24:MI')::TIME,
    'America/Montreal', 'casual', 'singles', 'practice', '120',
    CASE WHEN facility_2_id IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    facility_2_id, 'Parc La Fontaine Tennis Courts', '3933 Avenue du Parc La Fontaine, Montreal',
    true, 'split_equal', 'public', 'direct', 'Practice session', 'scheduled',
    now_time - INTERVAL '3 days', now_time - INTERVAL '3 days'
  );
  INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at)
  VALUES (match_id, creator_3_id, 'joined', false, now_time - INTERVAL '2 days', now_time - INTERVAL '2 days');
  
  -- Tennis Match 3: Tomorrow morning - Doubles, Open, Practice, Free court
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type, visibility, join_mode, notes, status,
    created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, creator_3_id, tomorrow_date,
    '09:00'::TIME, '11:00'::TIME, 'America/Montreal',
    'casual', 'doubles', 'practice', '120',
    CASE WHEN facility_3_id IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    facility_3_id, 'Parc Jeanne-Mance Tennis Courts', 'Avenue du Parc, Montreal',
    true, 'split_equal', 'public', 'direct', 'Morning doubles practice - need 2 more!', 'scheduled',
    now_time - INTERVAL '2 days', now_time - INTERVAL '2 days'
  );
  INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at)
  VALUES (match_id, creator_4_id, 'joined', false, now_time - INTERVAL '1 day', now_time - INTERVAL '1 day');
  
  -- Tennis Match 4: Tomorrow evening - Doubles, Full, Competitive, High rating
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type, estimated_cost, min_rating_score_id,
    visibility, join_mode, notes, status, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, creator_4_id, tomorrow_date,
    '18:00'::TIME, '20:00'::TIME, 'America/Montreal',
    'casual', 'doubles', 'competitive', '120',
    CASE WHEN facility_1_id IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    facility_1_id, 'Parc Jarry Tennis Courts', '285 Rue Faillon O, Montreal',
    false, 'split_equal', 60.00, tennis_rating_40_id,
    'public', 'direct', 'Competitive doubles match', 'scheduled',
    now_time - INTERVAL '4 days', now_time - INTERVAL '4 days'
  );
  INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at) VALUES
    (match_id, creator_5_id, 'joined', false, now_time - INTERVAL '3 days', now_time - INTERVAL '3 days'),
    (match_id, creator_6_id, 'joined', false, now_time - INTERVAL '2 days', now_time - INTERVAL '2 days'),
    (match_id, creator_7_id, 'joined', false, now_time - INTERVAL '1 day', now_time - INTERVAL '1 day');
  
  -- Tennis Match 5: Yesterday - Completed match
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type, estimated_cost, visibility, join_mode,
    notes, status, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, creator_5_id, yesterday_date,
    '16:00'::TIME, '18:00'::TIME, 'America/Montreal',
    'casual', 'singles', 'competitive', '120',
    CASE WHEN facility_3_id IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    facility_3_id, 'Parc Jeanne-Mance Tennis Courts', 'Avenue du Parc, Montreal',
    false, 'split_equal', 45.00, 'public', 'direct',
    'Great match!', 'completed',
    now_time - INTERVAL '6 days', now_time - INTERVAL '1 day'
  );
  INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at)
  VALUES (match_id, creator_1_id, 'joined', false, now_time - INTERVAL '5 days', now_time - INTERVAL '5 days');
  
  -- ============================================================================
  -- PICKLEBALL MATCHES
  -- ============================================================================
  
  -- Pickleball Match 1: Today in 3 hours - Singles, Open, Casual
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    location_name, location_address, is_court_free, cost_split_type, min_rating_score_id,
    visibility, join_mode, notes, status, created_at, updated_at
  ) VALUES (
    match_id, pickleball_sport_id, creator_6_id, today_date,
    TO_CHAR(now_time + INTERVAL '3 hours', 'HH24:MI')::TIME,
    TO_CHAR(now_time + INTERVAL '5 hours', 'HH24:MI')::TIME,
    'America/Montreal', 'casual', 'singles', 'practice', '120', 'custom',
    'Community Center Courts', '123 Main Street, Montreal',
    true, 'split_equal', pickleball_rating_30_id, 'public', 'direct',
    'Beginner-friendly pickleball session!', 'scheduled',
    now_time - INTERVAL '2 days', now_time - INTERVAL '2 days'
  );
  
  -- Pickleball Match 2: Tomorrow afternoon - Doubles, Open, Competitive
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    location_name, location_address, is_court_free, cost_split_type, estimated_cost,
    min_rating_score_id, visibility, join_mode, notes, status,
    created_at, updated_at
  ) VALUES (
    match_id, pickleball_sport_id, creator_7_id, tomorrow_date,
    '14:00'::TIME, '16:00'::TIME, 'America/Montreal',
    'casual', 'doubles', 'competitive', '120', 'custom',
    'Pickleball Club Montreal', '456 Rue Sherbrooke, Montreal',
    false, 'split_equal', 25.00, pickleball_rating_40_id, 'public', 'direct',
    'Intermediate doubles game - looking for 3 more!', 'scheduled',
    now_time - INTERVAL '3 days', now_time - INTERVAL '3 days'
  );
  INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at)
  VALUES (match_id, creator_8_id, 'joined', false, now_time - INTERVAL '2 days', now_time - INTERVAL '2 days');
  
  -- Pickleball Match 3: Next week - Doubles, Full, High level
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    location_name, location_address, is_court_free, cost_split_type, estimated_cost,
    min_rating_score_id, visibility, join_mode, notes, status,
    created_at, updated_at
  ) VALUES (
    match_id, pickleball_sport_id, creator_8_id, next_week_date,
    '10:00'::TIME, '12:00'::TIME, 'America/Montreal',
    'casual', 'doubles', 'competitive', '120', 'custom',
    'Parc Maisonneuve', '4601 Rue Sherbrooke E, Montreal',
    false, 'split_equal', 15.00, pickleball_rating_40_id, 'public', 'direct',
    'Advanced players only! Looking for a serious game.', 'scheduled',
    now_time - INTERVAL '1 day', now_time - INTERVAL '1 day'
  );
  INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at) VALUES
    (match_id, creator_1_id, 'joined', false, now_time - INTERVAL '12 hours', now_time - INTERVAL '12 hours'),
    (match_id, creator_2_id, 'joined', false, now_time - INTERVAL '8 hours', now_time - INTERVAL '8 hours'),
    (match_id, creator_3_id, 'joined', false, now_time - INTERVAL '4 hours', now_time - INTERVAL '4 hours');
  
  -- Pickleball Match 4: Today evening - Mixed doubles, Open
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    location_name, location_address, is_court_free, cost_split_type, min_rating_score_id,
    visibility, join_mode, notes, status, created_at, updated_at
  ) VALUES (
    match_id, pickleball_sport_id, creator_2_id, today_date,
    TO_CHAR(now_time + INTERVAL '6 hours', 'HH24:MI')::TIME,
    TO_CHAR(now_time + INTERVAL '8 hours', 'HH24:MI')::TIME,
    'America/Montreal', 'casual', 'doubles', 'practice', '120', 'custom',
    'YMCA Downtown', '1440 Rue Stanley, Montreal',
    true, 'split_equal', pickleball_rating_30_id, 'public', 'direct',
    'Mixed doubles - all skill levels welcome!', 'scheduled',
    now_time - INTERVAL '4 days', now_time - INTERVAL '4 days'
  );
  INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at) VALUES
    (match_id, creator_5_id, 'joined', false, now_time - INTERVAL '3 days', now_time - INTERVAL '3 days'),
    (match_id, creator_8_id, 'joined', false, now_time - INTERVAL '2 days', now_time - INTERVAL '2 days');
  
  -- Pickleball Match 5: TBD location
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    location_name, is_court_free, cost_split_type, visibility, join_mode, notes, status,
    created_at, updated_at
  ) VALUES (
    match_id, pickleball_sport_id, creator_4_id, tomorrow_date,
    '11:00'::TIME, '13:00'::TIME, 'America/Montreal',
    'casual', 'singles', 'practice', '120', 'tbd',
    'TBD - Will decide with partner', true, 'split_equal',
    'public', 'direct', 'Flexible on location - downtown area preferred', 'scheduled',
    now_time - INTERVAL '1 day', now_time - INTERVAL '1 day'
  );
  
  RAISE NOTICE 'Successfully seeded 5 tennis matches and 5 pickleball matches';
END $$;

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  user_count INTEGER;
  tennis_count INTEGER;
  pickleball_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profile WHERE email LIKE '%@test.local';
  SELECT COUNT(*) INTO tennis_count FROM match m JOIN sport s ON m.sport_id = s.id WHERE s.name = 'tennis';
  SELECT COUNT(*) INTO pickleball_count FROM match m JOIN sport s ON m.sport_id = s.id WHERE s.name = 'pickleball';
  
  RAISE NOTICE 'Seed verification:';
  RAISE NOTICE '  - Seed users: %', user_count;
  RAISE NOTICE '  - Tennis matches: %', tennis_count;
  RAISE NOTICE '  - Pickleball matches: %', pickleball_count;
END $$;
