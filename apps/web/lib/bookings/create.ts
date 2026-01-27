/**
 * Booking Creation Service
 *
 * Handles creating new bookings with payment processing.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateBookingParams, CreateBookingResult } from '@rallia/shared-services';
import {
  validateBookingSlot,
  checkBookingConstraints,
  checkPlayerBlocked,
} from '@rallia/shared-services';
import { createPaymentIntent, calculateApplicationFee } from '@/lib/stripe/payments';

/**
 * Create a new booking
 */
export async function createBooking(
  supabase: SupabaseClient,
  params: CreateBookingParams
): Promise<CreateBookingResult> {
  // 1. Check if player is blocked (only if playerId is provided)
  if (params.playerId) {
    const blockCheck = await checkPlayerBlocked(supabase, params.organizationId, params.playerId);
    if (blockCheck.blocked) {
      throw new Error(blockCheck.reason);
    }
  }

  // 2. Check booking constraints (same-day, notice, advance limits)
  const constraintCheck = await checkBookingConstraints(supabase, {
    organizationId: params.organizationId,
    bookingDate: params.bookingDate,
    startTime: params.startTime,
  });
  if (!constraintCheck.valid) {
    throw new Error(constraintCheck.error);
  }

  // 3. Validate slot is available
  const validation = await validateBookingSlot(supabase, {
    courtId: params.courtId,
    bookingDate: params.bookingDate,
    startTime: params.startTime,
    endTime: params.endTime,
  });
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 4. Determine initial status
  let status: 'pending' | 'confirmed' | 'awaiting_approval' = 'pending';
  if (params.skipPayment) {
    status = 'confirmed'; // Manual/cash bookings are confirmed immediately
  } else if (params.requiresApproval) {
    status = 'awaiting_approval';
  }

  // 5. Create PaymentIntent if needed
  let paymentIntentId: string | null = null;
  let clientSecret: string | null = null;

  if (!params.skipPayment && params.stripeAccountId) {
    const applicationFee = calculateApplicationFee(params.priceCents, params.applicationFeePercent);

    // Generate a temporary booking ID for metadata
    const tempBookingId = crypto.randomUUID();

    const paymentResult = await createPaymentIntent({
      amountCents: params.priceCents,
      currency: params.currency || 'CAD',
      connectedAccountId: params.stripeAccountId,
      applicationFeeCents: applicationFee,
      description: `Court booking for ${params.bookingDate}`,
      metadata: {
        booking_id: tempBookingId,
        court_id: params.courtId,
        organization_id: params.organizationId,
        player_id: params.playerId || 'guest',
        booking_date: params.bookingDate,
        start_time: params.startTime,
        end_time: params.endTime,
      },
    });

    paymentIntentId = paymentResult.paymentIntentId;
    clientSecret = paymentResult.clientSecret;
  }

  // 6. Create the booking record
  // Note: The exclusion constraint will prevent double-booking at the database level
  const { data: booking, error: bookingError } = await supabase
    .from('booking')
    .insert({
      organization_id: params.organizationId,
      court_id: params.courtId,
      player_id: params.playerId || null,
      booking_date: params.bookingDate,
      start_time: params.startTime,
      end_time: params.endTime,
      status,
      price_cents: params.priceCents,
      currency: params.currency || 'CAD',
      stripe_payment_intent_id: paymentIntentId,
      requires_approval: params.requiresApproval || false,
      notes: params.notes || null,
    })
    .select('id, status')
    .single();

  if (bookingError) {
    // Check for exclusion constraint violation (double-booking)
    if (bookingError.code === '23P01') {
      throw new Error('This time slot has already been booked');
    }
    throw new Error(`Failed to create booking: ${bookingError.message}`);
  }

  return {
    bookingId: booking.id,
    status: booking.status,
    clientSecret,
    paymentIntentId,
  };
}
