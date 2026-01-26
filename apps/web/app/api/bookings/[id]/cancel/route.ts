/**
 * POST /api/bookings/[id]/cancel
 *
 * Cancels a booking with refund processing based on cancellation policy.
 */

import { createClient } from '@/lib/supabase/server';
import { cancelBooking } from '@rallia/shared-services';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const body = await request.json().catch(() => ({}));
    const { reason, forceCancel } = body;

    // Get the booking to check permissions
    const { data: booking, error: bookingError } = await supabase
      .from('booking')
      .select('id, player_id, organization_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user is the booking owner or an org admin
    const isBookingOwner = booking.player_id === user.id;

    let isOrgAdmin = false;
    if (!isBookingOwner && booking.organization_id) {
      const { data: membership } = await supabase
        .from('organization_member')
        .select('role')
        .eq('organization_id', booking.organization_id)
        .eq('user_id', user.id)
        .single();

      isOrgAdmin = membership?.role === 'owner' || membership?.role === 'admin';
    }

    if (!isBookingOwner && !isOrgAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to cancel this booking' },
        { status: 403 }
      );
    }

    // Only org admins can force cancel
    if (forceCancel && !isOrgAdmin) {
      return NextResponse.json(
        { error: 'Only organization admins can force cancel bookings' },
        { status: 403 }
      );
    }

    // Cancel the booking
    const result = await cancelBooking(supabase, {
      bookingId,
      cancelledBy: user.id,
      reason,
      forceCancel: isOrgAdmin ? forceCancel : false,
    });

    return NextResponse.json({
      success: result.success,
      refundAmountCents: result.refundAmountCents,
      refundStatus: result.refundStatus,
      message: result.message,
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    const message = error instanceof Error ? error.message : 'Failed to cancel booking';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
