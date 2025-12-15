/**
 * Auth Feature
 *
 * Contains components and hooks for authentication flow.
 */

export { AuthWizard } from './components/AuthWizard';
export type { AuthWizardColors } from './components/AuthWizard';
export { EmailStep } from './components/steps/EmailStep';
export { OTPVerificationStep } from './components/steps/OTPVerificationStep';
export { useAuthWizard } from './hooks/useAuthWizard';
