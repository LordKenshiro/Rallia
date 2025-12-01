import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Overlay } from '@rallia/shared-components';
import { COLORS } from '@rallia/shared-constants';
import ProgressIndicator from '../ProgressIndicator';
import { lightHaptic, mediumHaptic, successHaptic } from '../../../../utils/haptics';
// TEMPORARY: verifyCode commented out during testing bypass
import { sendVerificationCode, /* verifyCode, */ createAuthUser, ProfileService } from '@rallia/shared-services';

interface AuthOverlayProps {
  visible: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
  onReturningUser?: () => void; // New callback for users with completed onboarding
  onShowCalendarOverlay?: () => void;
  currentStep?: number;
  totalSteps?: number;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({
  visible,
  onClose,
  onAuthSuccess,
  onReturningUser,
  onShowCalendarOverlay: _onShowCalendarOverlay,
  currentStep = 1,
  totalSteps = 8,
}) => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    console.log('Sign in with Google');
    // TODO: Implement Google authentication
  };

  const handleAppleSignIn = () => {
    lightHaptic();
    console.log('Sign in with Apple');
    // TODO: Implement Apple authentication
  };

  const handleFacebookSignIn = () => {
    lightHaptic();
    console.log('Sign in with Facebook');
    // TODO: Implement Facebook authentication
  };

  const handleEmailContinue = async () => {
    mediumHaptic();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await sendVerificationCode(email);
      
      if (result.success) {
        console.log('Verification code sent to:', email);
        setStep('code');
      } else {
        setErrorMessage(result.error || 'Failed to send verification code');
        Alert.alert('Error', result.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
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
        console.log('Verification code resent to:', email);
        Alert.alert('Success', 'Verification code sent!');
      } else {
        setErrorMessage(result.error || 'Failed to resend verification code');
        Alert.alert('Error', result.error || 'Failed to resend verification code');
      }
    } catch (error) {
      console.error('Error resending verification code:', error);
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
      // ========== TEMPORARY: BYPASS CODE VERIFICATION FOR TESTING ==========
      // TODO: Re-enable code verification after testing is complete
      
      // COMMENTED OUT: Original verification logic
      // // Verify the code
      // const verifyResult = await verifyCode(email, fullCode);
      // 
      // if (!verifyResult.success) {
      //   setErrorMessage(verifyResult.error || 'Invalid verification code');
      //   Alert.alert('Error', verifyResult.error || 'Invalid verification code');
      //   setIsLoading(false);
      //   return;
      // }

      console.log('⚠️ TEMPORARY: Skipping code verification for testing');
      
      // Create auth user with verified email (no verification required for now)
      const authResult = await createAuthUser(email);
      
      if (!authResult.success) {
        setErrorMessage(authResult.error || 'Failed to create account');
        Alert.alert('Error', authResult.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      console.log('User created (verification bypassed):', authResult.userId);
      
      // Check if this is a returning user (profile exists with completed onboarding)
      const { data: profile, error: profileError } = await ProfileService.getProfile(authResult.userId!);
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // If there's an error fetching profile, treat as new user to be safe
        successHaptic();
        if (onAuthSuccess) {
          onAuthSuccess();
        }
        return;
      }

      // Check if onboarding is already completed
      if (profile && profile.onboarding_completed) {
        console.log('🔄 Returning user detected - onboarding already completed');
        successHaptic();
        
        // Close auth overlay and navigate directly to app (skip onboarding)
        if (onReturningUser) {
          onReturningUser();
        } else {
          // Fallback: just close the overlay
          onClose();
        }
      } else {
        console.log('✨ New user or incomplete onboarding - proceeding with onboarding flow');
        successHaptic();
        
        // Proceed to next step (Personal Information)
        if (onAuthSuccess) {
          onAuthSuccess();
        }
      }
    } catch (error) {
      console.error('Error creating user:', error);
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
      >
        {/* Progress Indicator */}
        <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />

        {step === 'email' ? (
          // Email Entry Step
          <>
            {/* Title */}
            <Text style={styles.title}>Sign In</Text>

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
                <TouchableOpacity
                  key={index}
                  style={styles.codeBox}
                  onPress={() => {
                    // Simulate entering digits for demo
                    const newCode = [...code];
                    const emptyIndex = newCode.findIndex(d => d === '');
                    if (emptyIndex !== -1) {
                      newCode[emptyIndex] = String(Math.floor(Math.random() * 10));
                      setCode(newCode);
                    }
                  }}
                >
                  <Text style={styles.codeDigit}>{digit || '—'}</Text>
                </TouchableOpacity>
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
    width: 40,
    height: 50,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
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
