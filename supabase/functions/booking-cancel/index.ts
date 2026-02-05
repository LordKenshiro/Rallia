/**
 * Booking Cancel Edge Function
 *
 * Cancels a booking with refund processing based on cancellation policy.
 * Consolidates logic from web cancel API route + cancel service so both
 * web and mobile can call supabase.functions.invoke('booking-cancel').
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

// ---------------------------------------------------------------------------
// Cancellation policy helpers (inlined from policy.ts)
// ---------------------------------------------------------------------------

interface CancellationPolicy {
  freeCancellationHours: number;
  partialRefundHours: number;
  partialRefundPercent: number;
  noRefundHours: number;
}

const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  freeCancellationHours: 24,
  partialRefundHours: 12,
  partialRefundPercent: 50,
  noRefundHours: 0,
};

async function getCancellationPolicy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  organizationId: string
): Promise<CancellationPolicy> {
  const { data: policy } = await supabase
    .from('cancellation_policy')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (!policy) return DEFAULT_CANCELLATION_POLICY;

  return {
    freeCancellationHours: policy.free_cancellation_hours,
    partialRefundHours: policy.partial_refund_hours,
    partialRefundPercent: policy.partial_refund_percent,
    noRefundHours: policy.no_refund_hours,
  };
}

function calculateRefundAmount(
  priceCents: number,
  hoursUntilBooking: number,
  policy: CancellationPolicy
): { refundAmountCents: number; refundPercent: number } {
  if (hoursUntilBooking >= policy.freeCancellationHours) {
    return { refundAmountCents: priceCents, refundPercent: 100 };
  }
  if (hoursUntilBooking >= policy.partialRefundHours) {
    const refundAmount = Math.round((priceCents * policy.partialRefundPercent) / 100);
    return { refundAmountCents: refundAmount, refundPercent: policy.partialRefundPercent };
  }
  if (hoursUntilBooking <= policy.noRefundHours) {
    return { refundAmountCents: 0, refundPercent: 0 };
  }
  return { refundAmountCents: 0, refundPercent: 0 };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ---- Auth ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const user = authData.user;

    // Service-role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ---- Parse body ----
    const body = await req.json();
    const { bookingId, reason, forceCancel } = body;

    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'Missing required field: bookingId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // ---- Fetch booking ----
    const { data: booking, error: bookingError } = await supabase
      .from('booking')
      .select(
        `id, organization_id, court_id, player_id, booking_date, start_time, end_time,
         status, price_cents, stripe_payment_intent_id, stripe_charge_id`
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // ---- Permission check ----
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
      return new Response(
        JSON.stringify({ error: 'You do not have permission to cancel this booking' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    if (forceCancel && !isOrgAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only organization admins can force cancel bookings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // ---- Validate cancellable ----
    if (booking.status === 'cancelled') {
      return new Response(JSON.stringify({ error: 'Booking is already cancelled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (booking.status === 'completed') {
      return new Response(JSON.stringify({ error: 'Cannot cancel a completed booking' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // ---- Calculate refund ----
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const policy = await getCancellationPolicy(supabase, booking.organization_id);

    const { refundAmountCents, refundPercent } = forceCancel
      ? { refundAmountCents: booking.price_cents, refundPercent: 100 }
      : calculateRefundAmount(booking.price_cents, hoursUntilBooking, policy);

    // ---- Stripe operations ----
    type RefundStatus = 'none' | 'pending' | 'partial' | 'refunded' | 'failed';
    let refundStatus: RefundStatus = 'none';
    let refundMessage: string | undefined;

    if (booking.stripe_payment_intent_id) {
      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          booking.stripe_payment_intent_id
        );

        if (
          paymentIntent.status === 'requires_payment_method' ||
          paymentIntent.status === 'requires_confirmation' ||
          paymentIntent.status === 'requires_action'
        ) {
          await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id);
          refundStatus = 'none';
          refundMessage = 'Payment cancelled (not yet processed)';
        } else if (paymentIntent.status === 'succeeded' && refundAmountCents > 0) {
          const chargeId =
            booking.stripe_charge_id ||
            (typeof paymentIntent.latest_charge === 'string'
              ? paymentIntent.latest_charge
              : paymentIntent.latest_charge?.id);

          if (chargeId) {
            const refund = await stripe.refunds.create({
              charge: chargeId,
              amount: refundAmountCents,
              reason: 'requested_by_customer',
              metadata: {
                booking_id: booking.id,
                cancelled_by: user.id,
                reason: reason || 'Customer requested cancellation',
              },
            });

            refundStatus = refund.amount === booking.price_cents ? 'refunded' : 'partial';
            refundMessage = `Refunded ${refundPercent}% (${refund.amount / 100} ${paymentIntent.currency?.toUpperCase()})`;
          }
        } else if (paymentIntent.status === 'succeeded' && refundAmountCents === 0) {
          refundStatus = 'none';
          refundMessage = 'No refund - cancelled outside refund window';
        }
      } catch (stripeError) {
        console.error('Error processing refund:', stripeError);
        refundStatus = 'failed';
        refundMessage = 'Failed to process refund. Please contact support.';
      }
    }

    // ---- Update booking ----
    const { error: updateError } = await supabase
      .from('booking')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        cancellation_reason: reason,
        refund_amount_cents: refundAmountCents,
        refund_status: refundStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Failed to update booking: ${updateError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // ---- Send notifications ----
    try {
      const { data: courtData } = await supabase
        .from('court')
        .select('name, facility:facility_id(name)')
        .eq('id', booking.court_id)
        .single();

      let playerName = 'A player';
      if (booking.player_id) {
        const { data: playerData } = await supabase
          .from('profile')
          .select('full_name')
          .eq('id', booking.player_id)
          .single();
        if (playerData?.full_name) {
          playerName = playerData.full_name;
        }
      }

      const courtName = courtData?.name || 'Court';
      const facilityName = (courtData?.facility as { name?: string } | null)?.name || '';

      const cancelledByPlayer = user.id === booking.player_id;

      if (cancelledByPlayer) {
        // Notify org staff via notification table insert (triggers send-notification)
        const { data: orgMembers } = await supabase
          .from('organization_member')
          .select('user_id')
          .eq('organization_id', booking.organization_id)
          .in('role', ['owner', 'admin'])
          .is('left_at', null);

        if (orgMembers?.length) {
          const notifications = orgMembers.map((m: { user_id: string }) => ({
            user_id: m.user_id,
            type: 'booking_cancelled_by_player',
            title: 'Booking Cancelled',
            body: `${playerName} cancelled their booking at ${courtName}${facilityName ? ` (${facilityName})` : ''} on ${booking.booking_date} ${booking.start_time}-${booking.end_time}`,
            data: {
              booking_id: booking.id,
              court_name: courtName,
              facility_name: facilityName,
              booking_date: booking.booking_date,
              start_time: booking.start_time,
              end_time: booking.end_time,
              player_name: playerName,
            },
            organization_id: booking.organization_id,
          }));

          await supabase.from('notification').insert(notifications);
        }
      } else if (booking.player_id) {
        // Notify the player their booking was cancelled by org
        await supabase.from('notification').insert({
          user_id: booking.player_id,
          type: 'booking_cancelled_by_org',
          title: 'Booking Cancelled',
          body: `Your booking at ${courtName}${facilityName ? ` (${facilityName})` : ''} on ${booking.booking_date} ${booking.start_time}-${booking.end_time} has been cancelled`,
          data: {
            booking_id: booking.id,
            court_name: courtName,
            facility_name: facilityName,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
          },
          organization_id: booking.organization_id,
        });
      }
    } catch (notifError) {
      console.error('Failed to send cancellation notifications:', notifError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundAmountCents,
        refundStatus,
        message: refundMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel booking';
    console.error('booking-cancel error:', message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
