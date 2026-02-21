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
 * Filter types for player search
 */
export type GenderFilter = 'all' | 'male' | 'female' | 'other';
export type AvailabilityFilter = 'all' | 'morning' | 'afternoon' | 'evening';
export type DayFilter = 'all' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type PlayStyleFilter = 'all' | 'counterpuncher' | 'aggressive_baseliner' | 'serve_and_volley' | 'all_court';
export type SkillLevelFilter = 'all' | string; // '1.0', '1.5', etc.
export type DistanceFilter = 'all' | number; // 5, 10, 15, etc.

export interface PlayerFilters {
  favorites?: boolean;
  blocked?: boolean;
  gender?: GenderFilter;
  skillLevel?: SkillLevelFilter;
  maxDistance?: DistanceFilter;
  availability?: AvailabilityFilter;
  day?: DayFilter;
  playStyle?: PlayStyleFilter;
}

/**
 * Player search result with profile and sport-specific rating
 */
export interface PlayerSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  profile_picture_url: string | null;
  city: string | null;
  /** Player's gender */
  gender: string | null;
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
  /** Filters to apply */
  filters?: PlayerFilters;
  /** Favorite player IDs (to filter by favorites) */
  favoritePlayerIds?: string[];
  /** Blocked player IDs (to filter by blocked or exclude blocked) */
  blockedPlayerIds?: string[];
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
    filters = {},
    favoritePlayerIds = [],
    blockedPlayerIds = [],
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

  // Filter by favorites if enabled
  if (filters.favorites && favoritePlayerIds.length > 0) {
    playerIds = playerIds.filter(id => favoritePlayerIds.includes(id));
  } else if (filters.favorites && favoritePlayerIds.length === 0) {
    // No favorites, return empty
    return { players: [], hasMore: false, nextOffset: null };
  }

  // Handle blocked players:
  // - If blocked filter is ON: show only blocked players
  // - If blocked filter is OFF: exclude blocked players from results (default behavior)
  if (filters.blocked && blockedPlayerIds.length > 0) {
    // Show only blocked players
    playerIds = playerIds.filter(id => blockedPlayerIds.includes(id));
  } else if (filters.blocked && blockedPlayerIds.length === 0) {
    // No blocked players, return empty
    return { players: [], hasMore: false, nextOffset: null };
  } else if (!filters.blocked && blockedPlayerIds.length > 0) {
    // Exclude blocked players from results (default behavior)
    playerIds = playerIds.filter(id => !blockedPlayerIds.includes(id));
  }

  if (playerIds.length === 0) {
    return { players: [], hasMore: false, nextOffset: null };
  }

  // Step 2: Apply gender filter by fetching player data
  // Filter by gender if specified (gender is on player table)
  if (filters.gender && filters.gender !== 'all') {
    const { data: genderFilteredPlayers, error: genderError } = await supabase
      .from('player')
      .select('id')
      .in('id', playerIds)
      .eq('gender', filters.gender);

    if (genderError) {
      console.error('[searchPlayersForSport] Error filtering by gender:', genderError);
    } else if (genderFilteredPlayers) {
      playerIds = genderFilteredPlayers.map(p => p.id);
    }

    if (playerIds.length === 0) {
      return { players: [], hasMore: false, nextOffset: null };
    }
  }

  // Step 3: Apply distance filter if specified
  // Filter players whose max_travel_distance is >= the selected distance
  if (filters.maxDistance && filters.maxDistance !== 'all') {
    const distanceValue = typeof filters.maxDistance === 'number' ? filters.maxDistance : parseInt(String(filters.maxDistance), 10);
    
    if (!isNaN(distanceValue)) {
      const { data: distanceFilteredPlayers, error: distanceError } = await supabase
        .from('player')
        .select('id')
        .in('id', playerIds)
        .gte('max_travel_distance', distanceValue);

      if (distanceError) {
        console.error('[searchPlayersForSport] Error filtering by distance:', distanceError);
      } else if (distanceFilteredPlayers) {
        playerIds = distanceFilteredPlayers.map(p => p.id);
      }

      if (playerIds.length === 0) {
        return { players: [], hasMore: false, nextOffset: null };
      }
    }
  }

  // Step 4: Apply availability filter if specified
  if (filters.availability && filters.availability !== 'all') {
    const { data: availabilityPlayers, error: availError } = await supabase
      .from('player_availability')
      .select('player_id')
      .in('player_id', playerIds)
      .eq('period', filters.availability)
      .or('is_active.is.null,is_active.eq.true');

    if (availError) {
      console.error('[searchPlayersForSport] Error filtering by availability:', availError);
    } else if (availabilityPlayers) {
      const availablePlayerIds = [...new Set(availabilityPlayers.map(p => p.player_id))];
      playerIds = playerIds.filter(id => availablePlayerIds.includes(id));
    }

    if (playerIds.length === 0) {
      return { players: [], hasMore: false, nextOffset: null };
    }
  }

  // Step 4b: Apply day filter if specified
  if (filters.day && filters.day !== 'all') {
    const { data: dayFilteredPlayers, error: dayError } = await supabase
      .from('player_availability')
      .select('player_id')
      .in('player_id', playerIds)
      .eq('day', filters.day)
      .or('is_active.is.null,is_active.eq.true');

    if (dayError) {
      console.error('[searchPlayersForSport] Error filtering by day:', dayError);
    } else if (dayFilteredPlayers) {
      const dayPlayerIds = [...new Set(dayFilteredPlayers.map(p => p.player_id))];
      playerIds = playerIds.filter(id => dayPlayerIds.includes(id));
    }

    if (playerIds.length === 0) {
      return { players: [], hasMore: false, nextOffset: null };
    }
  }

  // Step 5: Apply play style filter if specified
  if (filters.playStyle && filters.playStyle !== 'all') {
    // First get play_style_id for the given play style name
    const { data: playStyleData, error: playStyleError } = await supabase
      .from('play_style')
      .select('id')
      .eq('sport_id', sportId)
      .ilike('name', filters.playStyle.replace(/_/g, ' ')); // Convert snake_case to space separated

    if (playStyleError) {
      console.error('[searchPlayersForSport] Error fetching play style:', playStyleError);
    } else if (playStyleData && playStyleData.length > 0) {
      const playStyleIds = playStyleData.map(ps => ps.id);
      
      const { data: styledPlayers, error: styledError } = await supabase
        .from('player_sport_profile')
        .select('player_id')
        .in('player_id', playerIds)
        .eq('sport_id', sportId)
        .in('play_style_id', playStyleIds);

      if (styledError) {
        console.error('[searchPlayersForSport] Error filtering by play style:', styledError);
      } else if (styledPlayers) {
        const styledPlayerIds = styledPlayers.map(p => p.player_id);
        playerIds = playerIds.filter(id => styledPlayerIds.includes(id));
      }
    }

    if (playerIds.length === 0) {
      return { players: [], hasMore: false, nextOffset: null };
    }
  }

  // Step 6: Apply skill level filter - we need to fetch ratings first
  let ratingsMap: Record<string, { label: string; value: number | null }> = {};
  let skillFilteredPlayerIds = playerIds;

  // Always fetch ratings (we need them for the result anyway)
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
    .in('player_id', playerIds);

  if (ratingsError) {
    console.error('[searchPlayersForSport] Error fetching ratings:', ratingsError);
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

  // Apply skill level filter if specified
  if (filters.skillLevel && filters.skillLevel !== 'all') {
    const targetLevel = parseFloat(filters.skillLevel);
    if (!isNaN(targetLevel)) {
      // Filter to players with rating >= target level
      skillFilteredPlayerIds = playerIds.filter(id => {
        const rating = ratingsMap[id];
        return rating && rating.value !== null && rating.value >= targetLevel;
      });
      playerIds = skillFilteredPlayerIds;
    }
  }

  if (playerIds.length === 0) {
    return { players: [], hasMore: false, nextOffset: null };
  }

  // Step 7: Fetch profiles with search filter
  // Note: city is now on player table, not profile table
  let profileQuery = supabase
    .from('profile')
    .select('id, first_name, last_name, display_name, profile_picture_url')
    .in('id', playerIds)
    .or('is_active.is.null,is_active.eq.true') // Include null (default) or true
    .order('first_name', { ascending: true })
    .range(offset, offset + limit); // Fetch one extra to check if more exist

  // Apply search filter if provided (searches name only - city search handled separately via player table)
  if (searchQuery && searchQuery.trim().length > 0) {
    const searchTerm = `%${searchQuery.trim()}%`;
    profileQuery = profileQuery.or(
      `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},display_name.ilike.${searchTerm}`
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

  // Fetch gender and city data from player table (city was moved from profile to player)
  const genderMap: Record<string, string | null> = {};
  const cityMap: Record<string, string | null> = {};
  const { data: playerData, error: playerError } = await supabase
    .from('player')
    .select('id, gender, city')
    .in('id', profileIdsToFetch);

  if (!playerError && playerData) {
    playerData.forEach(p => {
      genderMap[p.id] = p.gender;
      cityMap[p.id] = p.city;
    });
  }

  // Step 8: Combine profiles with ratings, gender and city
  const players: PlayerSearchResult[] = resultsToReturn.map(profile => ({
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    display_name: profile.display_name,
    profile_picture_url: profile.profile_picture_url,
    city: cityMap[profile.id] ?? null,
    gender: genderMap[profile.id] ?? null,
    rating: ratingsMap[profile.id] ?? null,
  }));

  return {
    players,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  };
}
