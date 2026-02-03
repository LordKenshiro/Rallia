/**
 * Booking Services - Barrel Export
 *
 * Client-safe booking types, validation, and utility functions.
 * For server-side functions (createBooking, cancelBooking), use the
 * web app's lib/bookings module instead.
 */

// Types
export * from './types';

// Validation functions
export * from './validation';

// Cancellation policy functions
export * from './policy';

// Status functions
export * from './status';

// Mobile booking service (calls web API from mobile app)
export * from './mobileBookingService';

// Time normalization for slot comparison
export * from './timeUtils';
