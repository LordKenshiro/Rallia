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
  Profile,
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
  playerExpectation?: 'practice' | 'competitive' | 'both';
  duration?: '30' | '60' | '90' | '120' | 'custom';
  customDurationMinutes?: number;

  // Location
  locationType?: 'facility' | 'custom' | 'tbd';
  facilityId?: string;
  courtId?: string;
  locationName?: string;
  locationAddress?: string;

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
  // Map playerExpectation to match_type enum values
  const matchTypeMap: Record<string, 'casual' | 'competitive' | 'both'> = {
    practice: 'casual',
    competitive: 'competitive',
    both: 'both',
  };

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
    match_type: matchTypeMap[input.playerExpectation ?? 'both'] ?? 'both',
    format: input.format ?? 'singles',
    player_expectation: input.playerExpectation ?? 'both',
    duration: input.duration ?? '60',
    custom_duration_minutes: input.customDurationMinutes,
    location_type: input.locationType ?? 'tbd',
    facility_id: emptyToUndefined(input.facilityId),
    court_id: emptyToUndefined(input.courtId),
    location_name: emptyToUndefined(input.locationName),
    location_address: emptyToUndefined(input.locationAddress),
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
    status: 'scheduled',
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
      if (p.player?.id) {
        playerIds.add(p.player.id);
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

  // Attach profiles to players
  if (data.created_by_player?.id && profilesMap[data.created_by_player.id]) {
    data.created_by_player.profile = profilesMap[data.created_by_player.id];
  }

  if (data.participants) {
    data.participants = data.participants.map((p: MatchParticipantWithPlayer) => {
      if (p.player?.id && profilesMap[p.player.id]) {
        p.player.profile = profilesMap[p.player.id];
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
    status?: string;
    visibility?: 'public' | 'private';
    matchDateFrom?: string;
    matchDateTo?: string;
  } = {}
) {
  const {
    limit = 50,
    offset = 0,
    status,
    visibility = 'public',
    matchDateFrom,
    matchDateTo,
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

  if (status) {
    query = query.eq('status', status);
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
        if (p.player?.id) {
          playerIds.add(p.player.id);
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
        if (p.player?.id && profilesMap[p.player.id]) {
          p.player.profile = profilesMap[p.player.id];
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
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<Match[]> {
  const { status, limit = 20, offset = 0 } = options;

  let query = supabase
    .from('match')
    .select('*')
    .eq('created_by', userId)
    .order('match_date', { ascending: true })
    .order('start_time', { ascending: true })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
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
  // Map input to database fields
  const updateData: Record<string, unknown> = {};

  if (updates.matchDate !== undefined) updateData.match_date = updates.matchDate;
  if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
  if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
  if (updates.format !== undefined) {
    updateData.format = updates.format;
    updateData.match_type = updates.format === 'doubles' ? 'doubles' : 'singles';
  }
  if (updates.playerExpectation !== undefined)
    updateData.player_expectation = updates.playerExpectation;
  if (updates.duration !== undefined) updateData.duration = updates.duration;
  if (updates.customDurationMinutes !== undefined)
    updateData.custom_duration_minutes = updates.customDurationMinutes;
  if (updates.locationType !== undefined) updateData.location_type = updates.locationType;
  if (updates.facilityId !== undefined) updateData.facility_id = updates.facilityId;
  if (updates.courtId !== undefined) updateData.court_id = updates.courtId;
  if (updates.locationName !== undefined) updateData.location_name = updates.locationName;
  if (updates.locationAddress !== undefined) updateData.location_address = updates.locationAddress;
  if (updates.courtStatus !== undefined) updateData.court_status = updates.courtStatus;
  if (updates.isCourtFree !== undefined) updateData.is_court_free = updates.isCourtFree;
  if (updates.costSplitType !== undefined) updateData.cost_split_type = updates.costSplitType;
  if (updates.estimatedCost !== undefined) updateData.estimated_cost = updates.estimatedCost;
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
 * Cancel a match
 */
export async function cancelMatch(matchId: string): Promise<Match> {
  const { data, error } = await supabase
    .from('match')
    .update({ status: 'cancelled' })
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

/**
 * Parameters for searching nearby matches
 */
export interface SearchNearbyMatchesParams {
  latitude: number;
  longitude: number;
  maxDistanceKm: number;
  sportId: string;
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
  const { latitude, longitude, maxDistanceKm, sportId, limit = 20, offset = 0 } = params;

  // Step 1: Get match IDs within distance using RPC
  const { data: nearbyResults, error: rpcError } = await supabase.rpc('search_matches_nearby', {
    p_latitude: latitude,
    p_longitude: longitude,
    p_max_distance_km: maxDistanceKm,
    p_sport_id: sportId,
    p_limit: limit + 1, // Fetch one extra to check if more exist
    p_offset: offset,
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
        if (p.player?.id) {
          playerIds.add(p.player.id);
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

  // Step 4: Attach profiles and distance to matches, maintain order from RPC
  const matchMap = new Map<string, MatchWithDetailsAndDistance>();
  matchesData.forEach((match: MatchWithDetails) => {
    // Attach profile to creator
    if (match.created_by_player?.id && profilesMap[match.created_by_player.id]) {
      match.created_by_player.profile = profilesMap[match.created_by_player.id];
    }

    // Attach profiles to participants
    if (match.participants) {
      match.participants = match.participants.map((p: MatchParticipantWithPlayer) => {
        if (p.player?.id && profilesMap[p.player.id]) {
          p.player.profile = profilesMap[p.player.id];
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
  limit?: number;
  offset?: number;
}

/**
 * Get matches where the user is either the creator or a confirmed participant.
 * Supports filtering by upcoming/past and pagination.
 * Returns full match details with profiles.
 */
export async function getPlayerMatchesWithDetails(params: GetPlayerMatchesParams) {
  const { userId, timeFilter, limit = 20, offset = 0 } = params;

  // Get today's date in YYYY-MM-DD format for comparison
  const today = new Date().toISOString().split('T')[0];

  // First, get match IDs where user is a participant (any status - confirmed, pending, etc.)
  const { data: participantMatches, error: participantError } = await supabase
    .from('match_participant')
    .select('match_id')
    .eq('player_id', userId);

  if (participantError) {
    throw new Error(`Failed to get participant matches: ${participantError.message}`);
  }

  const participantMatchIds = (participantMatches ?? []).map(p => p.match_id);

  // Build the query for matches
  // Important: Apply filters BEFORE ordering and range for correct results
  const isUpcoming = timeFilter === 'upcoming';

  // Start with base select
  let query = supabase.from('match').select(
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
  );

  // Apply date filter first
  if (isUpcoming) {
    query = query.gte('match_date', today);
  } else {
    query = query.lt('match_date', today);
  }

  // Filter by user being creator OR participant
  if (participantMatchIds.length > 0) {
    query = query.or(`created_by.eq.${userId},id.in.(${participantMatchIds.join(',')})`);
  } else {
    query = query.eq('created_by', userId);
  }

  // Apply ordering and pagination last
  query = query
    .order('match_date', { ascending: isUpcoming })
    .order('start_time', { ascending: isUpcoming })
    .range(offset, offset + limit);

  const { data, error } = await query;

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

  const hasMore = data.length > limit;
  const matchesData = hasMore ? data.slice(0, limit) : data;

  // Fetch profiles for all players (creator + participants)
  const playerIds = new Set<string>();
  matchesData.forEach((match: MatchWithDetails) => {
    if (match.created_by_player?.id) {
      playerIds.add(match.created_by_player.id);
    }
    if (match.participants) {
      match.participants.forEach((p: MatchParticipantWithPlayer) => {
        if (p.player?.id) {
          playerIds.add(p.player.id);
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
  const enrichedData = matchesData.map((match: MatchWithDetails) => {
    // Attach profile to creator
    if (match.created_by_player?.id && profilesMap[match.created_by_player.id]) {
      match.created_by_player.profile = profilesMap[match.created_by_player.id];
    }

    // Attach profiles to participants
    if (match.participants) {
      match.participants = match.participants.map((p: MatchParticipantWithPlayer) => {
        if (p.player?.id && profilesMap[p.player.id]) {
          p.player.profile = profilesMap[p.player.id];
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
 * Match service object for grouped exports
 */
export const matchService = {
  createMatch,
  getMatch,
  getMatchWithDetails,
  getMatchesByCreator,
  getPlayerMatchesWithDetails,
  getNearbyMatches,
  updateMatch,
  cancelMatch,
  deleteMatch,
};

export default matchService;
