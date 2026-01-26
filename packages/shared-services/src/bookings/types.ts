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
