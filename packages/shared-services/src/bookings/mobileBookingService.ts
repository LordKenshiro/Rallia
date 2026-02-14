/**
 * Mobile Booking Service
 *
 * @deprecated Use `bookingService` instead, which calls Supabase Edge Functions
 * directly and works identically on both web and mobile.
 *
 * Calls the web API to create bookings from the mobile app.
 * This is a client-side service that communicates with the server-side booking API.
 */

import { supabase } from '../supabase';
import { Logger } from '../logger';

// API URL - defaults to production, can be overridden by environment variable
// For local development, set EXPO_PUBLIC_API_URL to your local web server URL
// e.g., EXPO_PUBLIC_API_URL=http://192.168.1.x:3000 (use your computer's local IP)
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://rallia.app';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateMobileBookingParams {
  /** Court ID to book */
  courtId: string;
  /** Booking date in YYYY-MM-DD format */
  bookingDate: string;
  /** Start time in HH:MM format */
  startTime: string;
  /** End time in HH:MM format */
  endTime: string;
  /** Optional notes for the booking */
  notes?: string;
}

export interface CreateMobileBookingResult {
  /** Whether the booking was created successfully */
  success: boolean;
  /** Unique booking ID */
  bookingId: string;
  /** Current status of the booking */
  status: 'pending_payment' | 'pending_approval' | 'confirmed';
  /** Stripe client secret for PaymentSheet (null if no payment required) */
  clientSecret: string | null;
  /** Price in cents */
  priceCents: number;
}

export interface MobileBookingError {
  /** Error message */
  error: string;
  /** HTTP status code */
  statusCode: number;
}

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Creates a booking from the mobile app by calling the web API.
 *
 * @deprecated Use `createBooking` from `bookingService` instead.
 *
 * @param params - Booking parameters
 * @returns Booking result with client secret for payment (if required)
 * @throws Error if the request fails
 */
export async function createMobileBooking(
  params: CreateMobileBookingParams
): Promise<CreateMobileBookingResult> {
  // Get the current session for authentication
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    Logger.error('Mobile booking failed: No authentication', sessionError ?? undefined);
    throw new Error('Authentication required to book a court');
  }

  try {
    const bookingUrl = `${API_URL}/api/bookings/create`;
    Logger.info('Creating mobile booking', {
      url: bookingUrl,
      courtId: params.courtId,
      bookingDate: params.bookingDate,
      startTime: params.startTime,
      endTime: params.endTime,
    });

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response;
    try {
      response = await fetch(bookingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          courtId: params.courtId,
          bookingDate: params.bookingDate,
          startTime: params.startTime,
          endTime: params.endTime,
          notes: params.notes,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json();

    if (!response.ok) {
      Logger.warn('Mobile booking failed', {
        statusCode: response.status,
        error: data.error,
      });
      throw new Error(data.error || 'Failed to create booking');
    }

    Logger.info('Mobile booking created successfully', {
      bookingId: data.bookingId,
      status: data.status,
      hasPayment: !!data.clientSecret,
    });

    return {
      success: true,
      bookingId: data.bookingId,
      status: data.status,
      clientSecret: data.clientSecret ?? null,
      priceCents: data.priceCents,
    };
  } catch (error) {
    // Handle abort/timeout errors with a user-friendly message
    if (error instanceof Error && error.name === 'AbortError') {
      Logger.error('Mobile booking request timed out');
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    Logger.error('Mobile booking request failed', error as Error);
    throw error;
  }
}

/**
 * Confirms that a payment was successful.
 * Called after the Stripe PaymentSheet completes successfully.
 *
 * @deprecated The webhook handles payment confirmation automatically.
 * Use `updateBookingStatus` from `bookingService` if manual confirmation is needed.
 *
 * @param bookingId - The booking ID to confirm
 * @returns Whether the confirmation was successful
 */
export async function confirmMobileBookingPayment(bookingId: string): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/api/bookings/${bookingId}/confirm-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Cancels a booking from the mobile app.
 *
 * @deprecated Use `cancelBooking` from `bookingService` instead.
 *
 * @param bookingId - The booking ID to cancel
 * @param reason - Optional cancellation reason
 * @returns Whether the cancellation was successful
 */
export async function cancelMobileBooking(
  bookingId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const response = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ reason }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to cancel booking' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
