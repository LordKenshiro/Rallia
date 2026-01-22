-- ============================================================================
-- Migration: Seed Additional Matches for Testing All Configurations
-- Created: 2025-12-23
-- Description: Seeds more tennis and pickleball matches with various configurations
--              to test all possible match settings (visibility, join mode, 
--              gender preferences, rating requirements, cost options, etc.)
-- ============================================================================

DO $$
DECLARE
  -- Sports
  tennis_sport_id UUID;
  pickleball_sport_id UUID;
  
  -- Facilities (use existing seeded facilities)
  facility_jarry_id UUID;
  facility_lafontaine_id UUID;
  facility_jeanne_mance_id UUID;
  facility_maisonneuve_id UUID;
  facility_laurier_id UUID;
  facility_mont_royal_id UUID;
  facility_ahuntsic_id UUID;
  facility_angrignon_id UUID;
  facility_outremont_id UUID;
  
  -- Rating scores
  tennis_rating_25_id UUID;
  tennis_rating_30_id UUID;
  tennis_rating_35_id UUID;
  tennis_rating_40_id UUID;
  tennis_rating_45_id UUID;
  pickleball_rating_25_id UUID;
  pickleball_rating_30_id UUID;
  pickleball_rating_35_id UUID;
  pickleball_rating_40_id UUID;
  pickleball_rating_45_id UUID;
  
  -- Time variables
  now_time TIMESTAMPTZ := NOW();
  today_date DATE := CURRENT_DATE;
  tomorrow_date DATE := CURRENT_DATE + INTERVAL '1 day';
  day_after_tomorrow DATE := CURRENT_DATE + INTERVAL '2 days';
  in_3_days DATE := CURRENT_DATE + INTERVAL '3 days';
  in_4_days DATE := CURRENT_DATE + INTERVAL '4 days';
  in_5_days DATE := CURRENT_DATE + INTERVAL '5 days';
  next_week DATE := CURRENT_DATE + INTERVAL '7 days';
  in_2_weeks DATE := CURRENT_DATE + INTERVAL '14 days';
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  two_days_ago DATE := CURRENT_DATE - INTERVAL '2 days';
  
  -- User IDs (fetched from seed users)
  creator_ids UUID[];
  user_1 UUID;
  user_2 UUID;
  user_3 UUID;
  user_4 UUID;
  user_5 UUID;
  user_6 UUID;
  user_7 UUID;
  user_8 UUID;
  
  -- Match ID for participants
  match_id UUID;
  existing_match_count INTEGER;
BEGIN
  -- Check how many matches already exist to avoid duplicates
  SELECT COUNT(*) INTO existing_match_count FROM match;
  
  IF existing_match_count >= 25 THEN
    RAISE NOTICE 'Already have % matches. Skipping additional seed.', existing_match_count;
    RETURN;
  END IF;

  -- Get creator user IDs from seed users
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO creator_ids 
  FROM profile 
  WHERE email LIKE '%@test.local'
  LIMIT 8;
  
  IF creator_ids IS NULL OR array_length(creator_ids, 1) < 1 THEN
    RAISE NOTICE 'No seed users found. Skipping match seeding.';
    RETURN;
  END IF;
  
  -- Assign user IDs
  user_1 := creator_ids[1];
  user_2 := creator_ids[LEAST(2, array_length(creator_ids, 1))];
  user_3 := creator_ids[LEAST(3, array_length(creator_ids, 1))];
  user_4 := creator_ids[LEAST(4, array_length(creator_ids, 1))];
  user_5 := creator_ids[LEAST(5, array_length(creator_ids, 1))];
  user_6 := creator_ids[LEAST(6, array_length(creator_ids, 1))];
  user_7 := creator_ids[LEAST(7, array_length(creator_ids, 1))];
  user_8 := creator_ids[LEAST(8, array_length(creator_ids, 1))];
  
  -- Get sport IDs
  SELECT id INTO tennis_sport_id FROM sport WHERE name = 'tennis' LIMIT 1;
  SELECT id INTO pickleball_sport_id FROM sport WHERE name = 'pickleball' LIMIT 1;
  
  IF tennis_sport_id IS NULL THEN
    RAISE NOTICE 'Tennis sport not found. Skipping match seeding.';
    RETURN;
  END IF;
  
  -- Get facility IDs
  SELECT id INTO facility_jarry_id FROM facility WHERE slug = 'parc-jarry-tennis' LIMIT 1;
  SELECT id INTO facility_lafontaine_id FROM facility WHERE slug = 'parc-la-fontaine-tennis' LIMIT 1;
  SELECT id INTO facility_jeanne_mance_id FROM facility WHERE slug = 'parc-jeanne-mance-tennis' LIMIT 1;
  SELECT id INTO facility_maisonneuve_id FROM facility WHERE slug = 'parc-maisonneuve-tennis' LIMIT 1;
  SELECT id INTO facility_laurier_id FROM facility WHERE slug = 'parc-laurier-tennis' LIMIT 1;
  SELECT id INTO facility_mont_royal_id FROM facility WHERE slug = 'parc-mont-royal-tennis' LIMIT 1;
  SELECT id INTO facility_ahuntsic_id FROM facility WHERE slug = 'parc-ahuntsic-tennis' LIMIT 1;
  SELECT id INTO facility_angrignon_id FROM facility WHERE slug = 'parc-angrignon-tennis' LIMIT 1;
  SELECT id INTO facility_outremont_id FROM facility WHERE slug = 'parc-outremont-tennis' LIMIT 1;
  
  -- Get tennis rating score IDs (NTRP)
  SELECT rs.id INTO tennis_rating_25_id FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    WHERE rs.label ILIKE '%2.5%' AND rsys.code = 'ntrp' LIMIT 1;
  SELECT rs.id INTO tennis_rating_30_id FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    WHERE rs.label ILIKE '%3.0%' AND rsys.code = 'ntrp' LIMIT 1;
  SELECT rs.id INTO tennis_rating_35_id FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    WHERE rs.label ILIKE '%3.5%' AND rsys.code = 'ntrp' LIMIT 1;
  SELECT rs.id INTO tennis_rating_40_id FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    WHERE rs.label ILIKE '%4.0%' AND rsys.code = 'ntrp' LIMIT 1;
  SELECT rs.id INTO tennis_rating_45_id FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    WHERE rs.label ILIKE '%4.5%' AND rsys.code = 'ntrp' LIMIT 1;
  
  -- Get pickleball rating score IDs (DUPR)
  SELECT rs.id INTO pickleball_rating_25_id FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    WHERE rs.label ILIKE '%2.5%' AND rsys.code = 'dupr' LIMIT 1;
  SELECT rs.id INTO pickleball_rating_30_id FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    WHERE rs.label ILIKE '%3.0%' AND rsys.code = 'dupr' LIMIT 1;
  SELECT rs.id INTO pickleball_rating_35_id FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    WHERE rs.label ILIKE '%3.5%' AND rsys.code = 'dupr' LIMIT 1;
  SELECT rs.id INTO pickleball_rating_40_id FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    WHERE rs.label ILIKE '%4.0%' AND rsys.code = 'dupr' LIMIT 1;
  SELECT rs.id INTO pickleball_rating_45_id FROM rating_score rs
    JOIN rating_system rsys ON rs.rating_system_id = rsys.id
    WHERE rs.label ILIKE '%4.5%' AND rsys.code = 'dupr' LIMIT 1;

  -- ============================================================================
  -- TENNIS MATCHES - Various Configurations
  -- ============================================================================
  
  RAISE NOTICE 'Creating additional tennis matches...';

  -- Tennis 1: Private match with request-to-join mode
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type, estimated_cost,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, user_1, tomorrow_date,
    '10:00'::TIME, '12:00'::TIME, 'America/Montreal',
    'competitive', 'singles', 'competitive', '120',
    'facility'::location_type_enum, facility_jarry_id,
    'Parc Jarry Tennis Courts', '285 Rue Faillon O, Montreal',
    false, 'split_equal', 50.00,
    'private', 'request', 'Private competitive singles - request to join',
    now_time - INTERVAL '2 days', now_time - INTERVAL '2 days'
  );
  
  -- Tennis 2: Women-only match (gender preference)
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type, preferred_opponent_gender,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, user_2, tomorrow_date,
    '08:00'::TIME, '09:30'::TIME, 'America/Montreal',
    'casual', 'doubles', 'casual', '90',
    'facility'::location_type_enum, facility_lafontaine_id,
    'Parc La Fontaine Tennis Courts', '3933 Avenue du Parc La Fontaine, Montreal',
    true, 'split_equal', 'female',
    'public', 'direct', 'Ladies morning doubles - all levels welcome!',
    now_time - INTERVAL '3 days', now_time - INTERVAL '3 days'
  );
  INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at)
  VALUES (match_id, user_5, 'joined', false, now_time - INTERVAL '2 days', now_time - INTERVAL '2 days');
  
  -- Tennis 3: Host pays configuration
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type, estimated_cost, min_rating_score_id,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, user_3, day_after_tomorrow,
    '14:00'::TIME, '16:00'::TIME, 'America/Montreal',
    'competitive', 'singles', 'competitive', '120',
    'facility'::location_type_enum, facility_maisonneuve_id,
    'Parc Maisonneuve Tennis Courts', '4601 Rue Sherbrooke Est, Montreal',
    false, 'host_pays', 40.00, tennis_rating_40_id,
    'public', 'direct', 'I will pay for the court - looking for 4.0+ player!',
    now_time - INTERVAL '1 day', now_time - INTERVAL '1 day'
  );
  
  -- Tennis 4: Early morning match (6 AM)
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, user_4, in_3_days,
    '06:00'::TIME, '07:00'::TIME, 'America/Montreal',
    'casual', 'singles', 'casual', '60',
    'facility'::location_type_enum, facility_laurier_id,
    'Parc Laurier Tennis Courts', 'Rue Laurier Est, Montreal',
    true, 'split_equal',
    'public', 'direct', 'Early bird tennis before work!',
    now_time - INTERVAL '12 hours', now_time - INTERVAL '12 hours'
  );
  
  -- Tennis 5: Late evening match (9 PM)
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type, estimated_cost,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, user_5, in_3_days,
    '21:00'::TIME, '22:30'::TIME, 'America/Montreal',
    'casual', 'doubles', 'both', '90',
    'facility'::location_type_enum, facility_mont_royal_id,
    'Parc du Mont-Royal Tennis Courts', 'Chemin Remembrance, Montreal',
    false, 'split_equal', 35.00,
    'public', 'direct', 'Evening doubles under the lights!',
    now_time - INTERVAL '6 hours', now_time - INTERVAL '6 hours'
  );
  INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at)
  VALUES (match_id, user_1, 'joined', false, now_time - INTERVAL '4 hours', now_time - INTERVAL '4 hours');
  
  -- Tennis 6: Beginner-friendly (low rating requirement)
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type, min_rating_score_id,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, user_6, in_4_days,
    '15:00'::TIME, '16:30'::TIME, 'America/Montreal',
    'casual', 'singles', 'casual', '90',
    'facility'::location_type_enum, facility_ahuntsic_id,
    'Parc Ahuntsic Tennis Courts', '10555 Rue Lajeunesse, Montreal',
    true, 'split_equal', tennis_rating_25_id,
    'public', 'direct', 'Beginner friendly - just started learning tennis!',
    now_time - INTERVAL '2 days', now_time - INTERVAL '2 days'
  );
  
  -- Tennis 7: Advanced competitive match (4.5+ rating)
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type, estimated_cost, min_rating_score_id,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, user_7, in_5_days,
    '11:00'::TIME, '13:00'::TIME, 'America/Montreal',
    'competitive', 'singles', 'competitive', '120',
    'facility'::location_type_enum, facility_angrignon_id,
    'Parc Angrignon Tennis Courts', '3400 Boulevard des Trinitaires, Montreal',
    false, 'split_equal', 60.00, tennis_rating_45_id,
    'public', 'request', 'Advanced players only! Looking for serious competition.',
    now_time - INTERVAL '1 day', now_time - INTERVAL '1 day'
  );
  
  -- Tennis 8: Custom location (club)
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    location_name, location_address,
    is_court_free, cost_split_type, estimated_cost,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, user_8, next_week,
    '19:00'::TIME, '21:00'::TIME, 'America/Montreal',
    'competitive', 'doubles', 'competitive', '120',
    'custom'::location_type_enum,
    'Club de Tennis Outremont', '550 Chemin de la Côte-Sainte-Catherine, Montreal',
    false, 'split_equal', 80.00,
    'public', 'direct', 'Indoor courts at the club - doubles tournament prep',
    now_time - INTERVAL '3 days', now_time - INTERVAL '3 days'
  );
  INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at) VALUES
    (match_id, user_2, 'joined', false, now_time - INTERVAL '2 days', now_time - INTERVAL '2 days'),
    (match_id, user_4, 'joined', false, now_time - INTERVAL '1 day', now_time - INTERVAL '1 day');
  
  -- Tennis 9: TBD location - flexible meetup
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    location_name,
    is_court_free, cost_split_type,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, user_1, in_4_days,
    '16:00'::TIME, '18:00'::TIME, 'America/Montreal',
    'casual', 'singles', 'both', '120',
    'tbd'::location_type_enum,
    'TBD - Downtown Montreal area',
    true, 'split_equal',
    'public', 'direct', 'Location flexible - will decide with partner. Downtown preferred.',
    now_time - INTERVAL '1 day', now_time - INTERVAL '1 day'
  );
  
  -- Tennis 10: Men-only doubles
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type, estimated_cost, preferred_opponent_gender, min_rating_score_id,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, user_3, next_week,
    '09:00'::TIME, '11:00'::TIME, 'America/Montreal',
    'competitive', 'doubles', 'competitive', '120',
    'facility'::location_type_enum, facility_outremont_id,
    'Parc Outremont Tennis Courts', 'Avenue McEachran, Montreal',
    false, 'split_equal', 45.00, 'male', tennis_rating_35_id,
    'public', 'direct', 'Mens doubles - 3.5+ level, competitive but fun!',
    now_time - INTERVAL '4 days', now_time - INTERVAL '4 days'
  );
  INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at)
  VALUES (match_id, user_7, 'joined', false, now_time - INTERVAL '3 days', now_time - INTERVAL '3 days');
  
  -- Tennis 11: Short 30-min hitting session (need to check if duration supports this)
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, user_2, today_date,
    '12:00'::TIME, '13:00'::TIME, 'America/Montreal',
    'casual', 'singles', 'casual', '60',
    'facility'::location_type_enum, facility_jarry_id,
    'Parc Jarry Tennis Courts', '285 Rue Faillon O, Montreal',
    true, 'split_equal',
    'public', 'direct', 'Quick lunch break hitting session!',
    now_time - INTERVAL '4 hours', now_time - INTERVAL '4 hours'
  );
  
  -- Tennis 12: Cancelled match (for testing status display)
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, user_4, yesterday_date,
    '17:00'::TIME, '19:00'::TIME, 'America/Montreal',
    'casual', 'singles', 'casual', '120',
    'facility'::location_type_enum, facility_lafontaine_id,
    'Parc La Fontaine Tennis Courts', '3933 Avenue du Parc La Fontaine, Montreal',
    true, 'split_equal',
    'public', 'direct', 'Had to cancel due to rain',
    now_time - INTERVAL '5 days', now_time - INTERVAL '1 day'
  );
  
  -- Tennis 13: In-progress match (testing status)
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type, estimated_cost,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, tennis_sport_id, user_6, today_date,
    TO_CHAR(now_time - INTERVAL '30 minutes', 'HH24:MI')::TIME,
    TO_CHAR(now_time + INTERVAL '90 minutes', 'HH24:MI')::TIME,
    'America/Montreal',
    'competitive', 'singles', 'competitive', '120',
    'facility'::location_type_enum, facility_jeanne_mance_id,
    'Parc Jeanne-Mance Tennis Courts', 'Avenue du Parc, Montreal',
    false, 'split_equal', 35.00,
    'public', 'direct', 'Currently playing!',
    now_time - INTERVAL '3 days', now_time - INTERVAL '30 minutes'
  );
  INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at)
  VALUES (match_id, user_8, 'joined', false, now_time - INTERVAL '2 days', now_time - INTERVAL '2 days');

  -- ============================================================================
  -- PICKLEBALL MATCHES - Various Configurations
  -- ============================================================================
  
  RAISE NOTICE 'Creating additional pickleball matches...';

  IF pickleball_sport_id IS NOT NULL THEN
  
    -- Pickleball 1: Private with request mode
    match_id := gen_random_uuid();
    INSERT INTO match (
      id, sport_id, created_by, match_date, start_time, end_time, timezone,
      match_type, format, player_expectation, duration, location_type,
      location_name, location_address,
      is_court_free, cost_split_type, estimated_cost,
      visibility, join_mode, notes, created_at, updated_at
    ) VALUES (
      match_id, pickleball_sport_id, user_1, tomorrow_date,
      '13:00'::TIME, '15:00'::TIME, 'America/Montreal',
      'competitive', 'doubles', 'competitive', '120',
      'custom'::location_type_enum,
      'Centre Sportif Claude-Robillard', '1000 Émile-Journault, Montreal',
      false, 'split_equal', 30.00,
      'private', 'request', 'Private doubles match - approved players only',
      now_time - INTERVAL '2 days', now_time - INTERVAL '2 days'
    );
    
    -- Pickleball 2: Women-only session
    match_id := gen_random_uuid();
    INSERT INTO match (
      id, sport_id, created_by, match_date, start_time, end_time, timezone,
      match_type, format, player_expectation, duration, location_type,
      location_name, location_address,
      is_court_free, cost_split_type, preferred_opponent_gender,
      visibility, join_mode, notes, created_at, updated_at
    ) VALUES (
      match_id, pickleball_sport_id, user_5, day_after_tomorrow,
      '10:00'::TIME, '12:00'::TIME, 'America/Montreal',
      'casual', 'doubles', 'casual', '120',
      'custom'::location_type_enum,
      'YMCA du Parc', '5550 Avenue du Parc, Montreal',
      true, 'split_equal', 'female',
      'public', 'direct', 'Ladies pickleball morning - beginners welcome!',
      now_time - INTERVAL '3 days', now_time - INTERVAL '3 days'
    );
    INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at)
    VALUES (match_id, user_8, 'joined', false, now_time - INTERVAL '2 days', now_time - INTERVAL '2 days');
    
    -- Pickleball 3: High-level competitive (4.0+)
    match_id := gen_random_uuid();
    INSERT INTO match (
      id, sport_id, created_by, match_date, start_time, end_time, timezone,
      match_type, format, player_expectation, duration, location_type,
      location_name, location_address,
      is_court_free, cost_split_type, estimated_cost, min_rating_score_id,
      visibility, join_mode, notes, created_at, updated_at
    ) VALUES (
      match_id, pickleball_sport_id, user_3, in_3_days,
      '18:00'::TIME, '20:00'::TIME, 'America/Montreal',
      'competitive', 'doubles', 'competitive', '120',
      'custom'::location_type_enum,
      'Complexe Sportif Claude-Robillard', '1000 Émile-Journault, Montreal',
      false, 'split_equal', 40.00, pickleball_rating_40_id,
      'public', 'request', 'Advanced players only - tournament prep!',
      now_time - INTERVAL '1 day', now_time - INTERVAL '1 day'
    );
    
    -- Pickleball 4: Beginner-friendly with low rating
    match_id := gen_random_uuid();
    INSERT INTO match (
      id, sport_id, created_by, match_date, start_time, end_time, timezone,
      match_type, format, player_expectation, duration, location_type,
      location_name, location_address,
      is_court_free, cost_split_type, min_rating_score_id,
      visibility, join_mode, notes, created_at, updated_at
    ) VALUES (
      match_id, pickleball_sport_id, user_4, in_4_days,
      '09:00'::TIME, '10:30'::TIME, 'America/Montreal',
      'casual', 'doubles', 'casual', '90',
      'custom'::location_type_enum,
      'Parc La Fontaine Courts', '3933 Avenue du Parc La Fontaine, Montreal',
      true, 'split_equal', pickleball_rating_25_id,
      'public', 'direct', 'Beginner session - learning together!',
      now_time - INTERVAL '2 days', now_time - INTERVAL '2 days'
    );
    INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at) VALUES
      (match_id, user_6, 'joined', false, now_time - INTERVAL '1 day', now_time - INTERVAL '1 day'),
      (match_id, user_7, 'joined', false, now_time - INTERVAL '12 hours', now_time - INTERVAL '12 hours');
    
    -- Pickleball 5: Singles match (less common in pickleball)
    match_id := gen_random_uuid();
    INSERT INTO match (
      id, sport_id, created_by, match_date, start_time, end_time, timezone,
      match_type, format, player_expectation, duration, location_type,
      location_name, location_address,
      is_court_free, cost_split_type,
      visibility, join_mode, notes, created_at, updated_at
    ) VALUES (
      match_id, pickleball_sport_id, user_6, in_5_days,
      '07:00'::TIME, '08:00'::TIME, 'America/Montreal',
      'casual', 'singles', 'both', '60',
      'custom'::location_type_enum,
      'Centre Récréatif Saint-Laurent', '1750 Boulevard Thimens, Saint-Laurent',
      true, 'split_equal',
      'public', 'direct', 'Pickleball singles - great cardio workout!',
      now_time - INTERVAL '1 day', now_time - INTERVAL '1 day'
    );
    
    -- Pickleball 6: Host pays - looking for partner
    match_id := gen_random_uuid();
    INSERT INTO match (
      id, sport_id, created_by, match_date, start_time, end_time, timezone,
      match_type, format, player_expectation, duration, location_type,
      location_name, location_address,
      is_court_free, cost_split_type, estimated_cost, min_rating_score_id,
      visibility, join_mode, notes, created_at, updated_at
    ) VALUES (
      match_id, pickleball_sport_id, user_7, next_week,
      '16:00'::TIME, '18:00'::TIME, 'America/Montreal',
      'competitive', 'doubles', 'competitive', '120',
      'custom'::location_type_enum,
      'Complexe Sportif Marie-Victorin', '7000 Rue Marie-Victorin, Montreal',
      false, 'host_pays', 35.00, pickleball_rating_35_id,
      'public', 'direct', 'Need 3 more players - I cover the court cost!',
      now_time - INTERVAL '2 days', now_time - INTERVAL '2 days'
    );
    
    -- Pickleball 7: Evening social game
    match_id := gen_random_uuid();
    INSERT INTO match (
      id, sport_id, created_by, match_date, start_time, end_time, timezone,
      match_type, format, player_expectation, duration, location_type,
      location_name, location_address,
      is_court_free, cost_split_type,
      visibility, join_mode, notes, created_at, updated_at
    ) VALUES (
      match_id, pickleball_sport_id, user_8, in_3_days,
      '20:00'::TIME, '22:00'::TIME, 'America/Montreal',
      'casual', 'doubles', 'casual', '120',
      'custom'::location_type_enum,
      'Centre Communautaire Rosemont', '4675 Rue Pierre-de-Coubertin, Montreal',
      true, 'split_equal',
      'public', 'direct', 'Evening social pickleball - come hang out!',
      now_time - INTERVAL '1 day', now_time - INTERVAL '1 day'
    );
    INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at) VALUES
      (match_id, user_1, 'joined', false, now_time - INTERVAL '8 hours', now_time - INTERVAL '8 hours'),
      (match_id, user_3, 'joined', false, now_time - INTERVAL '4 hours', now_time - INTERVAL '4 hours');
    
    -- Pickleball 8: TBD location
    match_id := gen_random_uuid();
    INSERT INTO match (
      id, sport_id, created_by, match_date, start_time, end_time, timezone,
      match_type, format, player_expectation, duration, location_type,
      location_name,
      is_court_free, cost_split_type,
      visibility, join_mode, notes, created_at, updated_at
    ) VALUES (
      match_id, pickleball_sport_id, user_2, in_4_days,
      '14:00'::TIME, '16:00'::TIME, 'America/Montreal',
      'casual', 'doubles', 'both', '120',
      'tbd'::location_type_enum,
      'TBD - West Island area',
      true, 'split_equal',
      'public', 'direct', 'Looking for players in West Island - location flexible',
      now_time - INTERVAL '1 day', now_time - INTERVAL '1 day'
    );
    
    -- Pickleball 9: Completed match (for history)
    match_id := gen_random_uuid();
    INSERT INTO match (
      id, sport_id, created_by, match_date, start_time, end_time, timezone,
      match_type, format, player_expectation, duration, location_type,
      location_name, location_address,
      is_court_free, cost_split_type, estimated_cost,
      visibility, join_mode, notes, created_at, updated_at
    ) VALUES (
      match_id, pickleball_sport_id, user_4, two_days_ago,
      '11:00'::TIME, '13:00'::TIME, 'America/Montreal',
      'competitive', 'doubles', 'competitive', '120',
      'custom'::location_type_enum,
      'YMCA Centre-Ville', '1440 Rue Stanley, Montreal',
      false, 'split_equal', 25.00,
      'public', 'direct', 'Great games! Thanks everyone!',
      now_time - INTERVAL '7 days', now_time - INTERVAL '2 days'
    );
    INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at) VALUES
      (match_id, user_5, 'joined', false, now_time - INTERVAL '6 days', now_time - INTERVAL '6 days'),
      (match_id, user_6, 'joined', false, now_time - INTERVAL '5 days', now_time - INTERVAL '5 days'),
      (match_id, user_7, 'joined', false, now_time - INTERVAL '4 days', now_time - INTERVAL '4 days');
    
    -- Pickleball 10: Men-only competitive
    match_id := gen_random_uuid();
    INSERT INTO match (
      id, sport_id, created_by, match_date, start_time, end_time, timezone,
      match_type, format, player_expectation, duration, location_type,
      location_name, location_address,
      is_court_free, cost_split_type, estimated_cost, preferred_opponent_gender, min_rating_score_id,
      visibility, join_mode, notes, created_at, updated_at
    ) VALUES (
      match_id, pickleball_sport_id, user_1, in_2_weeks,
      '08:00'::TIME, '10:00'::TIME, 'America/Montreal',
      'competitive', 'doubles', 'competitive', '120',
      'custom'::location_type_enum,
      'Centre Pierre-Charbonneau', '3000 Rue Viau, Montreal',
      false, 'split_equal', 40.00, 'male', pickleball_rating_35_id,
      'public', 'direct', 'Mens competitive doubles - 3.5+ level',
      now_time - INTERVAL '3 days', now_time - INTERVAL '3 days'
    );
    INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at)
    VALUES (match_id, user_3, 'joined', false, now_time - INTERVAL '2 days', now_time - INTERVAL '2 days');
    
  ELSE
    RAISE NOTICE 'Pickleball sport not found. Skipping pickleball matches.';
  END IF;

  RAISE NOTICE 'Successfully created additional tennis and pickleball matches with various configurations!';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  total_match_count INTEGER;
  tennis_count INTEGER;
  pickleball_count INTEGER;
  scheduled_count INTEGER;
  completed_count INTEGER;
  cancelled_count INTEGER;
  in_progress_count INTEGER;
  singles_count INTEGER;
  doubles_count INTEGER;
  private_count INTEGER;
  request_mode_count INTEGER;
  with_rating_req INTEGER;
  with_gender_pref INTEGER;
  host_pays_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_match_count FROM match;
  SELECT COUNT(*) INTO tennis_count FROM match m JOIN sport s ON m.sport_id = s.id WHERE s.name = 'tennis';
  SELECT COUNT(*) INTO pickleball_count FROM match m JOIN sport s ON m.sport_id = s.id WHERE s.name = 'pickleball';
  SELECT COUNT(*) INTO scheduled_count FROM match WHERE cancelled_at IS NULL AND NOT EXISTS (SELECT 1 FROM match_result mr WHERE mr.match_id = match.id);
  SELECT COUNT(*) INTO completed_count FROM match WHERE EXISTS (SELECT 1 FROM match_result mr WHERE mr.match_id = match.id);
  SELECT COUNT(*) INTO cancelled_count FROM match WHERE cancelled_at IS NOT NULL;
  SELECT COUNT(*) INTO in_progress_count FROM match WHERE cancelled_at IS NULL AND EXISTS (SELECT 1 FROM match_result mr WHERE mr.match_id = match.id);
  SELECT COUNT(*) INTO singles_count FROM match WHERE format = 'singles';
  SELECT COUNT(*) INTO doubles_count FROM match WHERE format = 'doubles';
  SELECT COUNT(*) INTO private_count FROM match WHERE visibility = 'private';
  SELECT COUNT(*) INTO request_mode_count FROM match WHERE join_mode = 'request';
  SELECT COUNT(*) INTO with_rating_req FROM match WHERE min_rating_score_id IS NOT NULL;
  SELECT COUNT(*) INTO with_gender_pref FROM match WHERE preferred_opponent_gender IS NOT NULL;
  SELECT COUNT(*) INTO host_pays_count FROM match WHERE cost_split_type = 'host_pays';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Match Seed Verification:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total matches: %', total_match_count;
  RAISE NOTICE '  - Tennis: %', tennis_count;
  RAISE NOTICE '  - Pickleball: %', pickleball_count;
  RAISE NOTICE '';
  RAISE NOTICE 'By Status:';
  RAISE NOTICE '  - Scheduled: %', scheduled_count;
  RAISE NOTICE '  - Completed: %', completed_count;
  RAISE NOTICE '  - Cancelled: %', cancelled_count;
  RAISE NOTICE '  - In Progress: %', in_progress_count;
  RAISE NOTICE '';
  RAISE NOTICE 'By Format:';
  RAISE NOTICE '  - Singles: %', singles_count;
  RAISE NOTICE '  - Doubles: %', doubles_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Special Configurations:';
  RAISE NOTICE '  - Private matches: %', private_count;
  RAISE NOTICE '  - Request-to-join: %', request_mode_count;
  RAISE NOTICE '  - With rating requirement: %', with_rating_req;
  RAISE NOTICE '  - With gender preference: %', with_gender_pref;
  RAISE NOTICE '  - Host pays: %', host_pays_count;
  RAISE NOTICE '========================================';
END $$;

