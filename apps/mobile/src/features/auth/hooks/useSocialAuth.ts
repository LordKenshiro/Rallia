/**
 * useSocialAuth Hook
 *
 * Handles native social authentication for Google, Apple, and Facebook.
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
import { ProfileService, Logger } from '@rallia/shared-services';
import { lightHaptic, successHaptic, warningHaptic } from '@rallia/shared-utils';

// =============================================================================
// TYPES
// =============================================================================

export type SocialProvider = 'google' | 'apple' | 'facebook';

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
  signInWithFacebook: () => Promise<SocialAuthResult>;

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

// Configure Facebook
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '';

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
let LoginManager: typeof import('react-native-fbsdk-next').LoginManager | null = null;
let AccessToken: typeof import('react-native-fbsdk-next').AccessToken | null = null;
let Settings: typeof import('react-native-fbsdk-next').Settings | null = null;

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

  try {
    // Dynamically import Google Sign-In
    const googleModule = await import('@react-native-google-signin/google-signin');
    GoogleSignin = googleModule.GoogleSignin;
    statusCodes = googleModule.statusCodes;
    isSuccessResponse = googleModule.isSuccessResponse;
    isErrorWithCode = googleModule.isErrorWithCode;

    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      scopes: ['email', 'profile'],
      offlineAccess: true,
    });

    // Dynamically import Facebook SDK
    const fbModule = await import('react-native-fbsdk-next');
    LoginManager = fbModule.LoginManager;
    AccessToken = fbModule.AccessToken;
    Settings = fbModule.Settings;

    // Initialize Facebook SDK
    if (FACEBOOK_APP_ID) {
      Settings.initializeSDK();
      Settings.setAppID(FACEBOOK_APP_ID);
    }

    nativeModulesInitialized = true;
    Logger.debug('Native social auth modules initialized successfully');
    return true;
  } catch (error) {
    Logger.error('Failed to initialize native social auth modules', error as Error);
    return false;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check onboarding status after successful authentication
 */
async function checkOnboardingStatus(userId: string): Promise<boolean> {
  try {
    const { data: profile, error } = await ProfileService.getProfile(userId);

    if (error) {
      const errorCode = (error as { code?: string })?.code;
      // PGRST116 = no rows found, meaning new user
      if (errorCode === 'PGRST116') {
        Logger.debug('No profile found - new user needs onboarding', { userId });
        return true;
      }
      Logger.error('Failed to fetch profile for onboarding check', error as Error);
      return true; // Default to needing onboarding on error
    }

    return !profile?.onboarding_completed;
  } catch (error) {
    Logger.error('Error checking onboarding status', error as Error);
    return true;
  }
}

// =============================================================================
// HOOK
// =============================================================================

export function useSocialAuth(): UseSocialAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [modulesReady, setModulesReady] = useState(false);
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
      initializeNativeModules().then(setModulesReady);
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

      if (isErrorWithCode && isErrorWithCode(error) && statusCodes) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            Logger.debug('Google sign-in cancelled by user');
            return { success: false, needsOnboarding: false };
          case statusCodes.IN_PROGRESS:
            setErrorMessage('Sign-in already in progress');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setErrorMessage('Google Play Services not available');
            Alert.alert('Error', 'Google Play Services is required for Google Sign-In');
            break;
          default:
            setErrorMessage('Google sign-in failed');
        }
      } else {
        setErrorMessage((error as Error).message || 'Google sign-in failed');
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

      if (appleError.code === 'ERR_REQUEST_CANCELED') {
        Logger.debug('Apple sign-in cancelled by user');
        return { success: false, needsOnboarding: false };
      }

      setErrorMessage((error as Error).message || 'Apple sign-in failed');
      Logger.error('Apple sign-in error', error as Error);
      warningHaptic();
      return { success: false, needsOnboarding: false, error: error as Error };
    }
  }, []);

  /**
   * Sign in with Facebook using native SDK
   */
  const signInWithFacebook = useCallback(async (): Promise<SocialAuthResult> => {
    // Check for Expo Go
    if (!isNativeBuild) {
      showExpoGoWarning('Facebook');
      return { success: false, needsOnboarding: false };
    }

    if (!LoginManager || !AccessToken) {
      setErrorMessage('Facebook Sign-In not initialized');
      return { success: false, needsOnboarding: false };
    }

    lightHaptic();
    setIsLoading(true);
    setLoadingProvider('facebook');
    setErrorMessage('');

    try {
      Logger.logUserAction('social_signin_initiated', { provider: 'facebook' });

      // Initiate Facebook login
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

      if (result.isCancelled) {
        Logger.debug('Facebook sign-in cancelled by user');
        setIsLoading(false);
        setLoadingProvider(null);
        return { success: false, needsOnboarding: false };
      }

      // Get the access token
      const accessTokenData = await AccessToken.getCurrentAccessToken();

      if (!accessTokenData?.accessToken) {
        throw new Error('No access token received from Facebook');
      }

      Logger.debug('Facebook sign-in successful, authenticating with Supabase');

      // Sign in to Supabase with the Facebook access token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'facebook',
        token: accessTokenData.accessToken,
      });

      if (error) {
        Logger.error('Supabase Facebook auth failed', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('No user returned from Supabase');
      }

      Logger.info('Facebook sign-in completed successfully', { userId: data.user.id });
      successHaptic();

      const needsOnboarding = await checkOnboardingStatus(data.user.id);

      setIsLoading(false);
      setLoadingProvider(null);
      return { success: true, needsOnboarding };
    } catch (error) {
      setIsLoading(false);
      setLoadingProvider(null);

      setErrorMessage((error as Error).message || 'Facebook sign-in failed');
      Logger.error('Facebook sign-in error', error as Error);
      warningHaptic();
      return { success: false, needsOnboarding: false, error: error as Error };
    }
  }, [isNativeBuild, showExpoGoWarning]);

  return {
    isLoading,
    loadingProvider,
    errorMessage,
    signInWithGoogle,
    signInWithApple,
    signInWithFacebook,
    isAppleSignInAvailable,
    isNativeBuild,
  };
}

export default useSocialAuth;
