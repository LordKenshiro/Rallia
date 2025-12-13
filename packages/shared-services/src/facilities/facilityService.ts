/**
 * Facility Service
 * Handles all facility-related database operations using Supabase.
 */

import { supabase } from '../supabase';
import type { FacilitySearchResult, FacilitiesPage } from '@rallia/shared-types';

const DEFAULT_PAGE_SIZE = 20;

export interface SearchFacilitiesParams {
  sportId: string;
  latitude: number;
  longitude: number;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search facilities nearby, sorted by distance from user location.
 * Uses PostGIS RPC function for distance calculations.
 */
export async function searchFacilitiesNearby(
  params: SearchFacilitiesParams
): Promise<FacilitiesPage> {
  const {
    sportId,
    latitude,
    longitude,
    searchQuery,
    limit = DEFAULT_PAGE_SIZE,
    offset = 0,
  } = params;

  const { data, error } = await supabase.rpc('search_facilities_nearby', {
    p_sport_id: sportId,
    p_latitude: latitude,
    p_longitude: longitude,
    p_search_query: searchQuery || null,
    p_limit: limit + 1, // Fetch one extra to check if more exist
    p_offset: offset,
  });

  if (error) {
    throw new Error(`Failed to search facilities: ${error.message}`);
  }

  const facilities = (data ?? []) as FacilitySearchResult[];
  const hasMore = facilities.length > limit;

  // Remove the extra item used for pagination check
  if (hasMore) {
    facilities.pop();
  }

  return {
    facilities,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  };
}

/**
 * Facility service object for grouped exports
 */
export const facilityService = {
  searchFacilitiesNearby,
};

export default facilityService;
