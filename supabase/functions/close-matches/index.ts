/**
 * close-matches Edge Function
 *
 * Automated match closure system that:
 * 1. Finds matches whose end time was more than 48 hours ago
 * 2. Detects mutual cancellations
 * 3. Aggregates feedback for each participant
 * 4. Creates reputation events based on aggregated feedback
 * 5. Marks matches as closed
 *
 * Triggered hourly by pg_cron
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// TYPES
// =============================================================================

interface MatchToClose {
  id: string;
  format: 'singles' | 'doubles';
}

interface MatchParticipant {
  id: string;
  player_id: string;
  match_outcome: 'played' | 'mutual_cancel' | 'opponent_no_show' | null;
  feedback_completed: boolean;
}

interface MatchFeedback {
  id: string;
  reviewer_id: string;
  opponent_id: string;
  showed_up: boolean;
  was_late: boolean | null;
  star_rating: number | null;
}

interface AggregatedFeedback {
  showedUp: boolean | null;
  wasLate: boolean | null;
  starRating: number | null;
  feedbackCount: number;
}

interface ClosureResult {
  matchId: string;
  status: 'closed' | 'mutual_cancel' | 'error';
  error?: string;
  participantsProcessed?: number;
  reputationEventsCreated?: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CUTOFF_HOURS = 48;
const BATCH_LIMIT = 100;

// Reputation event types
type ReputationEventType =
  | 'match_completed'
  | 'match_no_show'
  | 'match_on_time'
  | 'match_late'
  | 'review_received_5star'
  | 'review_received_4star'
  | 'review_received_3star'
  | 'review_received_2star'
  | 'review_received_1star';

// Default impact values (fallback if DB config not available)
const DEFAULT_IMPACTS: Record<ReputationEventType, number> = {
  match_completed: 12,
  match_no_show: -50,
  match_on_time: 3,
  match_late: -10,
  review_received_5star: 10,
  review_received_4star: 5,
  review_received_3star: 0,
  review_received_2star: -5,
  review_received_1star: -10,
};

// Cache for reputation config
let reputationConfigCache: Map<string, number> | null = null;

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Fetch reputation config from database and cache it
 */
async function getReputationConfig(): Promise<Map<string, number>> {
  if (reputationConfigCache) {
    return reputationConfigCache;
  }

  const { data, error } = await supabase
    .from('reputation_config')
    .select('event_type, default_impact')
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch reputation config:', error);
    // Return defaults as a map
    return new Map(Object.entries(DEFAULT_IMPACTS));
  }

  reputationConfigCache = new Map(
    (data || []).map((row: { event_type: string; default_impact: number }) => [
      row.event_type,
      row.default_impact,
    ])
  );

  return reputationConfigCache;
}

/**
 * Get impact value for an event type
 */
async function getImpactForEvent(eventType: ReputationEventType): Promise<number> {
  const config = await getReputationConfig();
  return config.get(eventType) ?? DEFAULT_IMPACTS[eventType] ?? 0;
}

/**
 * Get matches ready for closure (48+ hours since end time)
 */
async function getMatchesReadyForClosure(): Promise<MatchToClose[]> {
  const { data, error } = await supabase.rpc('get_matches_ready_for_closure', {
    cutoff_hours: CUTOFF_HOURS,
    batch_limit: BATCH_LIMIT,
  });

  if (error) {
    console.error('Failed to get matches ready for closure:', error);
    throw new Error(`Failed to query matches: ${error.message}`);
  }

  return (data || []) as MatchToClose[];
}

/**
 * Get all participants for a match
 */
async function getMatchParticipants(matchId: string): Promise<MatchParticipant[]> {
  const { data, error } = await supabase
    .from('match_participant')
    .select('id, player_id, match_outcome, feedback_completed')
    .eq('match_id', matchId)
    .eq('status', 'joined');

  if (error) {
    throw new Error(`Failed to get participants: ${error.message}`);
  }

  return (data || []) as MatchParticipant[];
}

/**
 * Get all feedback records for a match
 */
async function getMatchFeedback(matchId: string): Promise<MatchFeedback[]> {
  const { data, error } = await supabase
    .from('match_feedback')
    .select('id, reviewer_id, opponent_id, showed_up, was_late, star_rating')
    .eq('match_id', matchId);

  if (error) {
    throw new Error(`Failed to get feedback: ${error.message}`);
  }

  return (data || []) as MatchFeedback[];
}

/**
 * Check if match was mutually cancelled (majority of participants said mutual_cancel)
 */
function isMutualCancellation(participants: MatchParticipant[]): boolean {
  const mutualCancelCount = participants.filter(p => p.match_outcome === 'mutual_cancel').length;
  const totalParticipants = participants.length;

  // Majority rule: more than half must say mutual_cancel
  return mutualCancelCount > totalParticipants / 2;
}

/**
 * Get IDs of players who were marked as no-show by others
 * (their feedback should be ignored)
 */
function getNoShowPlayerIds(
  feedback: MatchFeedback[],
  participants: MatchParticipant[]
): Set<string> {
  const noShowIds = new Set<string>();

  for (const participant of participants) {
    // Get all feedback where this participant is the opponent
    const feedbackAboutPlayer = feedback.filter(f => f.opponent_id === participant.player_id);

    if (feedbackAboutPlayer.length === 0) continue;

    // Count how many said no-show vs showed
    const noShowCount = feedbackAboutPlayer.filter(f => !f.showed_up).length;
    const showedCount = feedbackAboutPlayer.filter(f => f.showed_up).length;

    // Majority rule: if more say no-show than showed, they're a no-show
    if (noShowCount > showedCount) {
      noShowIds.add(participant.player_id);
    }
  }

  return noShowIds;
}

/**
 * Aggregate feedback for a specific participant
 * Filters out feedback from no-show players
 * Applies majority rule with benefit of doubt on ties
 */
function aggregateFeedback(
  participantPlayerId: string,
  feedback: MatchFeedback[],
  noShowPlayerIds: Set<string>
): AggregatedFeedback {
  // Get feedback about this participant, excluding feedback from no-show players
  const validFeedback = feedback.filter(
    f => f.opponent_id === participantPlayerId && !noShowPlayerIds.has(f.reviewer_id)
  );

  if (validFeedback.length === 0) {
    return {
      showedUp: null,
      wasLate: null,
      starRating: null,
      feedbackCount: 0,
    };
  }

  // Aggregate showed_up with majority rule
  const showedUpCount = validFeedback.filter(f => f.showed_up).length;
  const noShowCount = validFeedback.filter(f => !f.showed_up).length;

  let showedUp: boolean | null = null;
  if (showedUpCount > noShowCount) {
    showedUp = true;
  } else if (noShowCount > showedUpCount) {
    showedUp = false;
  } else {
    // Tie: benefit of doubt - no negative event (treat as showed up)
    showedUp = true;
  }

  // If no-show, don't process late or ratings
  if (!showedUp) {
    return {
      showedUp: false,
      wasLate: null,
      starRating: null,
      feedbackCount: validFeedback.length,
    };
  }

  // Aggregate was_late with majority rule
  const lateFeedback = validFeedback.filter(f => f.was_late !== null);
  const lateCount = lateFeedback.filter(f => f.was_late === true).length;
  const onTimeCount = lateFeedback.filter(f => f.was_late === false).length;

  let wasLate: boolean | null = null;
  if (lateCount > onTimeCount) {
    wasLate = true;
  } else if (onTimeCount > lateCount) {
    wasLate = false;
  } else {
    // Tie: benefit of doubt - not late
    wasLate = false;
  }

  // Average star ratings, round to nearest integer
  const ratingFeedback = validFeedback.filter(f => f.star_rating !== null);
  let starRating: number | null = null;
  if (ratingFeedback.length > 0) {
    const avgRating =
      ratingFeedback.reduce((sum, f) => sum + (f.star_rating || 0), 0) / ratingFeedback.length;
    starRating = Math.round(avgRating);
    // Clamp to 1-5
    starRating = Math.max(1, Math.min(5, starRating));
  }

  return {
    showedUp: true,
    wasLate,
    starRating,
    feedbackCount: validFeedback.length,
  };
}

/**
 * Get star rating event type
 */
function getStarRatingEventType(rating: number): ReputationEventType {
  switch (rating) {
    case 5:
      return 'review_received_5star';
    case 4:
      return 'review_received_4star';
    case 3:
      return 'review_received_3star';
    case 2:
      return 'review_received_2star';
    case 1:
    default:
      return 'review_received_1star';
  }
}

/**
 * Create reputation events for a participant based on aggregated feedback
 */
async function createReputationEvents(
  playerId: string,
  matchId: string,
  aggregated: AggregatedFeedback
): Promise<number> {
  if (aggregated.feedbackCount === 0) {
    return 0;
  }

  const eventTypes: ReputationEventType[] = [];

  if (aggregated.showedUp === true) {
    // Player showed up - create match_completed event
    eventTypes.push('match_completed');

    // Create late/on-time event
    if (aggregated.wasLate === true) {
      eventTypes.push('match_late');
    } else if (aggregated.wasLate === false) {
      eventTypes.push('match_on_time');
    }

    // Create star rating event
    if (aggregated.starRating !== null) {
      eventTypes.push(getStarRatingEventType(aggregated.starRating));
    }
  } else if (aggregated.showedUp === false) {
    // Player was a no-show
    eventTypes.push('match_no_show');
  }

  if (eventTypes.length === 0) {
    return 0;
  }

  // Build events with base_impact from config
  const events = await Promise.all(
    eventTypes.map(async eventType => {
      const baseImpact = await getImpactForEvent(eventType);
      return {
        player_id: playerId,
        event_type: eventType,
        base_impact: baseImpact,
        match_id: matchId,
        metadata: {
          source: 'closure_aggregation',
          ...(eventType.startsWith('review_received_') && aggregated.starRating
            ? { aggregated_rating: aggregated.starRating }
            : {}),
        },
        event_occurred_at: new Date().toISOString(),
      };
    })
  );

  // Insert all events
  const { error } = await supabase.from('reputation_event').insert(events);

  if (error) {
    console.error(`Failed to create reputation events for player ${playerId}:`, error);
    throw new Error(`Failed to create reputation events: ${error.message}`);
  }

  return events.length;
}

/**
 * Update match_participant with aggregated feedback
 */
async function updateParticipantAggregation(
  participantId: string,
  aggregated: AggregatedFeedback
): Promise<void> {
  const { error } = await supabase
    .from('match_participant')
    .update({
      showed_up: aggregated.showedUp,
      was_late: aggregated.wasLate,
      star_rating: aggregated.starRating,
      aggregated_at: new Date().toISOString(),
    })
    .eq('id', participantId);

  if (error) {
    throw new Error(`Failed to update participant: ${error.message}`);
  }
}

/**
 * Mark match as closed (with optional mutual cancellation flag)
 */
async function closeMatch(matchId: string, mutuallyCancelled: boolean = false): Promise<void> {
  const updateData: Record<string, unknown> = {
    closed_at: new Date().toISOString(),
  };

  if (mutuallyCancelled) {
    updateData.mutually_cancelled = true;
  }

  const { error } = await supabase.from('match').update(updateData).eq('id', matchId);

  if (error) {
    throw new Error(`Failed to close match: ${error.message}`);
  }
}

/**
 * Process a single match for closure
 */
async function processMatch(match: MatchToClose): Promise<ClosureResult> {
  const matchId = match.id;

  try {
    // Get participants and feedback
    const [participants, feedback] = await Promise.all([
      getMatchParticipants(matchId),
      getMatchFeedback(matchId),
    ]);

    if (participants.length === 0) {
      await closeMatch(matchId);
      return {
        matchId,
        status: 'closed',
        participantsProcessed: 0,
        reputationEventsCreated: 0,
      };
    }

    // Check for mutual cancellation
    if (isMutualCancellation(participants)) {
      await closeMatch(matchId, true);
      return {
        matchId,
        status: 'mutual_cancel',
        participantsProcessed: participants.length,
        reputationEventsCreated: 0,
      };
    }

    // Determine which players are no-shows (for filtering their feedback)
    const noShowPlayerIds = getNoShowPlayerIds(feedback, participants);

    // Aggregate feedback and create reputation events for each participant
    let totalReputationEvents = 0;

    for (const participant of participants) {
      const aggregated = aggregateFeedback(participant.player_id, feedback, noShowPlayerIds);

      // Create reputation events
      const eventsCreated = await createReputationEvents(
        participant.player_id,
        matchId,
        aggregated
      );
      totalReputationEvents += eventsCreated;

      // Update participant record with aggregated values
      await updateParticipantAggregation(participant.id, aggregated);
    }

    // Mark match as closed
    await closeMatch(matchId);

    return {
      matchId,
      status: 'closed',
      participantsProcessed: participants.length,
      reputationEventsCreated: totalReputationEvents,
    };
  } catch (error) {
    console.error(`Error processing match ${matchId}:`, error);
    return {
      matchId,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async req => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Bearer auth with anon key (staging/prod). When no key is configured (e.g. local --no-verify-jwt), skip validation.
  const expectedAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (expectedAnonKey) {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token || token !== expectedAnonKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  console.log('Starting match closure job...');
  const startTime = Date.now();

  try {
    // Get matches ready for closure
    const matches = await getMatchesReadyForClosure();
    console.log(`Found ${matches.length} matches ready for closure`);

    if (matches.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No matches to close',
          matchesProcessed: 0,
          duration_ms: Date.now() - startTime,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Process each match
    const results: ClosureResult[] = [];
    for (const match of matches) {
      const result = await processMatch(match);
      results.push(result);
      console.log(`Match ${match.id}: ${result.status}`);
    }

    // Summarize results
    const summary = {
      success: true,
      matchesProcessed: results.length,
      closed: results.filter(r => r.status === 'closed').length,
      mutualCancel: results.filter(r => r.status === 'mutual_cancel').length,
      errors: results.filter(r => r.status === 'error').length,
      totalReputationEvents: results.reduce((sum, r) => sum + (r.reputationEventsCreated || 0), 0),
      duration_ms: Date.now() - startTime,
      results,
    };

    console.log(
      `Closure job complete: ${summary.closed} closed, ${summary.mutualCancel} mutual cancels, ${summary.errors} errors`
    );

    // Return error status if all matches failed
    const httpStatus = summary.errors === summary.matchesProcessed ? 500 : 200;

    return new Response(JSON.stringify(summary), {
      status: httpStatus,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Match closure job failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
