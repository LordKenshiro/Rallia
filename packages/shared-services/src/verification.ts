import { supabase } from './supabase';
import { Logger } from '../../../apps/mobile/src/services/logger';

/**
 * Verification Service
 * Handles email verification code generation, sending, and validation
 * Uses Supabase Edge Functions to securely send emails via Resend
 */

/**
 * Get the Supabase function URL
 */
const getSupabaseFunctionUrl = (functionName: string): string => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL not configured');
  }
  return `${supabaseUrl}/functions/v1/${functionName}`;
};

/**
 * Send verification code via Supabase Edge Function
 * The Edge Function handles rate limiting, code generation, storage, and email sending
 */
export const sendVerificationCode = async (
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Get current session for authorization
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Call Supabase Edge Function
    const functionUrl = getSupabaseFunctionUrl('send-verification-email');
    Logger.debug('Calling Edge Function', { url: functionUrl, email: email.split('@')[1] });

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        email,
        ipAddress,
        userAgent,
      }),
    });

    const data = (await response.json()) as { error?: string; message?: string };

    if (!response.ok) {
      Logger.error('Failed to send verification code', new Error(data.error || 'Unknown error'), {
        status: response.status,
        statusText: response.statusText,
        error: data.error,
      });
      return { success: false, error: data.error || 'Failed to send verification email' };
    }

    Logger.info('Verification code sent successfully', { emailDomain: email.split('@')[1] });
    return { success: true };
  } catch (error) {
    Logger.error('Send verification code error', error as Error, { email: email.split('@')[1] });
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Verify the code entered by the user via Supabase Edge Function
 */
export const verifyCode = async (
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get current session for authorization
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const functionUrl = getSupabaseFunctionUrl('verify-code');
    Logger.debug('Calling verify-code Edge Function', {
      url: functionUrl,
      emailDomain: email.split('@')[1],
    });

    // Call Supabase Edge Function
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        email,
        code,
      }),
    });

    const data = (await response.json()) as { error?: string; message?: string };

    if (!response.ok) {
      Logger.warn('Code verification failed', {
        status: response.status,
        error: data.error,
        emailDomain: email.split('@')[1],
      });
      return { success: false, error: data.error || 'Invalid or expired code' };
    }

    Logger.info('Code verified successfully', { emailDomain: email.split('@')[1] });
    return { success: true };
  } catch (error) {
    Logger.error('Verify code error', error as Error, { emailDomain: email.split('@')[1] });
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Generate a deterministic password based on email for passwordless flow
 * This ensures the same password is used for both signup and login
 * Uses a secret salt to make it more secure
 */
const generatePasswordFromEmail = (email: string): string => {
  // Create a deterministic password based on email with a secret component
  const salt = 'rallia_secure_2024_v2'; // Changed salt to force new passwords
  const combined = `${email.toLowerCase().trim()}:${salt}`;
  const hash = combined.split('').reduce((acc, char) => {
    return (acc << 5) - acc + char.charCodeAt(0);
  }, 0);
  return `Ral_${Math.abs(hash)}_${email.length}_lia!`;
};

/**
 * Authenticate user after email verification
 * This function handles both new users and existing users
 */
export const authenticateAfterVerification = async (
  email: string
): Promise<{ success: boolean; userId?: string; error?: string; isNewUser?: boolean }> => {
  const normalizedEmail = email.toLowerCase().trim();
  const userPassword = generatePasswordFromEmail(normalizedEmail);

  console.log('🔐 Authenticating user after verification:', normalizedEmail);

  // First, try to sign in (user might already exist)
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: userPassword,
  });

  if (!signInError && signInData.user && signInData.session) {
    console.log('✅ Existing user signed in successfully');
    return { success: true, userId: signInData.user.id, isNewUser: false };
  }

  // If sign in failed, try to create the user
  console.log('📝 Sign in failed, attempting to create new user...');

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: userPassword,
    options: {
      data: {
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      },
    },
  });

  if (!signUpError && signUpData.user) {
    // Check if we got a session (email confirmation disabled) or just user created
    if (signUpData.session) {
      console.log('✅ New user created and signed in');
      return { success: true, userId: signUpData.user.id, isNewUser: true };
    }

    // User created but no session - try signing in
    console.log('📝 User created, attempting sign in...');
    const { data: newSignIn, error: newSignInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: userPassword,
    });

    if (!newSignInError && newSignIn.session) {
      console.log('✅ New user signed in after creation');
      return { success: true, userId: signUpData.user.id, isNewUser: true };
    }

    console.error('❌ Failed to sign in after user creation:', newSignInError);
    return { success: false, error: 'Account created but sign in failed. Please try again.' };
  }

  // If signup also failed with "already registered", the user exists but with different password
  if (signUpError?.message?.includes('already registered')) {
    console.log('⚠️ User exists with different password - this should not happen with our flow');
    // This means the user was created outside our system or with old password
    // We cannot recover without admin access or password reset
    return {
      success: false,
      error: 'Account exists but cannot sign in. Please contact support or use password reset.',
    };
  }

  console.error('❌ Authentication failed:', signUpError || signInError);
  return {
    success: false,
    error: signUpError?.message || signInError?.message || 'Authentication failed',
  };
};

/**
 * Create Supabase Auth user and confirm email
 * @deprecated Use authenticateAfterVerification instead
 */
export const createAuthUser = async (
  email: string,
  password?: string
): Promise<{ success: boolean; userId?: string; error?: string }> => {
  try {
    // If no password provided, generate a deterministic one based on email (for passwordless flow)
    const userPassword = password || generatePasswordFromEmail(email.toLowerCase().trim());

    console.log('🔐 Creating auth user for:', email);

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password: userPassword,
      options: {
        emailRedirectTo: undefined, // Skip email confirmation
        data: {
          email_verified: true,
          email_verified_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      console.error('❌ Failed to create auth user:', error);

      // Check if user already exists
      if (
        error.message.includes('already registered') ||
        error.message.includes('already exists') ||
        error.message.includes('User already registered')
      ) {
        return { success: false, error: 'User already registered' };
      }

      return { success: false, error: error.message };
    }

    if (!data.user) {
      console.error('❌ No user returned from signUp');
      return { success: false, error: 'Failed to create user' };
    }

    const userId = data.user.id;

    // Check if we got a session from signup
    if (!data.session) {
      console.warn('⚠️ No session returned from signUp - email confirmation may be required');
      console.log(
        '📧 User created but needs confirmation. Since we are bypassing verification, attempting sign in...'
      );

      // In development/testing, we're bypassing email verification
      // Normally, Supabase would send a confirmation email
      // For now, we'll attempt to sign in and handle the "Email not confirmed" error

      // Try to sign in - this might fail with "Email not confirmed"
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: userPassword,
      });

      if (signInError) {
        // Check if it's the email confirmation error
        if (signInError.message.includes('Email not confirmed')) {
          console.warn('⚠️ Email not confirmed - this is expected with email confirmation enabled');
          console.log(
            '💡 User account created successfully. Email confirmation is required by Supabase settings.'
          );
          console.log(
            '💡 For development: Disable email confirmation in Supabase Dashboard → Authentication → Settings'
          );
          console.log('💡 Or manually confirm the user in Dashboard → Authentication → Users');

          // Return success with user ID - they can manually confirm or we can handle this differently
          // For now, we'll return an error that includes instructions
          return {
            success: false,
            error:
              'Account created! Please check your email to confirm your account, or disable email confirmation in Supabase settings for development.',
            userId: userId,
          };
        }

        console.error('❌ Failed to sign in after signup:', signInError);
        return {
          success: false,
          error: `Account created but sign in failed: ${signInError.message}`,
        };
      }

      if (!signInData.session) {
        console.error('❌ No session after sign in');
        return { success: false, error: 'Failed to establish session' };
      }

      console.log('✅ Signed in successfully after signup');
    } else {
      console.log('✅ Session created for user:', userId);
    }

    // Verify session was persisted
    const {
      data: { session: verifySession },
    } = await supabase.auth.getSession();
    if (verifySession) {
      console.log('✅ Session verified and persisted');
    } else {
      console.error('❌ Session not persisted to storage');
      return { success: false, error: 'Session was not properly saved' };
    }

    console.log('✅ Auth user created successfully:', userId);
    return { success: true, userId: userId };
  } catch (error) {
    console.error('❌ Create auth user error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Login existing Supabase Auth user
 * @deprecated Use authenticateAfterVerification instead
 */
export const loginAuthUser = async (
  email: string,
  password?: string
): Promise<{ success: boolean; userId?: string; error?: string }> => {
  try {
    // Normalize email and use deterministic password
    const normalizedEmail = email.toLowerCase().trim();
    const userPassword = password || generatePasswordFromEmail(normalizedEmail);

    console.log('🔐 Logging in user:', normalizedEmail);

    // Sign in with password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: userPassword,
    });

    if (error) {
      console.error('❌ Failed to sign in:', error);
      return { success: false, error: error.message };
    }

    if (!data.user) {
      console.error('❌ No user returned from signIn');
      return { success: false, error: 'Failed to sign in' };
    }

    if (!data.session) {
      console.error('❌ No session returned from signIn');
      return { success: false, error: 'Failed to establish session' };
    }

    const userId = data.user.id;
    console.log('✅ User logged in successfully:', userId);

    // Verify session was persisted
    const {
      data: { session: verifySession },
    } = await supabase.auth.getSession();
    if (verifySession) {
      console.log('✅ Session verified and persisted');
    } else {
      console.error('❌ Session not persisted to storage');
      return { success: false, error: 'Session was not properly saved' };
    }

    return { success: true, userId: userId };
  } catch (error) {
    console.error('❌ Login auth user error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Update phone number in auth.users metadata
 */
export const updateAuthUserPhone = async (
  phone: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.updateUser({
      phone,
      data: {
        phone_verified: false, // Will be true after SMS verification if implemented
      },
    });

    if (error) {
      console.error('Failed to update user phone:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Update auth user phone error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};
