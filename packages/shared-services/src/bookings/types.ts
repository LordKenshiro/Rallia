/**
 * Booking Types
 */

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'
  | 'awaiting_approval';

export type RefundStatus = 'none' | 'pending' | 'partial' | 'refunded' | 'failed';

export interface CreateBookingParams {
  courtId: string;
  organizationId: string;
  /** Player ID - optional for guest bookings */
  playerId?: string | null;
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
  priceCents: number;
  currency?: string;
  requiresApproval?: boolean;
  /** If true, skip payment processing (for cash/manual bookings) */
  skipPayment?: boolean;
  /** Stripe connected account ID for the organization */
  stripeAccountId?: string;
  /** Application fee percentage (0-100) */
  applicationFeePercent?: number;
  /** Notes for the booking (e.g., guest info) */
  notes?: string;
}

export interface CreateBookingResult {
  bookingId: string;
  status: BookingStatus;
  /** Stripe PaymentIntent client secret (null if skipPayment is true) */
  clientSecret: string | null;
  /** Stripe PaymentIntent ID */
  paymentIntentId: string | null;
}

export interface CancelBookingParams {
  bookingId: string;
  cancelledBy: string;
  reason?: string;
  /** Force cancel even if outside cancellation window */
  forceCancel?: boolean;
}

export interface CancelBookingResult {
  success: boolean;
  refundAmountCents: number;
  refundStatus: RefundStatus;
  message?: string;
}

export interface UpdateBookingStatusParams {
  bookingId: string;
  newStatus: BookingStatus;
  updatedBy: string;
}

export interface CancellationPolicy {
  freeCancellationHours: number;
  partialRefundHours: number;
  partialRefundPercent: number;
  noRefundHours: number;
}

export interface BookingSlot {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  priceCents: number;
  templateSource: 'facility' | 'court';
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amountCents: number;
  status: RefundStatus;
  error?: string;
}

export interface BookingValidationResult {
  valid: boolean;
  error?: string;
  availableSlot?: BookingSlot;
}

// ---------------------------------------------------------------------------
// Client-facing types for the unified bookingService (Edge Function backed)
// ---------------------------------------------------------------------------

/** Parameters for creating a booking via the Edge Function */
export interface CreateBookingClientParams {
  courtId: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM or HH:MM:SS
  endTime: string; // HH:MM or HH:MM:SS
  notes?: string;
  /** Book on behalf of another player (staff only) */
  playerId?: string;
  /** Guest name (staff-created guest bookings) */
  guestName?: string;
  /** Guest email (staff-created guest bookings) */
  guestEmail?: string;
  /** Guest phone (staff-created guest bookings) */
  guestPhone?: string;
  /** Skip payment for staff / cash bookings */
  skipPayment?: boolean;
}

/** Result from the booking-create Edge Function */
export interface CreateBookingClientResult {
  bookingId: string;
  status: BookingStatus;
  clientSecret: string | null;
  priceCents: number;
}

/** Parameters for cancelling a booking via the Edge Function */
export interface CancelBookingClientParams {
  bookingId: string;
  reason?: string;
  forceCancel?: boolean;
}

/** Result from the booking-cancel Edge Function */
export interface CancelBookingClientResult {
  success: boolean;
  refundAmountCents: number;
  refundStatus: RefundStatus;
  message?: string;
}

/** Booking record with joined court and facility details */
export interface BookingWithDetails {
  id: string;
  organization_id: string;
  court_id: string;
  player_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  price_cents: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  requires_approval: boolean;
  notes: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  refund_amount_cents: number | null;
  refund_status: RefundStatus | null;
  created_at: string;
  updated_at: string;
  court: {
    id: string;
    name: string | null;
    court_number: number | null;
    facility: {
      id: string;
      name: string;
      organization_id: string;
    };
  };
}

/** Filters for listing bookings */
export interface BookingListFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: BookingStatus | BookingStatus[];
  limit?: number;
  offset?: number;
}
