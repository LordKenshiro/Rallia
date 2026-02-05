/**
 * Unified Booking Service
 *
 * Thin client that calls Supabase Edge Functions for Stripe-dependent
 * operations (create, cancel) and uses direct Supabase queries for reads.
 * Both web and mobile consume this identically.
 */

import { supabase } from '../supabase';
import type {
  CreateBookingClientParams,
  CreateBookingClientResult,
  CancelBookingClientParams,
  CancelBookingClientResult,
  BookingWithDetails,
  BookingListFilters,
} from './types';

// ---------------------------------------------------------------------------
// Booking select fragment (shared across read queries)
// ---------------------------------------------------------------------------

const BOOKING_WITH_DETAILS_SELECT = `
  id, organization_id, court_id, player_id,
  booking_date, start_time, end_time,
  status, price_cents, currency,
  stripe_payment_intent_id, stripe_charge_id,
  requires_approval, notes,
  cancelled_at, cancelled_by, cancellation_reason,
  refund_amount_cents, refund_status,
  created_at, updated_at,
  court:court_id (
    id, name, court_number,
    facility:facility_id (
      id, name, organization_id
    )
  )
`;

// ---------------------------------------------------------------------------
// Create (Edge Function)
// ---------------------------------------------------------------------------

/**
 * Create a booking via the `booking-create` Edge Function.
 * Handles Stripe PaymentIntent creation server-side.
 */
export async function createBooking(
  params: CreateBookingClientParams
): Promise<CreateBookingClientResult> {
  const { data, error } = await supabase.functions.invoke('booking-create', {
    body: params,
  });

  if (error) {
    // Edge Function errors come as FunctionsHttpError with a JSON body
    const message =
      (data as { error?: string } | null)?.error ?? error.message ?? 'Failed to create booking';
    throw new Error(message);
  }

  return data as CreateBookingClientResult;
}

// ---------------------------------------------------------------------------
// Cancel (Edge Function)
// ---------------------------------------------------------------------------

/**
 * Cancel a booking via the `booking-cancel` Edge Function.
 * Handles Stripe refund processing server-side.
 */
export async function cancelBooking(
  params: CancelBookingClientParams
): Promise<CancelBookingClientResult> {
  const { data, error } = await supabase.functions.invoke('booking-cancel', {
    body: params,
  });

  if (error) {
    const message =
      (data as { error?: string } | null)?.error ?? error.message ?? 'Failed to cancel booking';
    throw new Error(message);
  }

  return data as CancelBookingClientResult;
}

// ---------------------------------------------------------------------------
// Read: single booking (direct Supabase)
// ---------------------------------------------------------------------------

/**
 * Get a single booking by ID with court/facility details.
 */
export async function getBooking(bookingId: string): Promise<BookingWithDetails | null> {
  const { data, error } = await supabase
    .from('booking')
    .select(BOOKING_WITH_DETAILS_SELECT)
    .eq('id', bookingId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch booking: ${error.message}`);
  }

  return data as unknown as BookingWithDetails;
}

// ---------------------------------------------------------------------------
// Read: player bookings (direct Supabase)
// ---------------------------------------------------------------------------

/**
 * Get all bookings for a player, with optional filters.
 */
export async function getPlayerBookings(
  playerId: string,
  filters?: BookingListFilters
): Promise<BookingWithDetails[]> {
  let query = supabase
    .from('booking')
    .select(BOOKING_WITH_DETAILS_SELECT)
    .eq('player_id', playerId)
    .order('booking_date', { ascending: false });

  query = applyFilters(query, filters);

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch player bookings: ${error.message}`);
  return (data ?? []) as unknown as BookingWithDetails[];
}

// ---------------------------------------------------------------------------
// Read: organization bookings (direct Supabase)
// ---------------------------------------------------------------------------

/**
 * Get all bookings for an organization, with optional filters.
 */
export async function getOrgBookings(
  orgId: string,
  filters?: BookingListFilters
): Promise<BookingWithDetails[]> {
  let query = supabase
    .from('booking')
    .select(BOOKING_WITH_DETAILS_SELECT)
    .eq('organization_id', orgId)
    .order('booking_date', { ascending: false });

  query = applyFilters(query, filters);

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch organization bookings: ${error.message}`);
  return (data ?? []) as unknown as BookingWithDetails[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filters?: BookingListFilters) {
  if (!filters) return query;

  if (filters.dateFrom) {
    query = query.gte('booking_date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('booking_date', filters.dateTo);
  }
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 20) - 1);
  }

  return query;
}
