/**
 * useAuthWizard Hook
 *
 * Manages authentication wizard state and logic.
 * Extracted from AuthOverlay for reusability in the wizard pattern.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../hooks';
import { ProfileService, Logger } from '@rallia/shared-services';
import { supabase } from '../../../lib/supabase';
import { lightHaptic, mediumHaptic, successHaptic } from '@rallia/shared-utils';

interface UseAuthWizardReturn {
  // State
  email: string;
  setEmail: (email: string) => void;
  code: string;
  setCode: (code: string) => void;
  isLoading: boolean;
  errorMessage: string;

  // Actions
  handleEmailSubmit: () => Promise<boolean>;
  handleResendCode: () => Promise<void>;
  handleVerifyCode: () => Promise<{ success: boolean; needsOnboarding: boolean }>;
  resetState: () => void;

  // Validation
  isEmailValid: boolean;
  isCodeComplete: boolean;
}

/**
 * Email validation regex
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export function useAuthWizard(): UseAuthWizardReturn {
  const { signInWithEmail, verifyOtp } = useAuth();

  // State
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Computed
  const isEmailValid = isValidEmail(email);
  const isCodeComplete = code.length === 6;

  /**
   * Reset all state
   */
  const resetState = useCallback(() => {
    setEmail('');
    setCode('');
    setErrorMessage('');
    setIsLoading(false);
  }, []);

  /**
   * Submit email for OTP
   * @returns true if OTP was sent successfully
   */
  const handleEmailSubmit = useCallback(async (): Promise<boolean> => {
    if (!isEmailValid) return false;

    mediumHaptic();
    setIsLoading(true);
    setErrorMessage('');

    try {
      Logger.debug('Sending OTP via Supabase SDK', { emailDomain: email.split('@')[1] });

      const result = await signInWithEmail(email);

      if (result.success) {
        Logger.info('OTP sent successfully', { emailDomain: email.split('@')[1] });
        setIsLoading(false);
        return true;
      } else {
        const errorMsg = result.error?.message || 'Failed to send verification code';
        setErrorMessage(errorMsg);
        Alert.alert('Error', errorMsg);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      Logger.error('Failed to send OTP', error as Error, { emailDomain: email.split('@')[1] });
      setErrorMessage('An unexpected error occurred');
      Alert.alert('Error', 'An unexpected error occurred');
      setIsLoading(false);
      return false;
    }
  }, [email, isEmailValid, signInWithEmail]);

  /**
   * Resend verification code
   */
  const handleResendCode = useCallback(async (): Promise<void> => {
    lightHaptic();
    setIsLoading(true);
    setErrorMessage('');
    setCode(''); // Clear the input field when resending

    try {
      const result = await signInWithEmail(email);

      if (result.success) {
        Logger.info('OTP resent successfully', { emailDomain: email.split('@')[1] });
        Alert.alert('Success', 'Verification code sent!');
      } else {
        const errorMsg = result.error?.message || 'Failed to resend verification code';
        setErrorMessage(errorMsg);
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      Logger.error('Failed to resend OTP', error as Error, { emailDomain: email.split('@')[1] });
      setErrorMessage('An unexpected error occurred');
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [email, signInWithEmail]);

  /**
   * Verify OTP code
   * @returns object with success status and whether user needs onboarding
   */
  const handleVerifyCode = useCallback(async (): Promise<{
    success: boolean;
    needsOnboarding: boolean;
  }> => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter all 6 digits');
      return { success: false, needsOnboarding: false };
    }

    mediumHaptic();
    setIsLoading(true);
    setErrorMessage('');

    try {
      Logger.debug('Verifying OTP via Supabase SDK', {
        emailDomain: email.split('@')[1],
        codeLength: code.length,
      });

      const result = await verifyOtp(email, code);

      if (!result.success) {
        const errorMsg = result.error?.message || 'Invalid verification code';
        setErrorMessage(errorMsg);
        Alert.alert('Error', errorMsg);
        setIsLoading(false);
        return { success: false, needsOnboarding: false };
      }

      Logger.info('OTP verified successfully', { emailDomain: email.split('@')[1] });

      // Wait for session to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get user ID to check onboarding status
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        Logger.error('No user ID after OTP verification', new Error('Missing userId'));
        setErrorMessage('Authentication failed - please try again');
        Alert.alert('Error', 'Authentication failed - please try again');
        setIsLoading(false);
        return { success: false, needsOnboarding: false };
      }

      Logger.info('User authenticated successfully', { userId });

      // Check if this is a returning user (profile exists with completed onboarding)
      const { data: profile, error: profileError } = await ProfileService.getProfile(userId);

      if (profileError) {
        // PGRST116 means no profile found - this is expected for new users
        const errorCode = (profileError as { code?: string })?.code;
        const isNoRowsError = errorCode === 'PGRST116';
        if (isNoRowsError) {
          Logger.debug('No profile found - treating as new user', { userId });
        } else {
          Logger.error('Failed to fetch profile', profileError as Error, { userId });
        }
        // If there's an error fetching profile, treat as new user
        successHaptic();
        setIsLoading(false);
        return { success: true, needsOnboarding: true };
      }

      // Check if onboarding is already completed
      if (profile && profile.onboarding_completed) {
        Logger.logNavigation('returning_user_skip_onboarding', {
          userId,
          onboardingCompleted: true,
        });
        successHaptic();
        setIsLoading(false);
        return { success: true, needsOnboarding: false };
      } else {
        Logger.logNavigation('new_user_start_onboarding', {
          userId,
          onboardingCompleted: false,
        });
        successHaptic();
        setIsLoading(false);
        return { success: true, needsOnboarding: true };
      }
    } catch (error) {
      Logger.error('Error during OTP verification', error as Error);
      setErrorMessage('An unexpected error occurred');
      Alert.alert('Error', 'An unexpected error occurred');
      setIsLoading(false);
      return { success: false, needsOnboarding: false };
    }
  }, [code, email, verifyOtp]);

  return {
    email,
    setEmail,
    code,
    setCode,
    isLoading,
    errorMessage,
    handleEmailSubmit,
    handleResendCode,
    handleVerifyCode,
    resetState,
    isEmailValid,
    isCodeComplete,
  };
}

export default useAuthWizard;
