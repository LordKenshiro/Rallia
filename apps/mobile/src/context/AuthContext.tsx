/**
 * AuthContext - Centralized authentication state management
 *
 * Following Supabase's recommended pattern for React Native:
 * https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth
 *
 * Features:
 * - Single source of truth for auth state across the app
 * - AppState listener for proper token refresh handling
 * - Session validation to detect deleted users
 * - Proper cleanup on unmount
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  PropsWithChildren,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Session, AuthError, Provider } from '@supabase/supabase-js';

/** Supported OAuth providers */
export type OAuthProvider = 'google' | 'apple' | 'facebook' | 'azure';

/** Result type for auth operations */
export type AuthResult = {
  success: boolean;
  error?: AuthError | Error;
};

/** Options for OAuth sign-in */
export type OAuthSignInOptions = {
  redirectTo?: string;
  scopes?: string;
  skipBrowserRedirect?: boolean;
};

/** Options for email OTP sign-in */
export type EmailOtpOptions = {
  emailRedirectTo?: string;
  shouldCreateUser?: boolean;
};

/** Auth context value type */
export type AuthContextType = {
  // State
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  user: Session['user'] | null;

  // Auth methods
  signInWithProvider: (
    provider: OAuthProvider,
    options?: OAuthSignInOptions
  ) => Promise<AuthResult>;
  signInWithEmail: (email: string, options?: EmailOtpOptions) => Promise<AuthResult>;
  verifyOtp: (email: string, token: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
};

// Create context with undefined default (will throw if used outside provider)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - Wraps the app and provides auth state via context
 *
 * This should be placed near the top of the component tree, after
 * any providers it depends on (like QueryClientProvider).
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;

    /**
     * Fetch and validate the initial session
     */
    const fetchSession = async () => {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Error fetching session:', error);
        }

        if (initialSession && isSubscribed) {
          // Validate session by checking if user still exists in database
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !user) {
            console.warn(
              '⚠️ Invalid session detected (user deleted from database). Clearing session...'
            );
            try {
              await supabase.auth.signOut();
            } catch {
              // Ignore signOut errors
            }
            if (isSubscribed) {
              setSession(null);
            }
          } else {
            if (isSubscribed) {
              setSession(initialSession);
            }
          }
        } else if (isSubscribed) {
          setSession(null);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        if (isSubscribed) {
          setSession(null);
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    // Fetch initial session
    fetchSession();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('Auth state change:', _event);
      setSession(newSession);
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * AppState listener for token refresh handling
   *
   * Supabase Auth automatically refreshes tokens, but in React Native
   * we need to manually start/stop this based on app foreground state.
   * This prevents unnecessary network requests when the app is in background
   * and ensures tokens are refreshed when the app becomes active.
   */
  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        // App came to foreground - start auto refresh
        supabase.auth.startAutoRefresh();
      } else {
        // App went to background - stop auto refresh
        supabase.auth.stopAutoRefresh();
      }
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Start auto refresh initially if app is active
    if (AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
    }

    return () => {
      subscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  /**
   * Sign in with an OAuth provider (Google, Apple, or Facebook)
   */
  const signInWithProvider = useCallback(
    async (provider: OAuthProvider, options?: OAuthSignInOptions): Promise<AuthResult> => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: provider as Provider,
          options: {
            redirectTo: options?.redirectTo,
            scopes: options?.scopes,
            skipBrowserRedirect: options?.skipBrowserRedirect,
          },
        });

        if (error) {
          console.error(`OAuth sign-in error (${provider}):`, error);
          return { success: false, error };
        }

        return { success: true };
      } catch (error) {
        console.error(`Unexpected OAuth sign-in error (${provider}):`, error);
        return {
          success: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        };
      }
    },
    []
  );

  /**
   * Send an OTP code to the user's email
   */
  const signInWithEmail = useCallback(
    async (email: string, options?: EmailOtpOptions): Promise<AuthResult> => {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: options?.emailRedirectTo,
            shouldCreateUser: options?.shouldCreateUser ?? true,
          },
        });

        if (error) {
          console.error('Email OTP send error:', error);
          return { success: false, error };
        }

        return { success: true };
      } catch (error) {
        console.error('Unexpected email OTP send error:', error);
        return {
          success: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        };
      }
    },
    []
  );

  /**
   * Verify an OTP code sent to the user's email
   */
  const verifyOtp = useCallback(async (email: string, token: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        console.error('OTP verification error:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected OTP verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }, []);

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async (): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        return { success: false, error };
      }
      return { success: true };
    } catch (error) {
      console.error('Unexpected sign out error:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }, []);

  const value: AuthContextType = {
    // State
    session,
    loading,
    isAuthenticated: !!session,
    user: session?.user ?? null,

    // Auth methods
    signInWithProvider,
    signInWithEmail,
    verifyOtp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth hook - Access auth state and methods from any component
 *
 * Must be used within an AuthProvider.
 *
 * @example
 * ```tsx
 * const { session, loading, signOut } = useAuth();
 *
 * if (loading) return <Spinner />;
 * if (!session) return <LoginScreen />;
 * return <HomeScreen user={session.user} />;
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
