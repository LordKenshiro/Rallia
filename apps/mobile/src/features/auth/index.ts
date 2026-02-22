/**
 * Auth Feature
 *
 * Contains components, hooks, and utilities for authentication flow.
 */

// Components
export { AuthWizard } from './components/AuthWizard';
export type { AuthWizardColors } from './components/AuthWizard';
export { EmailStep } from './components/steps/EmailStep';
export { OTPVerificationStep } from './components/steps/OTPVerificationStep';

// Hooks
export { useAuthWizard } from './hooks/useAuthWizard';
export { useSocialAuth } from './hooks/useSocialAuth';
export type { SocialProvider, SocialAuthResult } from './hooks/useSocialAuth';

// Utilities
export { checkOnboardingStatus, getFriendlyErrorMessage, RESEND_COOLDOWN_SECONDS } from './utils';
