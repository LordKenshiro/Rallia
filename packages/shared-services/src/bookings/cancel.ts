/**
 * Booking Cancellation Service
 *
 * Handles cancelling bookings with refund processing based on cancellation policy.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createRefund, cancelPaymentIntent, getPaymentIntent } from '../stripe/payments';
import type {
  CancelBookingParams,
  CancelBookingResult,
  CancellationPolicy,
  RefundStatus,
} from './types';

/**
 * Default cancellation policy if none is configured
 */
const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  freeCancellationHours: 24,
  partialRefundHours: 12,
  partialRefundPercent: 50,
  noRefundHours: 0,
};

/**
 * Get the cancellation policy for an organization
 */
export async function getCancellationPolicy(
  supabase: SupabaseClient,
  organizationId: string
): Promise<CancellationPolicy> {
  const { data: policy } = await supabase
    .from('cancellation_policy')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (!policy) {
    return DEFAULT_CANCELLATION_POLICY;
  }

  return {
    freeCancellationHours: policy.free_cancellation_hours,
    partialRefundHours: policy.partial_refund_hours,
    partialRefundPercent: policy.partial_refund_percent,
    noRefundHours: policy.no_refund_hours,
  };
}

/**
 * Calculate the refund amount based on cancellation policy
 */
export function calculateRefundAmount(
  priceCents: number,
  hoursUntilBooking: number,
  policy: CancellationPolicy
): { refundAmountCents: number; refundPercent: number } {
  // Full refund if within free cancellation window
  if (hoursUntilBooking >= policy.freeCancellationHours) {
    return { refundAmountCents: priceCents, refundPercent: 100 };
  }

  // Partial refund if within partial refund window
  if (hoursUntilBooking >= policy.partialRefundHours) {
    const refundAmount = Math.round((priceCents * policy.partialRefundPercent) / 100);
    return { refundAmountCents: refundAmount, refundPercent: policy.partialRefundPercent };
  }

  // No refund if past all windows
  if (hoursUntilBooking <= policy.noRefundHours) {
    return { refundAmountCents: 0, refundPercent: 0 };
  }

  // Between partial and no-refund windows - no refund
  return { refundAmountCents: 0, refundPercent: 0 };
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  supabase: SupabaseClient,
  params: CancelBookingParams
): Promise<CancelBookingResult> {
  // 1. Get the booking
  const { data: booking, error: bookingError } = await supabase
    .from('booking')
    .select(
      `
      id,
      organization_id,
      court_id,
      player_id,
      booking_date,
      start_time,
      end_time,
      status,
      price_cents,
      stripe_payment_intent_id,
      stripe_charge_id
    `
    )
    .eq('id', params.bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error('Booking not found');
  }

  // 2. Check if booking can be cancelled
  if (booking.status === 'cancelled') {
    throw new Error('Booking is already cancelled');
  }

  if (booking.status === 'completed') {
    throw new Error('Cannot cancel a completed booking');
  }

  // 3. Calculate hours until booking
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
  const now = new Date();
  const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // 4. Get cancellation policy
  const policy = await getCancellationPolicy(supabase, booking.organization_id);

  // 5. Calculate refund amount
  const { refundAmountCents, refundPercent } = params.forceCancel
    ? { refundAmountCents: booking.price_cents, refundPercent: 100 }
    : calculateRefundAmount(booking.price_cents, hoursUntilBooking, policy);

  // 6. Process refund if applicable
  let refundStatus: RefundStatus = 'none';
  let refundMessage: string | undefined;

  if (booking.stripe_payment_intent_id) {
    try {
      // Check the PaymentIntent status
      const paymentIntent = await getPaymentIntent(booking.stripe_payment_intent_id);

      if (
        paymentIntent.status === 'requires_payment_method' ||
        paymentIntent.status === 'requires_confirmation' ||
        paymentIntent.status === 'requires_action'
      ) {
        // Payment not completed yet, just cancel the intent
        await cancelPaymentIntent(booking.stripe_payment_intent_id);
        refundStatus = 'none';
        refundMessage = 'Payment cancelled (not yet processed)';
      } else if (paymentIntent.status === 'succeeded' && refundAmountCents > 0) {
        // Payment was successful, process refund
        const chargeId =
          booking.stripe_charge_id ||
          (typeof paymentIntent.latest_charge === 'string'
            ? paymentIntent.latest_charge
            : paymentIntent.latest_charge?.id);

        if (chargeId) {
          const refundResult = await createRefund({
            chargeId,
            amountCents: refundAmountCents,
            reason: 'requested_by_customer',
            metadata: {
              booking_id: booking.id,
              cancelled_by: params.cancelledBy,
              reason: params.reason || 'Customer requested cancellation',
            },
          });

          refundStatus = refundResult.amountCents === booking.price_cents ? 'refunded' : 'partial';
          refundMessage = `Refunded ${refundPercent}% (${refundResult.amountCents / 100} ${paymentIntent.currency?.toUpperCase()})`;
        }
      } else if (paymentIntent.status === 'succeeded' && refundAmountCents === 0) {
        refundStatus = 'none';
        refundMessage = 'No refund - cancelled outside refund window';
      }
    } catch (stripeError) {
      console.error('Error processing refund:', stripeError);
      refundStatus = 'failed';
      refundMessage = 'Failed to process refund. Please contact support.';
    }
  }

  // 7. Update booking status
  const { error: updateError } = await supabase
    .from('booking')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: params.cancelledBy,
      cancellation_reason: params.reason,
      refund_amount_cents: refundAmountCents,
      refund_status: refundStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.bookingId);

  if (updateError) {
    throw new Error(`Failed to update booking: ${updateError.message}`);
  }

  return {
    success: true,
    refundAmountCents,
    refundStatus,
    message: refundMessage,
  };
}
