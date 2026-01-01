/**
 * Match Service
 * Handles all match-related database operations using Supabase.
 */

import { supabase } from '../supabase';
import type {
  Match,
  TablesInsert,
  MatchWithDetails,
  MatchParticipantWithPlayer,
  MatchParticipant,
  Profile,
  PlayerWithProfile,
} from '@rallia/shared-types';

/**
 * Input data for creating a match
 * Maps from form data to database insert structure
 */
export interface CreateMatchInput {
  // Required fields
  sportId: string;
  createdBy: string;
  matchDate: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  timezone: string; // IANA timezone (e.g., "America/New_York")

  // Match format
  format?: 'singles' | 'doubles';
  playerExpectation?: 'casual' | 'competitive' | 'both';
  duration?: '30' | '60' | '90' | '120' | 'custom';
  customDurationMinutes?: number;

  // Location
  locationType?: 'facility' | 'custom' | 'tbd';
  facilityId?: string;
  courtId?: string;
  locationName?: string;
  locationAddress?: string;
  customLatitude?: number;
  customLongitude?: number;

  // Court & cost
  courtStatus?: 'booked' | 'to_book' | 'tbd';
  isCourtFree?: boolean;
  costSplitType?: 'equal' | 'creator_pays' | 'custom';
  estimatedCost?: number;

  // Opponent preferences
  minRatingScoreId?: string;
  preferredOpponentGender?: 'male' | 'female' | 'other' | 'any';

  // Visibility & access
  visibility?: 'public' | 'private';
  joinMode?: 'direct' | 'request';

  // Additional info
  notes?: string;
}

/**
 * Helper to convert empty strings to undefined (for optional UUID fields)
 */
function emptyToUndefined(value: string | undefined): string | undefined {
  return value && value.trim() !== '' ? value : undefined;
}

/**
 * Create a new match
 */
export async function createMatch(input: CreateMatchInput): Promise<Match> {
  // Map costSplitType to database enum values
  const costSplitMap: Record<string, 'host_pays' | 'split_equal' | 'custom'> = {
    creator_pays: 'host_pays',
    equal: 'split_equal',
    custom: 'custom',
  };

  // Map courtStatus to database enum values (null if tbd)
  const courtStatusMap: Record<string, 'reserved' | 'to_reserve' | null> = {
    booked: 'reserved',
    to_book: 'to_reserve',
    tbd: null,
  };

  // Build the insert object
  // Note: Empty strings are converted to undefined for UUID fields to avoid "invalid uuid" errors
  const insertData: TablesInsert<'match'> = {
    sport_id: input.sportId,
    created_by: input.createdBy,
    match_date: input.matchDate,
    start_time: input.startTime,
    end_time: input.endTime,
    timezone: input.timezone,
    match_type: input.playerExpectation ?? 'both',
    format: input.format ?? 'singles',
    player_expectation: input.playerExpectation ?? 'both',
    duration: input.duration ?? '60',
    custom_duration_minutes: input.customDurationMinutes,
    location_type: input.locationType ?? 'tbd',
    facility_id: emptyToUndefined(input.facilityId),
    court_id: emptyToUndefined(input.courtId),
    location_name: emptyToUndefined(input.locationName),
    location_address: emptyToUndefined(input.locationAddress),
    custom_latitude: input.customLatitude,
    custom_longitude: input.customLongitude,
    court_status: input.courtStatus ? courtStatusMap[input.courtStatus] : null,
    is_court_free: input.isCourtFree ?? true,
    cost_split_type: costSplitMap[input.costSplitType ?? 'equal'] ?? 'split_equal',
    estimated_cost: input.estimatedCost,
    min_rating_score_id: emptyToUndefined(input.minRatingScoreId),
    preferred_opponent_gender:
      input.preferredOpponentGender === 'any' ? null : input.preferredOpponentGender,
    visibility: input.visibility ?? 'public',
    join_mode: input.joinMode ?? 'direct',
    notes: emptyToUndefined(input.notes),
  };

  const { data, error } = await supabase.from('match').insert(insertData).select().single();

  if (error) {
    throw new Error(`Failed to create match: ${error.message}`);
  }

  return data as Match;
}

/**
 * Get a match by ID
 */
export async function getMatch(matchId: string): Promise<Match | null> {
  const { data, error } = await supabase.from('match').select('*').eq('id', matchId).single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get match: ${error.message}`);
  }

  return data as Match;
}

/**
 * Get a match with full details (sport, facility, court, participants)
 */
export async function getMatchWithDetails(matchId: string) {
  const { data, error } = await supabase
    .from('match')
    .select(
      `
      *,
      sport:sport_id (*),
      facility:facility_id (*),
      court:court_id (*),
      min_rating_score:min_rating_score_id (*),
      created_by_player:created_by (
        id,
        gender,
        playing_hand,
        max_travel_distance,
        notification_match_requests,
        notification_messages,
        notification_reminders,
        privacy_show_age,
        privacy_show_location,
        privacy_show_stats
      ),
      participants:match_participant (
        id,
        match_id,
        player_id,
        status,
        is_host,
        score,
        team_number,
        created_at,
        updated_at,
        player:player_id (
          id,
          gender,
          playing_hand,
          max_travel_distance,
          notification_match_requests,
          notification_messages,
          notification_reminders,
          privacy_show_age,
          privacy_show_location,
          privacy_show_stats
        )
      )
    `
    )
    .eq('id', matchId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get match details: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // Fetch profiles for all players (creator + participants)
  const playerIds = new Set<string>();
  if (data.created_by_player?.id) {
    playerIds.add(data.created_by_player.id);
  }
  if (data.participants) {
    data.participants.forEach((p: MatchParticipantWithPlayer) => {
      // Handle both array and object formats from Supabase
      const playerObj = Array.isArray(p.player) ? p.player[0] : p.player;
      if (playerObj?.id) {
        playerIds.add(playerObj.id);
      }
    });
  }

  // Fetch all profiles at once
  const profileIds = Array.from(playerIds);
  const profilesMap: Record<string, Profile> = {};

  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profile')
      .select('*')
      .in('id', profileIds);

    if (!profilesError && profiles) {
      profiles.forEach(profile => {
        profilesMap[profile.id] = profile;
      });
    }
  }

  // Fetch player ratings for the match's sport (for displaying in request cards)
  const sportId = data.sport_id;
  const ratingsMap: Record<string, { label: string; value: number | null }> = {}; // playerId -> rating info

  if (profileIds.length > 0 && sportId) {
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('player_rating_score')
      .select(
        `
        player_id,
        rating_score!player_rating_scores_rating_score_id_fkey!inner (
          label,
          value,
          rating_system!inner (
            sport_id
          )
        )
      `
      )
      .in('player_id', profileIds);

    if (ratingsError) {
      console.error('[getMatchWithDetails] Error fetching ratings:', ratingsError);
    }

    if (!ratingsError && ratingsData) {
      type RatingResult = {
        player_id: string;
        rating_score: { label: string; value: number | null; rating_system: { sport_id: string } };
      };
      (ratingsData as unknown as RatingResult[]).forEach(rating => {
        // Filter to only ratings for this match's sport
        const ratingScore = rating.rating_score;
        const ratingSystem = ratingScore?.rating_system;
        if (ratingSystem?.sport_id === sportId && ratingScore?.label) {
          ratingsMap[rating.player_id] = {
            label: ratingScore.label,
            value: ratingScore.value,
          };
        }
      });
    }
  }

  // Attach profiles and ratings to players
  if (data.created_by_player?.id && profilesMap[data.created_by_player.id]) {
    data.created_by_player.profile = profilesMap[data.created_by_player.id];
    const creatorRating = ratingsMap[data.created_by_player.id];
    if (creatorRating) {
      data.created_by_player.sportRatingLabel = creatorRating.label;
      if (creatorRating.value !== null) {
        data.created_by_player.sportRatingValue = creatorRating.value;
      }
    }
  }

  if (data.participants) {
    data.participants = data.participants.map((p: MatchParticipantWithPlayer) => {
      // Handle both array and object formats from Supabase
      // Supabase can return player as array in some cases
      const playerObj = Array.isArray(p.player) ? p.player[0] : p.player;
      const playerId = playerObj?.id;

      if (playerId && profilesMap[playerId]) {
        playerObj.profile = profilesMap[playerId];
      }
      const participantRating = playerId ? ratingsMap[playerId] : undefined;
      if (participantRating && playerObj) {
        (
          playerObj as MatchParticipantWithPlayer['player'] & {
            sportRatingLabel?: string;
            sportRatingValue?: number;
          }
        ).sportRatingLabel = participantRating.label;
        if (participantRating.value !== null) {
          (
            playerObj as MatchParticipantWithPlayer['player'] & {
              sportRatingLabel?: string;
              sportRatingValue?: number;
            }
          ).sportRatingValue = participantRating.value;
        }
      }
      // Ensure player is always an object, not array
      if (Array.isArray(p.player) && playerObj) {
        p.player = playerObj;
      }
      return p;
    });
  }

  return data;
}

/**
 * Get multiple matches with full details (for match discovery/listing)
 */
export async function getMatchesWithDetails(
  options: {
    limit?: number;
    offset?: number;
    visibility?: 'public' | 'private';
    matchDateFrom?: string;
    matchDateTo?: string;
    /** Filter only non-cancelled matches (default: true) */
    excludeCancelled?: boolean;
  } = {}
) {
  const {
    limit = 50,
    offset = 0,
    visibility = 'public',
    matchDateFrom,
    matchDateTo,
    excludeCancelled = true,
  } = options;

  let query = supabase
    .from('match')
    .select(
      `
      *,
      sport:sport_id (*),
      facility:facility_id (*),
      court:court_id (*),
      min_rating_score:min_rating_score_id (*),
      created_by_player:created_by (
        id,
        gender,
        playing_hand,
        max_travel_distance,
        notification_match_requests,
        notification_messages,
        notification_reminders,
        privacy_show_age,
        privacy_show_location,
        privacy_show_stats
      ),
      participants:match_participant (
        id,
        match_id,
        player_id,
        status,
        is_host,
        score,
        team_number,
        created_at,
        updated_at,
        player:player_id (
          id,
          gender,
          playing_hand,
          max_travel_distance,
          notification_match_requests,
          notification_messages,
          notification_reminders,
          privacy_show_age,
          privacy_show_location,
          privacy_show_stats
        )
      )
    `
    )
    .eq('visibility', visibility)
    .order('match_date', { ascending: true })
    .order('start_time', { ascending: true })
    .range(offset, offset + limit - 1);

  // Filter out cancelled matches by checking cancelled_at is null
  // Match status is now derived from cancelled_at, match_date, start_time, end_time
  if (excludeCancelled) {
    query = query.is('cancelled_at', null);
  }

  if (matchDateFrom) {
    query = query.gte('match_date', matchDateFrom);
  }

  if (matchDateTo) {
    query = query.lte('match_date', matchDateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get matches: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Fetch profiles for all players (creator + participants)
  const playerIds = new Set<string>();
  data.forEach((match: MatchWithDetails) => {
    if (match.created_by_player?.id) {
      playerIds.add(match.created_by_player.id);
    }
    if (match.participants) {
      match.participants.forEach((p: MatchParticipantWithPlayer) => {
        // Handle both array and object formats from Supabase
        const playerObj = Array.isArray(p.player) ? p.player[0] : p.player;
        if (playerObj?.id) {
          playerIds.add(playerObj.id);
        }
      });
    }
  });

  // Fetch all profiles at once
  const profileIds = Array.from(playerIds);
  const profilesMap: Record<string, Profile> = {};

  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profile')
      .select('*')
      .in('id', profileIds);

    if (!profilesError && profiles) {
      profiles.forEach(profile => {
        profilesMap[profile.id] = profile;
      });
    }
  }

  // Attach profiles to players
  const enrichedData = data.map((match: MatchWithDetails) => {
    // Attach profile to creator
    if (match.created_by_player?.id && profilesMap[match.created_by_player.id]) {
      match.created_by_player.profile = profilesMap[match.created_by_player.id];
    }

    // Attach profiles to participants
    if (match.participants) {
      match.participants = match.participants.map((p: MatchParticipantWithPlayer) => {
        // Handle both array and object formats from Supabase
        const playerObj = Array.isArray(p.player) ? p.player[0] : p.player;
        const playerId = playerObj?.id;

        if (playerId && profilesMap[playerId]) {
          playerObj.profile = profilesMap[playerId];
        }
        // Ensure player is always an object, not array
        if (Array.isArray(p.player) && playerObj) {
          p.player = playerObj;
        }
        return p;
      });
    }

    return match;
  });

  return enrichedData;
}

/**
 * Get matches created by a user
 */
export async function getMatchesByCreator(
  userId: string,
  options: { excludeCancelled?: boolean; limit?: number; offset?: number } = {}
): Promise<Match[]> {
  const { excludeCancelled = true, limit = 20, offset = 0 } = options;

  let query = supabase
    .from('match')
    .select('*')
    .eq('created_by', userId)
    .order('match_date', { ascending: true })
    .order('start_time', { ascending: true })
    .range(offset, offset + limit - 1);

  // Filter out cancelled matches by checking cancelled_at is null
  // Match status is now derived from cancelled_at, match_date, start_time, end_time
  if (excludeCancelled) {
    query = query.is('cancelled_at', null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get matches: ${error.message}`);
  }

  return data as Match[];
}

/**
 * Update a match
 */
export async function updateMatch(
  matchId: string,
  updates: Partial<CreateMatchInput>
): Promise<Match> {
  // Map playerExpectation to match_type enum values (same as createMatch)
  // Note: form values now match database enum values directly
  const matchTypeMap: Record<string, 'casual' | 'competitive' | 'both'> = {
    casual: 'casual',
    competitive: 'competitive',
    both: 'both',
  };

  // Map costSplitType to database enum values (same as createMatch)
  const costSplitMap: Record<string, 'host_pays' | 'split_equal' | 'custom'> = {
    creator_pays: 'host_pays',
    equal: 'split_equal',
    custom: 'custom',
  };

  // Map courtStatus to database enum values (same as createMatch)
  const courtStatusMap: Record<string, 'reserved' | 'to_reserve' | null> = {
    booked: 'reserved',
    to_book: 'to_reserve',
    tbd: null,
  };

  // Map input to database fields
  const updateData: Record<string, unknown> = {};

  if (updates.matchDate !== undefined) updateData.match_date = updates.matchDate;
  if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
  if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
  if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
  if (updates.format !== undefined) updateData.format = updates.format;
  if (updates.playerExpectation !== undefined) {
    // player_expectation stores the raw value (casual/competitive/both)
    updateData.player_expectation = updates.playerExpectation;
    // match_type stores the mapped value (casual/competitive/both) - same as createMatch
    updateData.match_type = matchTypeMap[updates.playerExpectation] ?? 'both';
  }
  if (updates.duration !== undefined) updateData.duration = updates.duration;
  if (updates.customDurationMinutes !== undefined)
    updateData.custom_duration_minutes = updates.customDurationMinutes;
  if (updates.locationType !== undefined) updateData.location_type = updates.locationType;
  if (updates.facilityId !== undefined)
    updateData.facility_id = emptyToUndefined(updates.facilityId);
  if (updates.courtId !== undefined) updateData.court_id = emptyToUndefined(updates.courtId);
  if (updates.locationName !== undefined)
    updateData.location_name = emptyToUndefined(updates.locationName);
  if (updates.locationAddress !== undefined)
    updateData.location_address = emptyToUndefined(updates.locationAddress);
  if (updates.customLatitude !== undefined) updateData.custom_latitude = updates.customLatitude;
  if (updates.customLongitude !== undefined) updateData.custom_longitude = updates.customLongitude;
  if (updates.courtStatus !== undefined) {
    updateData.court_status = courtStatusMap[updates.courtStatus] ?? null;
  }
  if (updates.isCourtFree !== undefined) updateData.is_court_free = updates.isCourtFree;
  if (updates.costSplitType !== undefined) {
    updateData.cost_split_type = costSplitMap[updates.costSplitType] ?? 'split_equal';
  }
  if (updates.estimatedCost !== undefined) updateData.estimated_cost = updates.estimatedCost;
  if (updates.minRatingScoreId !== undefined)
    updateData.min_rating_score_id = emptyToUndefined(updates.minRatingScoreId);
  if (updates.preferredOpponentGender !== undefined)
    updateData.preferred_opponent_gender = updates.preferredOpponentGender;
  if (updates.visibility !== undefined) updateData.visibility = updates.visibility;
  if (updates.joinMode !== undefined) updateData.join_mode = updates.joinMode;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { data, error } = await supabase
    .from('match')
    .update(updateData)
    .eq('id', matchId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update match: ${error.message}`);
  }

  return data as Match;
}

/**
 * Cancel a match (host only)
 *
 * @param matchId - The ID of the match to cancel
 * @param userId - The ID of the user attempting to cancel (must be the creator)
 * @throws Error if user is not the creator or match is already cancelled/completed
 */
export async function cancelMatch(matchId: string, userId?: string): Promise<Match> {
  // First, verify the user is authorized to cancel (must be the creator)
  const { data: match, error: fetchError } = await supabase
    .from('match')
    .select('created_by, cancelled_at, match_date, start_time, end_time, timezone')
    .eq('id', matchId)
    .single();

  if (fetchError || !match) {
    throw new Error('Match not found');
  }

  // Check authorization if userId is provided
  if (userId && match.created_by !== userId) {
    throw new Error('Only the host can cancel this match');
  }

  // Check if match is already cancelled (use cancelled_at instead of status)
  if (match.cancelled_at) {
    throw new Error('Match is already cancelled');
  }

  // Check if match has already ended (can't cancel completed matches)
  // A match is considered completed if its end_time has passed
  const { getMatchEndTimeDifferenceFromNow } = await import('@rallia/shared-utils');
  const endTimeDiff = getMatchEndTimeDifferenceFromNow(
    match.match_date,
    match.start_time,
    match.end_time,
    match.timezone || 'UTC'
  );
  if (endTimeDiff < 0) {
    throw new Error('Cannot cancel a completed match');
  }

  // Perform the cancellation - set cancelled_at timestamp
  const { data, error } = await supabase
    .from('match')
    .update({
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to cancel match: ${error.message}`);
  }

  return data as Match;
}

/**
 * Delete a match (hard delete - use with caution)
 */
export async function deleteMatch(matchId: string): Promise<void> {
  const { error } = await supabase.from('match').delete().eq('id', matchId);

  if (error) {
    throw new Error(`Failed to delete match: ${error.message}`);
  }
}

// =============================================================================
// MATCH PARTICIPANT ACTIONS
// =============================================================================

/**
 * Join match result with status info
 */
export interface JoinMatchResult {
  participant: MatchParticipant;
  status: 'joined' | 'requested' | 'waitlisted';
}

/**
 * Join a match as a participant.
 * - For direct join mode: Creates participant with 'joined' status
 * - For request join mode: Creates participant with 'requested' status (pending host approval)
 *
 * @throws Error if match is full, already joined, or match not found
 */
export async function joinMatch(matchId: string, playerId: string): Promise<JoinMatchResult> {
  // First, get match details to check join_mode, capacity, and gender preference
  const { data: match, error: matchError } = await supabase
    .from('match')
    .select(
      `
      id,
      format,
      join_mode,
      cancelled_at,
      match_date,
      start_time,
      end_time,
      timezone,
      created_by,
      preferred_opponent_gender,
      participants:match_participant (
        id,
        player_id,
        status
      )
    `
    )
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    throw new Error('Match not found');
  }

  // Check match is still open using derived status logic
  // Match is not available if cancelled or if end_time has passed
  if (match.cancelled_at) {
    throw new Error('Match is no longer available');
  }

  // Check if match has already ended
  const { getMatchEndTimeDifferenceFromNow } = await import('@rallia/shared-utils');
  const endTimeDiff = getMatchEndTimeDifferenceFromNow(
    match.match_date,
    match.start_time,
    match.end_time,
    match.timezone || 'UTC'
  );
  if (endTimeDiff < 0) {
    throw new Error('Match is no longer available');
  }

  // Check if player is the creator (creators can't join their own match as participant)
  if (match.created_by === playerId) {
    throw new Error('You are the host of this match');
  }

  // Check gender eligibility if the match has a gender preference
  if (match.preferred_opponent_gender) {
    // Fetch the player's gender
    const { data: player, error: playerError } = await supabase
      .from('player')
      .select('gender')
      .eq('id', playerId)
      .single();

    if (playerError) {
      throw new Error('Could not verify player eligibility');
    }

    // If player hasn't set their gender, or gender doesn't match, block the join
    if (!player?.gender || player.gender !== match.preferred_opponent_gender) {
      throw new Error('GENDER_MISMATCH');
    }
  }

  // Check if player already has a participant record
  const existingParticipant = match.participants?.find(
    (p: { player_id: string; status: string }) => p.player_id === playerId
  );

  // If they have an active participation, they can't join again
  // Allow re-joining if they previously left, declined an invitation, were refused by host, were kicked, or are waitlisted (and spots opened up)
  if (
    existingParticipant &&
    existingParticipant.status !== 'left' &&
    existingParticipant.status !== 'declined' &&
    existingParticipant.status !== 'refused' &&
    existingParticipant.status !== 'kicked' &&
    existingParticipant.status !== 'waitlisted'
  ) {
    throw new Error('You are already in this match');
  }

  // Calculate spots: format determines total capacity (singles=2, doubles=4)
  // Creator counts as 1, participants with 'joined' status fill remaining spots
  const totalSpots = match.format === 'doubles' ? 4 : 2;
  const joinedParticipants =
    match.participants?.filter((p: { status: string }) => p.status === 'joined').length ?? 0;
  // Creator takes 1 spot, so available = total - 1 (creator) - joined participants
  const availableSpots = totalSpots - 1 - joinedParticipants;

  // Determine status based on join mode and availability
  let participantStatus: 'joined' | 'requested' | 'waitlisted';

  if (availableSpots <= 0) {
    // Match is full - add to waitlist
    participantStatus = 'waitlisted';
  } else if (match.join_mode === 'request') {
    // Match has spots but requires host approval
    participantStatus = 'requested';
  } else {
    // Match has spots and allows direct join
    participantStatus = 'joined';
  }

  let participant: MatchParticipant;

  // If user previously left/declined, update the existing record instead of inserting
  if (existingParticipant) {
    const { data: updatedParticipant, error: updateError } = await supabase
      .from('match_participant')
      .update({
        status: participantStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('match_id', matchId)
      .eq('player_id', playerId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to rejoin match: ${updateError.message}`);
    }
    participant = updatedParticipant as MatchParticipant;
  } else {
    // Insert new participant record
    const { data: newParticipant, error: insertError } = await supabase
      .from('match_participant')
      .insert({
        match_id: matchId,
        player_id: playerId,
        status: participantStatus,
        is_host: false,
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation (shouldn't happen but just in case)
      if (insertError.code === '23505') {
        throw new Error('You are already in this match');
      }
      throw new Error(`Failed to join match: ${insertError.message}`);
    }
    participant = newParticipant as MatchParticipant;
  }

  return {
    participant: participant as MatchParticipant,
    status: participantStatus,
  };
}

/**
 * Leave a match as a participant.
 * Updates the participant status to 'left' (soft delete to preserve history).
 *
 * @throws Error if user is the host, not a participant, or match not found
 */
export async function leaveMatch(matchId: string, playerId: string): Promise<void> {
  // First check if user is the match creator (hosts cannot leave, they must cancel)
  const { data: match, error: matchError } = await supabase
    .from('match')
    .select('created_by')
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    throw new Error('Match not found');
  }

  if (match.created_by === playerId) {
    throw new Error('Hosts cannot leave their own match. Cancel it instead.');
  }

  // Update status to 'left'
  const { data, error } = await supabase
    .from('match_participant')
    .update({ status: 'left' })
    .eq('match_id', matchId)
    .eq('player_id', playerId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('You are not a participant in this match');
    }
    throw new Error(`Failed to leave match: ${error.message}`);
  }

  if (!data) {
    throw new Error('You are not a participant in this match');
  }
}

/**
 * Get a player's participation status in a match
 */
export async function getParticipantStatus(
  matchId: string,
  playerId: string
): Promise<MatchParticipant | null> {
  const { data, error } = await supabase
    .from('match_participant')
    .select('*')
    .eq('match_id', matchId)
    .eq('player_id', playerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get participant status: ${error.message}`);
  }

  return data as MatchParticipant;
}

/**
 * Accept a join request for a match (host only).
 * Updates the participant status from 'requested' to 'joined'.
 *
 * @param matchId - The match ID
 * @param participantId - The participant record ID (not player_id)
 * @param hostId - The ID of the user performing the action (must be match host)
 * @throws Error if not host, participant not found, not in 'requested' status, or match is full
 */
export async function acceptJoinRequest(
  matchId: string,
  participantId: string,
  hostId: string
): Promise<MatchParticipant> {
  // First, verify the caller is the match host and get match details
  const { data: match, error: matchError } = await supabase
    .from('match')
    .select(
      `
      id,
      format,
      created_by,
      cancelled_at,
      match_date,
      start_time,
      end_time,
      timezone,
      participants:match_participant (
        id,
        player_id,
        status
      )
    `
    )
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    throw new Error('Match not found');
  }

  // Check match is still available (not cancelled or completed)
  if (match.cancelled_at) {
    throw new Error('Cannot accept requests for a cancelled match');
  }

  const { getMatchEndTimeDifferenceFromNow } = await import('@rallia/shared-utils');
  const endTimeDiff = getMatchEndTimeDifferenceFromNow(
    match.match_date,
    match.start_time,
    match.end_time,
    match.timezone || 'UTC'
  );
  if (endTimeDiff < 0) {
    throw new Error('Cannot accept requests for a completed match');
  }

  // Verify caller is the host
  if (match.created_by !== hostId) {
    throw new Error('Only the match host can accept join requests');
  }

  // Find the participant record
  const participant = match.participants?.find(
    (p: { id: string; status: string }) => p.id === participantId
  );

  if (!participant) {
    throw new Error('Join request not found');
  }

  // Verify the participant has 'requested' status
  if (participant.status !== 'requested') {
    throw new Error('This is not a pending join request');
  }

  // Check if there's capacity to accept
  const totalSpots = match.format === 'doubles' ? 4 : 2;
  const joinedParticipants =
    match.participants?.filter((p: { status: string }) => p.status === 'joined').length ?? 0;
  // Creator takes 1 spot
  const availableSpots = totalSpots - 1 - joinedParticipants;

  if (availableSpots <= 0) {
    throw new Error('Match is full. Cannot accept more players.');
  }

  // Update the participant status to 'joined'
  const { data: updatedParticipant, error: updateError } = await supabase
    .from('match_participant')
    .update({
      status: 'joined',
      updated_at: new Date().toISOString(),
    })
    .eq('id', participantId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to accept join request: ${updateError.message}`);
  }

  return updatedParticipant as MatchParticipant;
}

/**
 * Reject a join request for a match (host only).
 * Updates the participant status from 'requested' to 'refused'.
 *
 * Note: 'refused' is used when a host rejects a join request.
 * 'declined' is used when an invited player declines an invitation.
 *
 * @param matchId - The match ID
 * @param participantId - The participant record ID (not player_id)
 * @param hostId - The ID of the user performing the action (must be match host)
 * @throws Error if not host, participant not found, or not in 'requested' status
 */
export async function rejectJoinRequest(
  matchId: string,
  participantId: string,
  hostId: string
): Promise<MatchParticipant> {
  // First, verify the caller is the match host
  const { data: match, error: matchError } = await supabase
    .from('match')
    .select(
      `
      id,
      created_by,
      cancelled_at,
      match_date,
      start_time,
      end_time,
      timezone,
      participants:match_participant (
        id,
        status
      )
    `
    )
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    throw new Error('Match not found');
  }

  // Check match is still available (not cancelled or completed)
  if (match.cancelled_at) {
    throw new Error('Cannot reject requests for a cancelled match');
  }

  const { getMatchEndTimeDifferenceFromNow } = await import('@rallia/shared-utils');
  const endTimeDiff = getMatchEndTimeDifferenceFromNow(
    match.match_date,
    match.start_time,
    match.end_time,
    match.timezone || 'UTC'
  );
  if (endTimeDiff < 0) {
    throw new Error('Cannot reject requests for a completed match');
  }

  // Verify caller is the host
  if (match.created_by !== hostId) {
    throw new Error('Only the match host can reject join requests');
  }

  // Find the participant record
  const participant = match.participants?.find(
    (p: { id: string; status: string }) => p.id === participantId
  );

  if (!participant) {
    throw new Error('Join request not found');
  }

  // Verify the participant has 'requested' status
  if (participant.status !== 'requested') {
    throw new Error('This is not a pending join request');
  }

  // Update the participant status to 'refused'
  const { data: updatedParticipant, error: updateError } = await supabase
    .from('match_participant')
    .update({
      status: 'refused',
      updated_at: new Date().toISOString(),
    })
    .eq('id', participantId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to reject join request: ${updateError.message}`);
  }

  return updatedParticipant as MatchParticipant;
}

/**
 * Cancel a pending join request (requester only).
 * Updates the participant status from 'requested' to 'left'.
 *
 * @param matchId - The match ID
 * @param playerId - The ID of the player cancelling their request
 * @throws Error if participant not found or not in 'requested' status
 */
export async function cancelJoinRequest(
  matchId: string,
  playerId: string
): Promise<MatchParticipant> {
  // First, verify the user has a pending request
  const { data: participant, error: participantError } = await supabase
    .from('match_participant')
    .select('id, status')
    .eq('match_id', matchId)
    .eq('player_id', playerId)
    .single();

  if (participantError || !participant) {
    throw new Error('Join request not found');
  }

  // Verify the participant has 'requested' status
  if (participant.status !== 'requested') {
    throw new Error('No pending request to cancel');
  }

  // Update the participant status to 'left'
  const { data: updatedParticipant, error: updateError } = await supabase
    .from('match_participant')
    .update({
      status: 'left',
      updated_at: new Date().toISOString(),
    })
    .eq('id', participant.id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to cancel join request: ${updateError.message}`);
  }

  return updatedParticipant as MatchParticipant;
}

/**
 * Kick a joined participant from a match (host only).
 * Updates the participant status from 'joined' to 'kicked'.
 *
 * @param matchId - The match ID
 * @param participantId - The participant record ID (not player_id)
 * @param hostId - The ID of the user performing the action (must be match host)
 * @throws Error if not host, participant not found, or not in 'joined' status
 */
export async function kickParticipant(
  matchId: string,
  participantId: string,
  hostId: string
): Promise<MatchParticipant> {
  // First, verify the caller is the match host
  const { data: match, error: matchError } = await supabase
    .from('match')
    .select(
      `
      id,
      created_by,
      cancelled_at,
      match_date,
      start_time,
      end_time,
      timezone,
      participants:match_participant (
        id,
        player_id,
        status
      )
    `
    )
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    throw new Error('Match not found');
  }

  // Check match is still available (not cancelled or completed)
  if (match.cancelled_at) {
    throw new Error('Cannot kick participants from a cancelled match');
  }

  const { getMatchEndTimeDifferenceFromNow } = await import('@rallia/shared-utils');
  const endTimeDiff = getMatchEndTimeDifferenceFromNow(
    match.match_date,
    match.start_time,
    match.end_time,
    match.timezone || 'UTC'
  );
  if (endTimeDiff < 0) {
    throw new Error('Cannot kick participants from a completed match');
  }

  // Verify caller is the host
  if (match.created_by !== hostId) {
    throw new Error('Only the match host can kick participants');
  }

  // Find the participant record
  const participant = match.participants?.find(
    (p: { id: string; status: string }) => p.id === participantId
  );

  if (!participant) {
    throw new Error('Participant not found');
  }

  // Verify the participant has 'joined' status
  if (participant.status !== 'joined') {
    throw new Error('This participant is not currently joined');
  }

  // Update the participant status to 'kicked'
  const { data: updatedParticipant, error: updateError } = await supabase
    .from('match_participant')
    .update({
      status: 'kicked',
      updated_at: new Date().toISOString(),
    })
    .eq('id', participantId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to kick participant: ${updateError.message}`);
  }

  return updatedParticipant as MatchParticipant;
}

/**
 * Parameters for searching nearby matches
 */
export interface SearchNearbyMatchesParams {
  latitude: number;
  longitude: number;
  maxDistanceKm: number;
  sportId: string;
  /** The viewing user's gender for eligibility filtering */
  userGender?: string | null;
  limit?: number;
  offset?: number;
}

/**
 * Result from nearby matches RPC
 */
interface NearbyMatchResult {
  match_id: string;
  distance_meters: number;
}

/**
 * Match with details including distance (for nearby matches)
 */
interface MatchWithDetailsAndDistance extends MatchWithDetails {
  distance_meters: number | null;
}

/**
 * Get matches at facilities near a location, within max distance.
 * Uses PostGIS RPC function for efficient distance filtering.
 * Returns full match details with distance_meters attached.
 */
export async function getNearbyMatches(params: SearchNearbyMatchesParams) {
  const {
    latitude,
    longitude,
    maxDistanceKm,
    sportId,
    userGender,
    limit = 20,
    offset = 0,
  } = params;

  // Step 1: Get match IDs within distance using RPC
  const { data: nearbyResults, error: rpcError } = await supabase.rpc('search_matches_nearby', {
    p_latitude: latitude,
    p_longitude: longitude,
    p_max_distance_km: maxDistanceKm,
    p_sport_id: sportId,
    p_limit: limit + 1, // Fetch one extra to check if more exist
    p_offset: offset,
    p_user_gender: userGender || null, // Pass user's gender for eligibility filtering
  });

  if (rpcError) {
    throw new Error(`Failed to search nearby matches: ${rpcError.message}`);
  }

  const results = (nearbyResults ?? []) as NearbyMatchResult[];
  const hasMore = results.length > limit;

  // Remove the extra item used for pagination check
  if (hasMore) {
    results.pop();
  }

  if (results.length === 0) {
    return {
      matches: [],
      hasMore: false,
      nextOffset: null,
    };
  }

  // Step 2: Fetch full match details for the found IDs
  const matchIds = results.map(r => r.match_id);
  const distanceMap = new Map(results.map(r => [r.match_id, r.distance_meters]));

  const { data: matchesData, error: matchError } = await supabase
    .from('match')
    .select(
      `
      *,
      sport:sport_id (*),
      facility:facility_id (*),
      court:court_id (*),
      min_rating_score:min_rating_score_id (*),
      created_by_player:created_by (
        id,
        gender,
        playing_hand,
        max_travel_distance,
        notification_match_requests,
        notification_messages,
        notification_reminders,
        privacy_show_age,
        privacy_show_location,
        privacy_show_stats
      ),
      participants:match_participant (
        id,
        match_id,
        player_id,
        status,
        is_host,
        score,
        team_number,
        created_at,
        updated_at,
        player:player_id (
          id,
          gender,
          playing_hand,
          max_travel_distance,
          notification_match_requests,
          notification_messages,
          notification_reminders,
          privacy_show_age,
          privacy_show_location,
          privacy_show_stats
        )
      )
    `
    )
    .in('id', matchIds);

  if (matchError) {
    throw new Error(`Failed to get match details: ${matchError.message}`);
  }

  if (!matchesData || matchesData.length === 0) {
    return {
      matches: [],
      hasMore: false,
      nextOffset: null,
    };
  }

  // Step 3: Fetch profiles for all players
  const playerIds = new Set<string>();
  matchesData.forEach((match: MatchWithDetails) => {
    if (match.created_by_player?.id) {
      playerIds.add(match.created_by_player.id);
    }
    if (match.participants) {
      match.participants.forEach((p: MatchParticipantWithPlayer) => {
        // Handle both array and object formats from Supabase
        const playerObj = Array.isArray(p.player) ? p.player[0] : p.player;
        if (playerObj?.id) {
          playerIds.add(playerObj.id);
        }
      });
    }
  });

  const profileIds = Array.from(playerIds);
  const profilesMap: Record<string, Profile> = {};

  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profile')
      .select('*')
      .in('id', profileIds);

    if (!profilesError && profiles) {
      profiles.forEach(profile => {
        profilesMap[profile.id] = profile;
      });
    }
  }

  // Fetch player ratings for the match's sport (for displaying in request cards)
  // All matches in this result are for the same sport (params.sportId)
  const ratingsMap: Record<string, { label: string; value: number | null }> = {}; // playerId -> rating info

  if (profileIds.length > 0 && sportId) {
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('player_rating_score')
      .select(
        `
        player_id,
        rating_score!player_rating_scores_rating_score_id_fkey!inner (
          label,
          value,
          rating_system!inner (
            sport_id
          )
        )
      `
      )
      .in('player_id', profileIds);

    if (!ratingsError && ratingsData) {
      type RatingResult = {
        player_id: string;
        rating_score: { label: string; value: number | null; rating_system: { sport_id: string } };
      };
      (ratingsData as unknown as RatingResult[]).forEach(rating => {
        // Filter to only ratings for this match's sport
        const ratingScore = rating.rating_score;
        const ratingSystem = ratingScore?.rating_system;
        if (ratingSystem?.sport_id === sportId && ratingScore?.label) {
          ratingsMap[rating.player_id] = {
            label: ratingScore.label,
            value: ratingScore.value,
          };
        }
      });
    }
  }

  // Step 4: Attach profiles, ratings, and distance to matches, maintain order from RPC
  const matchMap = new Map<string, MatchWithDetailsAndDistance>();
  matchesData.forEach((match: MatchWithDetails) => {
    // Attach profile and rating to creator
    if (match.created_by_player?.id && profilesMap[match.created_by_player.id]) {
      match.created_by_player.profile = profilesMap[match.created_by_player.id];
      const creatorRating = ratingsMap[match.created_by_player.id];
      if (creatorRating) {
        (match.created_by_player as PlayerWithProfile).sportRatingLabel = creatorRating.label;
        if (creatorRating.value !== null) {
          (match.created_by_player as PlayerWithProfile).sportRatingValue = creatorRating.value;
        }
      }
    }

    // Attach profiles and ratings to participants
    if (match.participants) {
      match.participants = match.participants.map((p: MatchParticipantWithPlayer) => {
        // Handle both array and object formats from Supabase
        const playerObj = Array.isArray(p.player) ? p.player[0] : p.player;
        const playerId = playerObj?.id;

        if (playerId && profilesMap[playerId]) {
          playerObj.profile = profilesMap[playerId];
        }
        const participantRating = playerId ? ratingsMap[playerId] : undefined;
        if (participantRating && playerObj) {
          (playerObj as PlayerWithProfile).sportRatingLabel = participantRating.label;
          if (participantRating.value !== null) {
            (playerObj as PlayerWithProfile).sportRatingValue = participantRating.value;
          }
        }
        // Ensure player is always an object, not array
        if (Array.isArray(p.player) && playerObj) {
          p.player = playerObj;
        }
        return p;
      });
    }

    // Attach distance
    const matchWithDistance: MatchWithDetailsAndDistance = {
      ...match,
      distance_meters: distanceMap.get(match.id) ?? null,
    };

    matchMap.set(match.id, matchWithDistance);
  });

  // Maintain order from RPC results (sorted by date/time)
  const orderedMatches = matchIds
    .map(id => matchMap.get(id))
    .filter(Boolean) as MatchWithDetailsAndDistance[];

  // Additional client-side sort to ensure correct ordering by datetime
  // This handles edge cases where order might not be preserved
  // We create proper datetime objects by combining date + time
  orderedMatches.sort((a: MatchWithDetailsAndDistance, b: MatchWithDetailsAndDistance) => {
    // Create datetime objects by combining date and time
    // Use string parsing to avoid timezone issues with Date constructor
    const createDateTime = (match: MatchWithDetailsAndDistance): number => {
      const dateStr = match.match_date; // Format: YYYY-MM-DD
      const timeStr = match.start_time; // Format: HH:MM:SS or HH:MM

      // Parse date parts
      const [year, month, day] = dateStr.split('-').map(Number);
      // Parse time parts
      const timeParts = timeStr.split(':').map(Number);
      const hours = timeParts[0] || 0;
      const minutes = timeParts[1] || 0;

      // Create date in local timezone
      const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
      return date.getTime();
    };

    const datetimeA = createDateTime(a);
    const datetimeB = createDateTime(b);

    // Sort by datetime (earlier matches first)
    return datetimeA - datetimeB;
  });

  return {
    matches: orderedMatches,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  };
}

/**
 * Parameters for fetching player's matches
 */
export interface GetPlayerMatchesParams {
  userId: string;
  timeFilter: 'upcoming' | 'past';
  /** Optional sport ID to filter matches by */
  sportId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get matches where the user is either the creator or a confirmed participant.
 * Supports filtering by upcoming/past and pagination.
 * Returns full match details with profiles.
 */
export async function getPlayerMatchesWithDetails(params: GetPlayerMatchesParams) {
  const { userId, timeFilter, sportId, limit = 20, offset = 0 } = params;

  // Use RPC function for timezone-aware filtering based on match END time
  // This ensures matches are considered "past" when their end_time has passed in the match's timezone
  const { data: matchIdResults, error: rpcError } = await supabase.rpc('get_player_matches', {
    p_player_id: userId,
    p_time_filter: timeFilter,
    p_sport_id: sportId ?? null,
    p_limit: limit + 1, // Fetch one extra to check if there are more
    p_offset: offset,
  });

  if (rpcError) {
    throw new Error(`Failed to get player match IDs: ${rpcError.message}`);
  }

  const matchIds = (matchIdResults ?? []).map((r: { match_id: string }) => r.match_id);

  if (matchIds.length === 0) {
    return {
      matches: [],
      hasMore: false,
      nextOffset: null,
    };
  }

  // Determine if there are more results
  const hasMore = matchIds.length > limit;
  const matchIdsToFetch = hasMore ? matchIds.slice(0, limit) : matchIds;

  // Fetch full match details for the IDs
  const isUpcoming = timeFilter === 'upcoming';

  const { data, error } = await supabase
    .from('match')
    .select(
      `
      *,
      sport:sport_id (*),
      facility:facility_id (*),
      court:court_id (*),
      min_rating_score:min_rating_score_id (*),
      created_by_player:created_by (
        id,
        gender,
        playing_hand,
        max_travel_distance,
        notification_match_requests,
        notification_messages,
        notification_reminders,
        privacy_show_age,
        privacy_show_location,
        privacy_show_stats
      ),
      participants:match_participant (
        id,
        match_id,
        player_id,
        status,
        is_host,
        score,
        team_number,
        created_at,
        updated_at,
        player:player_id (
          id,
          gender,
          playing_hand,
          max_travel_distance,
          notification_match_requests,
          notification_messages,
          notification_reminders,
          privacy_show_age,
          privacy_show_location,
          privacy_show_stats
        )
      )
    `
    )
    .in('id', matchIdsToFetch)
    .order('match_date', { ascending: isUpcoming })
    .order('start_time', { ascending: isUpcoming });

  if (error) {
    throw new Error(`Failed to get player matches: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return {
      matches: [],
      hasMore: false,
      nextOffset: null,
    };
  }

  const matchesData = data;

  // Fetch profiles for all players (creator + participants)
  const playerIds = new Set<string>();
  matchesData.forEach((match: MatchWithDetails) => {
    if (match.created_by_player?.id) {
      playerIds.add(match.created_by_player.id);
    }
    if (match.participants) {
      match.participants.forEach((p: MatchParticipantWithPlayer) => {
        // Handle both array and object formats from Supabase
        const playerObj = Array.isArray(p.player) ? p.player[0] : p.player;
        if (playerObj?.id) {
          playerIds.add(playerObj.id);
        }
      });
    }
  });

  // Fetch all profiles at once
  const profileIds = Array.from(playerIds);
  const profilesMap: Record<string, Profile> = {};

  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profile')
      .select('*')
      .in('id', profileIds);

    if (!profilesError && profiles) {
      profiles.forEach(profile => {
        profilesMap[profile.id] = profile;
      });
    }
  }

  // Fetch player ratings for each match's sport (for displaying in request cards)
  // Build a map of sportId -> playerId -> rating info
  const sportRatingsMap: Record<
    string,
    Record<string, { label: string; value: number | null }>
  > = {};

  if (profileIds.length > 0) {
    // Get unique sport IDs from matches
    const sportIds = [
      ...new Set(matchesData.map((m: MatchWithDetails) => m.sport_id).filter(Boolean)),
    ];

    if (sportIds.length > 0) {
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('player_rating_score')
        .select(
          `
        player_id,
        rating_score!player_rating_scores_rating_score_id_fkey!inner (
          label,
          value,
          rating_system!inner (
            sport_id
          )
        )
      `
        )
        .in('player_id', profileIds);

      if (ratingsError) {
        console.error('[getPlayerMatchesWithDetails] Error fetching ratings:', ratingsError);
      }

      if (!ratingsError && ratingsData) {
        type RatingResult = {
          player_id: string;
          rating_score: {
            label: string;
            value: number | null;
            rating_system: { sport_id: string };
          };
        };
        (ratingsData as unknown as RatingResult[]).forEach(rating => {
          const ratingScore = rating.rating_score;
          const ratingSystem = ratingScore?.rating_system;
          if (ratingSystem?.sport_id && ratingScore?.label) {
            if (!sportRatingsMap[ratingSystem.sport_id]) {
              sportRatingsMap[ratingSystem.sport_id] = {};
            }
            sportRatingsMap[ratingSystem.sport_id][rating.player_id] = {
              label: ratingScore.label,
              value: ratingScore.value,
            };
          }
        });
      }
    }
  }

  // Attach profiles and ratings to players
  const enrichedData = matchesData.map((match: MatchWithDetails) => {
    const matchSportRatings = sportRatingsMap[match.sport_id] || {};

    // Attach profile and rating to creator
    if (match.created_by_player?.id && profilesMap[match.created_by_player.id]) {
      match.created_by_player.profile = profilesMap[match.created_by_player.id];
      const creatorRating = matchSportRatings[match.created_by_player.id];
      if (creatorRating) {
        (match.created_by_player as PlayerWithProfile).sportRatingLabel = creatorRating.label;
        if (creatorRating.value !== null) {
          (match.created_by_player as PlayerWithProfile).sportRatingValue = creatorRating.value;
        }
      }
    }

    // Attach profiles and ratings to participants
    if (match.participants) {
      match.participants = match.participants.map((p: MatchParticipantWithPlayer) => {
        // Handle both array and object formats from Supabase
        const playerObj = Array.isArray(p.player) ? p.player[0] : p.player;
        const playerId = playerObj?.id;

        if (playerId && profilesMap[playerId]) {
          playerObj.profile = profilesMap[playerId];
        }
        const participantRating = playerId ? matchSportRatings[playerId] : undefined;
        if (participantRating && playerObj) {
          (playerObj as PlayerWithProfile).sportRatingLabel = participantRating.label;
          if (participantRating.value !== null) {
            (playerObj as PlayerWithProfile).sportRatingValue = participantRating.value;
          }
        }
        // Ensure player is always an object, not array
        if (Array.isArray(p.player) && playerObj) {
          p.player = playerObj;
        }
        return p;
      });
    }

    return match;
  });

  return {
    matches: enrichedData as MatchWithDetails[],
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  };
}

/**
 * Parameters for searching public matches with filters
 */
export interface SearchPublicMatchesParams {
  latitude: number;
  longitude: number;
  /** Maximum distance in km, or 'all'/null for no distance filter (shows all location types) */
  maxDistanceKm: number | 'all' | null;
  sportId: string;
  searchQuery?: string;
  format?: 'all' | 'singles' | 'doubles';
  matchType?: 'all' | 'casual' | 'competitive';
  dateRange?: 'all' | 'today' | 'week' | 'weekend';
  timeOfDay?: 'all' | 'morning' | 'afternoon' | 'evening';
  skillLevel?: 'all' | 'beginner' | 'intermediate' | 'advanced';
  gender?: 'all' | 'male' | 'female';
  cost?: 'all' | 'free' | 'paid';
  joinMode?: 'all' | 'direct' | 'request';
  /** The viewing user's gender for eligibility filtering */
  userGender?: string | null;
  limit?: number;
  offset?: number;
}

/**
 * Result from public matches RPC
 */
interface PublicMatchResult {
  match_id: string;
  distance_meters: number;
}

/**
 * Get public matches with search and filters.
 * Uses PostGIS RPC function for efficient distance filtering and text search.
 * When maxDistanceKm is 'all' or null, returns matches of all location types.
 * When maxDistanceKm is a number, only returns facility and custom location matches within that distance.
 * Returns full match details with distance_meters attached.
 */
export async function getPublicMatches(params: SearchPublicMatchesParams) {
  const {
    latitude,
    longitude,
    maxDistanceKm,
    sportId,
    searchQuery,
    format = 'all',
    matchType = 'all',
    dateRange = 'all',
    timeOfDay = 'all',
    skillLevel = 'all',
    gender = 'all',
    cost = 'all',
    joinMode = 'all',
    userGender,
    limit = 20,
    offset = 0,
  } = params;

  // Convert 'all' to null for the RPC (null means no distance filter)
  const distanceForRpc = maxDistanceKm === 'all' || maxDistanceKm === null ? null : maxDistanceKm;

  // Step 1: Get match IDs using RPC with filters
  const { data: matchResults, error: rpcError } = await supabase.rpc('search_public_matches', {
    p_latitude: latitude,
    p_longitude: longitude,
    p_max_distance_km: distanceForRpc,
    p_sport_id: sportId,
    p_search_query: searchQuery || null,
    p_format: format === 'all' ? null : format,
    p_match_type: matchType === 'all' ? null : matchType,
    p_date_range: dateRange === 'all' ? null : dateRange,
    p_time_of_day: timeOfDay === 'all' ? null : timeOfDay,
    p_skill_level: skillLevel === 'all' ? null : skillLevel,
    p_gender: gender === 'all' ? null : gender,
    p_cost: cost === 'all' ? null : cost,
    p_join_mode: joinMode === 'all' ? null : joinMode,
    p_limit: limit + 1, // Fetch one extra to check if more exist
    p_offset: offset,
    p_user_gender: userGender || null, // Pass user's gender for eligibility filtering
  });

  if (rpcError) {
    throw new Error(`Failed to search public matches: ${rpcError.message}`);
  }

  const results = (matchResults ?? []) as PublicMatchResult[];
  const hasMore = results.length > limit;

  // Remove the extra item used for pagination check
  if (hasMore) {
    results.pop();
  }

  if (results.length === 0) {
    return {
      matches: [],
      hasMore: false,
      nextOffset: null,
    };
  }

  // Step 2: Fetch full match details for the found IDs
  const matchIds = results.map(r => r.match_id);
  const distanceMap = new Map(results.map(r => [r.match_id, r.distance_meters]));

  const { data: matchesData, error: matchError } = await supabase
    .from('match')
    .select(
      `
      *,
      sport:sport_id (*),
      facility:facility_id (*),
      court:court_id (*),
      min_rating_score:min_rating_score_id (*),
      created_by_player:created_by (
        id,
        gender,
        playing_hand,
        max_travel_distance,
        notification_match_requests,
        notification_messages,
        notification_reminders,
        privacy_show_age,
        privacy_show_location,
        privacy_show_stats
      ),
      participants:match_participant (
        id,
        match_id,
        player_id,
        status,
        is_host,
        score,
        team_number,
        created_at,
        updated_at,
        player:player_id (
          id,
          gender,
          playing_hand,
          max_travel_distance,
          notification_match_requests,
          notification_messages,
          notification_reminders,
          privacy_show_age,
          privacy_show_location,
          privacy_show_stats
        )
      )
    `
    )
    .in('id', matchIds);

  if (matchError) {
    throw new Error(`Failed to get match details: ${matchError.message}`);
  }

  if (!matchesData || matchesData.length === 0) {
    return {
      matches: [],
      hasMore: false,
      nextOffset: null,
    };
  }

  // Step 3: Fetch profiles for all players
  const playerIds = new Set<string>();
  matchesData.forEach((match: MatchWithDetails) => {
    if (match.created_by_player?.id) {
      playerIds.add(match.created_by_player.id);
    }
    if (match.participants) {
      match.participants.forEach((p: MatchParticipantWithPlayer) => {
        // Handle both array and object formats from Supabase
        const playerObj = Array.isArray(p.player) ? p.player[0] : p.player;
        if (playerObj?.id) {
          playerIds.add(playerObj.id);
        }
      });
    }
  });

  const profileIds = Array.from(playerIds);
  const profilesMap: Record<string, Profile> = {};

  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profile')
      .select('*')
      .in('id', profileIds);

    if (!profilesError && profiles) {
      profiles.forEach(profile => {
        profilesMap[profile.id] = profile;
      });
    }
  }

  // Fetch player ratings for the match's sport (for displaying in request cards)
  // All matches in this result are for the same sport (params.sportId)
  const publicRatingsMap: Record<string, { label: string; value: number | null }> = {}; // playerId -> rating info

  if (profileIds.length > 0 && sportId) {
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('player_rating_score')
      .select(
        `
        player_id,
        rating_score!player_rating_scores_rating_score_id_fkey!inner (
          label,
          value,
          rating_system!inner (
            sport_id
          )
        )
      `
      )
      .in('player_id', profileIds);

    if (!ratingsError && ratingsData) {
      type RatingResult = {
        player_id: string;
        rating_score: { label: string; value: number | null; rating_system: { sport_id: string } };
      };
      (ratingsData as unknown as RatingResult[]).forEach(rating => {
        // Filter to only ratings for this match's sport
        const ratingScore = rating.rating_score;
        const ratingSystem = ratingScore?.rating_system;
        if (ratingSystem?.sport_id === sportId && ratingScore?.label) {
          publicRatingsMap[rating.player_id] = {
            label: ratingScore.label,
            value: ratingScore.value,
          };
        }
      });
    }
  }

  // Step 4: Attach profiles, ratings, and distance to matches, maintain order from RPC
  const matchMap = new Map<string, MatchWithDetailsAndDistance>();
  matchesData.forEach((match: MatchWithDetails) => {
    // Attach profile and rating to creator
    if (match.created_by_player?.id && profilesMap[match.created_by_player.id]) {
      match.created_by_player.profile = profilesMap[match.created_by_player.id];
      const creatorRating = publicRatingsMap[match.created_by_player.id];
      if (creatorRating) {
        (match.created_by_player as PlayerWithProfile).sportRatingLabel = creatorRating.label;
        if (creatorRating.value !== null) {
          (match.created_by_player as PlayerWithProfile).sportRatingValue = creatorRating.value;
        }
      }
    }

    // Attach profiles and ratings to participants
    if (match.participants) {
      match.participants = match.participants.map((p: MatchParticipantWithPlayer) => {
        // Handle both array and object formats from Supabase
        const playerObj = Array.isArray(p.player) ? p.player[0] : p.player;
        const playerId = playerObj?.id;

        if (playerId && profilesMap[playerId]) {
          playerObj.profile = profilesMap[playerId];
        }
        const participantRating = playerId ? publicRatingsMap[playerId] : undefined;
        if (participantRating && playerObj) {
          (playerObj as PlayerWithProfile).sportRatingLabel = participantRating.label;
          if (participantRating.value !== null) {
            (playerObj as PlayerWithProfile).sportRatingValue = participantRating.value;
          }
        }
        // Ensure player is always an object, not array
        if (Array.isArray(p.player) && playerObj) {
          p.player = playerObj;
        }
        return p;
      });
    }

    // Attach distance
    const matchWithDistance: MatchWithDetailsAndDistance = {
      ...match,
      distance_meters: distanceMap.get(match.id) ?? null,
    };

    matchMap.set(match.id, matchWithDistance);
  });

  // Maintain order from RPC results (sorted by date/time)
  const orderedMatches = matchIds
    .map(id => matchMap.get(id))
    .filter(Boolean) as MatchWithDetailsAndDistance[];

  return {
    matches: orderedMatches,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  };
}

/**
 * Match service object for grouped exports
 */
export const matchService = {
  createMatch,
  getMatch,
  getMatchWithDetails,
  getMatchesByCreator,
  getPlayerMatchesWithDetails,
  getNearbyMatches,
  getPublicMatches,
  updateMatch,
  cancelMatch,
  deleteMatch,
  // Participant actions
  joinMatch,
  leaveMatch,
  getParticipantStatus,
  acceptJoinRequest,
  rejectJoinRequest,
  cancelJoinRequest,
  kickParticipant,
};

export default matchService;
