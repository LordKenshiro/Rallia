/**
 * Local Availability Fetcher
 *
 * Fetches court availability from local database using the get_available_slots_batch RPC.
 * This is used for organization-managed facilities that have court_slot templates.
 *
 * Named "Fetcher" (not "Provider") to distinguish from class-based external providers.
 */

import { supabase } from '../supabase';
import type { AvailabilityResult, AvailabilitySlot } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Row returned by the get_available_slots_batch RPC.
 */
interface BatchSlotRow {
  out_court_id: string;
  out_slot_date: string;
  out_start_time: string;
  out_end_time: string;
  out_price_cents: number | null;
  out_template_source: string;
}

// =============================================================================
// CACHE FOR hasLocalTemplates
// =============================================================================

/**
 * In-memory cache for hasLocalTemplates results.
 * Avoids repeated database queries for the same facility.
 */
const localTemplatesCache = new Map<string, boolean>();

/**
 * Cache entry timestamps for TTL checking.
 */
const cacheTimestamps = new Map<string, number>();

/**
 * Cache TTL in milliseconds (5 minutes).
 * Template configs rarely change frequently.
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Check if a cached result is still valid.
 */
function isCacheValid(facilityId: string): boolean {
  const timestamp = cacheTimestamps.get(facilityId);
  return timestamp ? Date.now() - timestamp < CACHE_TTL : false;
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Check if a facility has local availability templates.
 * Checks both recurring court_slot templates and future one-time availability.
 *
 * @param facilityId - UUID of the facility
 * @returns True if facility has any local templates
 */
export async function hasLocalTemplates(facilityId: string): Promise<boolean> {
  // Check cache first
  if (isCacheValid(facilityId)) {
    return localTemplatesCache.get(facilityId) ?? false;
  }

  try {
    // Check for recurring templates
    const { count: slotCount } = await supabase
      .from('court_slot')
      .select('*', { count: 'exact', head: true })
      .eq('facility_id', facilityId);

    // Check for future one-time availability (available slots only)
    const today = new Date().toISOString().split('T')[0];
    const { count: oneTimeCount } = await supabase
      .from('court_one_time_availability')
      .select('*', { count: 'exact', head: true })
      .eq('facility_id', facilityId)
      .eq('is_available', true)
      .gte('availability_date', today);

    const hasTemplates = (slotCount ?? 0) > 0 || (oneTimeCount ?? 0) > 0;

    // Cache result
    localTemplatesCache.set(facilityId, hasTemplates);
    cacheTimestamps.set(facilityId, Date.now());

    return hasTemplates;
  } catch (error) {
    console.error('[LocalAvailabilityFetcher] Error checking templates:', error);
    return false;
  }
}

/**
 * Fetch local availability for a facility using the batched RPC.
 *
 * @param facilityId - UUID of the facility
 * @param dates - Array of date strings in YYYY-MM-DD format
 * @returns Availability result with slots
 */
export async function fetchLocalAvailability(
  facilityId: string,
  dates: string[]
): Promise<AvailabilityResult> {
  try {
    // 1. Fetch all active courts for the facility
    const { data: courts, error: courtsError } = await supabase
      .from('court')
      .select('id, name, court_number')
      .eq('facility_id', facilityId)
      .or('availability_status.is.null,availability_status.eq.available');

    if (courtsError) {
      console.error('[LocalAvailabilityFetcher] Error fetching courts:', courtsError);
      return { slots: [], success: false, error: courtsError.message };
    }

    if (!courts || courts.length === 0) {
      // No active courts - return empty result
      return { slots: [], success: true };
    }

    // 2. Sort dates and determine date range
    const sortedDates = [...dates].sort();
    const dateFrom = sortedDates[0];
    const dateTo = sortedDates[sortedDates.length - 1];

    // 3. Call the batched RPC
    const { data: slots, error: rpcError } = await supabase.rpc('get_available_slots_batch', {
      p_court_ids: courts.map(c => c.id),
      p_date_from: dateFrom,
      p_date_to: dateTo,
    });

    if (rpcError) {
      console.error('[LocalAvailabilityFetcher] RPC error:', rpcError);
      return { slots: [], success: false, error: rpcError.message };
    }

    // 4. Build court lookup maps
    const courtNames = new Map<string, string>();
    const courtNumbers = new Map<string, number>();
    for (const court of courts) {
      courtNames.set(court.id, court.name ?? `Court ${court.court_number ?? '?'}`);
      if (court.court_number) {
        courtNumbers.set(court.id, court.court_number);
      }
    }

    // 5. Transform to AvailabilitySlot format
    const transformedSlots: AvailabilitySlot[] = ((slots as BatchSlotRow[]) ?? []).map(s => {
      // Parse date and time into Date objects
      const slotDate = new Date(`${s.out_slot_date}T${s.out_start_time}`);
      const endDate = new Date(`${s.out_slot_date}T${s.out_end_time}`);

      // Extract court number from lookup or parse from name
      const courtNumber = courtNumbers.get(s.out_court_id);
      const courtName = courtNames.get(s.out_court_id) ?? `Court ${courtNumber ?? '?'}`;

      return {
        datetime: slotDate,
        endDateTime: endDate,
        courtCount: 1, // Each slot is for a specific court
        facilityId: s.out_court_id, // Used as external ID for compatibility
        facilityScheduleId: `${s.out_court_id}-${s.out_slot_date}-${s.out_start_time}`,
        courtName,
        shortCourtName: courtName,
        courtNumber,
        price: s.out_price_cents ? s.out_price_cents / 100 : undefined,
        currency: 'CAD',
        // Local slot fields
        isLocalSlot: true,
        courtId: s.out_court_id,
        templateSource: s.out_template_source as 'court' | 'facility' | 'one_time',
      };
    });

    return {
      slots: transformedSlots,
      success: true,
      totalCount: transformedSlots.length,
    };
  } catch (error) {
    console.error('[LocalAvailabilityFetcher] Unexpected error:', error);
    return {
      slots: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear the local templates cache.
 * Useful for testing or after admin updates to court_slot.
 */
export function clearLocalTemplatesCache(): void {
  localTemplatesCache.clear();
  cacheTimestamps.clear();
}
