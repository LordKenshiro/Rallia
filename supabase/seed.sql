-- =============================================================================
-- Rallia Seed File for Local Development
-- =============================================================================
--
-- SEEDING WORKFLOW (run in this order):
--   1. supabase db reset
--      (runs all migrations, creates empty schema)
--   2. cd rallia-facilities && python src/main.py --supabase
--      (seeds sport, rating_system, rating_score, data_provider,
--       organization, facility, court, facility_sport, court_sport,
--       facility_contact -- links Montreal org to Loisir Montreal provider)
--   3. supabase db seed
--      (runs THIS file -- seeds profiles, players, matches, groups,
--       conversations, notifications, bookings, etc.)
--
-- This script is designed to be idempotent (safe to re-run).
-- It uses ON CONFLICT DO NOTHING and existence checks throughout.
-- All FK references are resolved dynamically via subqueries.
-- =============================================================================

-- ============================================================================
-- 1. Vault Secrets for Edge Functions
-- ============================================================================
DO $$
DECLARE
  local_service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  local_anon_key TEXT := 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODU1MzQ0NTh9.njT61CLkOy3AkOBDE7KgJ4vqL23h9bAA4HQb3T-fYlFwxfZV5flOkbxOXs4X_LEdOyBGRa_EkJJ-7U1KD6IsZw';
  local_functions_url TEXT := 'http://host.docker.internal:54321';
  existing_url_id UUID;
  existing_key_id UUID;
  existing_anon_id UUID;
BEGIN
  SELECT id INTO existing_url_id FROM vault.secrets WHERE name = 'supabase_functions_url';
  SELECT id INTO existing_key_id FROM vault.secrets WHERE name = 'service_role_key';
  SELECT id INTO existing_anon_id FROM vault.secrets WHERE name = 'anon_key';

  IF existing_url_id IS NULL THEN
    PERFORM vault.create_secret(local_functions_url, 'supabase_functions_url');
  ELSE
    PERFORM vault.update_secret(existing_url_id, local_functions_url, 'supabase_functions_url');
  END IF;

  IF existing_key_id IS NULL THEN
    PERFORM vault.create_secret(local_service_role_key, 'service_role_key');
  ELSE
    PERFORM vault.update_secret(existing_key_id, local_service_role_key, 'service_role_key');
  END IF;

  IF existing_anon_id IS NULL THEN
    PERFORM vault.create_secret(local_anon_key, 'anon_key');
  ELSE
    PERFORM vault.update_secret(existing_anon_id, local_anon_key, 'anon_key');
  END IF;
END $$;

-- ============================================================================
-- 2. Create Test Users in auth.users
-- ============================================================================
-- The logged-in user is created by Supabase auth when you sign up locally.
-- We create 9 additional fake users so the app has players to interact with.
-- These users use deterministic UUIDs so we can reference them throughout.
-- ============================================================================
DO $$
DECLARE
  fake_users TEXT[][] := ARRAY[
    ARRAY['a1000000-0000-0000-0000-000000000001', 'marc.dupont@test.com',      'Marc',      'Dupont'],
    ARRAY['a1000000-0000-0000-0000-000000000002', 'sophie.tremblay@test.com',   'Sophie',    'Tremblay'],
    ARRAY['a1000000-0000-0000-0000-000000000003', 'jean.lavoie@test.com',       'Jean',      'Lavoie'],
    ARRAY['a1000000-0000-0000-0000-000000000004', 'isabelle.gagnon@test.com',   'Isabelle',  'Gagnon'],
    ARRAY['a1000000-0000-0000-0000-000000000005', 'philippe.roy@test.com',      'Philippe',  'Roy'],
    ARRAY['a1000000-0000-0000-0000-000000000006', 'camille.bouchard@test.com',  'Camille',   'Bouchard'],
    ARRAY['a1000000-0000-0000-0000-000000000007', 'alexandre.morin@test.com',   'Alexandre', 'Morin'],
    ARRAY['a1000000-0000-0000-0000-000000000008', 'marie.cote@test.com',        'Marie',     'Cote'],
    ARRAY['a1000000-0000-0000-0000-000000000009', 'david.belanger@test.com',    'David',     'Belanger']
  ];
  u TEXT[];
BEGIN
  FOREACH u SLICE 1 IN ARRAY fake_users LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = u[1]::uuid) THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email,
        encrypted_password, email_confirmed_at, confirmation_sent_at,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        u[1]::uuid,
        'authenticated',
        'authenticated',
        u[2],
        crypt('password123', gen_salt('bf')),
        NOW(), NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('first_name', u[3], 'last_name', u[4], 'full_name', u[3] || ' ' || u[4]),
        NOW(), NOW()
      );
      -- Create identity for the user
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (
        gen_random_uuid(), u[1]::uuid,
        jsonb_build_object('sub', u[1], 'email', u[2]),
        'email', u[1],
        NOW(), NOW(), NOW()
      );
    END IF;
  END LOOP;
  RAISE NOTICE 'Ensured 9 test users exist in auth.users';
END $$;

-- ============================================================================
-- 3. Create Profiles for All Auth Users
-- ============================================================================
INSERT INTO profile (id, first_name, last_name, email, onboarding_completed, bio, birth_date, postal_code, city, province, country, preferred_locale)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'first_name', SPLIT_PART(COALESCE(raw_user_meta_data->>'full_name', 'Test User'), ' ', 1)),
  COALESCE(raw_user_meta_data->>'last_name', NULLIF(SPLIT_PART(COALESCE(raw_user_meta_data->>'full_name', ''), ' ', 2), '')),
  email,
  true,
  -- Give fake users bios
  CASE
    WHEN email = 'marc.dupont@test.com' THEN 'Passionné de tennis depuis 15 ans. Joueur régulier au parc Jeanne-Mance.'
    WHEN email = 'sophie.tremblay@test.com' THEN 'Joueuse de pickleball et tennis. Toujours partante pour un match!'
    WHEN email = 'jean.lavoie@test.com' THEN 'Ancien joueur de compétition, maintenant je joue pour le plaisir.'
    WHEN email = 'isabelle.gagnon@test.com' THEN 'Débutante enthousiaste! Cherche des partenaires patients.'
    WHEN email = 'philippe.roy@test.com' THEN 'Tennis 3x par semaine au parc La Fontaine. Niveau intermédiaire.'
    WHEN email = 'camille.bouchard@test.com' THEN 'Joueuse polyvalente tennis et pickleball. Disponible les weekends.'
    WHEN email = 'alexandre.morin@test.com' THEN 'Compétiteur dans l''âme. NTRP 4.5, toujours prêt pour un défi.'
    WHEN email = 'marie.cote@test.com' THEN 'Tennis récréatif. J''adore le doubles!'
    WHEN email = 'david.belanger@test.com' THEN 'Nouveau à Montréal, cherche des partenaires de tennis.'
    ELSE NULL
  END,
  -- Birth dates (varied ages 25-55)
  CASE
    WHEN email = 'marc.dupont@test.com' THEN '1980-03-15'::date
    WHEN email = 'sophie.tremblay@test.com' THEN '1992-07-22'::date
    WHEN email = 'jean.lavoie@test.com' THEN '1975-11-08'::date
    WHEN email = 'isabelle.gagnon@test.com' THEN '1998-01-30'::date
    WHEN email = 'philippe.roy@test.com' THEN '1985-09-12'::date
    WHEN email = 'camille.bouchard@test.com' THEN '1990-05-25'::date
    WHEN email = 'alexandre.morin@test.com' THEN '1988-12-03'::date
    WHEN email = 'marie.cote@test.com' THEN '1995-04-18'::date
    WHEN email = 'david.belanger@test.com' THEN '1993-08-07'::date
    ELSE NULL
  END,
  -- Montreal postal codes
  CASE
    WHEN email = 'marc.dupont@test.com' THEN 'H2T 1S4'
    WHEN email = 'sophie.tremblay@test.com' THEN 'H2X 1Y6'
    WHEN email = 'jean.lavoie@test.com' THEN 'H3A 1B9'
    WHEN email = 'isabelle.gagnon@test.com' THEN 'H2W 2E1'
    WHEN email = 'philippe.roy@test.com' THEN 'H2J 3K5'
    WHEN email = 'camille.bouchard@test.com' THEN 'H2R 2N2'
    WHEN email = 'alexandre.morin@test.com' THEN 'H3H 1P3'
    WHEN email = 'marie.cote@test.com' THEN 'H4A 1T2'
    WHEN email = 'david.belanger@test.com' THEN 'H1V 3R2'
    ELSE NULL
  END,
  'Montreal',
  'QC',
  'CA',
  'fr-CA'
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM profile WHERE profile.id = auth.users.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. Create Player Records
-- ============================================================================
DO $$
DECLARE
  u RECORD;
  genders gender_enum[] := ARRAY['male', 'female', 'male', 'female', 'male', 'female', 'male', 'female', 'male'];
  hands playing_hand[] := ARRAY['right', 'right', 'left', 'right', 'right', 'both', 'right', 'left', 'right'];
  -- Montreal lat/longs for different neighborhoods
  lats NUMERIC[] := ARRAY[45.5236, 45.5148, 45.5017, 45.5225, 45.5306, 45.5445, 45.4968, 45.4727, 45.5554];
  lngs NUMERIC[] := ARRAY[-73.5865, -73.5691, -73.5673, -73.5775, -73.5537, -73.5975, -73.5768, -73.6416, -73.5482];
  idx INT := 0;
BEGIN
  FOR u IN SELECT id, email FROM auth.users ORDER BY email LOOP
    idx := idx + 1;
    IF idx > 9 THEN idx := 9; END IF;

    INSERT INTO player (
      id, gender, playing_hand, max_travel_distance,
      postal_code, postal_code_country, postal_code_lat, postal_code_long,
      push_notifications_enabled, notification_match_requests, notification_messages, notification_reminders
    ) VALUES (
      u.id,
      genders[idx],
      hands[idx],
      (10 + (idx * 3)),  -- 13-40 km range
      (SELECT postal_code FROM profile WHERE id = u.id),
      'CA',
      lats[idx],
      lngs[idx],
      true, true, true, true
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
  RAISE NOTICE 'Created player records for all users';
END $$;

-- ============================================================================
-- 5. Player Sports + Rating Scores
-- ============================================================================
DO $$
DECLARE
  tennis_sport_id UUID;
  pickleball_sport_id UUID;
  ntrp_system_id UUID;
  dupr_system_id UUID;
  u RECORD;
  ntrp_levels NUMERIC[] := ARRAY[4.0, 3.5, 4.5, 2.5, 3.5, 3.0, 4.5, 3.0, 3.5];
  dupr_levels NUMERIC[] := ARRAY[3.5, 4.0, 3.0, 2.5, 3.5, 4.5, 3.0, 3.5, 2.5];
  -- Which players play which sports: 1=tennis only, 2=pickleball only, 3=both
  sport_mix INT[] := ARRAY[3, 3, 1, 3, 1, 2, 1, 3, 3];
  idx INT := 0;
  player_sport_uuid UUID;
  rating_score_uuid UUID;
BEGIN
  SELECT id INTO tennis_sport_id FROM sport WHERE slug = 'tennis';
  SELECT id INTO pickleball_sport_id FROM sport WHERE slug = 'pickleball';
  SELECT id INTO ntrp_system_id FROM rating_system WHERE code = 'ntrp';
  SELECT id INTO dupr_system_id FROM rating_system WHERE code = 'dupr';

  IF tennis_sport_id IS NULL OR pickleball_sport_id IS NULL THEN
    RAISE NOTICE 'Sports not found, skipping player sport seeding. Run rallia-facilities first!';
    RETURN;
  END IF;

  FOR u IN SELECT id, email FROM auth.users ORDER BY email LOOP
    idx := idx + 1;
    IF idx > 9 THEN idx := 9; END IF;

    -- Tennis
    IF sport_mix[idx] IN (1, 3) THEN
      INSERT INTO player_sport (player_id, sport_id, is_primary, is_active, preferred_match_duration, preferred_match_type)
      VALUES (u.id, tennis_sport_id, true, true,
        CASE WHEN idx % 3 = 0 THEN '60'::match_duration_enum ELSE '90'::match_duration_enum END,
        CASE WHEN idx % 2 = 0 THEN 'casual'::match_type_enum ELSE 'competitive'::match_type_enum END
      )
      ON CONFLICT DO NOTHING
      RETURNING id INTO player_sport_uuid;

      -- Assign NTRP rating
      IF ntrp_system_id IS NOT NULL AND player_sport_uuid IS NOT NULL THEN
        SELECT id INTO rating_score_uuid FROM rating_score
        WHERE rating_system_id = ntrp_system_id AND value = ntrp_levels[idx];

        IF rating_score_uuid IS NOT NULL THEN
          INSERT INTO player_rating_score (player_id, rating_score_id, badge_status, source)
          VALUES (u.id, rating_score_uuid, 'self_declared', 'onboarding')
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;

    -- Pickleball
    IF sport_mix[idx] IN (2, 3) THEN
      INSERT INTO player_sport (player_id, sport_id, is_primary, is_active, preferred_match_duration, preferred_match_type)
      VALUES (u.id, pickleball_sport_id,
        CASE WHEN sport_mix[idx] = 2 THEN true ELSE false END,
        true,
        '60'::match_duration_enum,
        'casual'::match_type_enum
      )
      ON CONFLICT DO NOTHING;

      -- Assign DUPR rating
      IF dupr_system_id IS NOT NULL THEN
        SELECT id INTO rating_score_uuid FROM rating_score
        WHERE rating_system_id = dupr_system_id AND value = dupr_levels[idx];

        IF rating_score_uuid IS NOT NULL THEN
          INSERT INTO player_rating_score (player_id, rating_score_id, badge_status, source)
          VALUES (u.id, rating_score_uuid, 'self_declared', 'onboarding')
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
  END LOOP;
  RAISE NOTICE 'Created player_sport and player_rating_score records';
END $$;

-- ============================================================================
-- 6. Player Availability
-- ============================================================================
DO $$
DECLARE
  u RECORD;
  days day_enum[] := ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  periods period_enum[] := ARRAY['morning', 'afternoon', 'evening'];
  d day_enum;
  p period_enum;
  idx INT := 0;
BEGIN
  FOR u IN SELECT id FROM auth.users ORDER BY email LOOP
    idx := idx + 1;
    FOREACH d IN ARRAY days LOOP
      FOREACH p IN ARRAY periods LOOP
        -- Each player gets a different but overlapping availability pattern
        IF (
          -- Weekday evenings for most players
          (d IN ('monday','tuesday','wednesday','thursday','friday') AND p = 'evening' AND idx % 3 != 0)
          OR
          -- Weekend mornings/afternoons for most
          (d IN ('saturday','sunday') AND p IN ('morning','afternoon'))
          OR
          -- Some players also free weekday mornings
          (d IN ('monday','wednesday','friday') AND p = 'morning' AND idx % 4 = 0)
          OR
          -- Some players free weekday afternoons
          (d IN ('tuesday','thursday') AND p = 'afternoon' AND idx % 3 = 0)
        ) THEN
          INSERT INTO player_availability (player_id, day, period, is_active)
          VALUES (u.id, d, p, true)
          ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Created player availability records';
END $$;

-- ============================================================================
-- 7. Matches (15 total at Montreal facilities)
-- ============================================================================
DO $$
DECLARE
  tennis_id UUID;
  pickleball_id UUID;
  -- Player IDs (our 9 fake users)
  p1 UUID := 'a1000000-0000-0000-0000-000000000001';
  p2 UUID := 'a1000000-0000-0000-0000-000000000002';
  p3 UUID := 'a1000000-0000-0000-0000-000000000003';
  p4 UUID := 'a1000000-0000-0000-0000-000000000004';
  p5 UUID := 'a1000000-0000-0000-0000-000000000005';
  p6 UUID := 'a1000000-0000-0000-0000-000000000006';
  p7 UUID := 'a1000000-0000-0000-0000-000000000007';
  p8 UUID := 'a1000000-0000-0000-0000-000000000008';
  p9 UUID := 'a1000000-0000-0000-0000-000000000009';
  -- Facility IDs (fetched dynamically from Montreal facilities)
  fac1 UUID; fac2 UUID; fac3 UUID; fac4 UUID; fac5 UUID;
  fac_court1 UUID; fac_court2 UUID; fac_court3 UUID;
  -- Match IDs (deterministic for participant references)
  m1 UUID := 'b1000000-0000-0000-0000-000000000001';
  m2 UUID := 'b1000000-0000-0000-0000-000000000002';
  m3 UUID := 'b1000000-0000-0000-0000-000000000003';
  m4 UUID := 'b1000000-0000-0000-0000-000000000004';
  m5 UUID := 'b1000000-0000-0000-0000-000000000005';
  m6 UUID := 'b1000000-0000-0000-0000-000000000006';
  m7 UUID := 'b1000000-0000-0000-0000-000000000007';
  m8 UUID := 'b1000000-0000-0000-0000-000000000008';
  m9 UUID := 'b1000000-0000-0000-0000-000000000009';
  m10 UUID := 'b1000000-0000-0000-0000-000000000010';
  m11 UUID := 'b1000000-0000-0000-0000-000000000011';
  m12 UUID := 'b1000000-0000-0000-0000-000000000012';
  m13 UUID := 'b1000000-0000-0000-0000-000000000013';
  m14 UUID := 'b1000000-0000-0000-0000-000000000014';
  m15 UUID := 'b1000000-0000-0000-0000-000000000015';
  -- Match result IDs
  mr1 UUID := 'c1000000-0000-0000-0000-000000000001';
  mr2 UUID := 'c1000000-0000-0000-0000-000000000002';
  mr3 UUID := 'c1000000-0000-0000-0000-000000000003';
  mr4 UUID := 'c1000000-0000-0000-0000-000000000004';
  mr5 UUID := 'c1000000-0000-0000-0000-000000000005';
  -- Dates
  today DATE := CURRENT_DATE;
  logged_in_user UUID;
BEGIN
  SELECT id INTO tennis_id FROM sport WHERE slug = 'tennis';
  SELECT id INTO pickleball_id FROM sport WHERE slug = 'pickleball';

  IF tennis_id IS NULL THEN
    RAISE NOTICE 'Sports not found, skipping match seeding. Run rallia-facilities first!';
    RETURN;
  END IF;

  -- Get the first auth user that is NOT one of our fake users (the logged-in dev user)
  SELECT id INTO logged_in_user FROM auth.users
  WHERE id NOT IN (p1,p2,p3,p4,p5,p6,p7,p8,p9)
  ORDER BY created_at LIMIT 1;

  -- If no real user yet, use p1 as fallback
  IF logged_in_user IS NULL THEN
    logged_in_user := p1;
  END IF;

  -- Ensure the logged-in user has a player record too
  INSERT INTO player (id, gender, max_travel_distance, postal_code, postal_code_country, postal_code_lat, postal_code_long, push_notifications_enabled)
  VALUES (logged_in_user, 'male', 25, 'H2T 1S4', 'CA', 45.5236, -73.5865, true)
  ON CONFLICT (id) DO NOTHING;

  -- Pick 5 Montreal facilities (with courts)
  SELECT f.id INTO fac1 FROM facility f
    JOIN court c ON c.facility_id = f.id
    WHERE f.city = 'Montreal' AND f.is_active = true
    ORDER BY f.name LIMIT 1;
  SELECT f.id INTO fac2 FROM facility f
    JOIN court c ON c.facility_id = f.id
    WHERE f.city = 'Montreal' AND f.is_active = true
    ORDER BY f.name OFFSET 1 LIMIT 1;
  SELECT f.id INTO fac3 FROM facility f
    JOIN court c ON c.facility_id = f.id
    WHERE f.city = 'Montreal' AND f.is_active = true
    ORDER BY f.name OFFSET 2 LIMIT 1;
  SELECT f.id INTO fac4 FROM facility f
    JOIN court c ON c.facility_id = f.id
    WHERE f.city = 'Montreal' AND f.is_active = true
    ORDER BY f.name OFFSET 3 LIMIT 1;
  SELECT f.id INTO fac5 FROM facility f
    JOIN court c ON c.facility_id = f.id
    WHERE f.city = 'Montreal' AND f.is_active = true
    ORDER BY f.name OFFSET 4 LIMIT 1;

  -- Get a court for each of the first 3 facilities
  SELECT c.id INTO fac_court1 FROM court c WHERE c.facility_id = fac1 LIMIT 1;
  SELECT c.id INTO fac_court2 FROM court c WHERE c.facility_id = fac2 LIMIT 1;
  SELECT c.id INTO fac_court3 FROM court c WHERE c.facility_id = fac3 LIMIT 1;

  -- If no facilities found, use custom locations
  IF fac1 IS NULL THEN
    RAISE NOTICE 'No Montreal facilities found, matches will use custom locations. Run rallia-facilities first!';
  END IF;

  -- -----------------------------------------------------------------------
  -- UPCOMING OPEN MATCHES (5) -- public, joinable
  -- -----------------------------------------------------------------------

  -- Match 1: Tennis singles, tomorrow evening, at facility 1
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, join_mode, duration,
    location_type, facility_id, court_id, court_status,
    location_name, location_address,
    notes)
  SELECT m1, tennis_id, p1,
    (today + 1),
    ((today + 1)::date + TIME '18:00')::timestamptz,
    ((today + 1)::date + TIME '19:30')::timestamptz,
    'America/Montreal',
    'casual', 'singles', 'public', 'direct', '90',
    CASE WHEN fac1 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac1, fac_court1, 'to_reserve',
    COALESCE((SELECT name FROM facility WHERE id = fac1), 'Parc Jeanne-Mance'),
    COALESCE((SELECT address FROM facility WHERE id = fac1), '4999 Avenue Esplanade, Montreal'),
    'Looking for a casual rally partner! All levels welcome.'
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m1);

  -- Match 2: Pickleball doubles, day after tomorrow morning
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, join_mode, duration,
    location_type, facility_id,
    location_name, location_address,
    notes)
  SELECT m2, COALESCE(pickleball_id, tennis_id), p2,
    (today + 2),
    ((today + 2)::date + TIME '09:00')::timestamptz,
    ((today + 2)::date + TIME '10:00')::timestamptz,
    'America/Montreal',
    'casual', 'doubles', 'public', 'direct', '60',
    CASE WHEN fac2 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac2,
    COALESCE((SELECT name FROM facility WHERE id = fac2), 'Parc La Fontaine'),
    COALESCE((SELECT address FROM facility WHERE id = fac2), 'Parc La Fontaine, Montreal'),
    'Need 2 more for doubles! Intermediate level preferred.'
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m2);

  -- Match 3: Tennis singles competitive, 3 days out
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, join_mode, duration,
    location_type, facility_id,
    location_name, location_address,
    notes)
  SELECT m3, tennis_id, p7,
    (today + 3),
    ((today + 3)::date + TIME '17:00')::timestamptz,
    ((today + 3)::date + TIME '19:00')::timestamptz,
    'America/Montreal',
    'competitive', 'singles', 'public', 'request', '120',
    CASE WHEN fac3 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac3,
    COALESCE((SELECT name FROM facility WHERE id = fac3), 'Parc Jarry'),
    COALESCE((SELECT address FROM facility WHERE id = fac3), 'Parc Jarry, Montreal'),
    'Competitive match, NTRP 4.0+ please. Let''s have a good game!'
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m3);

  -- Match 4: Pickleball doubles, 4 days out
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, join_mode, duration,
    location_type, facility_id,
    location_name, location_address)
  SELECT m4, COALESCE(pickleball_id, tennis_id), p6,
    (today + 4),
    ((today + 4)::date + TIME '10:00')::timestamptz,
    ((today + 4)::date + TIME '11:00')::timestamptz,
    'America/Montreal',
    'both', 'doubles', 'public', 'direct', '60',
    CASE WHEN fac4 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac4,
    COALESCE((SELECT name FROM facility WHERE id = fac4), 'Parc Kent'),
    COALESCE((SELECT address FROM facility WHERE id = fac4), 'Parc Kent, Montreal')
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m4);

  -- Match 5: Tennis doubles, this weekend
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, join_mode, duration,
    location_type, facility_id,
    location_name, location_address,
    notes)
  SELECT m5, tennis_id, p5,
    (today + (6 - EXTRACT(DOW FROM today)::int + 7)::int % 7 + 1),  -- next Saturday
    ((today + (6 - EXTRACT(DOW FROM today)::int + 7)::int % 7 + 1)::date + TIME '14:00')::timestamptz,
    ((today + (6 - EXTRACT(DOW FROM today)::int + 7)::int % 7 + 1)::date + TIME '15:30')::timestamptz,
    'America/Montreal',
    'casual', 'doubles', 'public', 'direct', '90',
    CASE WHEN fac5 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac5,
    COALESCE((SELECT name FROM facility WHERE id = fac5), 'Parc Beaubien'),
    COALESCE((SELECT address FROM facility WHERE id = fac5), 'Parc Beaubien, Montreal'),
    'Weekend doubles! Bring your A game (or just bring snacks).'
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m5);

  -- -----------------------------------------------------------------------
  -- UPCOMING FULL MATCHES (3) -- logged-in user is a participant
  -- -----------------------------------------------------------------------

  -- Match 6: Logged-in user's upcoming match (tennis singles, tomorrow)
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, join_mode, duration,
    location_type, facility_id, court_id, court_status,
    location_name, location_address)
  SELECT m6, tennis_id, logged_in_user,
    (today + 1),
    ((today + 1)::date + TIME '10:00')::timestamptz,
    ((today + 1)::date + TIME '11:30')::timestamptz,
    'America/Montreal',
    'competitive', 'singles', 'private', 'direct', '90',
    CASE WHEN fac1 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac1, fac_court1, 'reserved',
    COALESCE((SELECT name FROM facility WHERE id = fac1), 'Parc Jeanne-Mance'),
    COALESCE((SELECT address FROM facility WHERE id = fac1), '4999 Avenue Esplanade, Montreal')
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m6);

  -- Match 7: Logged-in user invited to doubles, in 2 days
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, join_mode, duration,
    location_type, facility_id,
    location_name, location_address)
  SELECT m7, tennis_id, p3,
    (today + 2),
    ((today + 2)::date + TIME '16:00')::timestamptz,
    ((today + 2)::date + TIME '17:30')::timestamptz,
    'America/Montreal',
    'casual', 'doubles', 'private', 'direct', '90',
    CASE WHEN fac2 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac2,
    COALESCE((SELECT name FROM facility WHERE id = fac2), 'Parc La Fontaine'),
    COALESCE((SELECT address FROM facility WHERE id = fac2), 'Parc La Fontaine, Montreal')
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m7);

  -- Match 8: Pickleball match, logged-in user joined, in 5 days
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, join_mode, duration,
    location_type, facility_id,
    location_name, location_address)
  SELECT m8, COALESCE(pickleball_id, tennis_id), p8,
    (today + 5),
    ((today + 5)::date + TIME '11:00')::timestamptz,
    ((today + 5)::date + TIME '12:00')::timestamptz,
    'America/Montreal',
    'casual', 'doubles', 'public', 'direct', '60',
    CASE WHEN fac3 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac3,
    COALESCE((SELECT name FROM facility WHERE id = fac3), 'Parc Jarry'),
    COALESCE((SELECT address FROM facility WHERE id = fac3), 'Parc Jarry, Montreal')
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m8);

  -- -----------------------------------------------------------------------
  -- PAST COMPLETED MATCHES (5)
  -- -----------------------------------------------------------------------

  -- Match 9: Completed 3 days ago
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, duration,
    location_type, facility_id,
    location_name, location_address,
    closed_at)
  SELECT m9, tennis_id, p1,
    (today - 3),
    ((today - 3)::date + TIME '18:00')::timestamptz,
    ((today - 3)::date + TIME '19:30')::timestamptz,
    'America/Montreal',
    'competitive', 'singles', 'public', '90',
    CASE WHEN fac1 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac1,
    COALESCE((SELECT name FROM facility WHERE id = fac1), 'Parc Jeanne-Mance'),
    COALESCE((SELECT address FROM facility WHERE id = fac1), 'Montreal'),
    ((today - 3)::date + TIME '19:30')::timestamptz
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m9);

  -- Match 10: Completed 5 days ago
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, duration,
    location_type, facility_id,
    location_name, location_address,
    closed_at)
  SELECT m10, tennis_id, logged_in_user,
    (today - 5),
    ((today - 5)::date + TIME '10:00')::timestamptz,
    ((today - 5)::date + TIME '11:30')::timestamptz,
    'America/Montreal',
    'casual', 'singles', 'private', '90',
    CASE WHEN fac2 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac2,
    COALESCE((SELECT name FROM facility WHERE id = fac2), 'Parc La Fontaine'),
    COALESCE((SELECT address FROM facility WHERE id = fac2), 'Montreal'),
    ((today - 5)::date + TIME '11:30')::timestamptz
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m10);

  -- Match 11: Completed 7 days ago (pickleball doubles)
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, duration,
    location_type, facility_id,
    location_name, location_address,
    closed_at)
  SELECT m11, COALESCE(pickleball_id, tennis_id), p2,
    (today - 7),
    ((today - 7)::date + TIME '09:00')::timestamptz,
    ((today - 7)::date + TIME '10:00')::timestamptz,
    'America/Montreal',
    'casual', 'doubles', 'public', '60',
    CASE WHEN fac3 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac3,
    COALESCE((SELECT name FROM facility WHERE id = fac3), 'Parc Jarry'),
    COALESCE((SELECT address FROM facility WHERE id = fac3), 'Montreal'),
    ((today - 7)::date + TIME '10:00')::timestamptz
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m11);

  -- Match 12: Completed 10 days ago
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, duration,
    location_type, facility_id,
    location_name, location_address,
    closed_at)
  SELECT m12, tennis_id, p7,
    (today - 10),
    ((today - 10)::date + TIME '17:00')::timestamptz,
    ((today - 10)::date + TIME '19:00')::timestamptz,
    'America/Montreal',
    'competitive', 'singles', 'public', '120',
    CASE WHEN fac4 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac4,
    COALESCE((SELECT name FROM facility WHERE id = fac4), 'Parc Kent'),
    COALESCE((SELECT address FROM facility WHERE id = fac4), 'Montreal'),
    ((today - 10)::date + TIME '19:00')::timestamptz
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m12);

  -- Match 13: Completed 14 days ago (logged-in user participated)
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, duration,
    location_type, facility_id,
    location_name, location_address,
    closed_at)
  SELECT m13, tennis_id, p5,
    (today - 14),
    ((today - 14)::date + TIME '14:00')::timestamptz,
    ((today - 14)::date + TIME '15:30')::timestamptz,
    'America/Montreal',
    'casual', 'doubles', 'private', '90',
    CASE WHEN fac5 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac5,
    COALESCE((SELECT name FROM facility WHERE id = fac5), 'Parc Beaubien'),
    COALESCE((SELECT address FROM facility WHERE id = fac5), 'Montreal'),
    ((today - 14)::date + TIME '15:30')::timestamptz
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m13);

  -- -----------------------------------------------------------------------
  -- CANCELLED MATCHES (2)
  -- -----------------------------------------------------------------------

  -- Match 14: Cancelled due to weather, was 2 days ago
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, duration,
    location_type, facility_id,
    location_name, location_address,
    cancelled_at)
  SELECT m14, tennis_id, p4,
    (today - 2),
    ((today - 2)::date + TIME '15:00')::timestamptz,
    ((today - 2)::date + TIME '16:30')::timestamptz,
    'America/Montreal',
    'casual', 'singles', 'public', '90',
    CASE WHEN fac1 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac1,
    COALESCE((SELECT name FROM facility WHERE id = fac1), 'Parc Jeanne-Mance'),
    COALESCE((SELECT address FROM facility WHERE id = fac1), 'Montreal'),
    ((today - 2)::date + TIME '12:00')::timestamptz
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m14);

  -- Match 15: Mutually cancelled, was 4 days ago
  INSERT INTO match (id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, duration,
    location_type, facility_id,
    location_name, location_address,
    cancelled_at, mutually_cancelled)
  SELECT m15, tennis_id, logged_in_user,
    (today - 4),
    ((today - 4)::date + TIME '18:00')::timestamptz,
    ((today - 4)::date + TIME '19:30')::timestamptz,
    'America/Montreal',
    'competitive', 'singles', 'private', '90',
    CASE WHEN fac2 IS NOT NULL THEN 'facility'::location_type_enum ELSE 'custom'::location_type_enum END,
    fac2,
    COALESCE((SELECT name FROM facility WHERE id = fac2), 'Parc La Fontaine'),
    COALESCE((SELECT address FROM facility WHERE id = fac2), 'Montreal'),
    ((today - 4)::date + TIME '10:00')::timestamptz,
    true
  WHERE NOT EXISTS (SELECT 1 FROM match WHERE id = m15);

  -- -----------------------------------------------------------------------
  -- MATCH PARTICIPANTS
  -- -----------------------------------------------------------------------

  -- Open match 1: host + 0 joined (looking for opponent)
  INSERT INTO match_participant (match_id, player_id, status, is_host) VALUES
    (m1, p1, 'joined', true)
  ON CONFLICT DO NOTHING;

  -- Open match 2: host + 1 joined (need 2 more for doubles)
  INSERT INTO match_participant (match_id, player_id, status, is_host) VALUES
    (m2, p2, 'joined', true), (m2, p8, 'joined', false)
  ON CONFLICT DO NOTHING;

  -- Open match 3: host only (competitive, request mode)
  INSERT INTO match_participant (match_id, player_id, status, is_host) VALUES
    (m3, p7, 'joined', true)
  ON CONFLICT DO NOTHING;

  -- Open match 4: host + 2 (need 1 more for doubles)
  INSERT INTO match_participant (match_id, player_id, status, is_host) VALUES
    (m4, p6, 'joined', true), (m4, p2, 'joined', false), (m4, p9, 'joined', false)
  ON CONFLICT DO NOTHING;

  -- Open match 5: host + 1
  INSERT INTO match_participant (match_id, player_id, status, is_host) VALUES
    (m5, p5, 'joined', true), (m5, p3, 'joined', false)
  ON CONFLICT DO NOTHING;

  -- Full match 6: logged-in user is host, playing against p7
  INSERT INTO match_participant (match_id, player_id, status, is_host) VALUES
    (m6, logged_in_user, 'joined', true), (m6, p7, 'joined', false)
  ON CONFLICT DO NOTHING;

  -- Full match 7: p3 hosts doubles, logged-in user + p1 + p8
  INSERT INTO match_participant (match_id, player_id, status, is_host, team_number) VALUES
    (m7, p3, 'joined', true, 1), (m7, logged_in_user, 'joined', false, 1),
    (m7, p1, 'joined', false, 2), (m7, p8, 'joined', false, 2)
  ON CONFLICT DO NOTHING;

  -- Full match 8: p8 hosts pickleball, logged-in user + p2 + p6
  INSERT INTO match_participant (match_id, player_id, status, is_host, team_number) VALUES
    (m8, p8, 'joined', true, 1), (m8, logged_in_user, 'joined', false, 1),
    (m8, p2, 'joined', false, 2), (m8, p6, 'joined', false, 2)
  ON CONFLICT DO NOTHING;

  -- Past match 9: p1 vs p7 (p1 won)
  INSERT INTO match_participant (match_id, player_id, status, is_host, match_outcome, feedback_completed) VALUES
    (m9, p1, 'joined', true, 'played', true), (m9, p7, 'joined', false, 'played', true)
  ON CONFLICT DO NOTHING;

  -- Past match 10: logged-in user vs p3 (logged-in user won)
  INSERT INTO match_participant (match_id, player_id, status, is_host, match_outcome, feedback_completed) VALUES
    (m10, logged_in_user, 'joined', true, 'played', true), (m10, p3, 'joined', false, 'played', true)
  ON CONFLICT DO NOTHING;

  -- Past match 11: pickleball doubles p2+p4 vs p8+p9
  INSERT INTO match_participant (match_id, player_id, status, is_host, team_number, match_outcome, feedback_completed) VALUES
    (m11, p2, 'joined', true, 1, 'played', true), (m11, p4, 'joined', false, 1, 'played', true),
    (m11, p8, 'joined', false, 2, 'played', true), (m11, p9, 'joined', false, 2, 'played', true)
  ON CONFLICT DO NOTHING;

  -- Past match 12: p7 vs p5
  INSERT INTO match_participant (match_id, player_id, status, is_host, match_outcome, feedback_completed) VALUES
    (m12, p7, 'joined', true, 'played', true), (m12, p5, 'joined', false, 'played', true)
  ON CONFLICT DO NOTHING;

  -- Past match 13: doubles p5+logged_in vs p1+p9
  INSERT INTO match_participant (match_id, player_id, status, is_host, team_number, match_outcome, feedback_completed) VALUES
    (m13, p5, 'joined', true, 1, 'played', true), (m13, logged_in_user, 'joined', false, 1, 'played', true),
    (m13, p1, 'joined', false, 2, 'played', true), (m13, p9, 'joined', false, 2, 'played', true)
  ON CONFLICT DO NOTHING;

  -- Cancelled match 14: p4 was host, p9 was joined
  INSERT INTO match_participant (match_id, player_id, status, is_host, cancellation_reason) VALUES
    (m14, p4, 'cancelled', true, 'weather'), (m14, p9, 'cancelled', false, 'weather')
  ON CONFLICT DO NOTHING;

  -- Cancelled match 15: logged-in user and p1, mutually cancelled
  INSERT INTO match_participant (match_id, player_id, status, is_host, cancellation_reason) VALUES
    (m15, logged_in_user, 'cancelled', true, 'other'), (m15, p1, 'cancelled', false, 'other')
  ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- MATCH RESULTS + SETS (for completed matches)
  -- -----------------------------------------------------------------------

  -- Match 9 result: p1 won 6-3, 6-4
  INSERT INTO match_result (id, match_id, winning_team, team1_score, team2_score, submitted_by, is_verified, verified_at)
  VALUES (mr1, m9, 1, 2, 0, p1, true, ((today - 3)::date + TIME '20:00')::timestamptz)
  ON CONFLICT DO NOTHING;
  INSERT INTO match_set (match_result_id, set_number, team1_score, team2_score) VALUES
    (mr1, 1, 6, 3), (mr1, 2, 6, 4)
  ON CONFLICT DO NOTHING;

  -- Match 10 result: logged-in user won 6-4, 3-6, 7-5
  INSERT INTO match_result (id, match_id, winning_team, team1_score, team2_score, submitted_by, is_verified, verified_at)
  VALUES (mr2, m10, 1, 2, 1, logged_in_user, true, ((today - 5)::date + TIME '12:00')::timestamptz)
  ON CONFLICT DO NOTHING;
  INSERT INTO match_set (match_result_id, set_number, team1_score, team2_score) VALUES
    (mr2, 1, 6, 4), (mr2, 2, 3, 6), (mr2, 3, 7, 5)
  ON CONFLICT DO NOTHING;

  -- Match 11 result: team 1 (p2+p4) won 11-8
  INSERT INTO match_result (id, match_id, winning_team, team1_score, team2_score, submitted_by, is_verified, verified_at)
  VALUES (mr3, m11, 1, 1, 0, p2, true, ((today - 7)::date + TIME '10:30')::timestamptz)
  ON CONFLICT DO NOTHING;
  INSERT INTO match_set (match_result_id, set_number, team1_score, team2_score) VALUES
    (mr3, 1, 11, 8)
  ON CONFLICT DO NOTHING;

  -- Match 12 result: p7 won 6-2, 6-1
  INSERT INTO match_result (id, match_id, winning_team, team1_score, team2_score, submitted_by, is_verified, verified_at)
  VALUES (mr4, m12, 1, 2, 0, p7, true, ((today - 10)::date + TIME '19:30')::timestamptz)
  ON CONFLICT DO NOTHING;
  INSERT INTO match_set (match_result_id, set_number, team1_score, team2_score) VALUES
    (mr4, 1, 6, 2), (mr4, 2, 6, 1)
  ON CONFLICT DO NOTHING;

  -- Match 13 result: team 2 (p1+p9) won 4-6, 7-5, 6-3
  INSERT INTO match_result (id, match_id, winning_team, team1_score, team2_score, submitted_by, is_verified, verified_at)
  VALUES (mr5, m13, 2, 1, 2, p5, true, ((today - 14)::date + TIME '16:00')::timestamptz)
  ON CONFLICT DO NOTHING;
  INSERT INTO match_set (match_result_id, set_number, team1_score, team2_score) VALUES
    (mr5, 1, 4, 6), (mr5, 2, 7, 5), (mr5, 3, 6, 3)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created 15 matches with participants and results';
END $$;

-- ============================================================================
-- 8. Networks (Groups)
-- ============================================================================
-- Ensure the player_group network type exists (not seeded in any migration)
INSERT INTO network_type (name, display_name, description, is_active)
VALUES ('player_group', 'Player Group', 'Player-created groups for organizing matches', true)
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  tennis_id UUID;
  pickleball_id UUID;
  p1 UUID := 'a1000000-0000-0000-0000-000000000001';
  p2 UUID := 'a1000000-0000-0000-0000-000000000002';
  p3 UUID := 'a1000000-0000-0000-0000-000000000003';
  p5 UUID := 'a1000000-0000-0000-0000-000000000005';
  p6 UUID := 'a1000000-0000-0000-0000-000000000006';
  p7 UUID := 'a1000000-0000-0000-0000-000000000007';
  p8 UUID := 'a1000000-0000-0000-0000-000000000008';
  p9 UUID := 'a1000000-0000-0000-0000-000000000009';
  logged_in_user UUID;
  group_type_id UUID;
  g1 UUID := 'd1000000-0000-0000-0000-000000000001';
  g2 UUID := 'd1000000-0000-0000-0000-000000000002';
  g3 UUID := 'd1000000-0000-0000-0000-000000000003';
BEGIN
  SELECT id INTO tennis_id FROM sport WHERE slug = 'tennis';
  SELECT id INTO pickleball_id FROM sport WHERE slug = 'pickleball';
  SELECT id INTO group_type_id FROM network_type WHERE name = 'player_group';

  -- Get logged-in user
  SELECT id INTO logged_in_user FROM auth.users
  WHERE id NOT IN (p1,p2,p3,'a1000000-0000-0000-0000-000000000004'::uuid,p5,p6,p7,p8,p9)
  ORDER BY created_at LIMIT 1;
  IF logged_in_user IS NULL THEN logged_in_user := p1; END IF;

  IF group_type_id IS NULL THEN
    RAISE NOTICE 'player_group network type not found, skipping group seeding';
    RETURN;
  END IF;

  -- Group 1: Montreal Tennis Club
  INSERT INTO network (id, name, description, network_type_id, created_by, is_private, invite_code, member_count)
  VALUES (g1, 'Montreal Tennis Club', 'Casual and competitive tennis players in Montreal. All levels welcome!',
    group_type_id, p1, false, 'MTC2026', 6)
  ON CONFLICT (id) DO NOTHING;

  -- Group 2: Plateau Pickleball
  INSERT INTO network (id, name, description, network_type_id, created_by, is_private, invite_code, member_count)
  VALUES (g2, 'Plateau Pickleball', 'Pickleball enthusiasts from the Plateau and surrounding areas.',
    group_type_id, p2, false, 'PLATPKL', 5)
  ON CONFLICT (id) DO NOTHING;

  -- Group 3: Compétiteurs MTL
  INSERT INTO network (id, name, description, network_type_id, created_by, is_private, invite_code, member_count)
  VALUES (g3, 'Compétiteurs MTL', 'Pour les joueurs compétitifs de Montréal. NTRP 4.0+ requis.',
    group_type_id, p7, true, 'CMTL40', 4)
  ON CONFLICT (id) DO NOTHING;

  -- Group 1 members: p1(mod), logged_in, p3, p5, p7, p8
  INSERT INTO network_member (network_id, player_id, role, status, request_type, joined_at) VALUES
    (g1, p1, 'moderator', 'active', 'direct_add', NOW() - INTERVAL '30 days'),
    (g1, logged_in_user, 'member', 'active', 'invite_code', NOW() - INTERVAL '20 days'),
    (g1, p3, 'member', 'active', 'join_request', NOW() - INTERVAL '25 days'),
    (g1, p5, 'member', 'active', 'invite_code', NOW() - INTERVAL '15 days'),
    (g1, p7, 'member', 'active', 'join_request', NOW() - INTERVAL '10 days'),
    (g1, p8, 'member', 'active', 'invite_code', NOW() - INTERVAL '5 days')
  ON CONFLICT DO NOTHING;

  -- Group 2 members: p2(mod), logged_in, p6, p8, p9
  INSERT INTO network_member (network_id, player_id, role, status, request_type, joined_at) VALUES
    (g2, p2, 'moderator', 'active', 'direct_add', NOW() - INTERVAL '20 days'),
    (g2, logged_in_user, 'member', 'active', 'join_request', NOW() - INTERVAL '12 days'),
    (g2, p6, 'member', 'active', 'invite_code', NOW() - INTERVAL '18 days'),
    (g2, p8, 'member', 'active', 'invite_code', NOW() - INTERVAL '8 days'),
    (g2, p9, 'member', 'active', 'join_request', NOW() - INTERVAL '3 days')
  ON CONFLICT DO NOTHING;

  -- Group 3 members: p7(mod), p1, p5, logged_in
  INSERT INTO network_member (network_id, player_id, role, status, request_type, joined_at) VALUES
    (g3, p7, 'moderator', 'active', 'direct_add', NOW() - INTERVAL '15 days'),
    (g3, p1, 'member', 'active', 'invite_code', NOW() - INTERVAL '12 days'),
    (g3, p5, 'member', 'active', 'invite_code', NOW() - INTERVAL '10 days'),
    (g3, logged_in_user, 'member', 'active', 'join_request', NOW() - INTERVAL '7 days')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created 3 groups with members';
END $$;

-- ============================================================================
-- 9. Conversations + Messages
-- ============================================================================
DO $$
DECLARE
  p1 UUID := 'a1000000-0000-0000-0000-000000000001';
  p2 UUID := 'a1000000-0000-0000-0000-000000000002';
  p3 UUID := 'a1000000-0000-0000-0000-000000000003';
  p7 UUID := 'a1000000-0000-0000-0000-000000000007';
  logged_in_user UUID;
  conv1 UUID := 'e1000000-0000-0000-0000-000000000001';
  conv2 UUID := 'e1000000-0000-0000-0000-000000000002';
  conv3 UUID := 'e1000000-0000-0000-0000-000000000003';
BEGIN
  SELECT id INTO logged_in_user FROM auth.users
  WHERE id NOT IN (p1,p2,p3,'a1000000-0000-0000-0000-000000000004'::uuid,
    'a1000000-0000-0000-0000-000000000005'::uuid,'a1000000-0000-0000-0000-000000000006'::uuid,
    p7,'a1000000-0000-0000-0000-000000000008'::uuid,'a1000000-0000-0000-0000-000000000009'::uuid)
  ORDER BY created_at LIMIT 1;
  IF logged_in_user IS NULL THEN logged_in_user := p1; END IF;

  -- Ensure all participants have chat_rules_agreed_at
  UPDATE player SET chat_rules_agreed_at = NOW() - INTERVAL '30 days'
  WHERE id IN (p1, p2, p3, p7, logged_in_user) AND chat_rules_agreed_at IS NULL;

  -- Conv 1: Direct message with p1 (Marc Dupont)
  INSERT INTO conversation (id, conversation_type, created_by, title)
  VALUES (conv1, 'direct', p1, NULL)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO conversation_participant (conversation_id, player_id, last_read_at) VALUES
    (conv1, logged_in_user, NOW() - INTERVAL '1 hour'),
    (conv1, p1, NOW() - INTERVAL '30 minutes')
  ON CONFLICT DO NOTHING;

  INSERT INTO message (conversation_id, sender_id, content, created_at, status) VALUES
    (conv1, p1, 'Salut! Tu es dispo pour un match cette semaine?', NOW() - INTERVAL '3 hours', 'read'),
    (conv1, logged_in_user, 'Oui! Mercredi soir ça te va?', NOW() - INTERVAL '2 hours 45 minutes', 'read'),
    (conv1, p1, 'Parfait! 18h au parc Jeanne-Mance?', NOW() - INTERVAL '2 hours 30 minutes', 'read'),
    (conv1, logged_in_user, 'Deal! On se voit là-bas', NOW() - INTERVAL '2 hours', 'read'),
    (conv1, p1, 'N''oublie pas ta raquette de rechange, au cas où 😄', NOW() - INTERVAL '30 minutes', 'delivered')
  ON CONFLICT DO NOTHING;

  -- Conv 2: Direct message with p7 (Alexandre Morin)
  INSERT INTO conversation (id, conversation_type, created_by, title)
  VALUES (conv2, 'direct', logged_in_user, NULL)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO conversation_participant (conversation_id, player_id, last_read_at) VALUES
    (conv2, logged_in_user, NOW()),
    (conv2, p7, NOW() - INTERVAL '2 hours')
  ON CONFLICT DO NOTHING;

  INSERT INTO message (conversation_id, sender_id, content, created_at, status) VALUES
    (conv2, logged_in_user, 'Hey Alexandre, GG pour le match de la semaine dernière!', NOW() - INTERVAL '1 day', 'read'),
    (conv2, p7, 'Merci! C''était un bon match. Revanche bientôt?', NOW() - INTERVAL '23 hours', 'read'),
    (conv2, logged_in_user, 'Quand tu veux! Je suis libre samedi matin si ça te dit.', NOW() - INTERVAL '22 hours', 'read'),
    (conv2, p7, 'Samedi 9h? Je réserve un court au parc Jarry.', NOW() - INTERVAL '20 hours', 'read'),
    (conv2, logged_in_user, 'Ça marche, à samedi!', NOW() - INTERVAL '19 hours', 'read')
  ON CONFLICT DO NOTHING;

  -- Conv 3: Group chat (3 people planning a doubles match)
  INSERT INTO conversation (id, conversation_type, created_by, title)
  VALUES (conv3, 'group', p2, 'Doubles ce weekend')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO conversation_participant (conversation_id, player_id, last_read_at) VALUES
    (conv3, p2, NOW() - INTERVAL '10 minutes'),
    (conv3, p3, NOW() - INTERVAL '1 hour'),
    (conv3, logged_in_user, NOW() - INTERVAL '5 minutes')
  ON CONFLICT DO NOTHING;

  INSERT INTO message (conversation_id, sender_id, content, created_at, status) VALUES
    (conv3, p2, 'On fait un doubles dimanche? Qui est dispo?', NOW() - INTERVAL '5 hours', 'read'),
    (conv3, p3, 'Moi je suis partant! Dimanche après-midi?', NOW() - INTERVAL '4 hours 30 minutes', 'read'),
    (conv3, logged_in_user, 'Moi aussi! Il nous faut un 4ème par contre.', NOW() - INTERVAL '4 hours', 'read'),
    (conv3, p2, 'Je vais demander à Marie, elle cherchait justement un match.', NOW() - INTERVAL '3 hours', 'read'),
    (conv3, p2, 'C''est bon, Marie est in! Dimanche 14h au parc La Fontaine.', NOW() - INTERVAL '1 hour', 'delivered'),
    (conv3, logged_in_user, 'Super, on est au complet!', NOW() - INTERVAL '10 minutes', 'sent')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created 3 conversations with messages';
END $$;

-- ============================================================================
-- 10. Notifications (30 varied notifications for the logged-in user)
-- ============================================================================
DO $$
DECLARE
  target_user_id UUID;
  notification_types text[] := ARRAY[
    'match_invitation', 'reminder', 'match_join_request', 'match_player_joined',
    'match_starting_soon', 'feedback_request', 'new_message', 'system',
    'match_completed', 'score_confirmation'
  ];
  notification_type text;
  i integer;
  is_read boolean;
  created_time timestamptz;
BEGIN
  -- Get the first non-fake user, or fall back to first profile
  SELECT id INTO target_user_id FROM auth.users
  WHERE id NOT IN (
    'a1000000-0000-0000-0000-000000000001'::uuid,'a1000000-0000-0000-0000-000000000002'::uuid,
    'a1000000-0000-0000-0000-000000000003'::uuid,'a1000000-0000-0000-0000-000000000004'::uuid,
    'a1000000-0000-0000-0000-000000000005'::uuid,'a1000000-0000-0000-0000-000000000006'::uuid,
    'a1000000-0000-0000-0000-000000000007'::uuid,'a1000000-0000-0000-0000-000000000008'::uuid,
    'a1000000-0000-0000-0000-000000000009'::uuid
  ) ORDER BY created_at LIMIT 1;

  IF target_user_id IS NULL THEN
    SELECT id INTO target_user_id FROM profile LIMIT 1;
  END IF;

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'No profile found, skipping notification seeding';
    RETURN;
  END IF;

  -- Clear existing notifications for clean seeding
  DELETE FROM notification WHERE user_id = target_user_id;

  FOR i IN 1..30 LOOP
    notification_type := notification_types[1 + ((i - 1) % 10)];
    is_read := (i % 5 = 0) OR (i % 7 = 0);
    created_time := NOW() - ((30 - i) * INTERVAL '5 hours');

    INSERT INTO notification (
      user_id, type, title, body, read_at, created_at, updated_at
    ) VALUES (
      target_user_id,
      notification_type::notification_type_enum,
      CASE notification_type
        WHEN 'match_invitation' THEN 'Match Invitation from Marc'
        WHEN 'reminder' THEN 'Match Tomorrow at ' || TO_CHAR(created_time + INTERVAL '1 day', 'HH:MI AM')
        WHEN 'match_join_request' THEN 'Sophie wants to join your match'
        WHEN 'match_player_joined' THEN 'Philippe joined your match'
        WHEN 'match_starting_soon' THEN 'Your match starts in 1 hour!'
        WHEN 'feedback_request' THEN 'How was your match with Alexandre?'
        WHEN 'new_message' THEN 'New message from Marc Dupont'
        WHEN 'system' THEN 'Welcome to Rallia!'
        WHEN 'match_completed' THEN 'Match completed - submit your score'
        WHEN 'score_confirmation' THEN 'Confirm your match score'
      END,
      CASE notification_type
        WHEN 'match_invitation' THEN 'Marc Dupont invited you to play tennis at Parc Jeanne-Mance on ' || TO_CHAR(created_time + INTERVAL '2 days', 'Day, Mon DD')
        WHEN 'reminder' THEN 'Don''t forget your match tomorrow at Parc La Fontaine. See you there!'
        WHEN 'match_join_request' THEN 'Sophie Tremblay wants to join your casual singles match. Tap to review.'
        WHEN 'match_player_joined' THEN 'Philippe Roy has joined your doubles match this Saturday.'
        WHEN 'match_starting_soon' THEN 'Your tennis match at Parc Jarry starts at 18:00. Time to warm up!'
        WHEN 'feedback_request' THEN 'Tell us how your match with Alexandre Morin went. Your feedback helps the community!'
        WHEN 'new_message' THEN 'Marc: N''oublie pas ta raquette de rechange!'
        WHEN 'system' THEN 'Welcome to Rallia! Find players, book courts, and enjoy your game.'
        WHEN 'match_completed' THEN 'Your match has been completed. Please submit the score to update rankings.'
        WHEN 'score_confirmation' THEN 'Alexandre submitted a score for your match. Please confirm or dispute.'
      END,
      CASE WHEN is_read THEN created_time + INTERVAL '30 minutes' ELSE NULL END,
      created_time,
      created_time
    );
  END LOOP;

  RAISE NOTICE 'Seeded 30 notifications for user %', target_user_id;
END $$;

-- ============================================================================
-- 11. Player Favorites
-- ============================================================================
DO $$
DECLARE
  p1 UUID := 'a1000000-0000-0000-0000-000000000001';
  p2 UUID := 'a1000000-0000-0000-0000-000000000002';
  p7 UUID := 'a1000000-0000-0000-0000-000000000007';
  logged_in_user UUID;
BEGIN
  SELECT id INTO logged_in_user FROM auth.users
  WHERE id NOT IN (p1,p2,'a1000000-0000-0000-0000-000000000003'::uuid,
    'a1000000-0000-0000-0000-000000000004'::uuid,'a1000000-0000-0000-0000-000000000005'::uuid,
    'a1000000-0000-0000-0000-000000000006'::uuid,p7,
    'a1000000-0000-0000-0000-000000000008'::uuid,'a1000000-0000-0000-0000-000000000009'::uuid)
  ORDER BY created_at LIMIT 1;
  IF logged_in_user IS NULL THEN logged_in_user := p1; END IF;

  -- Logged-in user favorites Marc and Alexandre (skip self-favorites)
  IF logged_in_user != p1 THEN
    INSERT INTO player_favorite (player_id, favorite_player_id) VALUES
      (logged_in_user, p1)
    ON CONFLICT DO NOTHING;
  END IF;
  IF logged_in_user != p7 THEN
    INSERT INTO player_favorite (player_id, favorite_player_id) VALUES
      (logged_in_user, p7)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Marc favorites the logged-in user and Sophie
  IF logged_in_user != p1 THEN
    INSERT INTO player_favorite (player_id, favorite_player_id) VALUES
      (p1, logged_in_user)
    ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO player_favorite (player_id, favorite_player_id) VALUES
    (p1, p2)
  ON CONFLICT DO NOTHING;

  -- Alexandre favorites Marc
  INSERT INTO player_favorite (player_id, favorite_player_id) VALUES
    (p7, p1)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created player favorite relationships';
END $$;

-- ============================================================================
-- 12. Player Reputation
-- ============================================================================
DO $$
DECLARE
  u RECORD;
  idx INT := 0;
  scores NUMERIC[] := ARRAY[85, 72, 90, 45, 68, 55, 95, 60, 50];
  tiers reputation_tier[] := ARRAY['gold', 'silver', 'gold', 'bronze', 'silver', 'bronze', 'platinum', 'silver', 'bronze'];
  completed INT[] := ARRAY[28, 15, 35, 5, 12, 8, 42, 10, 6];
  positives INT[] := ARRAY[24, 12, 32, 3, 10, 5, 40, 7, 4];
  negatives INT[] := ARRAY[1, 2, 0, 2, 1, 3, 0, 2, 1];
BEGIN
  FOR u IN SELECT id FROM auth.users ORDER BY email LOOP
    idx := idx + 1;
    IF idx > 9 THEN idx := 9; END IF;

    INSERT INTO player_reputation (
      player_id, reputation_score, reputation_tier,
      matches_completed, positive_events, negative_events, total_events
    ) VALUES (
      u.id,
      scores[idx],
      tiers[idx],
      completed[idx],
      positives[idx],
      negatives[idx],
      positives[idx] + negatives[idx]
    )
    ON CONFLICT (player_id) DO NOTHING;
  END LOOP;
  RAISE NOTICE 'Created player reputation records';
END $$;

-- ============================================================================
-- 13. Player Favorite Facilities
-- ============================================================================
DO $$
DECLARE
  p1 UUID := 'a1000000-0000-0000-0000-000000000001';
  p2 UUID := 'a1000000-0000-0000-0000-000000000002';
  p5 UUID := 'a1000000-0000-0000-0000-000000000005';
  p7 UUID := 'a1000000-0000-0000-0000-000000000007';
  logged_in_user UUID;
  fac_ids UUID[];
BEGIN
  SELECT id INTO logged_in_user FROM auth.users
  WHERE id NOT IN (p1,p2,'a1000000-0000-0000-0000-000000000003'::uuid,
    'a1000000-0000-0000-0000-000000000004'::uuid,p5,
    'a1000000-0000-0000-0000-000000000006'::uuid,p7,
    'a1000000-0000-0000-0000-000000000008'::uuid,'a1000000-0000-0000-0000-000000000009'::uuid)
  ORDER BY created_at LIMIT 1;
  IF logged_in_user IS NULL THEN logged_in_user := p1; END IF;

  -- Get up to 5 Montreal facilities
  SELECT ARRAY_AGG(id ORDER BY name) INTO fac_ids
  FROM (SELECT id, name FROM facility WHERE city = 'Montreal' AND is_active = true LIMIT 5) sub;

  IF fac_ids IS NULL OR array_length(fac_ids, 1) IS NULL THEN
    RAISE NOTICE 'No Montreal facilities found, skipping favorite facility seeding';
    RETURN;
  END IF;

  -- Logged-in user favorites 3 facilities
  IF array_length(fac_ids, 1) >= 1 THEN
    INSERT INTO player_favorite_facility (player_id, facility_id, display_order)
    VALUES (logged_in_user, fac_ids[1], 1) ON CONFLICT DO NOTHING;
  END IF;
  IF array_length(fac_ids, 1) >= 2 THEN
    INSERT INTO player_favorite_facility (player_id, facility_id, display_order)
    VALUES (logged_in_user, fac_ids[2], 2) ON CONFLICT DO NOTHING;
  END IF;
  IF array_length(fac_ids, 1) >= 3 THEN
    INSERT INTO player_favorite_facility (player_id, facility_id, display_order)
    VALUES (logged_in_user, fac_ids[3], 3) ON CONFLICT DO NOTHING;
  END IF;

  -- Marc favorites 2 facilities
  IF array_length(fac_ids, 1) >= 1 THEN
    INSERT INTO player_favorite_facility (player_id, facility_id, display_order)
    VALUES (p1, fac_ids[1], 1) ON CONFLICT DO NOTHING;
  END IF;
  IF array_length(fac_ids, 1) >= 3 THEN
    INSERT INTO player_favorite_facility (player_id, facility_id, display_order)
    VALUES (p1, fac_ids[3], 2) ON CONFLICT DO NOTHING;
  END IF;

  -- Sophie favorites 1 facility
  IF array_length(fac_ids, 1) >= 2 THEN
    INSERT INTO player_favorite_facility (player_id, facility_id, display_order)
    VALUES (p2, fac_ids[2], 1) ON CONFLICT DO NOTHING;
  END IF;

  -- Philippe favorites 2 facilities
  IF array_length(fac_ids, 1) >= 4 THEN
    INSERT INTO player_favorite_facility (player_id, facility_id, display_order)
    VALUES (p5, fac_ids[4], 1) ON CONFLICT DO NOTHING;
  END IF;
  IF array_length(fac_ids, 1) >= 1 THEN
    INSERT INTO player_favorite_facility (player_id, facility_id, display_order)
    VALUES (p5, fac_ids[1], 2) ON CONFLICT DO NOTHING;
  END IF;

  -- Alexandre favorites 2 facilities
  IF array_length(fac_ids, 1) >= 5 THEN
    INSERT INTO player_favorite_facility (player_id, facility_id, display_order)
    VALUES (p7, fac_ids[5], 1) ON CONFLICT DO NOTHING;
  END IF;
  IF array_length(fac_ids, 1) >= 2 THEN
    INSERT INTO player_favorite_facility (player_id, facility_id, display_order)
    VALUES (p7, fac_ids[2], 2) ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Created player favorite facility records';
END $$;

-- ============================================================================
-- 14. Bookings (3 bookings at Montreal facilities)
-- NOTE: Montreal facilities get availability from the Loisir Montreal API
-- (data_provider), not from local court_slot records.
-- ============================================================================
DO $$
DECLARE
  logged_in_user UUID;
  p1 UUID := 'a1000000-0000-0000-0000-000000000001';
  fac_id UUID;
  court_id UUID;
  org_id UUID;
  today DATE := CURRENT_DATE;
BEGIN
  SELECT id INTO logged_in_user FROM auth.users
  WHERE id NOT IN (
    'a1000000-0000-0000-0000-000000000001'::uuid,'a1000000-0000-0000-0000-000000000002'::uuid,
    'a1000000-0000-0000-0000-000000000003'::uuid,'a1000000-0000-0000-0000-000000000004'::uuid,
    'a1000000-0000-0000-0000-000000000005'::uuid,'a1000000-0000-0000-0000-000000000006'::uuid,
    'a1000000-0000-0000-0000-000000000007'::uuid,'a1000000-0000-0000-0000-000000000008'::uuid,
    'a1000000-0000-0000-0000-000000000009'::uuid
  ) ORDER BY created_at LIMIT 1;
  IF logged_in_user IS NULL THEN logged_in_user := p1; END IF;

  -- Find a Montreal facility with a court
  SELECT f.id, f.organization_id, c.id INTO fac_id, org_id, court_id
  FROM facility f
  JOIN court c ON c.facility_id = f.id
  WHERE f.city = 'Montreal' AND f.is_active = true
  ORDER BY f.name LIMIT 1;

  IF fac_id IS NULL THEN
    RAISE NOTICE 'No Montreal facilities found, skipping booking seeding';
    RETURN;
  END IF;

  -- Booking 1: Upcoming confirmed booking (day after tomorrow)
  INSERT INTO booking (
    player_id, court_id, organization_id, booking_date, start_time, end_time,
    booking_type, status, payment_status, price_cents, currency
  ) VALUES (
    logged_in_user, court_id, org_id,
    (today + 2),
    ((today + 2)::date + TIME '10:00')::timestamptz,
    ((today + 2)::date + TIME '11:00')::timestamptz,
    'player', 'confirmed', 'completed', 2500, 'CAD'
  ) ON CONFLICT DO NOTHING;

  -- Booking 2: Past completed booking (5 days ago)
  INSERT INTO booking (
    player_id, court_id, organization_id, booking_date, start_time, end_time,
    booking_type, status, payment_status, price_cents, currency
  ) VALUES (
    logged_in_user, court_id, org_id,
    (today - 5),
    ((today - 5)::date + TIME '18:00')::timestamptz,
    ((today - 5)::date + TIME '19:00')::timestamptz,
    'player', 'completed', 'completed', 3000, 'CAD'
  ) ON CONFLICT DO NOTHING;

  -- Booking 3: Upcoming booking for another player
  INSERT INTO booking (
    player_id, court_id, organization_id, booking_date, start_time, end_time,
    booking_type, status, payment_status, price_cents, currency
  ) VALUES (
    p1, court_id, org_id,
    (today + 3),
    ((today + 3)::date + TIME '14:00')::timestamptz,
    ((today + 3)::date + TIME '15:00')::timestamptz,
    'player', 'confirmed', 'completed', 2500, 'CAD'
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created 3 bookings';
END $$;

-- ============================================================================
-- Verification Summary
-- ============================================================================
DO $$
DECLARE
  cnt_profiles INT;
  cnt_players INT;
  cnt_player_sports INT;
  cnt_matches INT;
  cnt_participants INT;
  cnt_networks INT;
  cnt_conversations INT;
  cnt_messages INT;
  cnt_notifications INT;
  cnt_bookings INT;
BEGIN
  SELECT COUNT(*) INTO cnt_profiles FROM profile;
  SELECT COUNT(*) INTO cnt_players FROM player;
  SELECT COUNT(*) INTO cnt_player_sports FROM player_sport;
  SELECT COUNT(*) INTO cnt_matches FROM match;
  SELECT COUNT(*) INTO cnt_participants FROM match_participant;
  SELECT COUNT(*) INTO cnt_networks FROM network;
  SELECT COUNT(*) INTO cnt_conversations FROM conversation;
  SELECT COUNT(*) INTO cnt_messages FROM message;
  SELECT COUNT(*) INTO cnt_notifications FROM notification;
  SELECT COUNT(*) INTO cnt_bookings FROM booking;

  RAISE NOTICE '';
  RAISE NOTICE '=== SEED VERIFICATION ===';
  RAISE NOTICE 'Profiles:       %', cnt_profiles;
  RAISE NOTICE 'Players:        %', cnt_players;
  RAISE NOTICE 'Player Sports:  %', cnt_player_sports;
  RAISE NOTICE 'Matches:        %', cnt_matches;
  RAISE NOTICE 'Participants:   %', cnt_participants;
  RAISE NOTICE 'Networks:       %', cnt_networks;
  RAISE NOTICE 'Conversations:  %', cnt_conversations;
  RAISE NOTICE 'Messages:       %', cnt_messages;
  RAISE NOTICE 'Notifications:  %', cnt_notifications;
  RAISE NOTICE 'Bookings:       %', cnt_bookings;
  RAISE NOTICE '=========================';
END $$;
