/**
 * useFacilitySearch Hook
 * Custom hook for searching facilities with TanStack Query.
 * Provides infinite scrolling and debounced search.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { searchFacilitiesNearby } from '@rallia/shared-services';
import type { FacilitiesPage, FacilitySearchResult } from '@rallia/shared-types';
import { useDebounce } from './useDebounce';

// Query keys for cache management
export const facilityKeys = {
  all: ['facilities'] as const,
  search: () => [...facilityKeys.all, 'search'] as const,
  searchWithParams: (sportId: string, latitude: number, longitude: number, query: string) =>
    [...facilityKeys.search(), sportId, latitude, longitude, query] as const,
};

interface UseFacilitySearchOptions {
  /** Sport ID to filter facilities by */
  sportId: string | undefined;
  /** User's latitude */
  latitude: number | undefined;
  /** User's longitude */
  longitude: number | undefined;
  /** Search query string */
  searchQuery: string;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Enable/disable the query */
  enabled?: boolean;
}

interface UseFacilitySearchReturn {
  /** Flattened array of all facilities from all pages */
  facilities: FacilitySearchResult[];
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
 * Hook for searching facilities with infinite scrolling and debounced input.
 * Facilities are sorted by distance from the user's location.
 */
export function useFacilitySearch(options: UseFacilitySearchOptions): UseFacilitySearchReturn {
  const { sportId, latitude, longitude, searchQuery, debounceMs = 300, enabled = true } = options;

  // Debounce the search query
  const debouncedQuery = useDebounce(searchQuery, debounceMs);

  // Check if we have all required params
  const hasRequiredParams = !!sportId && latitude !== undefined && longitude !== undefined;

  const query = useInfiniteQuery<FacilitiesPage, Error>({
    queryKey: facilityKeys.searchWithParams(
      sportId ?? '',
      latitude ?? 0,
      longitude ?? 0,
      debouncedQuery
    ),
    queryFn: async ({ pageParam }) => {
      if (!sportId || latitude === undefined || longitude === undefined) {
        return { facilities: [], hasMore: false, nextOffset: null };
      }

      return searchFacilitiesNearby({
        sportId,
        latitude,
        longitude,
        searchQuery: debouncedQuery || undefined,
        offset: (pageParam as number) ?? 0,
      });
    },
    getNextPageParam: lastPage => lastPage.nextOffset,
    initialPageParam: 0,
    enabled: enabled && hasRequiredParams,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Flatten pages into a single array of facilities
  const allFacilities = query.data?.pages.flatMap(page => page.facilities) ?? [];

  return {
    facilities: allFacilities,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}

export default useFacilitySearch;
