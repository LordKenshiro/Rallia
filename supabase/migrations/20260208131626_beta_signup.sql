-- Create beta_signup table for collecting beta tester information
CREATE TABLE IF NOT EXISTS beta_signup (
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

-- Add check constraints for skill levels (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beta_signup_tennis_level_check'
  ) THEN
    ALTER TABLE beta_signup ADD CONSTRAINT beta_signup_tennis_level_check
      CHECK (tennis_level IS NULL OR tennis_level IN ('beginner', 'intermediate', 'advanced', 'elite'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beta_signup_pickleball_level_check'
  ) THEN
    ALTER TABLE beta_signup ADD CONSTRAINT beta_signup_pickleball_level_check
      CHECK (pickleball_level IS NULL OR pickleball_level IN ('beginner', 'intermediate', 'advanced', 'elite'));
  END IF;
END $$;

-- Ensure at least one sport is selected
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beta_signup_at_least_one_sport_check'
  ) THEN
    ALTER TABLE beta_signup ADD CONSTRAINT beta_signup_at_least_one_sport_check
      CHECK (plays_tennis = true OR plays_pickleball = true);
  END IF;
END $$;

-- Ensure level is provided when sport is selected
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beta_signup_tennis_level_required_check'
  ) THEN
    ALTER TABLE beta_signup ADD CONSTRAINT beta_signup_tennis_level_required_check
      CHECK (plays_tennis = false OR tennis_level IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beta_signup_pickleball_level_required_check'
  ) THEN
    ALTER TABLE beta_signup ADD CONSTRAINT beta_signup_pickleball_level_required_check
      CHECK (plays_pickleball = false OR pickleball_level IS NOT NULL);
  END IF;
END $$;

-- RLS policies for insert (allow both anonymous and authenticated users)
ALTER TABLE beta_signup ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'beta_signup' AND policyname = 'anyone can insert beta signup'
  ) THEN
    CREATE POLICY "anyone can insert beta signup"
      ON beta_signup
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Index on email for duplicate checking
CREATE INDEX IF NOT EXISTS beta_signup_email_idx ON beta_signup (email);
