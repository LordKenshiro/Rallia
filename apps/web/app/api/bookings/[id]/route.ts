/**
 * GET /api/bookings/[id] - Get booking details
 * PATCH /api/bookings/[id] - Update booking status
 */

import { createClient } from '@/lib/supabase/server';
import { updateBookingStatus, type BookingStatus } from '@rallia/shared-services';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET - Get booking details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get booking with related data
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
        currency,
        requires_approval,
        approved_by,
        approved_at,
        cancelled_at,
        cancelled_by,
        cancellation_reason,
        refund_amount_cents,
        refund_status,
        notes,
        created_at,
        updated_at,
        court:court_id (
          id,
          name,
          court_number,
          facility:facility_id (
            id,
            name,
            timezone
          )
        )
      `
      )
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('Error fetching booking:', bookingError);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Fetch player/profile info separately if player_id exists
    let player = null;
    if (booking.player_id) {
      const { data: profile } = await supabase
        .from('profile')
        .select('id, first_name, last_name, display_name, email')
        .eq('id', booking.player_id)
        .single();

      if (profile) {
        player = {
          id: booking.player_id,
          profile,
        };
      }
    }

    // Check if user has access to this booking
    const isBookingOwner = booking.player_id === user.id;

    let isOrgMember = false;
    if (!isBookingOwner && booking.organization_id) {
      const { data: membership } = await supabase
        .from('organization_member')
        .select('role')
        .eq('organization_id', booking.organization_id)
        .eq('user_id', user.id)
        .single();

      isOrgMember = !!membership;
    }

    if (!isBookingOwner && !isOrgMember) {
      return NextResponse.json(
        { error: 'You do not have permission to view this booking' },
        { status: 403 }
      );
    }

    // Return booking with player data attached
    return NextResponse.json({
      booking: {
        ...booking,
        player,
      },
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}

/**
 * PATCH - Update booking status
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: bookingId } = await params;
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
    const { status: newStatus } = body;

    if (!newStatus) {
      return NextResponse.json({ error: 'Missing required field: status' }, { status: 400 });
    }

    // Validate status value
    const validStatuses: BookingStatus[] = [
      'pending',
      'confirmed',
      'cancelled',
      'completed',
      'no_show',
      'awaiting_approval',
    ];

    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Get booking to check permissions
    const { data: booking, error: bookingError } = await supabase
      .from('booking')
      .select('id, organization_id, player_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user is an org admin (required for status updates)
    let isOrgAdmin = false;
    if (booking.organization_id) {
      const { data: membership } = await supabase
        .from('organization_member')
        .select('role')
        .eq('organization_id', booking.organization_id)
        .eq('user_id', user.id)
        .single();

      isOrgAdmin = membership?.role === 'owner' || membership?.role === 'admin';
    }

    // Players can only mark their own booking as completed
    const isBookingOwner = booking.player_id === user.id;
    const canUpdate = isOrgAdmin || (isBookingOwner && newStatus === 'completed');

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'You do not have permission to update this booking' },
        { status: 403 }
      );
    }

    // Update the booking status
    const result = await updateBookingStatus(supabase, {
      bookingId,
      newStatus,
      updatedBy: user.id,
    });

    return NextResponse.json({
      success: result.success,
      booking: result.booking,
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    const message = error instanceof Error ? error.message : 'Failed to update booking';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
