/**
 * Cancellation Policy Functions (Client-Safe)
 *
 * These functions don't require Stripe and can be used in React Native.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CancellationPolicy } from './types';

/**
 * Default cancellation policy if none is configured
 */
export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
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
