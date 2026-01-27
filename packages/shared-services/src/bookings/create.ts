/**
 * Booking Creation Service
 *
 * Handles creating new bookings with payment processing.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateBookingParams, CreateBookingResult, BookingValidationResult } from './types';
import { organizationNotificationFactory } from '../notifications/organizationNotificationFactory';

// Lazy import Stripe functions to avoid bundling Stripe SDK in React Native
async function getStripeFunctions() {
  // Dynamic import only loads in Node.js/server environments
  const stripeModule = await import('../stripe/payments');
  return {
    createPaymentIntent: stripeModule.createPaymentIntent,
    calculateApplicationFee: stripeModule.calculateApplicationFee,
  };
}

/**
 * Validate that a slot is available for booking
 */
export async function validateBookingSlot(
  supabase: SupabaseClient,
  params: {
    courtId: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
  }
): Promise<BookingValidationResult> {
  // First, check if the court is available for bookings
  const { data: court, error: courtError } = await supabase
    .from('court')
    .select('availability_status')
    .eq('id', params.courtId)
    .single();

  if (courtError) {
    return {
      valid: false,
      error: 'Court not found',
    };
  }

  if (court.availability_status !== 'available') {
    const statusMessages: Record<string, string> = {
      maintenance: 'This court is currently under maintenance',
      closed: 'This court is closed',
      reserved: 'This court is reserved',
    };
    return {
      valid: false,
      error: statusMessages[court.availability_status] || 'This court is not available for booking',
    };
  }

  // Get available slots for the court on the booking date
  const { data: availableSlots, error } = await supabase.rpc('get_available_slots', {
    p_court_id: params.courtId,
    p_date: params.bookingDate,
  });

  if (error) {
    return {
      valid: false,
      error: `Failed to check availability: ${error.message}`,
    };
  }

  // Find the matching slot
  const matchingSlot = availableSlots?.find(
    (slot: { start_time: string; end_time: string }) =>
      slot.start_time === params.startTime && slot.end_time === params.endTime
  );

  if (!matchingSlot) {
    return {
      valid: false,
      error: 'The requested time slot is not available',
    };
  }

  return {
    valid: true,
    availableSlot: {
      courtId: params.courtId,
      date: params.bookingDate,
      startTime: matchingSlot.start_time,
      endTime: matchingSlot.end_time,
      priceCents: matchingSlot.price_cents,
      templateSource: matchingSlot.template_source,
    },
  };
}

/**
 * Check organization settings for booking constraints
 */
export async function checkBookingConstraints(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    bookingDate: string;
    startTime: string;
  }
): Promise<{ valid: boolean; error?: string }> {
  // Get organization settings
  const { data: settings } = await supabase
    .from('organization_settings')
    .select('*')
    .eq('organization_id', params.organizationId)
    .single();

  if (!settings) {
    // No settings = use defaults, allow booking
    return { valid: true };
  }

  const now = new Date();
  const bookingDateTime = new Date(`${params.bookingDate}T${params.startTime}`);
  const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Check same-day booking
  // Format today in local timezone to avoid UTC conversion issues
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = params.bookingDate === todayLocal;
  if (isToday && !settings.allow_same_day_booking) {
    return { valid: false, error: 'Same-day bookings are not allowed' };
  }

  // Check minimum notice
  if (hoursUntilBooking < settings.min_booking_notice_hours) {
    return {
      valid: false,
      error: `Bookings require at least ${settings.min_booking_notice_hours} hours notice`,
    };
  }

  // Check maximum advance booking
  const daysInAdvance = Math.ceil(hoursUntilBooking / 24);
  if (daysInAdvance > settings.max_advance_booking_days) {
    return {
      valid: false,
      error: `Bookings can only be made up to ${settings.max_advance_booking_days} days in advance`,
    };
  }

  return { valid: true };
}

/**
 * Check if player is blocked by the organization
 */
export async function checkPlayerBlocked(
  supabase: SupabaseClient,
  organizationId: string,
  playerId: string
): Promise<{ blocked: boolean; reason?: string }> {
  const { data: block } = await supabase
    .from('organization_player_block')
    .select('reason, blocked_until')
    .eq('organization_id', organizationId)
    .eq('player_id', playerId)
    .eq('is_active', true)
    .single();

  if (!block) {
    return { blocked: false };
  }

  // Check if block has expired
  if (block.blocked_until && new Date(block.blocked_until) < new Date()) {
    return { blocked: false };
  }

  return {
    blocked: true,
    reason: block.reason || 'You are blocked from booking at this organization',
  };
}

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
    const stripeFunctions = await getStripeFunctions();
    const applicationFee = stripeFunctions.calculateApplicationFee(
      params.priceCents,
      params.applicationFeePercent
    );

    // Generate a temporary booking ID for metadata
    const tempBookingId = crypto.randomUUID();

    const paymentResult = await stripeFunctions.createPaymentIntent({
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

  // 7. Send notifications
  try {
    // Get court and player details for notification
    const { data: courtData } = await supabase
      .from('court')
      .select('name, facility:facility_id(name)')
      .eq('id', params.courtId)
      .single();

    let playerName = 'A player';
    if (params.playerId) {
      const { data: playerData } = await supabase
        .from('profile')
        .select('full_name')
        .eq('id', params.playerId)
        .single();
      if (playerData?.full_name) {
        playerName = playerData.full_name;
      }
    }

    const courtName = courtData?.name || 'Court';
    const facilityName = (courtData?.facility as { name?: string } | null)?.name || '';

    // Notify organization staff about the new booking
    await organizationNotificationFactory.bookingCreated(params.organizationId, booking.id, {
      bookingId: booking.id,
      courtName,
      facilityName,
      bookingDate: params.bookingDate,
      startTime: params.startTime,
      endTime: params.endTime,
      playerName,
      priceCents: params.priceCents,
      currency: params.currency || 'CAD',
    });

    // Send booking confirmation to the player if they have an account
    if (params.playerId) {
      await organizationNotificationFactory.bookingConfirmed(
        params.organizationId,
        params.playerId,
        booking.id,
        {
          bookingId: booking.id,
          courtName,
          facilityName,
          bookingDate: params.bookingDate,
          startTime: params.startTime,
          endTime: params.endTime,
          priceCents: params.priceCents,
          currency: params.currency || 'CAD',
        }
      );
    }
  } catch (notifError) {
    // Don't fail the booking if notification fails
    console.error('Failed to send booking notifications:', notifError);
  }

  return {
    bookingId: booking.id,
    status: booking.status,
    clientSecret,
    paymentIntentId,
  };
}
