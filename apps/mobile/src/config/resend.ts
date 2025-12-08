/**
 * Resend Configuration
 * Initialize Resend API for email verification
 */

import { initializeResend, Logger } from '@rallia/shared-services';

// Resend API Key - Store this in environment variables
// For development, you can temporarily hardcode it, but NEVER commit to git
// For production, use Expo's environment variables or secure storage
const RESEND_API_KEY = process.env.EXPO_PUBLIC_RESEND_API_KEY || '';

/**
 * Initialize Resend on app startup
 * Call this in your App.tsx before rendering the app
 */
export const setupResend = () => {
  if (!RESEND_API_KEY) {
    Logger.warn('Resend API key not found - email verification will not work');
    Logger.warn('Set EXPO_PUBLIC_RESEND_API_KEY in environment variables');
    return;
  }

  try {
    initializeResend(RESEND_API_KEY);
    Logger.info('resend_initialized');
  } catch (error) {
    Logger.error('Failed to initialize Resend', error as Error);
  }
};
