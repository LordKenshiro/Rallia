-- Migration: Seed Montreal Tennis Facilities
-- Created: 2024-12-14
-- Description: Seeds public tennis facilities in Montreal for testing facility search

-- ============================================
-- 1. CREATE TEST ORGANIZATION
-- ============================================

-- Create a test organization for Montreal public facilities
INSERT INTO organization (
  id,
  name,
  nature,
  type,
  slug,
  city,
  country,
  is_active
)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Ville de Montréal - Installations de Tennis',
  'public',
  'municipality',
  'ville-montreal-tennis',
  'Montreal',
  'Canada',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  nature = EXCLUDED.nature,
  type = EXCLUDED.type,
  city = EXCLUDED.city,
  country = EXCLUDED.country,
  is_active = EXCLUDED.is_active;

-- ============================================
-- 2. SEED FACILITIES
-- ============================================

-- Montreal tennis facilities with real coordinates
-- Coordinates are approximate locations of actual public tennis facilities

INSERT INTO facility (
  id,
  organization_id,
  name,
  facility_type,
  slug,
  description,
  address,
  city,
  postal_code,
  country,
  latitude,
  longitude,
  location,
  is_active
)
VALUES
  -- Parc Jarry Tennis Courts
  (
    'f1a2b3c4-d5e6-7890-abcd-ef1234567891',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Parc Jarry Tennis Courts',
    'municipal',
    'parc-jarry-tennis',
    'Public tennis courts in Parc Jarry, popular location for tennis enthusiasts',
    '285 Rue Faillon O',
    'Montreal',
    'H2R 2N6',
    'Canada',
    45.5289,
    -73.6250,
    extensions.ST_SetSRID(extensions.ST_MakePoint(-73.6250, 45.5289), 4326)::extensions.geography,
    true
  ),
  -- Parc Lafontaine Tennis Courts
  (
    'f1a2b3c4-d5e6-7890-abcd-ef1234567892',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Parc La Fontaine Tennis Courts',
    'municipal',
    'parc-la-fontaine-tennis',
    'Beautiful tennis courts in Parc La Fontaine, Plateau Mont-Royal',
    '3933 Avenue du Parc La Fontaine',
    'Montreal',
    'H2L 3C7',
    'Canada',
    45.5250,
    -73.5700,
    extensions.ST_SetSRID(extensions.ST_MakePoint(-73.5700, 45.5250), 4326)::extensions.geography,
    true
  ),
  -- Parc Jeanne-Mance Tennis Courts
  (
    'f1a2b3c4-d5e6-7890-abcd-ef1234567893',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Parc Jeanne-Mance Tennis Courts',
    'municipal',
    'parc-jeanne-mance-tennis',
    'Public tennis courts near Mount Royal, great for casual play',
    'Avenue du Parc',
    'Montreal',
    'H2V 4P7',
    'Canada',
    45.5100,
    -73.5850,
    extensions.ST_SetSRID(extensions.ST_MakePoint(-73.5850, 45.5100), 4326)::extensions.geography,
    true
  ),
  -- Parc Maisonneuve Tennis Courts
  (
    'f1a2b3c4-d5e6-7890-abcd-ef1234567894',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Parc Maisonneuve Tennis Courts',
    'municipal',
    'parc-maisonneuve-tennis',
    'Tennis facilities in Parc Maisonneuve, Olympic Park area',
    '4601 Rue Sherbrooke Est',
    'Montreal',
    'H1X 2B1',
    'Canada',
    45.5600,
    -73.5500,
    extensions.ST_SetSRID(extensions.ST_MakePoint(-73.5500, 45.5600), 4326)::extensions.geography,
    true
  ),
  -- Parc Laurier Tennis Courts
  (
    'f1a2b3c4-d5e6-7890-abcd-ef1234567895',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Parc Laurier Tennis Courts',
    'municipal',
    'parc-laurier-tennis',
    'Community tennis courts in Parc Laurier, Plateau Mont-Royal',
    'Rue Laurier Est',
    'Montreal',
    'H2J 1G7',
    'Canada',
    45.5300,
    -73.5800,
    extensions.ST_SetSRID(extensions.ST_MakePoint(-73.5800, 45.5300), 4326)::extensions.geography,
    true
  ),
  -- Parc du Mont-Royal Tennis Courts
  (
    'f1a2b3c4-d5e6-7890-abcd-ef1234567896',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Parc du Mont-Royal Tennis Courts',
    'municipal',
    'parc-mont-royal-tennis',
    'Scenic tennis courts on Mount Royal with great views',
    'Chemin Remembrance',
    'Montreal',
    'H3H 1A2',
    'Canada',
    45.5050,
    -73.5900,
    extensions.ST_SetSRID(extensions.ST_MakePoint(-73.5900, 45.5050), 4326)::extensions.geography,
    true
  ),
  -- Parc Ahuntsic Tennis Courts
  (
    'f1a2b3c4-d5e6-7890-abcd-ef1234567897',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Parc Ahuntsic Tennis Courts',
    'municipal',
    'parc-ahuntsic-tennis',
    'Public tennis courts in Ahuntsic-Cartierville borough',
    '10555 Rue Lajeunesse',
    'Montreal',
    'H3L 2E5',
    'Canada',
    45.5450,
    -73.6500,
    extensions.ST_SetSRID(extensions.ST_MakePoint(-73.6500, 45.5450), 4326)::extensions.geography,
    true
  ),
  -- Parc Angrignon Tennis Courts
  (
    'f1a2b3c4-d5e6-7890-abcd-ef1234567898',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Parc Angrignon Tennis Courts',
    'municipal',
    'parc-angrignon-tennis',
    'Tennis facilities in Parc Angrignon, Southwest Montreal',
    '3400 Boulevard des Trinitaires',
    'Montreal',
    'H4E 4J3',
    'Canada',
    45.4450,
    -73.6000,
    extensions.ST_SetSRID(extensions.ST_MakePoint(-73.6000, 45.4450), 4326)::extensions.geography,
    true
  ),
  -- Parc Rivière-des-Prairies Tennis Courts
  (
    'f1a2b3c4-d5e6-7890-abcd-ef1234567899',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Parc Rivière-des-Prairies Tennis Courts',
    'municipal',
    'parc-riviere-des-prairies-tennis',
    'Public tennis courts in Rivière-des-Prairies borough',
    'Boulevard Gouin Est',
    'Montreal',
    'H1E 1A1',
    'Canada',
    45.6500,
    -73.5500,
    extensions.ST_SetSRID(extensions.ST_MakePoint(-73.5500, 45.6500), 4326)::extensions.geography,
    true
  ),
  -- Parc Notre-Dame-de-Grâce Tennis Courts
  (
    'f1a2b3c4-d5e6-7890-abcd-ef12345678a0',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Parc Notre-Dame-de-Grâce Tennis Courts',
    'municipal',
    'parc-notre-dame-de-grace-tennis',
    'Community tennis courts in NDG neighborhood',
    'Avenue de Monkland',
    'Montreal',
    'H4A 1E5',
    'Canada',
    45.4800,
    -73.6100,
    extensions.ST_SetSRID(extensions.ST_MakePoint(-73.6100, 45.4800), 4326)::extensions.geography,
    true
  ),
  -- Parc Villeray Tennis Courts
  (
    'f1a2b3c4-d5e6-7890-abcd-ef12345678a1',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Parc Villeray Tennis Courts',
    'municipal',
    'parc-villeray-tennis',
    'Public tennis courts in Villeray-Saint-Michel-Parc-Extension',
    'Rue Jarry Est',
    'Montreal',
    'H2P 1T4',
    'Canada',
    45.5400,
    -73.6200,
    extensions.ST_SetSRID(extensions.ST_MakePoint(-73.6200, 45.5400), 4326)::extensions.geography,
    true
  ),
  -- Parc Outremont Tennis Courts
  (
    'f1a2b3c4-d5e6-7890-abcd-ef12345678a2',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Parc Outremont Tennis Courts',
    'municipal',
    'parc-outremont-tennis',
    'Tennis facilities in Outremont borough',
    'Avenue McEachran',
    'Montreal',
    'H2V 3T5',
    'Canada',
    45.5150,
    -73.6050,
    extensions.ST_SetSRID(extensions.ST_MakePoint(-73.6050, 45.5150), 4326)::extensions.geography,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  country = EXCLUDED.country,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  location = EXCLUDED.location,
  is_active = EXCLUDED.is_active;

-- ============================================
-- 3. LINK FACILITIES TO TENNIS SPORT
-- ============================================

-- Associate all facilities with tennis sport
INSERT INTO facility_sport (facility_id, sport_id)
SELECT
  f.id,
  s.id
FROM facility f
CROSS JOIN sport s
WHERE s.name = 'tennis'
  AND f.organization_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
ON CONFLICT (facility_id, sport_id) DO NOTHING;

-- ============================================
-- 4. VERIFICATION
-- ============================================

DO $$
DECLARE
  facility_count INTEGER;
  facility_sport_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO facility_count
  FROM facility
  WHERE organization_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  
  SELECT COUNT(*) INTO facility_sport_count
  FROM facility_sport fs
  JOIN facility f ON fs.facility_id = f.id
  WHERE f.organization_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  
  RAISE NOTICE 'Montreal tennis facilities seed verification:';
  RAISE NOTICE '  - Facilities created: % (expected: 12)', facility_count;
  RAISE NOTICE '  - Facility-sport links: % (expected: 12)', facility_sport_count;
  
  IF facility_count < 12 THEN
    RAISE WARNING 'Some facilities may not have been created!';
  END IF;
  
  IF facility_sport_count < 12 THEN
    RAISE WARNING 'Some facility-sport links may be missing!';
  END IF;
END $$;


