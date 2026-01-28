/**
 * useFacilityDetail Hook
 * Fetches detailed facility information including courts and contacts.
 */

import { useQuery } from '@tanstack/react-query';
import { getFacilityWithDetails, type FacilityWithDetails } from '@rallia/shared-services';
import type { Court, FacilityContact } from '@rallia/shared-types';

// Query keys for cache management
export const facilityDetailKeys = {
  all: ['facilityDetail'] as const,
  detail: (facilityId: string, sportId: string) =>
    [...facilityDetailKeys.all, facilityId, sportId] as const,
};

export interface UseFacilityDetailOptions {
  /** Facility ID to fetch */
  facilityId: string;
  /** Sport ID - required to filter courts */
  sportId: string | undefined;
  /** User's latitude for distance calculation */
  latitude?: number;
  /** User's longitude for distance calculation */
  longitude?: number;
  /** Enable/disable the query */
  enabled?: boolean;
}

export interface UseFacilityDetailReturn {
  /** Full facility with details */
  facility: FacilityWithDetails | null;
  /** Courts that support the selected sport */
  courts: Court[];
  /** Facility contacts */
  contacts: FacilityContact[];
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether any fetch is in progress */
  isFetching: boolean;
  /** Error if any */
  error: Error | null;
  /** Function to refetch data */
  refetch: () => void;
}

/**
 * Hook for fetching detailed facility information.
 * Returns facility data, courts (filtered by sport), and contact information.
 *
 * @example
 * ```tsx
 * const { facility, courts, contacts, isLoading } = useFacilityDetail({
 *   facilityId: 'abc-123',
 *   sportId: selectedSport?.id,
 *   latitude: location?.latitude,
 *   longitude: location?.longitude,
 * });
 * ```
 */
export function useFacilityDetail(options: UseFacilityDetailOptions): UseFacilityDetailReturn {
  const { facilityId, sportId, latitude, longitude, enabled = true } = options;

  // Only run query if we have required params
  const hasRequiredParams = !!facilityId && !!sportId;

  const query = useQuery<FacilityWithDetails | null, Error>({
    queryKey: facilityDetailKeys.detail(facilityId, sportId ?? ''),
    queryFn: async () => {
      if (!sportId) return null;
      return getFacilityWithDetails({
        facilityId,
        sportId,
        latitude,
        longitude,
      });
    },
    enabled: enabled && hasRequiredParams,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });

  return {
    facility: query.data ?? null,
    courts: query.data?.courts ?? [],
    contacts: query.data?.contacts ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useFacilityDetail;
