-- =============================================================================
-- Migration: Add Shared Contact List Tables
-- Description: Creates tables for managing shared contact lists with non-app users
--              who can be invited to matches
-- =============================================================================

-- =============================================================================
-- TABLE: shared_contact_list
-- Purpose: Lists of non-app contacts for inviting to matches
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.shared_contact_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.player(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  contact_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.shared_contact_list IS 'Lists of non-app contacts for inviting to matches';

-- =============================================================================
-- TABLE: shared_contact
-- Purpose: Individual contacts within shared contact lists
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.shared_contact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.shared_contact_list(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(255),
  notes TEXT,
  -- Source of the contact (phone_book = imported from device, manual = manually added)
  source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('phone_book', 'manual')),
  -- Original contact ID from device (for syncing purposes)
  device_contact_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- At least one contact method required
  CONSTRAINT shared_contact_has_contact_method CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Add comment
COMMENT ON TABLE public.shared_contact IS 'Individual contacts within shared contact lists';

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_shared_contact_list_player ON public.shared_contact_list(player_id);
CREATE INDEX IF NOT EXISTS idx_shared_contact_list_id ON public.shared_contact(list_id);
CREATE INDEX IF NOT EXISTS idx_shared_contact_phone ON public.shared_contact(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shared_contact_email ON public.shared_contact(email) WHERE email IS NOT NULL;

-- =============================================================================
-- TRIGGER: Update contact_count on shared_contact_list
-- =============================================================================
CREATE OR REPLACE FUNCTION update_shared_contact_list_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.shared_contact_list 
    SET contact_count = contact_count + 1, updated_at = NOW()
    WHERE id = NEW.list_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.shared_contact_list 
    SET contact_count = contact_count - 1, updated_at = NOW()
    WHERE id = OLD.list_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_shared_contact_list_count ON public.shared_contact;
CREATE TRIGGER trigger_update_shared_contact_list_count
AFTER INSERT OR DELETE ON public.shared_contact
FOR EACH ROW
EXECUTE FUNCTION update_shared_contact_list_count();

-- =============================================================================
-- TRIGGER: Update updated_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION update_shared_contact_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_shared_contact_list_updated_at ON public.shared_contact_list;
CREATE TRIGGER trigger_update_shared_contact_list_updated_at
BEFORE UPDATE ON public.shared_contact_list
FOR EACH ROW
EXECUTE FUNCTION update_shared_contact_updated_at();

DROP TRIGGER IF EXISTS trigger_update_shared_contact_updated_at ON public.shared_contact;
CREATE TRIGGER trigger_update_shared_contact_updated_at
BEFORE UPDATE ON public.shared_contact
FOR EACH ROW
EXECUTE FUNCTION update_shared_contact_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS
ALTER TABLE public.shared_contact_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_contact ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES: shared_contact_list
-- =============================================================================

-- Policy: Users can view their own lists
CREATE POLICY "Users can view own contact lists"
ON public.shared_contact_list
FOR SELECT
TO authenticated
USING (player_id = auth.uid());

-- Policy: Users can create their own lists
CREATE POLICY "Users can create own contact lists"
ON public.shared_contact_list
FOR INSERT
TO authenticated
WITH CHECK (player_id = auth.uid());

-- Policy: Users can update their own lists
CREATE POLICY "Users can update own contact lists"
ON public.shared_contact_list
FOR UPDATE
TO authenticated
USING (player_id = auth.uid())
WITH CHECK (player_id = auth.uid());

-- Policy: Users can delete their own lists
CREATE POLICY "Users can delete own contact lists"
ON public.shared_contact_list
FOR DELETE
TO authenticated
USING (player_id = auth.uid());

-- =============================================================================
-- RLS POLICIES: shared_contact
-- =============================================================================

-- Policy: Users can view contacts in their own lists
CREATE POLICY "Users can view contacts in own lists"
ON public.shared_contact
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shared_contact_list
    WHERE id = shared_contact.list_id
    AND player_id = auth.uid()
  )
);

-- Policy: Users can create contacts in their own lists
CREATE POLICY "Users can create contacts in own lists"
ON public.shared_contact
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shared_contact_list
    WHERE id = list_id
    AND player_id = auth.uid()
  )
);

-- Policy: Users can update contacts in their own lists
CREATE POLICY "Users can update contacts in own lists"
ON public.shared_contact
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shared_contact_list
    WHERE id = shared_contact.list_id
    AND player_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shared_contact_list
    WHERE id = list_id
    AND player_id = auth.uid()
  )
);

-- Policy: Users can delete contacts in their own lists
CREATE POLICY "Users can delete contacts in own lists"
ON public.shared_contact
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shared_contact_list
    WHERE id = shared_contact.list_id
    AND player_id = auth.uid()
  )
);

-- =============================================================================
-- ENABLE REALTIME (optional, for live updates)
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_contact_list;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_contact;
