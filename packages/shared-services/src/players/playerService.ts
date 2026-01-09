/**
 * Player Service
 * Handles player search and related operations.
 */

import { supabase } from '../supabase';
import type { Profile } from '@rallia/shared-types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Player search result with profile and sport-specific rating
 */
export interface PlayerSearchResult {
  id: string;
  full_name: string;
  display_name: string | null;
  profile_picture_url: string | null;
  city: string | null;
  /** Sport-specific rating (null if player has no rating for this sport) */
  rating: {
    label: string;
    value: number | null;
  } | null;
}

/**
 * Paginated response for player search
 */
export interface PlayersPage {
  players: PlayerSearchResult[];
  hasMore: boolean;
  nextOffset: number | null;
}

/**
 * Parameters for searching players
 */
export interface SearchPlayersParams {
  /** Sport ID to filter players by (required - only shows active players in this sport) */
  sportId: string;
  /** Current user ID to exclude from results */
  currentUserId: string;
  /** Search query for name matching */
  searchQuery?: string;
  /** Pagination offset */
  offset?: number;
  /** Number of results per page */
  limit?: number;
  /** Player IDs to exclude (e.g., already invited players) */
  excludePlayerIds?: string[];
}

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Search for players active in a specific sport.
 * Returns players with their profile info and sport-specific rating.
 *
 * @param params - Search parameters
 * @returns Paginated list of players matching the criteria
 */
export async function searchPlayersForSport(params: SearchPlayersParams): Promise<PlayersPage> {
  const {
    sportId,
    currentUserId,
    searchQuery,
    offset = 0,
    limit = 20,
    excludePlayerIds = [],
  } = params;

  // Step 1: Get player IDs that are active in this sport
  // Using player_sport table which links players to their sports
  const sportQuery = supabase
    .from('player_sport')
    .select('player_id')
    .eq('sport_id', sportId)
    .neq('player_id', currentUserId)
    .or('is_active.is.null,is_active.eq.true'); // Include null (default) or true

  const { data: playerSports, error: sportError } = await sportQuery;

  if (sportError) {
    throw new Error(`Failed to fetch player sports: ${sportError.message}`);
  }

  if (!playerSports || playerSports.length === 0) {
    return { players: [], hasMore: false, nextOffset: null };
  }

  // Get unique player IDs from player_sport records
  let playerIds = playerSports.map(ps => ps.player_id);

  // Filter out excluded players
  if (excludePlayerIds.length > 0) {
    playerIds = playerIds.filter(id => !excludePlayerIds.includes(id));
  }

  if (playerIds.length === 0) {
    return { players: [], hasMore: false, nextOffset: null };
  }

  // Step 2: Fetch profiles with search filter
  // Note: is_active can be null (defaults to active) or true
  let profileQuery = supabase
    .from('profile')
    .select('id, full_name, display_name, profile_picture_url, city')
    .in('id', playerIds)
    .or('is_active.is.null,is_active.eq.true') // Include null (default) or true
    .order('full_name', { ascending: true })
    .range(offset, offset + limit); // Fetch one extra to check if more exist

  // Apply search filter if provided
  if (searchQuery && searchQuery.trim().length > 0) {
    const searchTerm = `%${searchQuery.trim()}%`;
    profileQuery = profileQuery.or(
      `full_name.ilike.${searchTerm},display_name.ilike.${searchTerm}`
    );
  }

  const { data: profiles, error: profileError } = await profileQuery;

  if (profileError) {
    throw new Error(`Failed to fetch profiles: ${profileError.message}`);
  }

  if (!profiles || profiles.length === 0) {
    return { players: [], hasMore: false, nextOffset: null };
  }

  // Check if there are more results
  const hasMore = profiles.length > limit;
  const resultsToReturn = hasMore ? profiles.slice(0, limit) : profiles;
  const profileIdsToFetch = resultsToReturn.map(p => p.id);

  // Step 3: Fetch ratings for these players for the specific sport
  const ratingsMap: Record<string, { label: string; value: number | null }> = {};

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
    .in('player_id', profileIdsToFetch);

  if (ratingsError) {
    console.error('[searchPlayersForSport] Error fetching ratings:', ratingsError);
    // Continue without ratings - not a fatal error
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
      // Only include ratings for the requested sport
      if (ratingSystem?.sport_id === sportId && ratingScore?.label) {
        ratingsMap[rating.player_id] = {
          label: ratingScore.label,
          value: ratingScore.value,
        };
      }
    });
  }

  // Step 4: Combine profiles with ratings
  const players: PlayerSearchResult[] = resultsToReturn.map(profile => ({
    id: profile.id,
    full_name: profile.full_name,
    display_name: profile.display_name,
    profile_picture_url: profile.profile_picture_url,
    city: profile.city,
    rating: ratingsMap[profile.id] ?? null,
  }));

  return {
    players,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  };
}
