/**
 * Match Service
 * Handles all match-related database operations using Supabase.
 */

import { supabase } from '../supabase';
import type { Match, TablesInsert } from '@rallia/shared-types';

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
      created_by_player:created_by (
        id,
        profile:profile_id (
          id,
          display_name,
          avatar_url
        )
      ),
      participants:match_participant (
        *,
        player:player_id (
          id,
          profile:profile_id (
            id,
            display_name,
            avatar_url
          )
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

  return data;
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
 * Match service object for grouped exports
 */
export const matchService = {
  createMatch,
  getMatch,
  getMatchWithDetails,
  getMatchesByCreator,
  updateMatch,
  cancelMatch,
  deleteMatch,
};

export default matchService;
