/**
 * Match Service
 * Handles all match-related database operations using Supabase.
 */

import { supabase } from '../supabase';
import {
  notifyMatchJoinRequest,
  notifyJoinRequestAccepted,
  notifyJoinRequestRejected,
  notifyPlayerJoined,
  notifyPlayerLeft,
  notifyMatchCancelled,
  notifyMatchUpdated,
  notifyPlayerKicked,
  notifyMatchInvitation,
} from '../notifications/notificationFactory';
import {
  createReputationEvent,
  createReputationEvents,
  havePlayedTogether,
} from '../reputation/reputationService';
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
 * Helper to convert empty strings to null (for optional UUID fields)
 * Returns null (not undefined) so the field is actually cleared in the database
 */
function emptyToNull(value: string | null | undefined): string | null {
  return value && typeof value === 'string' && value.trim() !== '' ? value : null;
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
  // Note: Empty strings are converted to null for UUID fields to avoid "invalid uuid" errors
  const insertData: TablesInsert<'match'> = {
    sport_id: input.sportId,
    created_by: input.createdBy,
    match_date: input.matchDate,
    start_time: input.startTime,
    end_time: input.endTime,
    timezone: input.timezone,
    format: input.format ?? 'singles',
    player_expectation: input.playerExpectation ?? 'both',
    duration: input.duration ?? '60',
    custom_duration_minutes: input.customDurationMinutes,
    location_type: input.locationType ?? 'tbd',
    facility_id: emptyToNull(input.facilityId),
    court_id: emptyToNull(input.courtId),
    location_name: emptyToNull(input.locationName),
    location_address: emptyToNull(input.locationAddress),
    custom_latitude: input.customLatitude,
    custom_longitude: input.customLongitude,
    court_status: input.courtStatus ? courtStatusMap[input.courtStatus] : null,
    is_court_free: input.isCourtFree ?? true,
    cost_split_type: costSplitMap[input.costSplitType ?? 'equal'] ?? 'split_equal',
    estimated_cost: input.estimatedCost,
    min_rating_score_id: emptyToNull(input.minRatingScoreId),
    preferred_opponent_gender:
      input.preferredOpponentGender === 'any' ? null : input.preferredOpponentGender,
    visibility: input.visibility ?? 'public',
    join_mode: input.joinMode ?? 'direct',
    notes: emptyToNull(input.notes),
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
        reputation_score,
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
        feedback_completed,
        checked_in_at,
        created_at,
        updated_at,
        player:player_id (
          id,
          gender,
          playing_hand,
          max_travel_distance,
          reputation_score,
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
        reputation_score,
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
        feedback_completed,
        checked_in_at,
        created_at,
        updated_at,
        player:player_id (
          id,
          gender,
          playing_hand,
          max_travel_distance,
          reputation_score,
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
 * Error codes for match update validation
 * These are translated on the frontend
 */
export type UpdateMatchErrorCode = 'MATCH_NOT_FOUND' | 'FORMAT_CHANGE_BLOCKED' | 'UNKNOWN_ERROR';

/**
 * Result of match update validation
 */
export interface UpdateMatchValidationResult {
  canUpdate: boolean;
  errorCode?: UpdateMatchErrorCode;
  /** @deprecated Use errorCode instead - this is kept for backwards compatibility */
  error?: string;
  warnings?: {
    type: 'gender_mismatch' | 'rating_mismatch';
    affectedParticipantIds: string[];
    message: string;
  }[];
}

/**
 * Validate match update and return affected participants info
 * This is called before updateMatch to check for issues
 */
export async function validateMatchUpdate(
  matchId: string,
  updates: Partial<CreateMatchInput>
): Promise<UpdateMatchValidationResult> {
  // Fetch current match with participants
  const { data: match, error: matchError } = await supabase
    .from('match')
    .select(
      `
      id,
      format,
      preferred_opponent_gender,
      min_rating_score_id,
      participants:match_participant (
        id,
        player_id,
        status,
        player:player_id (
          id,
          gender
        )
      )
    `
    )
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    return { canUpdate: false, errorCode: 'MATCH_NOT_FOUND', error: 'Match not found' };
  }

  const joinedParticipants =
    match.participants?.filter((p: { status: string }) => p.status === 'joined') ?? [];
  const joinedCount = joinedParticipants.length;

  const warnings: UpdateMatchValidationResult['warnings'] = [];

  // ========================================
  // FORMAT VALIDATION
  // ========================================
  // Block format change from doubles to singles if 2+ participants joined
  if (updates.format !== undefined && updates.format !== match.format) {
    if (match.format === 'doubles' && updates.format === 'singles' && joinedCount >= 2) {
      return {
        canUpdate: false,
        errorCode: 'FORMAT_CHANGE_BLOCKED',
        error:
          'Cannot change from doubles to singles with 2 or more participants. Remove participants first or cancel the match.',
      };
    }
  }

  // ========================================
  // GENDER PREFERENCE VALIDATION
  // ========================================
  // Warn if changing gender preference would affect joined participants
  if (updates.preferredOpponentGender !== undefined && joinedCount > 0) {
    const newGender =
      updates.preferredOpponentGender === 'any' ? null : updates.preferredOpponentGender;

    // Only check if setting a specific gender (not clearing it)
    if (newGender) {
      const mismatchedParticipants = joinedParticipants.filter(
        (p: { player: { gender: string } | { gender: string }[] | null }) => {
          // Handle both array and object formats from Supabase
          const playerObj = Array.isArray(p.player) ? p.player[0] : p.player;
          return playerObj?.gender && playerObj.gender !== newGender;
        }
      );

      if (mismatchedParticipants.length > 0) {
        warnings.push({
          type: 'gender_mismatch',
          affectedParticipantIds: mismatchedParticipants.map(
            (p: { player_id: string }) => p.player_id
          ),
          message: `${mismatchedParticipants.length} participant(s) do not match the new gender preference`,
        });
      }
    }
  }

  return { canUpdate: true, warnings: warnings.length > 0 ? warnings : undefined };
}

/**
 * Update a match
 */
export async function updateMatch(
  matchId: string,
  updates: Partial<CreateMatchInput>,
  options?: { skipValidation?: boolean }
): Promise<Match> {
  // ========================================
  // VALIDATION (unless skipped)
  // ========================================
  if (!options?.skipValidation) {
    const validation = await validateMatchUpdate(matchId, updates);
    if (!validation.canUpdate) {
      throw new Error(validation.error || 'Update not allowed');
    }
    // Note: Warnings are returned but not blocking - caller can check them first
  }

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
    updateData.player_expectation = updates.playerExpectation;
  }
  if (updates.duration !== undefined) updateData.duration = updates.duration;
  if (updates.customDurationMinutes !== undefined)
    updateData.custom_duration_minutes = updates.customDurationMinutes;
  if (updates.locationType !== undefined) {
    updateData.location_type = updates.locationType;

    // Clear all location-related fields when switching location types
    // This ensures we start fresh with the new location type
    if (updates.locationType === 'tbd') {
      // TBD: clear everything
      updateData.facility_id = null;
      updateData.court_id = null;
      updateData.court_status = null;
      updateData.location_name = null;
      updateData.location_address = null;
      updateData.custom_latitude = null;
      updateData.custom_longitude = null;
    } else if (updates.locationType === 'facility') {
      // Facility: clear custom location fields (facility fields will be set separately)
      updateData.custom_latitude = null;
      updateData.custom_longitude = null;
      // Note: location_name/address may be set from facility, don't clear them here
    } else if (updates.locationType === 'custom') {
      // Custom: clear facility-related fields
      updateData.facility_id = null;
      updateData.court_id = null;
      updateData.court_status = null;
    }
  }
  if (updates.facilityId !== undefined) updateData.facility_id = emptyToNull(updates.facilityId);
  if (updates.courtId !== undefined) updateData.court_id = emptyToNull(updates.courtId);
  if (updates.locationName !== undefined)
    updateData.location_name = emptyToNull(updates.locationName);
  if (updates.locationAddress !== undefined)
    updateData.location_address = emptyToNull(updates.locationAddress);
  // Update custom coordinates if provided (will be cleared above if locationType changes away from 'custom')
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
    updateData.min_rating_score_id = emptyToNull(updates.minRatingScoreId);
  if (updates.preferredOpponentGender !== undefined)
    updateData.preferred_opponent_gender =
      updates.preferredOpponentGender === 'any' ? null : updates.preferredOpponentGender;
  if (updates.visibility !== undefined) updateData.visibility = updates.visibility;
  if (updates.joinMode !== undefined) updateData.join_mode = updates.joinMode;
  if (updates.notes !== undefined) updateData.notes = emptyToNull(updates.notes);

  const { data, error } = await supabase
    .from('match')
    .update(updateData)
    .eq('id', matchId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update match: ${error.message}`);
  }

  // ========================================
  // NOTIFY PARTICIPANTS OF CHANGES
  // ========================================
  // Get list of fields that were updated (for notification content)
  const updatedFields = Object.keys(updates).filter(
    key => updates[key as keyof typeof updates] !== undefined
  );

  // Fields that warrant participant notification
  const notifiableFields = [
    'matchDate',
    'startTime',
    'endTime',
    'duration',
    'customDurationMinutes',
    'timezone',
    'locationType',
    'facilityId',
    'courtId',
    'locationName',
    'locationAddress',
    'isCourtFree',
    'estimatedCost',
    'costSplitType',
    'format',
    'playerExpectation',
  ];

  const hasNotifiableChanges = updatedFields.some(field => notifiableFields.includes(field));

  if (hasNotifiableChanges) {
    // Fetch all joined participants (excluding the match creator who made the update)
    const { data: participantsData } = await supabase
      .from('match_participant')
      .select('player_id')
      .eq('match_id', matchId)
      .eq('status', 'joined');

    if (participantsData && participantsData.length > 0) {
      const participantIds = participantsData.map(p => p.player_id);

      // Send notifications (fire and forget - don't block on notification)
      notifyMatchUpdated(participantIds, matchId, updatedFields).catch(err => {
        console.error('Failed to send match updated notifications:', err);
      });
    }
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

  // Create reputation event for cancellation (if userId is provided = host cancelling)
  if (userId) {
    // Check if this is a late cancellation (less than 24 hours before match start)
    const matchStartDateTime = new Date(`${match.match_date}T${match.start_time}`);
    const now = new Date();
    const hoursUntilMatch = (matchStartDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isLateCancellation = hoursUntilMatch < 24;

    // Create reputation event for the host
    createReputationEvent(
      userId,
      isLateCancellation ? 'match_cancelled_late' : 'match_cancelled_early',
      { matchId }
    ).catch(err => {
      console.error('[cancelMatch] Failed to create reputation event:', err);
    });
  }

  // Notify all joined participants about the cancellation
  // First, get all participant IDs (excluding the host who cancelled)
  const { data: participantsData } = await supabase
    .from('match_participant')
    .select('player_id')
    .eq('match_id', matchId)
    .eq('status', 'joined');

  if (participantsData && participantsData.length > 0) {
    const participantIds = participantsData.map(p => p.player_id).filter(id => id !== userId); // Exclude the host

    if (participantIds.length > 0) {
      // Get sport name for better notification
      const { data: matchDetails } = await supabase
        .from('match')
        .select('sport:sport_id (name)')
        .eq('id', matchId)
        .single();

      const sportName = (matchDetails?.sport as { name?: string } | null)?.name ?? 'Match';

      // Send notifications (fire and forget)
      notifyMatchCancelled(participantIds, matchId, match.match_date, sportName).catch(err => {
        console.error('Failed to send match cancelled notifications:', err);
      });
    }
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

  // Check if player is already a host participant (creators can't join their own match)
  const isHost = match.participants?.some(
    (p: { player_id: string; is_host?: boolean | null }) => p.player_id === playerId && p.is_host
  );
  if (isHost) {
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
  // Allow joining/re-joining if:
  // - 'pending': invited by host, accepting the invitation
  // - 'left': previously left the match
  // - 'declined': previously declined an invitation
  // - 'refused': host previously rejected their join request
  // - 'kicked': previously kicked from the match
  // - 'waitlisted': on waitlist, spots may have opened up
  const allowedStatuses = ['pending', 'left', 'declined', 'refused', 'kicked', 'waitlisted'];
  if (existingParticipant && !allowedStatuses.includes(existingParticipant.status)) {
    throw new Error('You are already in this match');
  }

  // Calculate spots: format determines total capacity (singles=2, doubles=4)
  // Joined participants (now includes creator who has is_host=true) fill spots
  const totalSpots = match.format === 'doubles' ? 4 : 2;
  const joinedParticipants =
    match.participants?.filter((p: { status: string }) => p.status === 'joined').length ?? 0;
  // Available = total - joined participants (creator is now included in joined participants)
  const availableSpots = totalSpots - joinedParticipants;

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

  // Get player name for notifications (player.id = profile.id)
  const { data: profileData } = await supabase
    .from('profile')
    .select('first_name, last_name, display_name')
    .eq('id', playerId)
    .single();

  // Prefer display_name, fall back to first_name + last_name
  const playerName =
    profileData?.display_name ||
    (profileData?.first_name && profileData?.last_name
      ? `${profileData.first_name} ${profileData.last_name}`
      : profileData?.first_name) ||
    'A player';

  // Send notification to host if this is a join request
  if (participantStatus === 'requested') {
    // Notify the host (fire and forget - don't block on notification)
    notifyMatchJoinRequest(match.created_by, matchId, playerName).catch(err => {
      console.error('Failed to send join request notification:', err);
    });
  }

  // Send notifications to host and participants when a player directly joins (open access)
  if (participantStatus === 'joined') {
    // Get all joined participants (excluding the new player)
    const otherParticipants =
      match.participants?.filter(
        (p: { player_id: string; status: string }) =>
          p.status === 'joined' && p.player_id !== playerId
      ) ?? [];

    // Collect all user IDs to notify: host + other participants
    const userIdsToNotify = [
      match.created_by, // Always notify the host
      ...otherParticipants.map((p: { player_id: string }) => p.player_id),
    ];

    // Remove duplicates (in case host is somehow in participants)
    const uniqueUserIds = [...new Set(userIdsToNotify)];

    if (uniqueUserIds.length > 0) {
      // Fetch match details for more informative notification
      const { data: matchDetails } = await supabase
        .from('match')
        .select(
          `
          sport:sport_id (name),
          location_type,
          location_name,
          match_date,
          start_time
        `
        )
        .eq('id', matchId)
        .single();

      const sportName = (matchDetails?.sport as { name?: string } | null)?.name;
      // Don't include location if it's TBD
      const locationName =
        matchDetails?.location_type === 'tbd' ? undefined : matchDetails?.location_name;

      // Format match date
      let formattedDate: string | undefined;
      if (matchDetails?.match_date && matchDetails?.start_time) {
        try {
          const matchDateTime = new Date(`${matchDetails.match_date}T${matchDetails.start_time}`);
          formattedDate = matchDateTime.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });
        } catch {
          // Fallback to raw date if parsing fails
          formattedDate = matchDetails.match_date;
        }
      }

      // Notify all users (fire and forget - don't block on notification)
      notifyPlayerJoined(
        uniqueUserIds,
        matchId,
        playerName,
        sportName,
        formattedDate,
        locationName
      ).catch(err => {
        console.error('Failed to send player joined notifications:', err);
      });
    }
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
  // First check if user is the match host and get match details
  const { data: match, error: matchError } = await supabase
    .from('match')
    .select(
      `
      created_by,
      sport:sport_id (name),
      participants:match_participant (
        player_id,
        status,
        is_host
      )
    `
    )
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    throw new Error('Match not found');
  }

  // Check if user is the host (either via is_host flag or created_by for backwards compatibility)
  const isHost = match.participants?.some(
    (p: { player_id: string; is_host?: boolean | null }) => p.player_id === playerId && p.is_host
  );
  if (isHost || match.created_by === playerId) {
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

  // Send notifications to host and remaining participants
  // Get player name for notification
  const { data: profileData } = await supabase
    .from('profile')
    .select('first_name, last_name, display_name')
    .eq('id', playerId)
    .single();

  const playerName =
    profileData?.display_name ||
    (profileData?.first_name && profileData?.last_name
      ? `${profileData.first_name} ${profileData.last_name}`
      : profileData?.first_name) ||
    'A player';
  const sportName = (match.sport as { name?: string } | null)?.name;

  // Get all remaining joined participants (excluding the player who left)
  const remainingParticipants =
    match.participants?.filter(
      (p: { player_id: string; status: string }) =>
        p.status === 'joined' && p.player_id !== playerId
    ) ?? [];

  // Recipients include the host and remaining joined participants
  const userIdsToNotify = [
    match.created_by,
    ...remainingParticipants.map((p: { player_id: string }) => p.player_id),
  ];

  // Remove duplicates
  const uniqueUserIds = [...new Set(userIdsToNotify)];

  if (uniqueUserIds.length > 0) {
    // Notify all users (fire and forget - don't block on notification)
    notifyPlayerLeft(uniqueUserIds, matchId, playerName, sportName).catch(err => {
      console.error('Failed to send player left notifications:', err);
    });
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
  // Creator is now included in joined participants
  const availableSpots = totalSpots - joinedParticipants;

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

  // Notify the player that their request was accepted (fire and forget)
  notifyJoinRequestAccepted(
    participant.player_id,
    matchId,
    match.match_date,
    undefined // sportName - would need additional query to get
  ).catch(err => {
    console.error('Failed to send join accepted notification:', err);
  });

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

  // Get the participant's player_id to notify them
  const participantRecord = match.participants?.find(
    (p: { id: string }) => p.id === participantId
  ) as { player_id: string } | undefined;

  if (participantRecord?.player_id) {
    // Notify the player that their request was rejected (fire and forget)
    notifyJoinRequestRejected(participantRecord.player_id, matchId).catch(err => {
      console.error('Failed to send join rejected notification:', err);
    });
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

  // Notify the kicked player (fire and forget)
  const participantRecord = match.participants?.find(
    (p: { id: string }) => p.id === participantId
  ) as { player_id: string } | undefined;

  if (participantRecord?.player_id) {
    notifyPlayerKicked(participantRecord.player_id, matchId).catch(err => {
      console.error('Failed to send kicked notification:', err);
    });
  }

  return updatedParticipant as MatchParticipant;
}

/**
 * Cancel an invitation for a match (host only).
 * Updates the participant status from 'pending' to 'cancelled'.
 *
 * @param matchId - The match ID
 * @param participantId - The participant record ID (not player_id)
 * @param hostId - The ID of the user performing the action (must be match host)
 * @throws Error if not host, participant not found, or not in 'pending' status
 */
export async function cancelInvitation(
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

  // Check match is still available (not cancelled)
  if (match.cancelled_at) {
    throw new Error('Cannot cancel invitations for a cancelled match');
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
    throw new Error('Cannot cancel invitations for a completed match');
  }

  // Verify caller is the host
  if (match.created_by !== hostId) {
    throw new Error('Only the match host can cancel invitations');
  }

  // Find the participant record
  const participant = match.participants?.find(
    (p: { id: string; status: string }) => p.id === participantId
  );

  if (!participant) {
    throw new Error('Invitation not found');
  }

  // Verify the participant has 'pending' status (is an invitation)
  if (participant.status !== 'pending') {
    throw new Error('This is not a pending invitation');
  }

  // Update the participant status to 'cancelled'
  const { data: updatedParticipant, error: updateError } = await supabase
    .from('match_participant')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', participantId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to cancel invitation: ${updateError.message}`);
  }

  // No notification sent to invitee (per requirements)

  return updatedParticipant as MatchParticipant;
}

/**
 * Resend an invitation for a match (host only).
 * - For 'pending' invitations: resends the notification
 * - For 'declined' invitations: updates status to 'pending' and sends notification
 *
 * @param matchId - The match ID
 * @param participantId - The participant record ID (not player_id)
 * @param hostId - The ID of the user performing the action (must be match host)
 * @throws Error if not host, participant not found, or not in 'pending'/'declined' status
 */
export async function resendInvitation(
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
      created_by,
      cancelled_at,
      match_date,
      start_time,
      end_time,
      timezone,
      sport:sport (
        id,
        name,
        display_name
      ),
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

  // Check match is still available (not cancelled)
  if (match.cancelled_at) {
    throw new Error('Cannot resend invitations for a cancelled match');
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
    throw new Error('Cannot resend invitations for a completed match');
  }

  // Verify caller is the host
  if (match.created_by !== hostId) {
    throw new Error('Only the match host can resend invitations');
  }

  // Find the participant record
  const participant = match.participants?.find(
    (p: { id: string; status: string }) => p.id === participantId
  );

  if (!participant) {
    throw new Error('Invitation not found');
  }

  // Verify the participant has 'pending' or 'declined' status
  if (participant.status !== 'pending' && participant.status !== 'declined') {
    throw new Error('This is not a pending or declined invitation');
  }

  let updatedParticipant: MatchParticipant;

  // If status is 'declined', update it to 'pending'
  if (participant.status === 'declined') {
    const { data: updated, error: updateError } = await supabase
      .from('match_participant')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', participantId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to resend invitation: ${updateError.message}`);
    }
    updatedParticipant = updated as MatchParticipant;
  } else {
    // Status is already 'pending', just fetch the current record
    const { data: current, error: fetchError } = await supabase
      .from('match_participant')
      .select()
      .eq('id', participantId)
      .single();

    if (fetchError || !current) {
      throw new Error('Failed to fetch participant record');
    }
    updatedParticipant = current as MatchParticipant;
  }

  // Get host profile for notification
  const { data: hostProfile } = await supabase
    .from('profile')
    .select('first_name, last_name, display_name')
    .eq('id', hostId)
    .single();

  const inviterName =
    hostProfile?.display_name ||
    (hostProfile?.first_name && hostProfile?.last_name
      ? `${hostProfile.first_name} ${hostProfile.last_name}`
      : hostProfile?.first_name) ||
    'A player';

  // Get sport name (handle both array and object cases from Supabase types)
  const sportData = match.sport as
    | { name: string; display_name?: string | null }
    | { name: string; display_name?: string | null }[]
    | null;
  const sport = Array.isArray(sportData) ? sportData[0] : sportData;
  const sportName = sport?.display_name || sport?.name || 'a match';

  // Send invitation notification (fire and forget)
  const participantRecord = match.participants?.find(
    (p: { id: string }) => p.id === participantId
  ) as { player_id: string } | undefined;

  if (participantRecord?.player_id) {
    notifyMatchInvitation(
      participantRecord.player_id,
      matchId,
      inviterName,
      sportName,
      match.match_date
    ).catch(err => {
      console.error('Failed to send invitation notification:', err);
    });
  }

  return updatedParticipant;
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
        reputation_score,
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
        feedback_completed,
        checked_in_at,
        created_at,
        updated_at,
        player:player_id (
          id,
          gender,
          playing_hand,
          max_travel_distance,
          reputation_score,
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
        reputation_score,
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
        feedback_completed,
        checked_in_at,
        created_at,
        updated_at,
        player:player_id (
          id,
          gender,
          playing_hand,
          max_travel_distance,
          reputation_score,
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
        reputation_score,
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
        feedback_completed,
        checked_in_at,
        created_at,
        updated_at,
        player:player_id (
          id,
          gender,
          playing_hand,
          max_travel_distance,
          reputation_score,
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

// =============================================================================
// PLAYER INVITATION
// =============================================================================

/**
 * Result of inviting players to a match
 */
export interface InvitePlayersResult {
  /** Successfully created participant records */
  invited: MatchParticipant[];
  /** Player IDs that were already in the match (skipped) */
  alreadyInMatch: string[];
  /** Player IDs that failed to invite */
  failed: string[];
}

/**
 * Invite multiple players to a match.
 * Creates match_participant records with 'pending' status and sends notifications.
 *
 * @param matchId - The match ID to invite players to
 * @param playerIds - Array of player IDs to invite
 * @param hostId - The ID of the user inviting (must be match host)
 * @returns Result with invited, already in match, and failed player IDs
 * @throws Error if match not found, cancelled, or caller is not the host
 */
export async function invitePlayersToMatch(
  matchId: string,
  playerIds: string[],
  hostId: string
): Promise<InvitePlayersResult> {
  if (playerIds.length === 0) {
    return { invited: [], alreadyInMatch: [], failed: [] };
  }

  // Verify match exists, is not cancelled, and caller is host
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
      sport:sport_id (
        id,
        name,
        display_name
      ),
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

  if (match.cancelled_at) {
    throw new Error('Cannot invite players to a cancelled match');
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
    throw new Error('Cannot invite players to a completed match');
  }

  // Verify caller is the host
  if (match.created_by !== hostId) {
    throw new Error('Only the match host can invite players');
  }

  // Get host's name for notifications
  const { data: hostProfile } = await supabase
    .from('profile')
    .select('first_name, last_name, display_name')
    .eq('id', hostId)
    .single();

  const inviterName =
    hostProfile?.display_name ||
    (hostProfile?.first_name && hostProfile?.last_name
      ? `${hostProfile.first_name} ${hostProfile.last_name}`
      : hostProfile?.first_name) ||
    'A player';
  // Supabase returns relations as arrays when using select, handle both array and single object
  const sportData = match.sport;
  const sport = Array.isArray(sportData) ? sportData[0] : sportData;
  const sportName = sport?.display_name || sport?.name || 'a match';

  // Build a map of existing participants with their status
  const existingParticipants = new Map<string, { id: string; status: string }>();
  for (const p of match.participants ?? []) {
    existingParticipants.set(p.player_id, { id: p.id, status: p.status ?? '' });
  }

  // Statuses that cannot be re-invited (active participation states)
  const activeStatuses = ['pending', 'requested', 'joined', 'waitlisted', 'kicked'];
  // Statuses that CAN be re-invited (player declined, left, etc.)
  const reinvitableStatuses = ['declined', 'left', 'refused', 'cancelled'];

  const alreadyInMatch: string[] = [];
  const toReinvite: Array<{ participantId: string; playerId: string }> = [];
  const toInvite: string[] = [];

  for (const playerId of playerIds) {
    const existing = existingParticipants.get(playerId);
    if (existing) {
      if (activeStatuses.includes(existing.status)) {
        // Player has an active status - cannot re-invite
        alreadyInMatch.push(playerId);
      } else if (reinvitableStatuses.includes(existing.status)) {
        // Player has a re-invitable status - update their record
        toReinvite.push({ participantId: existing.id, playerId });
      } else {
        // Unknown status - treat as already in match for safety
        alreadyInMatch.push(playerId);
      }
    } else {
      // No existing record - create new invitation
      toInvite.push(playerId);
    }
  }

  if (toInvite.length === 0 && toReinvite.length === 0) {
    return { invited: [], alreadyInMatch, failed: [] };
  }

  const invited: MatchParticipant[] = [];
  const failed: string[] = [];

  // Update existing records for re-invitable players
  for (const { participantId, playerId } of toReinvite) {
    const { data: updatedParticipant, error: updateError } = await supabase
      .from('match_participant')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', participantId)
      .select()
      .single();

    if (updateError) {
      console.error('[invitePlayersToMatch] Update error for re-invite:', updateError);
      failed.push(playerId);
    } else if (updatedParticipant) {
      invited.push(updatedParticipant as MatchParticipant);
    }
  }

  // Create new participant records for players without existing records
  if (toInvite.length > 0) {
    const participantsToInsert = toInvite.map(playerId => ({
      match_id: matchId,
      player_id: playerId,
      status: 'pending' as const,
      is_host: false,
    }));

    const { data: insertedParticipants, error: insertError } = await supabase
      .from('match_participant')
      .insert(participantsToInsert)
      .select();

    if (insertError) {
      console.error('[invitePlayersToMatch] Insert error:', insertError);
      // Add all toInvite players to failed
      failed.push(...toInvite);
    } else {
      const insertedList = (insertedParticipants ?? []) as MatchParticipant[];
      invited.push(...insertedList);
      // Check if any inserts failed
      const insertedPlayerIds = new Set(insertedList.map(p => p.player_id));
      for (const playerId of toInvite) {
        if (!insertedPlayerIds.has(playerId)) {
          failed.push(playerId);
        }
      }
    }
  }

  // Send notifications to all invited players (fire and forget)
  for (const participant of invited) {
    notifyMatchInvitation(
      participant.player_id,
      matchId,
      inviterName,
      sportName,
      match.match_date
    ).catch(err => {
      console.error('[invitePlayersToMatch] Notification error:', err);
    });
  }

  return { invited, alreadyInMatch, failed };
}

// =============================================================================
// REPUTATION EVENTS
// =============================================================================

/**
 * Result of awarding match completion reputation
 */
export interface AwardMatchCompletionResult {
  /** Player IDs that received reputation events */
  awarded: string[];
  /** Player IDs that already had reputation events for this match */
  skipped: string[];
  /** Player IDs that had errors */
  failed: string[];
}

/**
 * Award match completion reputation events to all participants.
 * This should be called when a match is confirmed as completed (either via UI
 * confirmation or by a scheduled job after match end time).
 *
 * Awards:
 * - 'match_completed' to all participants
 * - 'first_match_bonus' if it's the player's first match
 * - 'match_repeat_opponent' if players have played together before
 *
 * @param matchId - The match ID
 * @returns Result with awarded, skipped, and failed player IDs
 */
export async function awardMatchCompletionReputation(
  matchId: string
): Promise<AwardMatchCompletionResult> {
  // Fetch match with participants
  const { data: match, error: matchError } = await supabase
    .from('match')
    .select(
      `
      id,
      created_by,
      cancelled_at,
      participants:match_participant (
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

  // Only award for non-cancelled matches
  if (match.cancelled_at) {
    return { awarded: [], skipped: [], failed: [] };
  }

  // Get all players who participated (joined participants, which now includes the creator)
  const participantPlayerIds = (match.participants ?? [])
    .filter((p: { status: string }) => p.status === 'joined')
    .map((p: { player_id: string }) => p.player_id);

  // Creator is now included as a joined participant with is_host=true
  const uniquePlayerIds = [...new Set(participantPlayerIds)];

  if (uniquePlayerIds.length === 0) {
    return { awarded: [], skipped: [], failed: [] };
  }

  // Check if reputation events already exist for this match (avoid duplicates)
  const { data: existingEvents } = await supabase
    .from('reputation_event')
    .select('player_id')
    .eq('match_id', matchId)
    .eq('event_type', 'match_completed');

  const playersWithEvents = new Set(
    (existingEvents ?? []).map((e: { player_id: string }) => e.player_id)
  );

  const skipped = uniquePlayerIds.filter(id => playersWithEvents.has(id));
  const toAward = uniquePlayerIds.filter(id => !playersWithEvents.has(id));

  if (toAward.length === 0) {
    return { awarded: [], skipped, failed: [] };
  }

  const awarded: string[] = [];
  const failed: string[] = [];

  // Prepare events for each player
  for (const playerId of toAward) {
    try {
      const eventsToCreate: Array<{
        playerId: string;
        eventType: 'match_completed' | 'first_match_bonus' | 'match_repeat_opponent';
        options?: { matchId?: string; causedByPlayerId?: string };
      }> = [
        {
          playerId,
          eventType: 'match_completed',
          options: { matchId },
        },
      ];

      // Check if this is the player's first match completion
      const { data: existingCompletions } = await supabase
        .from('reputation_event')
        .select('id')
        .eq('player_id', playerId)
        .eq('event_type', 'match_completed')
        .limit(1);

      if (!existingCompletions || existingCompletions.length === 0) {
        eventsToCreate.push({
          playerId,
          eventType: 'first_match_bonus',
          options: { matchId },
        });
      }

      // Check for repeat opponents
      const otherPlayerIds = uniquePlayerIds.filter(id => id !== playerId);
      for (const opponentId of otherPlayerIds) {
        const hasPlayedBefore = await havePlayedTogether(playerId, opponentId, matchId);
        if (hasPlayedBefore) {
          eventsToCreate.push({
            playerId,
            eventType: 'match_repeat_opponent',
            options: { matchId, causedByPlayerId: opponentId },
          });
          // Only award once per match (not per opponent)
          break;
        }
      }

      // Create all events for this player
      await createReputationEvents(eventsToCreate);
      awarded.push(playerId);
    } catch (err) {
      console.error(`[awardMatchCompletionReputation] Failed for player ${playerId}:`, err);
      failed.push(playerId);
    }
  }

  return { awarded, skipped, failed };
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
  // Invitations
  invitePlayersToMatch,
  // Reputation
  awardMatchCompletionReputation,
};

export default matchService;
