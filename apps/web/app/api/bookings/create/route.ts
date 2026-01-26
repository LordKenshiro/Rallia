/**
 * POST /api/bookings/create
 *
 * Creates a new booking with optional payment processing.
 */

import { createClient } from '@/lib/supabase/server';
import { createBooking } from '@rallia/shared-services';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const {
      courtId,
      bookingDate,
      startTime,
      endTime,
      skipPayment,
      playerId: requestedPlayerId,
      guestName,
      guestEmail,
      guestPhone,
      notes,
    } = body;

    // Validate required fields
    if (!courtId || !bookingDate || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: courtId, bookingDate, startTime, endTime' },
        { status: 400 }
      );
    }

    // Get court and organization info
    const { data: court, error: courtError } = await supabase
      .from('court')
      .select(
        `
        id,
        facility:facility_id (
          id,
          organization_id
        )
      `
      )
      .eq('id', courtId)
      .single();

    if (courtError || !court || !court.facility) {
      return NextResponse.json({ error: 'Court not found' }, { status: 404 });
    }

    const facility = court.facility as { id: string; organization_id: string };
    const organizationId = facility.organization_id;

    // Determine the player ID - if a different playerId is provided, verify the requester is org staff
    let effectivePlayerId = user.id;
    let isStaffBooking = false;

    if (requestedPlayerId && requestedPlayerId !== user.id) {
      // Check if the current user is org staff
      const { data: membership } = await supabase
        .from('organization_member')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .is('left_at', null)
        .single();

      const isOrgStaff = membership?.role && ['owner', 'admin', 'staff'].includes(membership.role);

      if (!isOrgStaff) {
        return NextResponse.json(
          { error: 'Only organization staff can create bookings for other players' },
          { status: 403 }
        );
      }

      effectivePlayerId = requestedPlayerId;
      isStaffBooking = true;
    }

    // Check if this is a guest booking (staff-only)
    const isGuestBooking = guestName && !requestedPlayerId;
    if (isGuestBooking) {
      // Check if the current user is org staff
      const { data: membership } = await supabase
        .from('organization_member')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .is('left_at', null)
        .single();

      const isOrgStaff = membership?.role && ['owner', 'admin', 'staff'].includes(membership.role);

      if (!isOrgStaff) {
        return NextResponse.json(
          { error: 'Only organization staff can create guest bookings' },
          { status: 403 }
        );
      }

      isStaffBooking = true;
      // For guest bookings, player_id will be null - guest info stored in notes
    }

    // Get Stripe account for the organization (if payment is needed)
    let stripeAccountId: string | undefined;
    if (!skipPayment) {
      const { data: stripeAccount } = await supabase
        .from('organization_stripe_account')
        .select('stripe_account_id, charges_enabled')
        .eq('organization_id', organizationId)
        .single();

      if (!stripeAccount || !stripeAccount.charges_enabled) {
        return NextResponse.json(
          { error: 'This organization cannot accept payments yet' },
          { status: 400 }
        );
      }

      stripeAccountId = stripeAccount.stripe_account_id;
    }

    // Get the price for the slot
    const { data: slots, error: slotsError } = await supabase.rpc('get_available_slots', {
      p_court_id: courtId,
      p_date: bookingDate,
    });

    if (slotsError) {
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
    }

    const matchingSlot = slots?.find(
      (slot: { start_time: string; end_time: string }) =>
        slot.start_time === startTime && slot.end_time === endTime
    );

    if (!matchingSlot) {
      return NextResponse.json(
        { error: 'The requested time slot is not available' },
        { status: 400 }
      );
    }

    // Check if approval is required
    const { data: settings } = await supabase
      .from('organization_settings')
      .select('require_booking_approval')
      .eq('organization_id', organizationId)
      .single();

    const requiresApproval = settings?.require_booking_approval || false;

    // For staff-created bookings with skipPayment, skip payment requirement check
    const shouldSkipPayment = skipPayment || (isStaffBooking && skipPayment !== false);

    // Build notes for guest bookings
    let bookingNotes = notes || '';
    if (isGuestBooking) {
      const guestInfo = [`Guest: ${guestName}`];
      if (guestEmail) guestInfo.push(`Email: ${guestEmail}`);
      if (guestPhone) guestInfo.push(`Phone: ${guestPhone}`);
      bookingNotes = guestInfo.join(' | ') + (bookingNotes ? ` | ${bookingNotes}` : '');
    }

    // Create the booking
    const result = await createBooking(supabase, {
      courtId,
      organizationId,
      playerId: isGuestBooking ? null : effectivePlayerId,
      bookingDate,
      startTime,
      endTime,
      priceCents: matchingSlot.price_cents,
      currency: 'CAD',
      requiresApproval: isStaffBooking ? false : requiresApproval, // Staff bookings auto-confirmed
      skipPayment: shouldSkipPayment,
      stripeAccountId,
      applicationFeePercent: 5, // 5% platform fee
      notes: bookingNotes || undefined,
    });

    return NextResponse.json({
      success: true,
      bookingId: result.bookingId,
      status: result.status,
      clientSecret: result.clientSecret,
      priceCents: matchingSlot.price_cents,
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    const message = error instanceof Error ? error.message : 'Failed to create booking';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
