/**
 * Program Cancellation Service (Server-side)
 *
 * Handles registration cancellations with Stripe refund processing.
 * This file contains server-only functions that depend on Stripe.
 *
 * For pure calculation functions, use @rallia/shared-services/programs
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Program } from '@rallia/shared-types';
import type {
  RefundCalculation,
  CancelRegistrationParams,
  CancelRegistrationResult,
} from '@rallia/shared-services';
import {
  calculateProgramRefund,
  getSessionsAttended,
  processWaitlistAfterCancellation,
} from '@rallia/shared-services';
import { createRefund, getPaymentIntent, cancelPaymentIntent } from '../stripe/payments';

/**
 * Process refund for installment registration
 */
export async function processInstallmentRefund(
  supabase: SupabaseClient,
  registrationId: string,
  refundAmountCents: number
): Promise<{ refundsProcessed: number; totalRefunded: number }> {
  // Get all payments for this registration
  const { data: payments } = await supabase
    .from('registration_payment')
    .select('*')
    .eq('registration_id', registrationId)
    .order('installment_number', { ascending: true });

  let refundsProcessed = 0;
  let totalRefunded = 0;
  let remainingRefund = refundAmountCents;

  for (const payment of payments || []) {
    if (remainingRefund <= 0) break;

    if (payment.status === 'succeeded' && payment.stripe_payment_intent_id) {
      // Calculate refund for this payment
      const refundForPayment = Math.min(remainingRefund, payment.amount_cents);

      try {
        // Get the charge ID from the payment intent
        const paymentIntent = await getPaymentIntent(payment.stripe_payment_intent_id);

        const chargeId =
          typeof paymentIntent.latest_charge === 'string'
            ? paymentIntent.latest_charge
            : paymentIntent.latest_charge?.id;

        if (chargeId) {
          // Process Stripe refund
          await createRefund({
            chargeId,
            amountCents: refundForPayment,
            reason: 'requested_by_customer',
            metadata: {
              registration_id: registrationId,
              installment_number: payment.installment_number.toString(),
            },
          });

          // Update payment record
          await supabase
            .from('registration_payment')
            .update({
              status: 'refunded',
              refund_amount_cents: refundForPayment,
              refunded_at: new Date().toISOString(),
            })
            .eq('id', payment.id);

          remainingRefund -= refundForPayment;
          totalRefunded += refundForPayment;
          refundsProcessed++;
        }
      } catch (err) {
        console.error(`Failed to refund payment ${payment.id}:`, err);
        // Continue with other payments
      }
    } else if (payment.status === 'pending') {
      // Cancel pending payment - no refund needed
      if (payment.stripe_payment_intent_id) {
        try {
          await cancelPaymentIntent(payment.stripe_payment_intent_id);
        } catch (err) {
          console.error(
            `Failed to cancel payment intent ${payment.stripe_payment_intent_id}:`,
            err
          );
        }
      }

      await supabase
        .from('registration_payment')
        .update({ status: 'cancelled' })
        .eq('id', payment.id);
    }
  }

  return { refundsProcessed, totalRefunded };
}

/**
 * Cancel a registration with refund processing
 */
export async function cancelRegistration(
  supabase: SupabaseClient,
  params: CancelRegistrationParams
): Promise<CancelRegistrationResult> {
  // Get registration with program details
  const { data: registration, error: regError } = await supabase
    .from('program_registration')
    .select(
      `
      *,
      program:program_id (*)
    `
    )
    .eq('id', params.registrationId)
    .single();

  if (regError || !registration) {
    return {
      success: false,
      refundAmountCents: 0,
      refundsProcessed: 0,
      message: 'Registration not found',
    };
  }

  if (registration.status === 'cancelled' || registration.status === 'refunded') {
    return {
      success: false,
      refundAmountCents: 0,
      refundsProcessed: 0,
      message: 'Registration is already cancelled',
    };
  }

  const program = registration.program as Program;

  // Get sessions attended
  const { attended, total } = await getSessionsAttended(supabase, params.registrationId);

  // Calculate refund
  let refundCalc: RefundCalculation;
  if (params.forceRefund) {
    // Force full refund (admin override)
    refundCalc = {
      eligibleForRefund: true,
      refundAmountCents: registration.paid_amount_cents,
      refundPercent: 100,
      sessionsAttended: attended,
      sessionsRemaining: total - attended,
      reason: 'Admin forced full refund',
    };
  } else {
    refundCalc = calculateProgramRefund(registration, program, attended, total);
  }

  // Process refunds if eligible
  let refundsProcessed = 0;
  let totalRefunded = 0;

  if (refundCalc.eligibleForRefund && refundCalc.refundAmountCents > 0) {
    const refundResult = await processInstallmentRefund(
      supabase,
      params.registrationId,
      refundCalc.refundAmountCents
    );
    refundsProcessed = refundResult.refundsProcessed;
    totalRefunded = refundResult.totalRefunded;
  }

  // Update registration status
  const newStatus = totalRefunded > 0 ? 'refunded' : 'cancelled';
  await supabase
    .from('program_registration')
    .update({
      status: newStatus,
      cancelled_at: new Date().toISOString(),
      refund_amount_cents: totalRefunded,
      notes: registration.notes
        ? `${registration.notes}\n\nCancellation: ${refundCalc.reason}`
        : `Cancellation: ${refundCalc.reason}`,
    })
    .eq('id', params.registrationId);

  // Process waitlist
  await processWaitlistAfterCancellation(supabase, program.id);

  // TODO: Send cancellation notification

  return {
    success: true,
    refundAmountCents: totalRefunded,
    refundsProcessed,
    message: refundCalc.reason,
  };
}

/**
 * Cancel all registrations for a program (when program is cancelled)
 */
export async function cancelAllProgramRegistrations(
  supabase: SupabaseClient,
  programId: string,
  fullRefund: boolean = true
): Promise<{ processed: number; refunded: number; errors: string[] }> {
  // Get all confirmed registrations
  const { data: registrations } = await supabase
    .from('program_registration')
    .select('id')
    .eq('program_id', programId)
    .in('status', ['pending', 'confirmed']);

  let processed = 0;
  let refunded = 0;
  const errors: string[] = [];

  for (const reg of registrations || []) {
    const result = await cancelRegistration(supabase, {
      registrationId: reg.id,
      cancelledBy: 'system',
      reason: 'Program cancelled',
      forceRefund: fullRefund,
    });

    if (result.success) {
      processed++;
      if (result.refundAmountCents > 0) {
        refunded++;
      }
    } else {
      errors.push(`Registration ${reg.id}: ${result.message}`);
    }
  }

  return { processed, refunded, errors };
}
