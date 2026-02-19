-- Migration: Add icon_url column to sport table
-- The original schema had icon_url but it was lost during the consolidation
-- from the remote schema (which didn't have it)

ALTER TABLE sport ADD COLUMN IF NOT EXISTS icon_url TEXT;

COMMENT ON COLUMN sport.icon_url IS 'URL to the sport icon image';

-- ============================================
-- SEED DATA: Sports
-- ============================================
-- Insert tennis and pickleball sports if they don't already exist.
-- Uses ON CONFLICT to be idempotent.

INSERT INTO sport (name, slug, display_name, description, icon_url, is_active)
VALUES
  ('tennis', 'tennis', 'Tennis', 'Traditional tennis sport', 'images/tennis.jpg', true),
  ('pickleball', 'pickleball', 'Pickleball', 'Fast-paced paddle sport', 'images/pickleball.jpg', true)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url;

