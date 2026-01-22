-- Fix type mismatch in get_pending_score_confirmations function
-- Cast VARCHAR columns to TEXT to match return type declaration

DROP FUNCTION IF EXISTS get_pending_score_confirmations(UUID);

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
    m.match_date as match_date,
    s.name::TEXT as sport_name,
    s.icon_url::TEXT as sport_icon_url,
    mr.winning_team,
    mr.team1_score,
    mr.team2_score,
    mr.submitted_by as submitted_by_id,
    COALESCE(sub_profile.display_name, sub_profile.first_name || ' ' || COALESCE(sub_profile.last_name, ''))::TEXT as submitted_by_name,
    sub_profile.profile_picture_url::TEXT as submitted_by_avatar,
    mr.confirmation_deadline,
    COALESCE(opp_profile.display_name, opp_profile.first_name || ' ' || COALESCE(opp_profile.last_name, ''))::TEXT as opponent_name,
    opp_profile.profile_picture_url::TEXT as opponent_avatar,
    my_part.team_number as player_team,
    mn.network_id,
    n.name::TEXT as network_name
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
