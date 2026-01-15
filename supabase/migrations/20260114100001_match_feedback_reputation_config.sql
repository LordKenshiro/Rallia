-- =============================================================================
-- MATCH FEEDBACK SYSTEM - REPUTATION CONFIG
-- Separate migration required because PostgreSQL doesn't allow using newly
-- added enum values in the same transaction where they were created.
-- =============================================================================

INSERT INTO reputation_config (event_type, default_impact, min_impact, max_impact, decay_enabled, decay_half_life_days)
VALUES ('feedback_submitted', 2, 1, 3, false, NULL)
ON CONFLICT (event_type) DO NOTHING;
