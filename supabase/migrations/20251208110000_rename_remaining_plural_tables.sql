-- Migration: Rename remaining plural tables to singular
-- This completes the singular naming convention migration

-- ============================================
-- PHASE 1: RENAME TABLES
-- ============================================

-- Junction tables
ALTER TABLE IF EXISTS court_sports RENAME TO court_sport;
ALTER TABLE IF EXISTS facility_files RENAME TO facility_file;
ALTER TABLE IF EXISTS facility_sports RENAME TO facility_sport;
ALTER TABLE IF EXISTS player_play_attributes RENAME TO player_play_attribute;

-- Regular tables
ALTER TABLE IF EXISTS delivery_attempts RENAME TO delivery_attempt;
ALTER TABLE IF EXISTS facility_contacts RENAME TO facility_contact;
ALTER TABLE IF EXISTS facility_images RENAME TO facility_image;
ALTER TABLE IF EXISTS files RENAME TO file;
ALTER TABLE IF EXISTS invitations RENAME TO invitation;
ALTER TABLE IF EXISTS peer_rating_requests RENAME TO peer_rating_request;
ALTER TABLE IF EXISTS play_attributes RENAME TO play_attribute;
ALTER TABLE IF EXISTS play_styles RENAME TO play_style;
ALTER TABLE IF EXISTS player_sport_profiles RENAME TO player_sport_profile;
ALTER TABLE IF EXISTS rating_proofs RENAME TO rating_proof;
ALTER TABLE IF EXISTS rating_reference_requests RENAME TO rating_reference_request;
ALTER TABLE IF EXISTS rating_systems RENAME TO rating_system;
ALTER TABLE IF EXISTS waitlist_signups RENAME TO waitlist_signup;

-- ============================================
-- PHASE 2: UPDATE FOREIGN KEY CONSTRAINTS
-- (PostgreSQL auto-renames most constraints with table rename,
--  but we should update any that reference old table names)
-- ============================================

-- Update FK constraints for court_sport (was court_sports)
ALTER TABLE IF EXISTS court_sport
  DROP CONSTRAINT IF EXISTS court_sports_court_id_fkey;
ALTER TABLE IF EXISTS court_sport
  DROP CONSTRAINT IF EXISTS court_sports_sport_id_fkey;
ALTER TABLE IF EXISTS court_sport
  ADD CONSTRAINT court_sport_court_id_fkey
  FOREIGN KEY (court_id) REFERENCES court(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS court_sport
  ADD CONSTRAINT court_sport_sport_id_fkey
  FOREIGN KEY (sport_id) REFERENCES sport(id) ON DELETE CASCADE;

-- Update FK constraints for facility_sport (was facility_sports)
ALTER TABLE IF EXISTS facility_sport
  DROP CONSTRAINT IF EXISTS facility_sports_facility_id_fkey;
ALTER TABLE IF EXISTS facility_sport
  DROP CONSTRAINT IF EXISTS facility_sports_sport_id_fkey;
ALTER TABLE IF EXISTS facility_sport
  ADD CONSTRAINT facility_sport_facility_id_fkey
  FOREIGN KEY (facility_id) REFERENCES facility(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS facility_sport
  ADD CONSTRAINT facility_sport_sport_id_fkey
  FOREIGN KEY (sport_id) REFERENCES sport(id) ON DELETE CASCADE;

-- Update FK constraints for facility_file (was facility_files)
ALTER TABLE IF EXISTS facility_file
  DROP CONSTRAINT IF EXISTS facility_files_facility_id_fkey;
ALTER TABLE IF EXISTS facility_file
  DROP CONSTRAINT IF EXISTS facility_files_file_id_fkey;
ALTER TABLE IF EXISTS facility_file
  ADD CONSTRAINT facility_file_facility_id_fkey
  FOREIGN KEY (facility_id) REFERENCES facility(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS facility_file
  ADD CONSTRAINT facility_file_file_id_fkey
  FOREIGN KEY (file_id) REFERENCES file(id) ON DELETE CASCADE;

-- Update FK constraints for facility_contact (was facility_contacts)
ALTER TABLE IF EXISTS facility_contact
  DROP CONSTRAINT IF EXISTS facility_contacts_facility_id_fkey;
ALTER TABLE IF EXISTS facility_contact
  ADD CONSTRAINT facility_contact_facility_id_fkey
  FOREIGN KEY (facility_id) REFERENCES facility(id) ON DELETE CASCADE;

-- Update FK constraints for facility_image (was facility_images)
ALTER TABLE IF EXISTS facility_image
  DROP CONSTRAINT IF EXISTS facility_images_facility_id_fkey;
ALTER TABLE IF EXISTS facility_image
  ADD CONSTRAINT facility_image_facility_id_fkey
  FOREIGN KEY (facility_id) REFERENCES facility(id) ON DELETE CASCADE;

-- Update FK constraints for rating_proof (was rating_proofs)
ALTER TABLE IF EXISTS rating_proof
  DROP CONSTRAINT IF EXISTS rating_proofs_player_rating_score_id_fkey;
ALTER TABLE IF EXISTS rating_proof
  DROP CONSTRAINT IF EXISTS rating_proofs_file_id_fkey;
ALTER TABLE IF EXISTS rating_proof
  ADD CONSTRAINT rating_proof_player_rating_score_id_fkey
  FOREIGN KEY (player_rating_score_id) REFERENCES player_rating_score(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS rating_proof
  ADD CONSTRAINT rating_proof_file_id_fkey
  FOREIGN KEY (file_id) REFERENCES file(id) ON DELETE SET NULL;

-- Update FK constraints for invitation (was invitations)
ALTER TABLE IF EXISTS invitation
  DROP CONSTRAINT IF EXISTS invitations_invited_by_fkey;
ALTER TABLE IF EXISTS invitation
  DROP CONSTRAINT IF EXISTS invitations_organization_id_fkey;

-- Update FK constraints for delivery_attempt (was delivery_attempts)
ALTER TABLE IF EXISTS delivery_attempt
  DROP CONSTRAINT IF EXISTS delivery_attempts_notification_id_fkey;
ALTER TABLE IF EXISTS delivery_attempt
  ADD CONSTRAINT delivery_attempt_notification_id_fkey
  FOREIGN KEY (notification_id) REFERENCES notification(id) ON DELETE CASCADE;

-- ============================================
-- PHASE 3: ADD TABLE COMMENTS
-- ============================================

COMMENT ON TABLE court_sport IS 'Junction table linking courts to sports they support';
COMMENT ON TABLE facility_file IS 'Junction table linking facilities to uploaded files';
COMMENT ON TABLE facility_sport IS 'Junction table linking facilities to sports offered';
COMMENT ON TABLE player_play_attribute IS 'Junction table linking players to their play attributes';
COMMENT ON TABLE delivery_attempt IS 'Tracks notification delivery attempts across channels';
COMMENT ON TABLE facility_contact IS 'Contact information for facilities';
COMMENT ON TABLE facility_image IS 'Images associated with facilities';
COMMENT ON TABLE file IS 'Uploaded files metadata';
COMMENT ON TABLE invitation IS 'User invitations to the platform';
COMMENT ON TABLE peer_rating_request IS 'Requests for peer rating verification';
COMMENT ON TABLE play_attribute IS 'Available play attributes/skills';
COMMENT ON TABLE play_style IS 'Available play styles';
COMMENT ON TABLE player_sport_profile IS 'Extended sport-specific player profiles';
COMMENT ON TABLE rating_proof IS 'Proof documents for rating verification';
COMMENT ON TABLE rating_reference_request IS 'Requests for rating references';
COMMENT ON TABLE rating_system IS 'Rating systems configuration';
COMMENT ON TABLE waitlist_signup IS 'Waitlist signups for early access';

