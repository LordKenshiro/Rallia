/**
 * usePlayerSearch Hook
 * Custom hook for searching players in a specific sport with TanStack Query.
 * Provides infinite scrolling and debounced search.
 */

import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { searchPlayersForSport } from '@rallia/shared-services';
import type { PlayersPage, PlayerSearchResult } from '@rallia/shared-services';
import { useDebounce } from './useDebounce';

// Query keys for cache management
export const playerKeys = {
  all: ['players'] as const,
  search: () => [...playerKeys.all, 'search'] as const,
  searchWithParams: (sportId: string, currentUserId: string, query: string) =>
    [...playerKeys.search(), sportId, currentUserId, query] as const,
};

interface UsePlayerSearchOptions {
  /** Sport ID to filter players by (required) */
  sportId: string | undefined;
  /** Current user ID to exclude from results */
  currentUserId: string | undefined;
  /** Search query string */
  searchQuery: string;
  /** Player IDs to exclude (e.g., already invited) */
  excludePlayerIds?: string[];
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Enable/disable the query */
  enabled?: boolean;
}

interface UsePlayerSearchReturn {
  /** Flattened array of all players from all pages */
  players: PlayerSearchResult[];
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether any fetch is in progress */
  isFetching: boolean;
  /** Whether we're fetching the next page */
  isFetchingNextPage: boolean;
  /** Whether there are more pages to load */
  hasNextPage: boolean;
  /** Error if any */
  error: Error | null;
  /** Function to fetch the next page */
  fetchNextPage: () => void;
  /** Function to refetch all data */
  refetch: () => void;
}

/**
 * Hook for searching players in a specific sport with infinite scrolling.
 * Only returns players who are active in the specified sport.
 * Includes sport-specific ratings for each player.
 *
 * @example
 * ```tsx
 * const {
 *   players,
 *   isLoading,
 *   hasNextPage,
 *   fetchNextPage,
 * } = usePlayerSearch({
 *   sportId: 'tennis-id',
 *   currentUserId: session.user.id,
 *   searchQuery: 'John',
 * });
 * ```
 */
export function usePlayerSearch(options: UsePlayerSearchOptions): UsePlayerSearchReturn {
  const {
    sportId,
    currentUserId,
    searchQuery,
    excludePlayerIds = [],
    debounceMs = 300,
    enabled = true,
  } = options;

  // Debounce the search query
  const debouncedQuery = useDebounce(searchQuery, debounceMs);

  // Check if we have all required params
  const hasRequiredParams = !!sportId && !!currentUserId;

  const query = useInfiniteQuery<PlayersPage, Error>({
    queryKey: playerKeys.searchWithParams(sportId ?? '', currentUserId ?? '', debouncedQuery),
    queryFn: async ({ pageParam }) => {
      if (!sportId || !currentUserId) {
        return { players: [], hasMore: false, nextOffset: null };
      }

      return searchPlayersForSport({
        sportId,
        currentUserId,
        searchQuery: debouncedQuery || undefined,
        offset: (pageParam as number) ?? 0,
        excludePlayerIds,
      });
    },
    getNextPageParam: lastPage => lastPage.nextOffset,
    initialPageParam: 0,
    enabled: enabled && hasRequiredParams,
    staleTime: 1000 * 60 * 2, // 2 minutes - players don't change often
    refetchOnWindowFocus: false,
  });

  // Flatten pages into a single array of players
  const allPlayers = useMemo(
    () => query.data?.pages.flatMap(page => page.players) ?? [],
    [query.data?.pages]
  );

  return {
    players: allPlayers,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}

export type { PlayerSearchResult };
export default usePlayerSearch;
