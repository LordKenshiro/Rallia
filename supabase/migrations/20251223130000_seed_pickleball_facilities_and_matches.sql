-- Migration: Seed Pickleball Facilities and Update Matches
-- Description: Add pickleball to existing facilities and create facility-based pickleball matches
--              so they appear in the "Soon & Nearby" section

-- ============================================================================
-- 1. Link existing tennis facilities to also support pickleball
-- ============================================================================

DO $$
DECLARE
  pickleball_sport_id UUID;
  facility_count INTEGER := 0;
BEGIN
  -- Get pickleball sport ID
  SELECT id INTO pickleball_sport_id FROM sport WHERE name = 'pickleball' LIMIT 1;
  
  IF pickleball_sport_id IS NULL THEN
    RAISE NOTICE 'Pickleball sport not found. Skipping.';
    RETURN;
  END IF;

  -- Link all Montreal tennis facilities to also support pickleball
  INSERT INTO facility_sport (facility_id, sport_id)
  SELECT f.id, pickleball_sport_id
  FROM facility f
  WHERE f.organization_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'  -- Montreal org
  ON CONFLICT (facility_id, sport_id) DO NOTHING;
  
  GET DIAGNOSTICS facility_count = ROW_COUNT;
  RAISE NOTICE 'Linked % facilities to pickleball', facility_count;
END $$;

-- ============================================================================
-- 2. Update existing pickleball matches to use facilities
-- ============================================================================

DO $$
DECLARE
  pickleball_sport_id UUID;
  facility_jarry_id UUID;
  facility_lafontaine_id UUID;
  facility_maisonneuve_id UUID;
  facility_laurier_id UUID;
  now_time TIMESTAMPTZ := NOW();
  today_date DATE := CURRENT_DATE;
  tomorrow_date DATE := CURRENT_DATE + INTERVAL '1 day';
  in_3_days DATE := CURRENT_DATE + INTERVAL '3 days';
  in_5_days DATE := CURRENT_DATE + INTERVAL '5 days';
  
  -- User IDs
  creator_ids UUID[];
  user_1 UUID;
  user_2 UUID;
  user_3 UUID;
  user_4 UUID;
  
  match_id UUID;
BEGIN
  -- Get sport and facility IDs
  SELECT id INTO pickleball_sport_id FROM sport WHERE name = 'pickleball' LIMIT 1;
  SELECT id INTO facility_jarry_id FROM facility WHERE slug = 'parc-jarry-tennis' LIMIT 1;
  SELECT id INTO facility_lafontaine_id FROM facility WHERE slug = 'parc-la-fontaine-tennis' LIMIT 1;
  SELECT id INTO facility_maisonneuve_id FROM facility WHERE slug = 'parc-maisonneuve-tennis' LIMIT 1;
  SELECT id INTO facility_laurier_id FROM facility WHERE slug = 'parc-laurier-tennis' LIMIT 1;
  
  IF pickleball_sport_id IS NULL OR facility_jarry_id IS NULL THEN
    RAISE NOTICE 'Required sport or facilities not found. Skipping.';
    RETURN;
  END IF;
  
  -- Get user IDs
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO creator_ids 
  FROM profile 
  WHERE email LIKE '%@test.local'
  LIMIT 8;
  
  IF creator_ids IS NULL OR array_length(creator_ids, 1) < 4 THEN
    RAISE NOTICE 'Not enough seed users found. Skipping.';
    RETURN;
  END IF;
  
  user_1 := creator_ids[1];
  user_2 := creator_ids[2];
  user_3 := creator_ids[3];
  user_4 := creator_ids[4];

  -- ============================================================================
  -- Create new pickleball matches at facilities
  -- ============================================================================
  
  -- Pickleball at Parc Jarry - Today
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, pickleball_sport_id, user_1, today_date,
    '15:00'::TIME, '17:00'::TIME, 'America/Montreal',
    'casual', 'doubles', 'casual', '120',
    'facility'::location_type_enum, facility_jarry_id,
    'Parc Jarry Courts', '285 Rue Faillon O, Montreal',
    true, 'split_equal',
    'public', 'direct', 'Casual pickleball doubles at Jarry!',
    now_time - INTERVAL '1 day', now_time - INTERVAL '1 day'
  );
  
  -- Pickleball at Parc La Fontaine - Tomorrow morning
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, pickleball_sport_id, user_2, tomorrow_date,
    '09:00'::TIME, '11:00'::TIME, 'America/Montreal',
    'casual', 'doubles', 'both', '120',
    'facility'::location_type_enum, facility_lafontaine_id,
    'Parc La Fontaine Courts', '3933 Avenue du Parc La Fontaine, Montreal',
    true, 'split_equal',
    'public', 'direct', 'Morning pickleball at La Fontaine - all levels!',
    now_time - INTERVAL '2 days', now_time - INTERVAL '2 days'
  );
  INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at)
  VALUES (match_id, user_3, 'joined', false, now_time - INTERVAL '1 day', now_time - INTERVAL '1 day');
  
  -- Pickleball at Maisonneuve - Tomorrow afternoon
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type, estimated_cost,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, pickleball_sport_id, user_3, tomorrow_date,
    '14:00'::TIME, '16:00'::TIME, 'America/Montreal',
    'competitive', 'doubles', 'competitive', '120',
    'facility'::location_type_enum, facility_maisonneuve_id,
    'Parc Maisonneuve Courts', '4601 Rue Sherbrooke Est, Montreal',
    false, 'split_equal', 20.00,
    'public', 'direct', 'Competitive pickleball doubles!',
    now_time - INTERVAL '3 days', now_time - INTERVAL '3 days'
  );
  
  -- Pickleball at Laurier - In 3 days
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, pickleball_sport_id, user_4, in_3_days,
    '16:00'::TIME, '18:00'::TIME, 'America/Montreal',
    'casual', 'singles', 'casual', '120',
    'facility'::location_type_enum, facility_laurier_id,
    'Parc Laurier Courts', 'Rue Laurier Est, Montreal',
    true, 'split_equal',
    'public', 'direct', 'Pickleball singles practice!',
    now_time - INTERVAL '1 day', now_time - INTERVAL '1 day'
  );
  
  -- Pickleball at Jarry - In 5 days evening
  match_id := gen_random_uuid();
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    match_type, format, player_expectation, duration, location_type,
    facility_id, location_name, location_address,
    is_court_free, cost_split_type,
    visibility, join_mode, notes, created_at, updated_at
  ) VALUES (
    match_id, pickleball_sport_id, user_1, in_5_days,
    '19:00'::TIME, '21:00'::TIME, 'America/Montreal',
    'casual', 'doubles', 'both', '120',
    'facility'::location_type_enum, facility_jarry_id,
    'Parc Jarry Courts', '285 Rue Faillon O, Montreal',
    true, 'split_equal',
    'public', 'direct', 'Evening pickleball session!',
    now_time - INTERVAL '2 days', now_time - INTERVAL '2 days'
  );
  INSERT INTO match_participant (match_id, player_id, status, is_host, created_at, updated_at) VALUES
    (match_id, user_2, 'joined', false, now_time - INTERVAL '1 day', now_time - INTERVAL '1 day'),
    (match_id, user_4, 'joined', false, now_time - INTERVAL '12 hours', now_time - INTERVAL '12 hours');

  RAISE NOTICE 'Successfully created 5 pickleball matches at facilities';
END $$;

-- ============================================================================
-- 3. Verification
-- ============================================================================

DO $$
DECLARE
  pickleball_facility_count INTEGER;
  pickleball_custom_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pickleball_facility_count 
  FROM match m 
  JOIN sport s ON s.id = m.sport_id 
  WHERE s.name = 'pickleball' AND m.location_type = 'facility' AND m.cancelled_at IS NULL;
  
  SELECT COUNT(*) INTO pickleball_custom_count 
  FROM match m 
  JOIN sport s ON s.id = m.sport_id 
  WHERE s.name = 'pickleball' AND m.location_type != 'facility' AND m.cancelled_at IS NULL;
  
  RAISE NOTICE 'Pickleball matches verification:';
  RAISE NOTICE '  - At facilities: % (will appear in Soon & Nearby)', pickleball_facility_count;
  RAISE NOTICE '  - Custom/TBD locations: % (not in Soon & Nearby)', pickleball_custom_count;
END $$;

