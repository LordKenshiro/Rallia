-- Migration: Add score confirmation fields to match_result
-- This enables the 24-hour score confirmation flow where opponents can confirm or dispute scores

-- ============================================
-- PHASE 1: ADD CONFIRMATION FIELDS
-- ============================================

-- Add fields to track who submitted the score and confirmation status
ALTER TABLE match_result
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES player(id),
ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES player(id),
ADD COLUMN IF NOT EXISTS disputed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

-- Update is_verified to default to FALSE (score needs confirmation)
ALTER TABLE match_result
ALTER COLUMN is_verified SET DEFAULT FALSE;

-- ============================================
-- PHASE 2: ADD INDEX FOR PENDING CONFIRMATIONS
-- ============================================

-- Index for efficiently querying pending confirmations
CREATE INDEX IF NOT EXISTS idx_match_result_pending_confirmation 
ON match_result (is_verified, confirmation_deadline) 
WHERE is_verified = FALSE AND disputed = FALSE;

-- Index for querying by submitted_by
CREATE INDEX IF NOT EXISTS idx_match_result_submitted_by 
ON match_result (submitted_by);

-- ============================================
-- PHASE 3: AUTO-CONFIRM FUNCTION
-- ============================================

-- Function to auto-confirm scores after 24 hours
CREATE OR REPLACE FUNCTION auto_confirm_expired_scores()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE match_result
  SET 
    is_verified = TRUE,
    verified_at = NOW()
  WHERE 
    is_verified = FALSE 
    AND disputed = FALSE
    AND confirmation_deadline IS NOT NULL
    AND confirmation_deadline < NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PHASE 4: GET PENDING CONFIRMATIONS RPC
-- ============================================

-- Function to get pending score confirmations for a player
CREATE OR REPLACE FUNCTION get_pending_score_confirmations(p_player_id UUID)
RETURNS TABLE (
  match_result_id UUID,
  match_id UUID,
  match_date DATE,
  sport_name TEXT,
  sport_icon_url TEXT,
  winning_team INTEGER,
  team1_score INTEGER,
  team2_score INTEGER,
  submitted_by_id UUID,
  submitted_by_name TEXT,
  submitted_by_avatar TEXT,
  confirmation_deadline TIMESTAMPTZ,
  opponent_name TEXT,
  opponent_avatar TEXT,
  player_team INTEGER,
  network_id UUID,
  network_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.id as match_result_id,
    m.id as match_id,
    m.scheduled_date as match_date,
    s.name as sport_name,
    s.icon_url as sport_icon_url,
    mr.winning_team,
    mr.team1_score,
    mr.team2_score,
    mr.submitted_by as submitted_by_id,
    COALESCE(sub_profile.display_name, sub_profile.first_name || ' ' || COALESCE(sub_profile.last_name, '')) as submitted_by_name,
    sub_profile.profile_picture_url as submitted_by_avatar,
    mr.confirmation_deadline,
    COALESCE(opp_profile.display_name, opp_profile.first_name || ' ' || COALESCE(opp_profile.last_name, '')) as opponent_name,
    opp_profile.profile_picture_url as opponent_avatar,
    my_part.team_number as player_team,
    mn.network_id,
    n.name as network_name
  FROM match_result mr
  JOIN match m ON m.id = mr.match_id
  JOIN sport s ON s.id = m.sport_id
  JOIN match_participant my_part ON my_part.match_id = m.id AND my_part.player_id = p_player_id
  LEFT JOIN player sub_player ON sub_player.id = mr.submitted_by
  LEFT JOIN profile sub_profile ON sub_profile.id = sub_player.id
  LEFT JOIN match_participant opp_part ON opp_part.match_id = m.id AND opp_part.player_id != p_player_id
  LEFT JOIN player opp_player ON opp_player.id = opp_part.player_id
  LEFT JOIN profile opp_profile ON opp_profile.id = opp_player.id
  LEFT JOIN match_network mn ON mn.match_id = m.id
  LEFT JOIN network n ON n.id = mn.network_id
  WHERE 
    mr.is_verified = FALSE
    AND mr.disputed = FALSE
    AND mr.submitted_by != p_player_id
    AND mr.confirmation_deadline > NOW()
  ORDER BY mr.confirmation_deadline ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PHASE 5: CONFIRM SCORE RPC
-- ============================================

-- Function to confirm a score
CREATE OR REPLACE FUNCTION confirm_match_score(
  p_match_result_id UUID,
  p_player_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_match_id UUID;
  v_is_participant BOOLEAN;
BEGIN
  -- Get match_id and verify player is a participant
  SELECT mr.match_id INTO v_match_id
  FROM match_result mr
  WHERE mr.id = p_match_result_id
    AND mr.is_verified = FALSE
    AND mr.disputed = FALSE
    AND mr.submitted_by != p_player_id;
  
  IF v_match_id IS NULL THEN
    RAISE EXCEPTION 'Score not found or already processed';
  END IF;
  
  -- Check player is a participant
  SELECT EXISTS(
    SELECT 1 FROM match_participant mp
    WHERE mp.match_id = v_match_id AND mp.player_id = p_player_id
  ) INTO v_is_participant;
  
  IF NOT v_is_participant THEN
    RAISE EXCEPTION 'Player is not a participant of this match';
  END IF;
  
  -- Confirm the score
  UPDATE match_result
  SET 
    is_verified = TRUE,
    verified_at = NOW(),
    confirmed_by = p_player_id
  WHERE id = p_match_result_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PHASE 6: DISPUTE SCORE RPC
-- ============================================

-- Function to dispute a score
CREATE OR REPLACE FUNCTION dispute_match_score(
  p_match_result_id UUID,
  p_player_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_match_id UUID;
  v_is_participant BOOLEAN;
BEGIN
  -- Get match_id and verify player is a participant
  SELECT mr.match_id INTO v_match_id
  FROM match_result mr
  WHERE mr.id = p_match_result_id
    AND mr.is_verified = FALSE
    AND mr.disputed = FALSE
    AND mr.submitted_by != p_player_id;
  
  IF v_match_id IS NULL THEN
    RAISE EXCEPTION 'Score not found or already processed';
  END IF;
  
  -- Check player is a participant
  SELECT EXISTS(
    SELECT 1 FROM match_participant mp
    WHERE mp.match_id = v_match_id AND mp.player_id = p_player_id
  ) INTO v_is_participant;
  
  IF NOT v_is_participant THEN
    RAISE EXCEPTION 'Player is not a participant of this match';
  END IF;
  
  -- Dispute the score
  UPDATE match_result
  SET 
    disputed = TRUE,
    dispute_reason = p_reason
  WHERE id = p_match_result_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PHASE 7: COMMENTS
-- ============================================

COMMENT ON COLUMN match_result.submitted_by IS 'Player who submitted the score';
COMMENT ON COLUMN match_result.confirmation_deadline IS 'Deadline for opponent to confirm (24h after submission)';
COMMENT ON COLUMN match_result.confirmed_by IS 'Player who confirmed the score (if not auto-confirmed)';
COMMENT ON COLUMN match_result.disputed IS 'Whether the score has been disputed by opponent';
COMMENT ON COLUMN match_result.dispute_reason IS 'Reason provided for disputing the score';
COMMENT ON FUNCTION auto_confirm_expired_scores() IS 'Auto-confirms scores where 24h deadline has passed';
COMMENT ON FUNCTION get_pending_score_confirmations(UUID) IS 'Get pending score confirmations for a player';
COMMENT ON FUNCTION confirm_match_score(UUID, UUID) IS 'Confirm a match score';
COMMENT ON FUNCTION dispute_match_score(UUID, UUID, TEXT) IS 'Dispute a match score';
