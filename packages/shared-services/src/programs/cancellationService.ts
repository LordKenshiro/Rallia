/**
 * Program Cancellation Service
 *
 * Handles registration cancellations with refund calculations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Program, ProgramRegistration, ProgramCancellationPolicy } from '@rallia/shared-types';
import type {
  RefundCalculation,
  CancelRegistrationParams,
  CancelRegistrationResult,
  ServiceResult,
} from './types';
import { getSessionsAttended, updateRegistrationStatus } from './registrationService';
import { processWaitlistAfterCancellation } from './waitlistService';

// Lazy import Stripe functions to avoid bundling Stripe SDK in React Native
async function getStripeFunctions() {
  const stripeModule = await import('../stripe/payments');
  return {
    createRefund: stripeModule.createRefund,
    getPaymentIntent: stripeModule.getPaymentIntent,
    cancelPaymentIntent: stripeModule.cancelPaymentIntent,
  };
}

/**
 * Default cancellation policy
 */
const DEFAULT_CANCELLATION_POLICY: ProgramCancellationPolicy = {
  full_refund_days_before_start: 7,
  partial_refund_days_before_start: 3,
  partial_refund_percent: 50,
  no_refund_after_start: true,
  prorate_by_sessions_attended: true,
};

/**
 * Calculate refund for program cancellation
 */
export function calculateProgramRefund(
  registration: ProgramRegistration,
  program: Program,
  sessionsAttended: number,
  totalSessions: number
): RefundCalculation {
  const policy: ProgramCancellationPolicy = {
    ...DEFAULT_CANCELLATION_POLICY,
    ...(program.cancellation_policy as Partial<ProgramCancellationPolicy>),
  };

  const now = new Date();
  const programStart = new Date(program.start_date);
  const daysUntilStart = Math.ceil(
    (programStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  const paidAmountCents = registration.paid_amount_cents;
  const sessionsRemaining = totalSessions - sessionsAttended;

  // Case 1: Program hasn't started yet
  if (daysUntilStart > 0) {
    // Full refund window
    if (daysUntilStart >= policy.full_refund_days_before_start) {
      return {
        eligibleForRefund: true,
        refundAmountCents: paidAmountCents,
        refundPercent: 100,
        sessionsAttended: 0,
        sessionsRemaining: totalSessions,
        reason: 'Full refund - cancelled before program start',
      };
    }

    // Partial refund window
    if (daysUntilStart >= policy.partial_refund_days_before_start) {
      const refundAmount = Math.round((paidAmountCents * policy.partial_refund_percent) / 100);
      return {
        eligibleForRefund: true,
        refundAmountCents: refundAmount,
        refundPercent: policy.partial_refund_percent,
        sessionsAttended: 0,
        sessionsRemaining: totalSessions,
        reason: `Partial refund (${policy.partial_refund_percent}%) - within cancellation window`,
      };
    }

    // No refund window (close to start)
    return {
      eligibleForRefund: false,
      refundAmountCents: 0,
      refundPercent: 0,
      sessionsAttended: 0,
      sessionsRemaining: totalSessions,
      reason: 'No refund - too close to program start date',
    };
  }

  // Case 2: Program has started
  if (policy.no_refund_after_start && !policy.prorate_by_sessions_attended) {
    return {
      eligibleForRefund: false,
      refundAmountCents: 0,
      refundPercent: 0,
      sessionsAttended,
      sessionsRemaining,
      reason: 'No refund - program has already started',
    };
  }

  // Case 3: Prorated refund based on sessions remaining
  if (policy.prorate_by_sessions_attended && sessionsRemaining > 0 && totalSessions > 0) {
    const perSessionValue = Math.round(paidAmountCents / totalSessions);
    const refundAmount = perSessionValue * sessionsRemaining;
    const refundPercent = Math.round((sessionsRemaining / totalSessions) * 100);

    return {
      eligibleForRefund: true,
      refundAmountCents: refundAmount,
      refundPercent,
      sessionsAttended,
      sessionsRemaining,
      reason: `Prorated refund for ${sessionsRemaining} remaining sessions`,
    };
  }

  // No sessions remaining
  return {
    eligibleForRefund: false,
    refundAmountCents: 0,
    refundPercent: 0,
    sessionsAttended,
    sessionsRemaining: 0,
    reason: 'No refund - all sessions completed',
  };
}

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

  const stripeFunctions = await getStripeFunctions();

  for (const payment of payments || []) {
    if (remainingRefund <= 0) break;

    if (payment.status === 'succeeded' && payment.stripe_payment_intent_id) {
      // Calculate refund for this payment
      const refundForPayment = Math.min(remainingRefund, payment.amount_cents);

      try {
        // Get the charge ID from the payment intent
        const paymentIntent = await stripeFunctions.getPaymentIntent(
          payment.stripe_payment_intent_id
        );

        const chargeId =
          typeof paymentIntent.latest_charge === 'string'
            ? paymentIntent.latest_charge
            : paymentIntent.latest_charge?.id;

        if (chargeId) {
          // Process Stripe refund
          await stripeFunctions.createRefund({
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
          await stripeFunctions.cancelPaymentIntent(payment.stripe_payment_intent_id);
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
 * Preview refund calculation without processing
 */
export async function previewCancellationRefund(
  supabase: SupabaseClient,
  registrationId: string
): Promise<ServiceResult<RefundCalculation>> {
  // Get registration with program details
  const { data: registration, error: regError } = await supabase
    .from('program_registration')
    .select(
      `
      *,
      program:program_id (*)
    `
    )
    .eq('id', registrationId)
    .single();

  if (regError || !registration) {
    return { success: false, error: 'Registration not found' };
  }

  const program = registration.program as Program;

  // Get sessions attended
  const { attended, total } = await getSessionsAttended(supabase, registrationId);

  // Calculate refund
  const refundCalc = calculateProgramRefund(registration, program, attended, total);

  return { success: true, data: refundCalc };
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
