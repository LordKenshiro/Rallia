/**
 * useSocialAuth Hook
 *
 * Handles native social authentication for Google and Apple.
 * Integrates with Supabase Auth for session management.
 *
 * NOTE: This requires a development build (not Expo Go) because it uses
 * native modules that aren't available in Expo Go.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '../../../lib/supabase';
import { Logger } from '@rallia/shared-services';
import { lightHaptic, successHaptic, warningHaptic } from '@rallia/shared-utils';
import { checkOnboardingStatus, getFriendlyErrorMessage } from '../utils';

// =============================================================================
// TYPES
// =============================================================================

export type SocialProvider = 'google' | 'apple';

export interface SocialAuthResult {
  success: boolean;
  needsOnboarding: boolean;
  error?: Error;
}

interface UseSocialAuthReturn {
  // State
  isLoading: boolean;
  loadingProvider: SocialProvider | null;
  errorMessage: string;

  // Actions
  signInWithGoogle: () => Promise<SocialAuthResult>;
  signInWithApple: () => Promise<SocialAuthResult>;

  // Utilities
  isAppleSignInAvailable: boolean;
  isNativeBuild: boolean;
}

// =============================================================================
// EXPO GO DETECTION
// =============================================================================

/**
 * Check if we're running in Expo Go (which doesn't support native modules)
 */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

// =============================================================================
// CONFIGURATION
// =============================================================================

// Configure Google Sign-In
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

// Lazy-loaded native modules (only available in dev builds, not Expo Go)
let GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin | null =
  null;
let statusCodes: typeof import('@react-native-google-signin/google-signin').statusCodes | null =
  null;
let isSuccessResponse:
  | typeof import('@react-native-google-signin/google-signin').isSuccessResponse
  | null = null;
let isErrorWithCode:
  | typeof import('@react-native-google-signin/google-signin').isErrorWithCode
  | null = null;

let nativeModulesInitialized = false;

/**
 * Initialize native modules lazily (only in dev builds)
 */
async function initializeNativeModules(): Promise<boolean> {
  if (nativeModulesInitialized) return true;
  if (isExpoGo()) {
    Logger.debug('Running in Expo Go - native social auth modules not available');
    return false;
  }

  let googleInitialized = false;

  // Initialize Google Sign-In
  try {
    const googleModule = await import('@react-native-google-signin/google-signin');
    GoogleSignin = googleModule.GoogleSignin;
    statusCodes = googleModule.statusCodes;
    isSuccessResponse = googleModule.isSuccessResponse;
    isErrorWithCode = googleModule.isErrorWithCode;

    // Configure Google Sign-In
    // For iOS, we prioritize the native client ID and disable offline access to avoid token audience issues
    GoogleSignin.configure({
      ...(Platform.OS === 'ios'
        ? {
            iosClientId: GOOGLE_IOS_CLIENT_ID,
            offlineAccess: false, // Disable to ensure iOS client ID is used in token
          }
        : {
            webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
            offlineAccess: !!GOOGLE_WEB_CLIENT_ID,
          }),
      scopes: ['email', 'profile'],
    });

    googleInitialized = true;
    Logger.debug('Google Sign-In initialized successfully');
  } catch (error) {
    Logger.error('Failed to initialize Google Sign-In', error as Error);
  }

  nativeModulesInitialized = googleInitialized;
  Logger.debug('Native social auth modules initialization complete', {
    google: googleInitialized,
  });
  return nativeModulesInitialized;
}

// =============================================================================
// HOOK
// =============================================================================

export function useSocialAuth(): UseSocialAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const initAttempted = useRef(false);

  // Check if we're in a native build (not Expo Go)
  const isNativeBuild = !isExpoGo();

  // Check Apple Sign-In availability (iOS 13+ only)
  const isAppleSignInAvailable =
    Platform.OS === 'ios' && AppleAuthentication.isAvailableAsync !== undefined;

  // Initialize native modules on mount (only in dev builds)
  useEffect(() => {
    if (!initAttempted.current && isNativeBuild) {
      initAttempted.current = true;
      initializeNativeModules();
    }
  }, [isNativeBuild]);

  /**
   * Show Expo Go warning
   */
  const showExpoGoWarning = useCallback((provider: string) => {
    Alert.alert(
      'Development Build Required',
      `${provider} Sign-In requires a development build and is not available in Expo Go.\n\nTo test social sign-in:\n1. Run: eas build --profile development\n2. Install the development build on your device`,
      [{ text: 'OK' }]
    );
  }, []);

  /**
   * Sign in with Google using native SDK
   */
  const signInWithGoogle = useCallback(async (): Promise<SocialAuthResult> => {
    // Check for Expo Go
    if (!isNativeBuild) {
      showExpoGoWarning('Google');
      return { success: false, needsOnboarding: false };
    }

    if (!GoogleSignin) {
      setErrorMessage('Google Sign-In not initialized');
      return { success: false, needsOnboarding: false };
    }

    lightHaptic();
    setIsLoading(true);
    setLoadingProvider('google');
    setErrorMessage('');

    try {
      Logger.logUserAction('social_signin_initiated', { provider: 'google' });

      // Check if Google Play Services are available (Android)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Perform sign-in
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse || !isSuccessResponse(response)) {
        throw new Error('Google sign-in was cancelled or failed');
      }

      const { idToken } = response.data;

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      Logger.debug('Google sign-in successful, authenticating with Supabase');

      // Sign in to Supabase with the Google ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        Logger.error('Supabase Google auth failed', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('No user returned from Supabase');
      }

      Logger.info('Google sign-in completed successfully', { userId: data.user.id });
      successHaptic();

      const needsOnboarding = await checkOnboardingStatus(data.user.id);

      setIsLoading(false);
      setLoadingProvider(null);
      return { success: true, needsOnboarding };
    } catch (error) {
      setIsLoading(false);
      setLoadingProvider(null);

      // Handle Google Sign-In specific error codes
      if (isErrorWithCode && isErrorWithCode(error) && statusCodes) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            Logger.debug('Google sign-in cancelled by user');
            return { success: false, needsOnboarding: false };
          case statusCodes.IN_PROGRESS:
            setErrorMessage('A sign-in is already in progress.');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE: {
            const playServicesError =
              'Google Play Services is required. Please update it and try again.';
            setErrorMessage(playServicesError);
            Alert.alert('Error', playServicesError);
            break;
          }
          default: {
            const friendlyError = getFriendlyErrorMessage(error);
            setErrorMessage(friendlyError);
            Alert.alert('Error', friendlyError);
          }
        }
      } else {
        // Use friendly error message utility for all other errors
        const friendlyError = getFriendlyErrorMessage(error);
        setErrorMessage(friendlyError);
        Alert.alert('Error', friendlyError);
      }

      Logger.error('Google sign-in error', error as Error);
      warningHaptic();
      return { success: false, needsOnboarding: false, error: error as Error };
    }
  }, [isNativeBuild, showExpoGoWarning]);

  /**
   * Sign in with Apple using native SDK (iOS only)
   */
  const signInWithApple = useCallback(async (): Promise<SocialAuthResult> => {
    lightHaptic();
    setIsLoading(true);
    setLoadingProvider('apple');
    setErrorMessage('');

    try {
      Logger.logUserAction('social_signin_initiated', { provider: 'apple' });

      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is only available on iOS');
      }

      // Generate a secure random nonce
      const rawNonce = Array.from(await Crypto.getRandomBytesAsync(32), byte =>
        byte.toString(16).padStart(2, '0')
      ).join('');

      // Hash the nonce for Apple (SHA-256)
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      Logger.debug('Apple sign-in successful, authenticating with Supabase');

      // Sign in to Supabase with the Apple identity token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce, // Send the raw nonce, not the hashed one
      });

      if (error) {
        Logger.error('Supabase Apple auth failed', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('No user returned from Supabase');
      }

      Logger.info('Apple sign-in completed successfully', { userId: data.user.id });
      successHaptic();

      const needsOnboarding = await checkOnboardingStatus(data.user.id);

      setIsLoading(false);
      setLoadingProvider(null);
      return { success: true, needsOnboarding };
    } catch (error) {
      setIsLoading(false);
      setLoadingProvider(null);

      const appleError = error as { code?: string };

      // Handle user cancellation silently
      if (appleError.code === 'ERR_REQUEST_CANCELED') {
        Logger.debug('Apple sign-in cancelled by user');
        return { success: false, needsOnboarding: false };
      }

      // Use friendly error message utility
      const friendlyError = getFriendlyErrorMessage(error);
      setErrorMessage(friendlyError);
      Alert.alert('Error', friendlyError);
      Logger.error('Apple sign-in error', error as Error);
      warningHaptic();
      return { success: false, needsOnboarding: false, error: error as Error };
    }
  }, []);

  return {
    isLoading,
    loadingProvider,
    errorMessage,
    signInWithGoogle,
    signInWithApple,
    isAppleSignInAvailable,
    isNativeBuild,
  };
}

export default useSocialAuth;
