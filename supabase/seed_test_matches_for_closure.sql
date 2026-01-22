-- =============================================================================
-- TEST SEED DATA FOR MATCH CLOSURE
-- Run this against your local database to create test matches for closure testing
-- =============================================================================

-- Get existing player IDs (adjust these to match your local seed data)
DO $$
DECLARE
  v_player1_id UUID;
  v_player2_id UUID;
  v_player3_id UUID;
  v_player4_id UUID;
  v_sport_id UUID;
  v_match1_id UUID := gen_random_uuid();
  v_match2_id UUID := gen_random_uuid();
  v_match3_id UUID := gen_random_uuid();
  v_match4_id UUID := gen_random_uuid();
BEGIN
  -- Get first 4 players
  SELECT id INTO v_player1_id FROM player LIMIT 1 OFFSET 0;
  SELECT id INTO v_player2_id FROM player LIMIT 1 OFFSET 1;
  SELECT id INTO v_player3_id FROM player LIMIT 1 OFFSET 2;
  SELECT id INTO v_player4_id FROM player LIMIT 1 OFFSET 3;
  
  -- Get tennis sport
  SELECT id INTO v_sport_id FROM sport WHERE slug = 'tennis' LIMIT 1;
  
  IF v_player1_id IS NULL OR v_player2_id IS NULL THEN
    RAISE NOTICE 'Not enough players in database. Skipping test seed.';
    RETURN;
  END IF;

  RAISE NOTICE 'Creating test matches with players: %, %, %, %', 
    v_player1_id, v_player2_id, v_player3_id, v_player4_id;

  -- ==========================================================================
  -- MATCH 1: Singles - Both played, both gave good feedback (should close)
  -- ==========================================================================
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, join_mode, notes
  ) VALUES (
    v_match1_id, v_sport_id, v_player1_id,
    CURRENT_DATE - INTERVAL '3 days',  -- 3 days ago
    '10:00:00', '11:00:00', 'America/Toronto',
    'competitive', 'singles', 'public', 'direct',
    'TEST: Singles match - both played'
  );

  -- Note: v_player1_id is auto-inserted as host by trigger match_create_host_participant
  -- Just update the auto-created record and insert the opponent
  UPDATE match_participant SET match_outcome = 'played', feedback_completed = true
    WHERE match_id = v_match1_id AND player_id = v_player1_id;
  INSERT INTO match_participant (match_id, player_id, status, is_host, match_outcome, feedback_completed)
  VALUES (v_match1_id, v_player2_id, 'joined', false, 'played', true);

  -- Feedback: both say opponent showed up, on time, 5 stars
  INSERT INTO match_feedback (match_id, reviewer_id, opponent_id, showed_up, was_late, star_rating)
  VALUES
    (v_match1_id, v_player1_id, v_player2_id, true, false, 5),
    (v_match1_id, v_player2_id, v_player1_id, true, false, 4);

  RAISE NOTICE 'Created Match 1 (singles, both played): %', v_match1_id;

  -- ==========================================================================
  -- MATCH 2: Singles - Mutual cancellation (should mark as mutually_cancelled)
  -- ==========================================================================
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, join_mode, notes
  ) VALUES (
    v_match2_id, v_sport_id, v_player1_id,
    CURRENT_DATE - INTERVAL '3 days',
    '14:00:00', '15:00:00', 'America/Toronto',
    'casual', 'singles', 'public', 'direct',
    'TEST: Singles match - mutual cancel'
  );

  -- Note: v_player1_id is auto-inserted as host by trigger
  UPDATE match_participant SET match_outcome = 'mutual_cancel', feedback_completed = true
    WHERE match_id = v_match2_id AND player_id = v_player1_id;
  INSERT INTO match_participant (match_id, player_id, status, is_host, match_outcome, feedback_completed)
  VALUES (v_match2_id, v_player2_id, 'joined', false, 'mutual_cancel', true);

  RAISE NOTICE 'Created Match 2 (singles, mutual cancel): %', v_match2_id;

  -- ==========================================================================
  -- MATCH 3: Singles - One no-show (player2 didn't show)
  -- ==========================================================================
  INSERT INTO match (
    id, sport_id, created_by, match_date, start_time, end_time, timezone,
    player_expectation, format, visibility, join_mode, notes
  ) VALUES (
    v_match3_id, v_sport_id, v_player1_id,
    CURRENT_DATE - INTERVAL '3 days',
    '16:00:00', '17:00:00', 'America/Toronto',
    'competitive', 'singles', 'public', 'direct',
    'TEST: Singles match - one no-show'
  );

  -- Note: v_player1_id is auto-inserted as host by trigger
  UPDATE match_participant SET match_outcome = 'opponent_no_show', feedback_completed = true
    WHERE match_id = v_match3_id AND player_id = v_player1_id;
  INSERT INTO match_participant (match_id, player_id, status, is_host, match_outcome, feedback_completed)
  VALUES (v_match3_id, v_player2_id, 'joined', false, NULL, false);  -- No outcome (didn't submit)

  -- Feedback: player1 says player2 was no-show
  INSERT INTO match_feedback (match_id, reviewer_id, opponent_id, showed_up, was_late, star_rating)
  VALUES
    (v_match3_id, v_player1_id, v_player2_id, false, NULL, NULL);

  RAISE NOTICE 'Created Match 3 (singles, no-show): %', v_match3_id;

  -- ==========================================================================
  -- MATCH 4: Doubles - Mixed feedback (tests aggregation)
  -- ==========================================================================
  IF v_player3_id IS NOT NULL AND v_player4_id IS NOT NULL THEN
    INSERT INTO match (
      id, sport_id, created_by, match_date, start_time, end_time, timezone,
      player_expectation, format, visibility, join_mode, notes
    ) VALUES (
      v_match4_id, v_sport_id, v_player1_id,
      CURRENT_DATE - INTERVAL '3 days',
      '18:00:00', '19:00:00', 'America/Toronto',
      'competitive', 'doubles', 'public', 'direct',
      'TEST: Doubles match - mixed feedback'
    );

    -- Note: v_player1_id is auto-inserted as host by trigger
    UPDATE match_participant SET match_outcome = 'played', feedback_completed = true
      WHERE match_id = v_match4_id AND player_id = v_player1_id;
    INSERT INTO match_participant (match_id, player_id, status, is_host, match_outcome, feedback_completed)
    VALUES 
      (v_match4_id, v_player2_id, 'joined', false, 'played', true),
      (v_match4_id, v_player3_id, 'joined', false, 'played', true),
      (v_match4_id, v_player4_id, 'joined', false, 'played', true);

    -- Feedback: 
    -- Player1 rates: P2(showed,on-time,5), P3(showed,late,3), P4(showed,on-time,4)
    -- Player2 rates: P1(showed,on-time,5), P3(showed,on-time,4), P4(showed,on-time,4)
    -- Player3 rates: P1(showed,on-time,5), P2(showed,on-time,4), P4(no-show)
    -- Player4 rates: P1(showed,on-time,5), P2(showed,late,3), P3(showed,on-time,4)
    INSERT INTO match_feedback (match_id, reviewer_id, opponent_id, showed_up, was_late, star_rating)
    VALUES
      -- Player 1's feedback
      (v_match4_id, v_player1_id, v_player2_id, true, false, 5),
      (v_match4_id, v_player1_id, v_player3_id, true, true, 3),
      (v_match4_id, v_player1_id, v_player4_id, true, false, 4),
      -- Player 2's feedback
      (v_match4_id, v_player2_id, v_player1_id, true, false, 5),
      (v_match4_id, v_player2_id, v_player3_id, true, false, 4),
      (v_match4_id, v_player2_id, v_player4_id, true, false, 4),
      -- Player 3's feedback
      (v_match4_id, v_player3_id, v_player1_id, true, false, 5),
      (v_match4_id, v_player3_id, v_player2_id, true, false, 4),
      (v_match4_id, v_player3_id, v_player4_id, false, NULL, NULL),  -- P4 no-show according to P3
      -- Player 4's feedback
      (v_match4_id, v_player4_id, v_player1_id, true, false, 5),
      (v_match4_id, v_player4_id, v_player2_id, true, true, 3),
      (v_match4_id, v_player4_id, v_player3_id, true, false, 4);

    RAISE NOTICE 'Created Match 4 (doubles, mixed): %', v_match4_id;
  END IF;

  RAISE NOTICE 'Test seed complete!';
END $$;

-- =============================================================================
-- VERIFICATION QUERY
-- Run this to see the test matches
-- =============================================================================
SELECT 
  m.id,
  m.notes,
  m.format,
  m.match_date,
  m.end_time,
  m.closed_at,
  m.mutually_cancelled,
  COUNT(mp.id) as participants
FROM match m
JOIN match_participant mp ON mp.match_id = m.id
WHERE m.notes LIKE 'TEST:%'
GROUP BY m.id
ORDER BY m.match_date DESC, m.start_time;
