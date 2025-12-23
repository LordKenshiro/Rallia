/**
 * useMatches Hook
 * Custom hook for fetching matches with TanStack Query.
 * Provides infinite scrolling, pull-to-refresh, and loading states.
 */

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMatchesWithDetails, getMatchWithDetails } from '@rallia/shared-services';
import type { MatchWithDetails } from '@rallia/shared-types';
import { matchKeys } from './useCreateMatch';
import { useCallback, useMemo } from 'react';

// Re-export matchKeys for convenience
export { matchKeys };

/** Default page size for infinite queries */
const DEFAULT_PAGE_SIZE = 20;

/**
 * Filter options for match queries
 */
export interface MatchFilters {
  /** Filter by match status */
  status?: string;
  /** Filter by visibility */
  visibility?: 'public' | 'private';
  /** Filter matches from this date onwards (ISO date string) */
  matchDateFrom?: string;
  /** Filter matches up to this date (ISO date string) */
  matchDateTo?: string;
  /** Maximum number of matches to fetch per page */
  limit?: number;
}

/**
 * Page structure for infinite queries
 */
interface MatchesPage {
  matches: MatchWithDetails[];
  nextOffset: number | null;
  hasMore: boolean;
}

/**
 * Options for the useMatches hook
 */
interface UseMatchesOptions extends MatchFilters {
  /** Enable/disable the query */
  enabled?: boolean;
}

/**
 * Hook for fetching a list of matches with infinite scrolling support
 *
 * @example
 * ```tsx
 * const {
 *   matches,
 *   isLoading,
 *   isFetchingNextPage,
 *   hasNextPage,
 *   fetchNextPage,
 *   refetch,
 *   isRefetching,
 * } = useMatches({
 *   visibility: 'public',
 *   limit: 20,
 * });
 *
 * return (
 *   <FlatList
 *     data={matches}
 *     renderItem={({ item }) => <MatchCard match={item} />}
 *     onEndReached={() => hasNextPage && fetchNextPage()}
 *     refreshing={isRefetching}
 *     onRefresh={refetch}
 *   />
 * );
 * ```
 */
export function useMatches(options: UseMatchesOptions = {}) {
  const { enabled = true, limit = DEFAULT_PAGE_SIZE, ...filters } = options;

  const query = useInfiniteQuery<MatchesPage, Error>({
    queryKey: matchKeys.list('discovery', { ...filters, limit }),
    queryFn: async ({ pageParam = 0 }) => {
      const offset = pageParam as number;
      const fetchedMatches = await getMatchesWithDetails({
        ...filters,
        limit,
        offset,
      });
      const matches = fetchedMatches as MatchWithDetails[];

      return {
        matches,
        nextOffset: matches.length === limit ? offset + limit : null,
        hasMore: matches.length === limit,
      };
    },
    getNextPageParam: lastPage => lastPage.nextOffset,
    initialPageParam: 0,
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Flatten all pages into a single array of matches
  const matches = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap(page => page.matches);
  }, [query.data?.pages]);

  // Stable refetch callback for pull-to-refresh
  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    /**
     * The flattened list of all matches across pages
     */
    matches,

    /**
     * Whether the initial load is in progress
     */
    isLoading: query.isLoading,

    /**
     * Whether any fetch is in progress (initial or refetch)
     */
    isFetching: query.isFetching,

    /**
     * Whether a refetch (pull-to-refresh) is in progress
     */
    isRefetching: query.isRefetching,

    /**
     * Whether fetching the next page
     */
    isFetchingNextPage: query.isFetchingNextPage,

    /**
     * Whether there are more pages to fetch
     */
    hasNextPage: query.hasNextPage ?? false,

    /**
     * Fetch the next page of matches
     */
    fetchNextPage: query.fetchNextPage,

    /**
     * Whether the query was successful
     */
    isSuccess: query.isSuccess,

    /**
     * Whether the query failed
     */
    isError: query.isError,

    /**
     * The error if query failed
     */
    error: query.error,

    /**
     * Refetch all pages (for pull-to-refresh)
     */
    refetch: refresh,
  };
}

/**
 * Options for the useMatch hook
 */
interface UseMatchOptions {
  /** Enable/disable the query */
  enabled?: boolean;
}

/**
 * Hook for fetching a single match with full details
 *
 * @example
 * ```tsx
 * const { match, isLoading, error } = useMatch(matchId);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 * if (!match) return <NotFound />;
 *
 * return <MatchDetails match={match} />;
 * ```
 */
export function useMatch(matchId: string | undefined, options: UseMatchOptions = {}) {
  const { enabled = true } = options;

  const query = useQuery<MatchWithDetails | null, Error>({
    queryKey: matchKeys.detail(matchId ?? ''),
    queryFn: async () => {
      if (!matchId) return null;
      const match = await getMatchWithDetails(matchId);
      return match as MatchWithDetails | null;
    },
    enabled: enabled && !!matchId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return {
    /**
     * The match data
     */
    match: query.data ?? null,

    /**
     * Whether the query is loading
     */
    isLoading: query.isLoading,

    /**
     * Whether the query is fetching (initial or refetch)
     */
    isFetching: query.isFetching,

    /**
     * Whether the query was successful
     */
    isSuccess: query.isSuccess,

    /**
     * Whether the query failed
     */
    isError: query.isError,

    /**
     * The error if query failed
     */
    error: query.error,

    /**
     * Refetch the match
     */
    refetch: query.refetch,
  };
}

/**
 * Hook to prefetch matches into the cache
 * Useful for optimistic UI when navigating to match lists
 */
export function usePrefetchMatches() {
  const queryClient = useQueryClient();

  const prefetchMatches = async (filters: MatchFilters = {}) => {
    const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
    await queryClient.prefetchInfiniteQuery({
      queryKey: matchKeys.list('discovery', { ...filters, limit }),
      queryFn: async () => {
        const matches = (await getMatchesWithDetails({
          ...filters,
          limit,
          offset: 0,
        })) as MatchWithDetails[];
        return {
          matches,
          nextOffset: matches.length === limit ? limit : null,
          hasMore: matches.length === limit,
        };
      },
      initialPageParam: 0,
      staleTime: 1000 * 60 * 2, // 2 minutes
    });
  };

  const prefetchMatch = async (matchId: string) => {
    await queryClient.prefetchQuery({
      queryKey: matchKeys.detail(matchId),
      queryFn: async () => {
        const match = await getMatchWithDetails(matchId);
        return match as MatchWithDetails | null;
      },
      staleTime: 1000 * 60 * 2, // 2 minutes
    });
  };

  return {
    prefetchMatches,
    prefetchMatch,
  };
}

/**
 * Hook to invalidate match queries
 * Useful after mutations that affect match data
 */
export function useInvalidateMatches() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: matchKeys.all });
  };

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: matchKeys.lists() });
  };

  const invalidateMatch = (matchId: string) => {
    queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
  };

  return {
    invalidateAll,
    invalidateLists,
    invalidateMatch,
  };
}

export default useMatches;
