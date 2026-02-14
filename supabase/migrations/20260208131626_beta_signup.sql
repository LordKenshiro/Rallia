-- Create beta_signup table for collecting beta tester information
CREATE TABLE beta_signup (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL,
  city TEXT NOT NULL,
  plays_tennis BOOLEAN NOT NULL DEFAULT false,
  tennis_level TEXT, -- 'beginner', 'intermediate', 'advanced', 'elite'
  plays_pickleball BOOLEAN NOT NULL DEFAULT false,
  pickleball_level TEXT, -- 'beginner', 'intermediate', 'advanced', 'elite'
  email TEXT NOT NULL,
  phone TEXT,
  ip_address TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add check constraints for skill levels
ALTER TABLE beta_signup ADD CONSTRAINT beta_signup_tennis_level_check
  CHECK (tennis_level IS NULL OR tennis_level IN ('beginner', 'intermediate', 'advanced', 'elite'));

ALTER TABLE beta_signup ADD CONSTRAINT beta_signup_pickleball_level_check
  CHECK (pickleball_level IS NULL OR pickleball_level IN ('beginner', 'intermediate', 'advanced', 'elite'));

-- Ensure at least one sport is selected
ALTER TABLE beta_signup ADD CONSTRAINT beta_signup_at_least_one_sport_check
  CHECK (plays_tennis = true OR plays_pickleball = true);

-- Ensure level is provided when sport is selected
ALTER TABLE beta_signup ADD CONSTRAINT beta_signup_tennis_level_required_check
  CHECK (plays_tennis = false OR tennis_level IS NOT NULL);

ALTER TABLE beta_signup ADD CONSTRAINT beta_signup_pickleball_level_required_check
  CHECK (plays_pickleball = false OR pickleball_level IS NOT NULL);

-- RLS policies for insert (allow both anonymous and authenticated users)
ALTER TABLE beta_signup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert beta signup"
  ON beta_signup
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Index on email for duplicate checking
CREATE INDEX beta_signup_email_idx ON beta_signup (email);
