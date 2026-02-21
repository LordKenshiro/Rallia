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

export interface GetFacilityByIdParams {
  facilityId: string;
  sportId: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Get a single facility by ID with the same shape as FacilitySearchResult.
 * Optionally calculates distance if coordinates are provided.
 * Returns null if facility not found or doesn't support the specified sport.
 */
export async function getFacilityById(
  params: GetFacilityByIdParams
): Promise<FacilitySearchResult | null> {
  const { facilityId, sportId, latitude, longitude } = params;

  // Fetch facility with related data
  const { data: facility, error } = await supabase
    .from('facility')
    .select(
      `
      id,
      name,
      city,
      address,
      latitude,
      longitude,
      data_provider_id,
      external_provider_id,
      timezone,
      organization:organization_id (
        data_provider_id
      ),
      facility_sports:facility_sport!inner (
        sport_id
      )
    `
    )
    .eq('id', facilityId)
    .eq('is_active', true)
    .eq('facility_sport.sport_id', sportId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - facility doesn't exist or doesn't support this sport
      return null;
    }
    throw new Error(`Failed to get facility: ${error.message}`);
  }

  if (!facility) {
    return null;
  }

  // Get provider ID (facility-level takes precedence over organization-level)
  // Handle organization as array (Supabase returns relations as arrays)
  const orgData = Array.isArray(facility.organization)
    ? facility.organization[0]
    : facility.organization;
  const orgProviderId =
    orgData && typeof orgData === 'object' && 'data_provider_id' in orgData
      ? (orgData.data_provider_id as string | null)
      : null;
  const providerId = facility.data_provider_id || orgProviderId || null;

  // Fetch provider details if we have a provider ID
  let providerType: string | null = null;
  let bookingUrlTemplate: string | null = null;

  if (providerId) {
    const { data: provider } = await supabase
      .from('data_provider')
      .select('provider_type, booking_url_template')
      .eq('id', providerId)
      .single();

    if (provider) {
      providerType = provider.provider_type;
      bookingUrlTemplate = provider.booking_url_template;
    }
  }

  // Calculate distance if coordinates provided
  let distanceMeters: number | null = null;
  if (
    latitude !== undefined &&
    longitude !== undefined &&
    facility.latitude &&
    facility.longitude
  ) {
    // Haversine formula for distance calculation
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (latitude * Math.PI) / 180;
    const lat2Rad = (Number(facility.latitude) * Math.PI) / 180;
    const deltaLat = ((Number(facility.latitude) - latitude) * Math.PI) / 180;
    const deltaLon = ((Number(facility.longitude) - longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    distanceMeters = R * c;
  }

  return {
    id: facility.id,
    name: facility.name,
    city: facility.city,
    address: facility.address,
    distance_meters: distanceMeters,
    data_provider_id: providerId,
    data_provider_type: providerType,
    booking_url_template: bookingUrlTemplate,
    external_provider_id: facility.external_provider_id,
    timezone: facility.timezone,
  };
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
    p_sport_ids: [sportId], // Changed from p_sport_id to p_sport_ids (array)
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
  getFacilityById,
  searchFacilitiesNearby,
};

export default facilityService;
