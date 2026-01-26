/**
 * Availability Service
 *
 * Main service for fetching court availability using the provider system.
 * Handles provider config caching and orchestrates availability fetching.
 */

import { supabase } from '../supabase';
import { getProvider, isProviderRegistered } from './providers';
import type {
  AvailabilitySlot,
  ProviderConfig,
  FetchAvailabilityParams,
  AvailabilityResult,
} from './types';

// =============================================================================
// PROVIDER CONFIG CACHE
// =============================================================================

/**
 * In-memory cache for provider configurations.
 * Avoids repeated database queries for the same provider.
 */
const providerConfigCache = new Map<string, ProviderConfig>();

/**
 * Cache TTL in milliseconds (5 minutes).
 * Provider configs rarely change, so a longer TTL is acceptable.
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Cache entry timestamps for TTL checking.
 */
const cacheTimestamps = new Map<string, number>();

/**
 * Check if a cached config is still valid.
 */
function isCacheValid(providerId: string): boolean {
  const timestamp = cacheTimestamps.get(providerId);
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL;
}

// =============================================================================
// PROVIDER CONFIG FETCHING
// =============================================================================

/**
 * Fetch provider configuration from database.
 * Uses caching to minimize database queries.
 *
 * @param providerId - UUID of the data_provider record
 * @returns Provider configuration or null if not found
 */
export async function fetchProviderConfig(providerId: string): Promise<ProviderConfig | null> {
  // Check cache first
  if (isCacheValid(providerId)) {
    const cached = providerConfigCache.get(providerId);
    if (cached) return cached;
  }

  try {
    const { data, error } = await supabase
      .from('data_provider')
      .select('id, provider_type, api_base_url, api_config, booking_url_template')
      .eq('id', providerId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.warn(`[AvailabilityService] Provider not found: ${providerId}`, error);
      return null;
    }

    const config: ProviderConfig = {
      id: data.id,
      providerType: data.provider_type,
      apiBaseUrl: data.api_base_url,
      apiConfig: (data.api_config as Record<string, unknown>) || {},
      bookingUrlTemplate: data.booking_url_template,
    };

    // Cache the config
    providerConfigCache.set(providerId, config);
    cacheTimestamps.set(providerId, Date.now());

    return config;
  } catch (error) {
    console.error('[AvailabilityService] Error fetching provider config:', error);
    return null;
  }
}

/**
 * Clear the provider config cache.
 * Useful for testing or after admin updates.
 */
export function clearProviderCache(): void {
  providerConfigCache.clear();
  cacheTimestamps.clear();
}

// =============================================================================
// AVAILABILITY FETCHING
// =============================================================================

/**
 * Fetch availability slots for a facility.
 *
 * @param providerId - UUID of the data_provider
 * @param params - Fetch parameters
 * @returns Availability result with slots or error
 */
export async function fetchAvailability(
  providerId: string,
  params: FetchAvailabilityParams
): Promise<AvailabilityResult> {
  try {
    // Get provider config
    const config = await fetchProviderConfig(providerId);
    if (!config) {
      return {
        slots: [],
        success: false,
        error: 'Provider configuration not found',
      };
    }

    // Check if provider type is registered
    if (!isProviderRegistered(config.providerType)) {
      return {
        slots: [],
        success: false,
        error: `Provider type not supported: ${config.providerType}`,
      };
    }

    // Get provider instance and fetch availability
    const provider = getProvider(config);
    const slots = await provider.fetchAvailability(params);

    return {
      slots,
      success: true,
      totalCount: slots.length,
    };
  } catch (error) {
    console.error('[AvailabilityService] Error fetching availability:', error);
    return {
      slots: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch availability for today and optionally tomorrow.
 * Convenience method for common use case.
 *
 * @param providerId - UUID of the data_provider
 * @param facilityExternalId - External facility ID (e.g., siteId)
 * @param includeTomorrow - Whether to include tomorrow's slots
 * @returns Availability result
 */
export async function fetchTodayAvailability(
  providerId: string,
  facilityExternalId: string | undefined,
  includeTomorrow = true
): Promise<AvailabilityResult> {
  // Format date in local timezone to avoid UTC conversion issues
  const formatDateLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const today = new Date();
  const dates = [formatDateLocal(today)];

  if (includeTomorrow) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dates.push(formatDateLocal(tomorrow));
  }

  return fetchAvailability(providerId, {
    dates,
    siteId: facilityExternalId ? parseInt(facilityExternalId, 10) : undefined,
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Filter slots to only future times.
 *
 * @param slots - Array of availability slots
 * @returns Slots that start after now
 */
export function filterFutureSlots(slots: AvailabilitySlot[]): AvailabilitySlot[] {
  const now = new Date();
  return slots.filter(slot => slot.datetime > now);
}

/**
 * Get the next N available slots.
 *
 * @param slots - Array of availability slots
 * @param count - Number of slots to return
 * @returns Next N slots starting from now
 */
export function getNextSlots(slots: AvailabilitySlot[], count: number = 3): AvailabilitySlot[] {
  return filterFutureSlots(slots)
    .sort((a, b) => a.datetime.getTime() - b.datetime.getTime())
    .slice(0, count);
}
