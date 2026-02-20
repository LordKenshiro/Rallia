import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Overlay } from '@rallia/shared-components';
import { lightHaptic, mediumHaptic, successHaptic } from '@rallia/shared-utils';
import { ProfileService, Logger } from '@rallia/shared-services';
import { useAuth, useTranslation } from '../../../../hooks';
import {
  spacingPixels,
  radiusPixels,
  fontSizePixels,
  fontWeightNumeric,
  shadowsNative,
} from '@rallia/design-system';
import { useThemeStyles } from '../../../../hooks';

interface AuthOverlayProps {
  visible: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
  onReturningUser?: () => void; // Callback for users with completed onboarding
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({
  visible,
  onClose,
  onAuthSuccess,
  onReturningUser,
}) => {
  const { signInWithEmail, verifyOtp } = useAuth();
  const { colors } = useThemeStyles();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Ref for the hidden OTP input
  const hiddenInputRef = useRef<TextInput>(null);

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
  const isValidEmail = (emailToValidate: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailToValidate.trim());
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
      Logger.debug('Sending OTP via Supabase SDK', { emailDomain: email.split('@')[1] });

      const result = await signInWithEmail(email);

      if (result.success) {
        Logger.info('OTP sent successfully', { emailDomain: email.split('@')[1] });
        setStep('code');
      } else {
        const errorMsg = result.error?.message || 'Failed to send verification code';
        setErrorMessage(errorMsg);
        Alert.alert(t('alerts.error'), errorMsg);
      }
    } catch (error) {
      Logger.error('Failed to send OTP', error as Error, { emailDomain: email.split('@')[1] });
      setErrorMessage('An unexpected error occurred');
      Alert.alert(t('alerts.error'), t('onboarding.overlay.unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    lightHaptic();
    setIsLoading(true);
    setErrorMessage('');
    setCode(''); // Clear the input field when resending

    try {
      const result = await signInWithEmail(email);

      if (result.success) {
        Logger.info('OTP resent successfully', { emailDomain: email.split('@')[1] });
        Alert.alert(t('alerts.success'), t('onboarding.overlay.verificationCodeSent'));
      } else {
        const errorMsg = result.error?.message || 'Failed to resend verification code';
        setErrorMessage(errorMsg);
        Alert.alert(t('alerts.error'), errorMsg);
      }
    } catch (error) {
      Logger.error('Failed to resend OTP', error as Error, { emailDomain: email.split('@')[1] });
      setErrorMessage('An unexpected error occurred');
      Alert.alert(t('alerts.error'), t('onboarding.overlay.unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert(t('alerts.error'), t('onboarding.overlay.enterAllDigits'));
      return;
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
        Alert.alert(t('alerts.error'), errorMsg);
        setIsLoading(false);
        return;
      }

      Logger.info('OTP verified successfully', { emailDomain: email.split('@')[1] });

      // Session is now created by SDK - get user ID to check onboarding status
      // The useAuth hook will update session state, we need to check profile
      // Wait a moment for session to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Import supabase to get the session
      const { supabase } = await import('@rallia/shared-services');
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        Logger.error('No user ID after OTP verification', new Error('Missing userId'));
        setErrorMessage('Authentication failed - please try again');
        Alert.alert(t('alerts.error'), t('onboarding.overlay.authFailed'));
        setIsLoading(false);
        return;
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
          userId,
          onboardingCompleted: true,
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
          userId,
          onboardingCompleted: false,
        });
        successHaptic();

        // Proceed to next step (Personal Information)
        if (onAuthSuccess) {
          onAuthSuccess();
        }
      }
    } catch (error) {
      Logger.error('Error during OTP verification', error as Error);
      setErrorMessage('An unexpected error occurred');
      Alert.alert(t('alerts.error'), t('onboarding.overlay.unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    lightHaptic();
    if (step === 'code') {
      setStep('email');
      setCode('');
    } else {
      onClose();
    }
  };

  // Reset to email step when overlay closes
  useEffect(() => {
    if (!visible) {
      // Reset after animation completes
      setTimeout(() => {
        setStep('email');
        setCode('');
        setEmail('');
        setErrorMessage('');
      }, 300);
    }
  }, [visible]);

  // Handler for code input changes - memoized for performance
  const handleCodeChange = useCallback((text: string) => {
    // Only accept digits, limit to 6 characters
    const cleanedCode = text.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(cleanedCode);
  }, []);

  // Focus the hidden input when tapping the code boxes
  const focusHiddenInput = useCallback(() => {
    hiddenInputRef.current?.focus();
  }, []);

  // Focus hidden input when step changes to 'code'
  useEffect(() => {
    if (step === 'code') {
      // Small delay to ensure the step animation has started
      const timer = setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

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
        {step === 'email' ? (
          // Email Entry Step
          <>
            {/* Title */}
            <Text style={[styles.title, { color: colors.text }]}>Sign In</Text>

            {/* Social Sign In Buttons */}
            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: colors.buttonActive }]}
                onPress={handleGoogleSignIn}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google" size={24} color={colors.buttonTextActive} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: colors.buttonActive }]}
                onPress={handleAppleSignIn}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-apple" size={24} color={colors.buttonTextActive} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: colors.buttonActive }]}
                onPress={handleFacebookSignIn}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-facebook" size={24} color={colors.buttonTextActive} />
              </TouchableOpacity>
            </View>

            {/* OR Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Email Input */}
            <TextInput
              style={[
                styles.emailInput,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                },
              ]}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Error Message */}
            {errorMessage ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
            ) : null}

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                {
                  backgroundColor:
                    isEmailValid && !isLoading ? colors.buttonActive : colors.buttonInactive,
                },
                (!isEmailValid || isLoading) && styles.continueButtonDisabled,
              ]}
              onPress={isEmailValid && !isLoading ? handleEmailContinue : undefined}
              activeOpacity={isEmailValid && !isLoading ? 0.8 : 1}
              disabled={!isEmailValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.buttonTextActive} />
              ) : (
                <Text
                  style={[
                    styles.continueButtonText,
                    {
                      color:
                        isEmailValid && !isLoading
                          ? colors.buttonTextActive
                          : colors.buttonTextInactive,
                    },
                  ]}
                >
                  Continue
                </Text>
              )}
            </TouchableOpacity>

            {/* Terms Text */}
            <Text style={[styles.termsText, { color: colors.textMuted }]}>
              By continuing, you agree to Rallia's Terms of Use.
            </Text>
          </>
        ) : (
          // Code Verification Step
          <>
            {/* Title */}
            <Text style={[styles.title, { color: colors.text }]}>Enter code</Text>

            {/* Description */}
            <Text style={[styles.description, { color: colors.textMuted }]}>
              We sent an email verification code to{'\n'}
              <Text style={[styles.emailText, { color: colors.text }]}>{email}</Text>
            </Text>

            {/* Hidden TextInput for smooth OTP entry */}
            <TextInput
              ref={hiddenInputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              caretHidden
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
            />

            {/* Visual Code Display Boxes */}
            <Pressable style={styles.codeInputContainer} onPress={focusHiddenInput}>
              {Array.from({ length: 6 }).map((_, index) => {
                const digit = code[index] || '';
                const isFilled = digit !== '';
                return (
                  <View
                    key={index}
                    style={[
                      styles.codeBox,
                      {
                        backgroundColor: isFilled ? colors.card : colors.inputBackground,
                        borderColor: isFilled ? colors.primary : colors.inputBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.codeDigit, { color: colors.text }]}>{digit}</Text>
                  </View>
                );
              })}
            </Pressable>

            {/* Resend Code Button */}
            <TouchableOpacity
              style={[styles.resendButton, { backgroundColor: colors.inputBackground }]}
              onPress={handleResendCode}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <Text style={[styles.resendButtonText, { color: colors.primary }]}>Resend Code</Text>
            </TouchableOpacity>

            {/* Error Message */}
            {errorMessage ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
            ) : null}

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: colors.buttonActive },
                isLoading && styles.continueButtonDisabled,
              ]}
              onPress={handleVerifyCode}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.buttonTextActive} />
              ) : (
                <Text style={[styles.continueButtonText, { color: colors.buttonTextActive }]}>
                  Continue
                </Text>
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
    paddingVertical: spacingPixels[5],
  },
  title: {
    fontSize: fontSizePixels['2xl'],
    fontWeight: fontWeightNumeric.bold,
    textAlign: 'center',
    marginBottom: 30, // 7.5 * 4px base unit
    // color will be set dynamically
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15, // 3.75 * 4px base unit
    marginBottom: 25, // 6.25 * 4px base unit
  },
  socialButton: {
    width: 70, // 17.5 * 4px base unit
    height: 50, // 12.5 * 4px base unit
    borderRadius: radiusPixels.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadowsNative.md,
    // backgroundColor will be set dynamically
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25, // 6.25 * 4px base unit
  },
  dividerLine: {
    flex: 1,
    height: 1,
    // backgroundColor will be set dynamically
  },
  dividerText: {
    marginHorizontal: 15, // 3.75 * 4px base unit
    fontSize: fontSizePixels.sm,
    fontWeight: fontWeightNumeric.medium,
    // color will be set dynamically
  },
  emailInput: {
    borderRadius: radiusPixels.DEFAULT,
    paddingHorizontal: spacingPixels[5],
    paddingVertical: spacingPixels[3.5],
    fontSize: fontSizePixels.base,
    marginBottom: spacingPixels[5],
    borderWidth: 1,
    // backgroundColor, borderColor, color will be set dynamically
  },
  continueButton: {
    borderRadius: radiusPixels.DEFAULT,
    paddingVertical: spacingPixels[4],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15, // 3.75 * 4px base unit
    ...shadowsNative.md,
    // backgroundColor will be set dynamically
  },
  continueButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    fontSize: fontSizePixels.base,
    fontWeight: fontWeightNumeric.semibold,
  },
  continueButtonTextDisabled: {},
  termsText: {
    textAlign: 'center',
    fontSize: fontSizePixels.xs,
    lineHeight: fontSizePixels.xs * 1.5,
  },
  // Code verification step styles
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    // color will be set dynamically
  },
  emailText: {
    fontWeight: '600',
    // color will be set dynamically
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 25,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  codeBox: {
    width: 45,
    height: 55,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor, borderColor will be set dynamically
  },
  codeDigit: {
    fontSize: 24,
    fontWeight: '600',
    // color will be set dynamically
  },
  resendButton: {
    borderRadius: 10,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    // backgroundColor will be set dynamically
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    // color will be set dynamically
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
    marginTop: -5,
    // color will be set dynamically
  },
});

export default AuthOverlay;
