-- Migration: Create junction tables for player play styles and attributes
-- This allows proper foreign key relationships between players and play_style/play_attribute tables

-- ============================================================================
-- 1. Create player_sport_play_style junction table (1 player_sport : 1 play_style)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.player_sport_play_style (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_sport_id uuid NOT NULL,
  play_style_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT player_sport_play_style_pkey PRIMARY KEY (id),
  CONSTRAINT player_sport_play_style_player_sport_id_fkey 
    FOREIGN KEY (player_sport_id) REFERENCES public.player_sport(id) ON DELETE CASCADE,
  CONSTRAINT player_sport_play_style_play_style_id_fkey 
    FOREIGN KEY (play_style_id) REFERENCES public.play_style(id) ON DELETE CASCADE,
  -- Each player_sport can only have one play_style
  CONSTRAINT player_sport_play_style_unique UNIQUE (player_sport_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_player_sport_play_style_player_sport_id 
  ON public.player_sport_play_style(player_sport_id);
CREATE INDEX IF NOT EXISTS idx_player_sport_play_style_play_style_id 
  ON public.player_sport_play_style(play_style_id);

-- ============================================================================
-- 2. Create player_sport_play_attribute junction table (1 player_sport : many play_attributes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.player_sport_play_attribute (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_sport_id uuid NOT NULL,
  play_attribute_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT player_sport_play_attribute_pkey PRIMARY KEY (id),
  CONSTRAINT player_sport_play_attribute_player_sport_id_fkey 
    FOREIGN KEY (player_sport_id) REFERENCES public.player_sport(id) ON DELETE CASCADE,
  CONSTRAINT player_sport_play_attribute_play_attribute_id_fkey 
    FOREIGN KEY (play_attribute_id) REFERENCES public.play_attribute(id) ON DELETE CASCADE,
  -- Each player_sport can only have each attribute once
  CONSTRAINT player_sport_play_attribute_unique UNIQUE (player_sport_id, play_attribute_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_player_sport_play_attribute_player_sport_id 
  ON public.player_sport_play_attribute(player_sport_id);
CREATE INDEX IF NOT EXISTS idx_player_sport_play_attribute_play_attribute_id 
  ON public.player_sport_play_attribute(play_attribute_id);

-- ============================================================================
-- 3. Enable Row Level Security
-- ============================================================================
ALTER TABLE public.player_sport_play_style ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_sport_play_attribute ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies for player_sport_play_style
-- ============================================================================

-- Players can view their own play style
CREATE POLICY "Players can view own play style"
  ON public.player_sport_play_style
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.player_sport ps
      WHERE ps.id = player_sport_play_style.player_sport_id
      AND ps.player_id = auth.uid()
    )
  );

-- Players can insert their own play style
CREATE POLICY "Players can insert own play style"
  ON public.player_sport_play_style
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.player_sport ps
      WHERE ps.id = player_sport_play_style.player_sport_id
      AND ps.player_id = auth.uid()
    )
  );

-- Players can update their own play style
CREATE POLICY "Players can update own play style"
  ON public.player_sport_play_style
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.player_sport ps
      WHERE ps.id = player_sport_play_style.player_sport_id
      AND ps.player_id = auth.uid()
    )
  );

-- Players can delete their own play style
CREATE POLICY "Players can delete own play style"
  ON public.player_sport_play_style
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.player_sport ps
      WHERE ps.id = player_sport_play_style.player_sport_id
      AND ps.player_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. RLS Policies for player_sport_play_attribute
-- ============================================================================

-- Players can view their own play attributes
CREATE POLICY "Players can view own play attributes"
  ON public.player_sport_play_attribute
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.player_sport ps
      WHERE ps.id = player_sport_play_attribute.player_sport_id
      AND ps.player_id = auth.uid()
    )
  );

-- Players can insert their own play attributes
CREATE POLICY "Players can insert own play attributes"
  ON public.player_sport_play_attribute
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.player_sport ps
      WHERE ps.id = player_sport_play_attribute.player_sport_id
      AND ps.player_id = auth.uid()
    )
  );

-- Players can update their own play attributes
CREATE POLICY "Players can update own play attributes"
  ON public.player_sport_play_attribute
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.player_sport ps
      WHERE ps.id = player_sport_play_attribute.player_sport_id
      AND ps.player_id = auth.uid()
    )
  );

-- Players can delete their own play attributes
CREATE POLICY "Players can delete own play attributes"
  ON public.player_sport_play_attribute
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.player_sport ps
      WHERE ps.id = player_sport_play_attribute.player_sport_id
      AND ps.player_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. Grant permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_sport_play_style TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_sport_play_attribute TO authenticated;
