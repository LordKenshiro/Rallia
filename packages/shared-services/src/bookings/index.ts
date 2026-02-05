/**
 * Booking Services - Barrel Export
 *
 * Client-safe booking types, validation, and utility functions.
 * The unified bookingService calls Supabase Edge Functions for
 * Stripe-dependent operations and direct Supabase for reads.
 */

// Types
export * from './types';

// Unified booking service (Edge Function backed – use this for new code)
export * from './bookingService';

// Validation functions
export * from './validation';

// Cancellation policy functions
export * from './policy';

// Status functions
export * from './status';

// Mobile booking service (calls web API from mobile app)
// @deprecated Use bookingService instead
export * from './mobileBookingService';

// Time normalization for slot comparison
export * from './timeUtils';
