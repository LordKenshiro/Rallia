/**
 * Booking Validation Functions (Client-Safe)
 *
 * These functions don't require Stripe and can be used in React Native.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BookingValidationResult } from './types';

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
