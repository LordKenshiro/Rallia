/**
 * usePreferredFacility Hook
 * Custom hook for fetching a player's preferred facility by ID.
 * Uses TanStack Query for caching and state management.
 */

import { useQuery } from '@tanstack/react-query';
import { getFacilityById } from '@rallia/shared-services';
import type { FacilitySearchResult } from '@rallia/shared-types';
import { facilityKeys } from './useFacilitySearch';

// Extend facility keys for preferred facility queries
export const preferredFacilityKeys = {
  ...facilityKeys,
  preferred: () => [...facilityKeys.all, 'preferred'] as const,
  preferredById: (facilityId: string, sportId: string) =>
    [...preferredFacilityKeys.preferred(), facilityId, sportId] as const,
};

interface UsePreferredFacilityOptions {
  /** The preferred facility ID to fetch */
  preferredFacilityId: string | undefined;
  /** Sport ID to verify facility supports this sport */
  sportId: string | undefined;
  /** User's latitude for distance calculation */
  latitude?: number;
  /** User's longitude for distance calculation */
  longitude?: number;
  /** Enable/disable the query */
  enabled?: boolean;
}

interface UsePreferredFacilityReturn {
  /** The preferred facility data */
  preferredFacility: FacilitySearchResult | null;
  /** Whether the fetch is in progress */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
}

/**
 * Hook for fetching a player's preferred facility.
 * Returns the facility data with the same shape as FacilitySearchResult
 * for easy integration with facility lists.
 */
export function usePreferredFacility(
  options: UsePreferredFacilityOptions
): UsePreferredFacilityReturn {
  const { preferredFacilityId, sportId, latitude, longitude, enabled = true } = options;

  // Check if we have required params
  const hasRequiredParams = !!preferredFacilityId && !!sportId;

  const query = useQuery<FacilitySearchResult | null, Error>({
    queryKey: preferredFacilityKeys.preferredById(preferredFacilityId ?? '', sportId ?? ''),
    queryFn: async () => {
      if (!preferredFacilityId || !sportId) {
        return null;
      }

      return getFacilityById({
        facilityId: preferredFacilityId,
        sportId,
        latitude,
        longitude,
      });
    },
    enabled: enabled && hasRequiredParams,
    staleTime: 1000 * 60 * 5, // 5 minutes - preferred facility doesn't change often
    refetchOnWindowFocus: false,
  });

  return {
    preferredFacility: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export default usePreferredFacility;
