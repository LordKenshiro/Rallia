/**
 * Program Cancellation Service (Client-safe)
 *
 * Pure calculation functions for program cancellation refunds.
 * These functions can be safely used in both web and mobile apps.
 *
 * For server-side functions that process actual Stripe refunds,
 * use apps/web/lib/programs/cancellation.ts
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Program, ProgramRegistration, ProgramCancellationPolicy } from '@rallia/shared-types';
import type { RefundCalculation, ServiceResult } from './types';
import { getSessionsAttended } from './registrationService';

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
