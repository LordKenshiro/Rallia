import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Overlay } from '@rallia/shared-components';
import { COLORS } from '@rallia/shared-constants';
import ProgressIndicator from '../ProgressIndicator';
import { lightHaptic, mediumHaptic, successHaptic } from '@rallia/shared-utils';
import { sendVerificationCode, verifyCode, authenticateAfterVerification, ProfileService, Logger } from '@rallia/shared-services';

interface AuthOverlayProps {
  visible: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
  onReturningUser?: () => void; // New callback for users with completed onboarding
  onShowCalendarOverlay?: () => void;
  currentStep?: number;
  totalSteps?: number;
  mode?: 'signup' | 'login'; // New: distinguish between signup and login flows
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({
  visible,
  onClose,
  onAuthSuccess,
  onReturningUser,
  onShowCalendarOverlay: _onShowCalendarOverlay,
  currentStep = 1,
  totalSteps = 8,
  mode = 'signup', // Default to signup mode for backward compatibility
}) => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Refs for code input fields
  const codeInputRefs = useRef<(TextInput | null)[]>([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Trigger animations when overlay becomes visible
  useEffect(() => {
    if (visible) {
      // Reset animation values
      fadeAnim.setValue(0);
      slideAnim.setValue(50);

      // Run animations in parallel
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const isEmailValid = isValidEmail(email);

  const handleGoogleSignIn = () => {
    lightHaptic();
    Logger.logUserAction('oauth_signin_initiated', { provider: 'google' });
    // TODO: Implement Google authentication
  };

  const handleAppleSignIn = () => {
    lightHaptic();
    Logger.logUserAction('oauth_signin_initiated', { provider: 'apple' });
    // TODO: Implement Apple authentication
  };

  const handleFacebookSignIn = () => {
    lightHaptic();
    Logger.logUserAction('oauth_signin_initiated', { provider: 'facebook' });
    // TODO: Implement Facebook authentication
  };

  const handleEmailContinue = async () => {
    mediumHaptic();
    setIsLoading(true);
    setErrorMessage('');

    try {
      // In login mode, check if email exists first
      if (mode === 'login') {
        Logger.debug('Login mode: Checking if email exists', { mode: 'login' });
        
        const { data: existingProfile, error: profileError } = await ProfileService.getProfileByEmail(email);
        
        if (profileError || !existingProfile) {
          setErrorMessage('No account found with this email. Please sign up instead.');
          Alert.alert('Account Not Found', 'No account found with this email. Please use the Sign In button to create a new account.');
          setIsLoading(false);
          return;
        }
        
        Logger.debug('Email exists, proceeding with login', { emailDomain: email.split('@')[1] });
      }
      
      const result = await sendVerificationCode(email);
      
      if (result.success) {
        Logger.info('Verification code sent successfully', { emailDomain: email.split('@')[1] });
        setStep('code');
      } else {
        setErrorMessage(result.error || 'Failed to send verification code');
        Alert.alert('Error', result.error || 'Failed to send verification code');
      }
    } catch (error) {
      Logger.error('Failed to send verification code', error as Error, { email: email.split('@')[1] });
      setErrorMessage('An unexpected error occurred');
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    lightHaptic();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await sendVerificationCode(email);
      
      if (result.success) {
        Logger.info('Verification code resent successfully', { emailDomain: email.split('@')[1] });
        Alert.alert('Success', 'Verification code sent!');
      } else {
        setErrorMessage(result.error || 'Failed to resend verification code');
        Alert.alert('Error', result.error || 'Failed to resend verification code');
      }
    } catch (error) {
      Logger.error('Failed to resend verification code', error as Error, { email: email.split('@')[1] });
      setErrorMessage('An unexpected error occurred');
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    
    if (fullCode.length !== 6) {
      Alert.alert('Error', 'Please enter all 6 digits');
      return;
    }

    mediumHaptic();
    setIsLoading(true);
    setErrorMessage('');

    try {
      // Step 1: Verify the code against the database
      Logger.debug('Verifying code', { email: email.split('@')[1], codeLength: fullCode.length });
      
      const verifyResult = await verifyCode(email, fullCode);
      
      if (!verifyResult.success) {
        setErrorMessage(verifyResult.error || 'Invalid verification code');
        Alert.alert('Error', verifyResult.error || 'Invalid verification code');
        setIsLoading(false);
        return;
      }

      Logger.info('Code verified successfully', { email: email.split('@')[1] });
      
      // Step 2: Code is verified, now authenticate the user
      Logger.debug('Authenticating user after code verification', { mode });
      
      const authResult = await authenticateAfterVerification(email);
      
      if (!authResult.success) {
        setErrorMessage(authResult.error || 'Authentication failed');
        Alert.alert('Error', authResult.error || 'Authentication failed');
        setIsLoading(false);
        return;
      }

      Logger.info('User authenticated successfully', { 
        userId: authResult.userId,
        isNewUser: authResult.isNewUser,
        mode 
      });
      
      // In login mode, always skip onboarding
      if (mode === 'login') {
        Logger.logNavigation('skip_onboarding_login', { mode: 'login', userId: authResult.userId });
        successHaptic();
        
        if (onReturningUser) {
          onReturningUser();
        } else {
          onClose();
        }
        return;
      }
      
      // Check if this is a returning user (profile exists with completed onboarding)
      const { data: profile, error: profileError } = await ProfileService.getProfile(authResult.userId!);
      
      if (profileError) {
        // PGRST116 means no profile found - this is expected for new users
        const errorCode = (profileError as { code?: string })?.code;
        const isNoRowsError = errorCode === 'PGRST116';
        if (isNoRowsError) {
          Logger.debug('No profile found - treating as new user', { userId: authResult.userId });
        } else {
          Logger.error('Failed to fetch profile', profileError as Error, { userId: authResult.userId });
        }
        // If there's an error fetching profile, treat as new user to be safe
        successHaptic();
        if (onAuthSuccess) {
          onAuthSuccess();
        }
        return;
      }

      // Check if onboarding is already completed
      if (profile && profile.onboarding_completed) {
        Logger.logNavigation('returning_user_skip_onboarding', { 
          userId: authResult.userId,
          onboardingCompleted: true 
        });
        successHaptic();
        
        // Close auth overlay and navigate directly to app (skip onboarding)
        if (onReturningUser) {
          onReturningUser();
        } else {
          // Fallback: just close the overlay
          onClose();
        }
      } else {
        Logger.logNavigation('new_user_start_onboarding', { 
          userId: authResult.userId,
          onboardingCompleted: false 
        });
        successHaptic();
        
        // Proceed to next step (Personal Information)
        if (onAuthSuccess) {
          onAuthSuccess();
        }
      }
    } catch (error) {
      Logger.error('Error during user authentication', error as Error, { mode });
      setErrorMessage('An unexpected error occurred');
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    lightHaptic();
    if (step === 'code') {
      setStep('email');
      setCode(['', '', '', '', '', '']);
    } else {
      onClose();
    }
  };

  // Reset to email step when overlay closes
  React.useEffect(() => {
    if (!visible) {
      // Reset after animation completes
      setTimeout(() => {
        setStep('email');
        setCode(['', '', '', '', '', '']);
        setEmail('');
      }, 300);
    }
  }, [visible]);

  return (
    <Overlay visible={visible} onClose={handleBack}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        collapsable={false}
      >
        {/* Progress Indicator - Only show in signup mode */}
        {mode !== 'login' && (
          <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
        )}

        {step === 'email' ? (
          // Email Entry Step
          <>
            {/* Title */}
            <Text style={styles.title}>{mode === 'login' ? 'Log In' : 'Sign In'}</Text>

            {/* Social Sign In Buttons */}
            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleSignIn}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleAppleSignIn}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-apple" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleFacebookSignIn}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-facebook" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* OR Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Input */}
            <TextInput
              style={styles.emailInput}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Error Message */}
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.continueButton, (!isEmailValid || isLoading) && styles.continueButtonDisabled]}
              onPress={(isEmailValid && !isLoading) ? handleEmailContinue : undefined}
              activeOpacity={(isEmailValid && !isLoading) ? 0.8 : 1}
              disabled={!isEmailValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.continueButtonText,
                    (!isEmailValid || isLoading) && styles.continueButtonTextDisabled,
                  ]}
                >
                  Continue
                </Text>
              )}
            </TouchableOpacity>

            {/* Terms Text */}
            <Text style={styles.termsText}>By continuing, you agree to Rallia's Terms of Use.</Text>
          </>
        ) : (
          // Code Verification Step
          <>
            {/* Title */}
            <Text style={styles.title}>Enter code</Text>

            {/* Description */}
            <Text style={styles.description}>
              We sent an email verification code to{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>

            {/* Code Input Boxes */}
            <View style={styles.codeInputContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { codeInputRefs.current[index] = ref; }}
                  style={[
                    styles.codeBox,
                    digit !== '' && styles.codeBoxFilled,
                  ]}
                  value={digit}
                  onChangeText={(text) => {
                    // Only accept single digit
                    const newDigit = text.replace(/[^0-9]/g, '').slice(-1);
                    const newCode = [...code];
                    newCode[index] = newDigit;
                    setCode(newCode);
                    
                    // Auto-focus next input if digit entered
                    if (newDigit && index < 5) {
                      codeInputRefs.current[index + 1]?.focus();
                    }
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    // Handle backspace to go to previous input
                    if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
                      codeInputRefs.current[index - 1]?.focus();
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  textAlign="center"
                  autoFocus={index === 0 && step === 'code'}
                />
              ))}
            </View>

            {/* Resend Code Button */}
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendCode}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <Text style={styles.resendButtonText}>Resend Code</Text>
            </TouchableOpacity>

            {/* Error Message */}
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
              onPress={handleVerifyCode}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.continueButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 25,
  },
  socialButton: {
    width: 70,
    height: 50,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.overlayDark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  emailInput: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  continueButton: {
    backgroundColor: COLORS.buttonPrimary,
    borderRadius: 10,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: COLORS.overlayDark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonDisabled: {
    backgroundColor: '#D3D3D3',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#999',
  },
  termsText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    lineHeight: 18,
  },
  // Code verification step styles
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  emailText: {
    color: '#333',
    fontWeight: '600',
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 25,
  },
  codeBox: {
    width: 45,
    height: 55,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  codeBoxFilled: {
    borderColor: COLORS.accent,
    backgroundColor: '#fff',
  },
  codeDigit: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  resendButton: {
    backgroundColor: '#FFE8EA',
    borderRadius: 10,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  resendButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.accent,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
    marginTop: -5,
  },
});

export default AuthOverlay;

