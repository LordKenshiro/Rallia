/**
 * Program Notifications
 *
 * Notification handlers for program-related events.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Program,
  ProgramRegistration,
  ProgramSession,
  ProgramWaitlist,
} from '@rallia/shared-types';

export interface ProgramNotificationPayload {
  programId: string;
  programName: string;
  sessionDate?: string;
  amountCents?: number;
  currency?: string;
  position?: number;
  expiresAt?: string;
}

/**
 * Send registration confirmation notification
 */
export async function sendRegistrationConfirmationNotification(
  supabase: SupabaseClient,
  registration: ProgramRegistration,
  program: Program
): Promise<void> {
  const payload: ProgramNotificationPayload = {
    programId: program.id,
    programName: program.name,
    amountCents: registration.total_amount_cents,
    currency: registration.currency,
  };

  await supabase.from('notification').insert({
    type: 'program_registration_confirmed',
    user_id: registration.player_id,
    title: `Registration Confirmed: ${program.name}`,
    body: `You are registered for ${program.name}. We look forward to seeing you!`,
    data: payload,
    priority: 'normal',
  });
}

/**
 * Send registration cancellation notification
 */
export async function sendRegistrationCancellationNotification(
  supabase: SupabaseClient,
  registration: ProgramRegistration,
  program: Program,
  refundAmountCents?: number
): Promise<void> {
  const payload: ProgramNotificationPayload = {
    programId: program.id,
    programName: program.name,
    amountCents: refundAmountCents,
    currency: registration.currency,
  };

  const refundMessage =
    refundAmountCents && refundAmountCents > 0
      ? ` A refund of ${formatCurrency(refundAmountCents, registration.currency)} has been processed.`
      : '';

  await supabase.from('notification').insert({
    type: 'program_registration_cancelled',
    user_id: registration.player_id,
    title: `Registration Cancelled: ${program.name}`,
    body: `Your registration for ${program.name} has been cancelled.${refundMessage}`,
    data: payload,
    priority: 'normal',
  });
}

/**
 * Send session reminder notification
 */
export async function sendSessionReminderNotification(
  supabase: SupabaseClient,
  session: ProgramSession,
  program: Program,
  playerIds: string[]
): Promise<void> {
  const payload: ProgramNotificationPayload = {
    programId: program.id,
    programName: program.name,
    sessionDate: session.date,
  };

  const notifications = playerIds.map(playerId => ({
    type: 'program_session_reminder' as const,
    user_id: playerId,
    title: `Session Reminder: ${program.name}`,
    body: `Session on ${formatDate(session.date)} is tomorrow at ${formatTime(session.start_time)}. See you there!`,
    data: payload,
    priority: 'normal' as const,
  }));

  if (notifications.length > 0) {
    await supabase.from('notification').insert(notifications);
  }
}

/**
 * Send session cancellation notification
 */
export async function sendSessionCancellationNotification(
  supabase: SupabaseClient,
  session: ProgramSession,
  program: Program,
  playerIds: string[]
): Promise<void> {
  const payload: ProgramNotificationPayload = {
    programId: program.id,
    programName: program.name,
    sessionDate: session.date,
  };

  const notifications = playerIds.map(playerId => ({
    type: 'program_session_cancelled' as const,
    user_id: playerId,
    title: `Session Cancelled: ${program.name}`,
    body: `Session on ${formatDate(session.date)} has been cancelled.`,
    data: payload,
    priority: 'high' as const,
  }));

  if (notifications.length > 0) {
    await supabase.from('notification').insert(notifications);
  }
}

/**
 * Send waitlist promotion notification
 */
export async function sendWaitlistPromotionNotification(
  supabase: SupabaseClient,
  waitlistEntry: ProgramWaitlist,
  program: Program
): Promise<void> {
  const payload: ProgramNotificationPayload = {
    programId: program.id,
    programName: program.name,
    expiresAt: waitlistEntry.promotion_expires_at || undefined,
  };

  await supabase.from('notification').insert({
    type: 'program_waitlist_promoted',
    user_id: waitlistEntry.player_id,
    title: `Spot Available: ${program.name}`,
    body: `A spot has opened up in ${program.name}! Complete your registration within 48 hours to claim it.`,
    data: payload,
    priority: 'high',
  });
}

/**
 * Send payment due notification
 */
export async function sendPaymentDueNotification(
  supabase: SupabaseClient,
  playerId: string,
  program: Program,
  amountCents: number,
  currency: string,
  dueDate: string
): Promise<void> {
  const payload: ProgramNotificationPayload = {
    programId: program.id,
    programName: program.name,
    amountCents,
    currency,
  };

  await supabase.from('notification').insert({
    type: 'program_payment_due',
    user_id: playerId,
    title: `Payment Due: ${program.name}`,
    body: `Your payment of ${formatCurrency(amountCents, currency)} is due on ${formatDate(dueDate)}.`,
    data: payload,
    priority: 'high',
  });
}

/**
 * Send payment received notification
 */
export async function sendPaymentReceivedNotification(
  supabase: SupabaseClient,
  playerId: string,
  program: Program,
  amountCents: number,
  currency: string,
  installmentNumber?: number,
  totalInstallments?: number
): Promise<void> {
  const payload: ProgramNotificationPayload = {
    programId: program.id,
    programName: program.name,
    amountCents,
    currency,
  };

  const installmentText =
    installmentNumber && totalInstallments && totalInstallments > 1
      ? ` (Payment ${installmentNumber} of ${totalInstallments})`
      : '';

  await supabase.from('notification').insert({
    type: 'program_payment_received',
    user_id: playerId,
    title: `Payment Received: ${program.name}`,
    body: `We received your payment of ${formatCurrency(amountCents, currency)}${installmentText}. Thank you!`,
    data: payload,
    priority: 'normal',
  });
}

/**
 * Notify all confirmed participants about program changes
 */
export async function notifyProgramParticipants(
  supabase: SupabaseClient,
  programId: string,
  notificationType: string,
  title: string,
  body: string
): Promise<void> {
  // Get all confirmed registrations
  const { data: registrations } = await supabase
    .from('program_registration')
    .select('player_id')
    .eq('program_id', programId)
    .eq('status', 'confirmed');

  if (!registrations || registrations.length === 0) return;

  const { data: program } = await supabase
    .from('program')
    .select('name')
    .eq('id', programId)
    .single();

  const notifications = registrations.map(reg => ({
    type: notificationType,
    user_id: reg.player_id,
    title,
    body,
    data: {
      programId,
      programName: program?.name,
    },
    priority: 'normal',
  }));

  await supabase.from('notification').insert(notifications);
}

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(cents: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}
