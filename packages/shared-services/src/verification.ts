import { supabase } from './supabase';

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
    const { data: { session } } = await supabase.auth.getSession();
    
    // Call Supabase Edge Function
    const response = await fetch(getSupabaseFunctionUrl('send-verification-email'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        email,
        ipAddress,
        userAgent,
      }),
    });

    const data = await response.json() as { error?: string; message?: string };

    if (!response.ok) {
      console.error('Failed to send verification code:', data);
      return { success: false, error: data.error || 'Failed to send verification email' };
    }

    return { success: true };
  } catch (error) {
    console.error('Send verification code error:', error);
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
    const { data: { session } } = await supabase.auth.getSession();
    
    // Call Supabase Edge Function
    const response = await fetch(getSupabaseFunctionUrl('verify-code'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        email,
        code,
      }),
    });

    const data = await response.json() as { error?: string; message?: string };

    if (!response.ok) {
      console.error('Failed to verify code:', data);
      return { success: false, error: data.error || 'Invalid or expired code' };
    }

    return { success: true };
  } catch (error) {
    console.error('Verify code error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Create Supabase Auth user and confirm email
 */
export const createAuthUser = async (
  email: string,
  password?: string
): Promise<{ success: boolean; userId?: string; error?: string }> => {
  try {
    // If no password provided, generate a random one (for passwordless flow)
    const userPassword = password || Math.random().toString(36).slice(-12);

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
      console.log('📧 User created but needs confirmation. Since we are bypassing verification, attempting sign in...');
      
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
          console.log('💡 User account created successfully. Email confirmation is required by Supabase settings.');
          console.log('💡 For development: Disable email confirmation in Supabase Dashboard → Authentication → Settings');
          console.log('💡 Or manually confirm the user in Dashboard → Authentication → Users');
          
          // Return success with user ID - they can manually confirm or we can handle this differently
          // For now, we'll return an error that includes instructions
          return { 
            success: false, 
            error: 'Account created! Please check your email to confirm your account, or disable email confirmation in Supabase settings for development.',
            userId: userId 
          };
        }
        
        console.error('❌ Failed to sign in after signup:', signInError);
        return { success: false, error: `Account created but sign in failed: ${signInError.message}` };
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
    const { data: { session: verifySession } } = await supabase.auth.getSession();
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
