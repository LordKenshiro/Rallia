import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase as sharedSupabase } from '@rallia/shared-services';
import type { Session, AuthError, Provider, SupabaseClient } from '@supabase/supabase-js';

/** Supported OAuth providers */
export type OAuthProvider = 'google' | 'apple' | 'facebook' | 'azure';

/** Result type for auth operations */
export type AuthResult = {
  success: boolean;
  error?: AuthError | Error;
};

/** Options for OAuth sign-in */
export type OAuthSignInOptions = {
  /** The redirect URL after OAuth authentication (platform-specific) */
  redirectTo?: string;
  /** Additional scopes to request from the provider */
  scopes?: string;
  /** Skip the browser redirect (useful for mobile with native auth) */
  skipBrowserRedirect?: boolean;
};

/** Options for email OTP sign-in */
export type EmailOtpOptions = {
  /** The redirect URL for magic link emails (platform-specific) */
  emailRedirectTo?: string;
  /** Whether to create a new user if one doesn't exist */
  shouldCreateUser?: boolean;
};

/** Options for the useAuth hook */
export type UseAuthOptions = {
  /**
   * Custom Supabase client to use instead of the shared service client.
   * Use this in Next.js apps to pass the SSR-aware browser client for proper cookie handling.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client?: SupabaseClient<any, any, any>;
};

/**
 * Custom hook for managing authentication state
 * Handles session management, auth state changes, and sign-in flows
 * Compatible with both Next.js (web) and Expo (mobile)
 *
 * @param options - Optional configuration including custom Supabase client
 */
export const useAuth = (options?: UseAuthOptions) => {
  // Use custom client if provided, otherwise fall back to shared service client
  const supabase = useMemo(() => options?.client ?? sharedSupabase, [options?.client]);

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session and validate it
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Validate session by checking if user still exists in database
          const { data: { user }, error } = await supabase.auth.getUser();
          
          if (error || !user) {
            // Session exists but user was deleted - clear the invalid session
            console.warn('⚠️ Invalid session detected (user deleted from database). Clearing session...');
            await supabase.auth.signOut();
            setSession(null);
          } else {
            // Valid session
            setSession(session);
          }
        } else {
          setSession(null);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        // Clear session on error
        await supabase.auth.signOut();
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  /**
   * Sign in with an OAuth provider (Google, Apple, or Facebook)
   * @param provider - The OAuth provider to use
   * @param options - Configuration options for the OAuth flow
   * @returns Promise resolving to success status and optional error
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
    [supabase]
  );

  /**
   * Send an OTP code to the user's email
   * @param email - The user's email address
   * @param options - Configuration options for the OTP email
   * @returns Promise resolving to success status and optional error
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
    [supabase]
  );

  /**
   * Verify an OTP code sent to the user's email
   * @param email - The user's email address
   * @param token - The 6-digit OTP code
   * @returns Promise resolving to success status and optional error
   */
  const verifyOtp = useCallback(
    async (email: string, token: string): Promise<AuthResult> => {
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
    },
    [supabase]
  );

  /**
   * Sign out the current user
   * @returns Promise resolving to success status and optional error
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
  }, [supabase]);

  return {
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
};
