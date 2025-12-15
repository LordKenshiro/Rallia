/**
 * OTPVerificationStep Component
 *
 * Second step of the AuthWizard - 6-digit OTP code verification.
 * Migrated from AuthOverlay with theme-aware colors and i18n support.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import type { TranslationKey } from '@rallia/shared-translations';

interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  buttonActive: string;
  buttonInactive: string;
  buttonTextActive: string;
  inputBackground: string;
  inputBorder: string;
  inputBorderFocused: string;
  error: string;
  success: string;
  divider: string;
}

interface OTPVerificationStepProps {
  email: string;
  code: string[];
  onCodeChange: (code: string[]) => void;
  isLoading: boolean;
  errorMessage: string;
  onVerify: () => void;
  onResendCode: () => void;
  colors: ThemeColors;
  t: (key: TranslationKey) => string;
  isDark: boolean;
  /** Whether this step is currently active/visible */
  isActive?: boolean;
}

export const OTPVerificationStep: React.FC<OTPVerificationStepProps> = ({
  email,
  code,
  onCodeChange,
  isLoading,
  errorMessage,
  onVerify,
  onResendCode,
  colors,
  t,
  isDark,
  isActive = true,
}) => {
  const codeInputRefs = useRef<(TextInput | null)[]>([]);

  // Focus first input when step becomes active
  useEffect(() => {
    if (isActive && codeInputRefs.current[0]) {
      // Small delay to ensure the step animation has started
      const timer = setTimeout(() => {
        codeInputRefs.current[0]?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const handleCodeDigitChange = (text: string, index: number) => {
    // Only accept single digit
    const newDigit = text.replace(/[^0-9]/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = newDigit;
    onCodeChange(newCode);

    // Auto-focus next input if digit entered
    if (newDigit && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number, digit: string) => {
    // Handle backspace to go to previous input
    if (key === 'Backspace' && !digit && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const isCodeComplete = code.every(digit => digit !== '');
  const canVerify = isCodeComplete && !isLoading;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title */}
      <Text size="2xl" weight="bold" color={colors.text} style={styles.title}>
        {t('auth.verificationCode')}
      </Text>

      {/* Description */}
      <Text size="base" color={colors.textSecondary} style={styles.description}>
        We sent an email verification code to{'\n'}
        <Text size="base" weight="semibold" color={colors.text}>
          {email}
        </Text>
      </Text>

      {/* Code Input Boxes */}
      <View style={styles.codeInputContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={ref => {
              codeInputRefs.current[index] = ref;
            }}
            style={[
              styles.codeBox,
              {
                backgroundColor: digit ? colors.cardBackground : colors.inputBackground,
                borderColor: digit ? colors.buttonActive : colors.inputBorder,
                color: colors.text,
              },
            ]}
            value={digit}
            onChangeText={text => handleCodeDigitChange(text, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index, digit)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            textAlign="center"
            editable={isActive}
          />
        ))}
      </View>

      {/* Resend Code Button */}
      <TouchableOpacity
        style={[
          styles.resendButton,
          { backgroundColor: isDark ? colors.buttonInactive : `${colors.buttonActive}15` },
        ]}
        onPress={onResendCode}
        activeOpacity={0.8}
        disabled={isLoading}
      >
        <Text size="base" weight="semibold" color={colors.buttonActive}>
          {t('auth.resendCode')}
        </Text>
      </TouchableOpacity>

      {/* Error Message */}
      {errorMessage ? (
        <Text size="sm" color={colors.error} style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.continueButton,
          { backgroundColor: canVerify ? colors.buttonActive : colors.buttonInactive },
        ]}
        onPress={canVerify ? onVerify : undefined}
        activeOpacity={canVerify ? 0.8 : 1}
        disabled={!canVerify}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.buttonTextActive} />
        ) : (
          <Text
            size="lg"
            weight="semibold"
            color={canVerify ? colors.buttonTextActive : colors.textMuted}
          >
            {t('common.continue')}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacingPixels[4],
    paddingTop: spacingPixels[4],
    paddingBottom: spacingPixels[8],
  },
  title: {
    textAlign: 'center',
    marginBottom: spacingPixels[4],
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacingPixels[6],
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacingPixels[2],
    marginBottom: spacingPixels[6],
  },
  codeBox: {
    width: 45,
    height: 55,
    borderRadius: radiusPixels.md,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: '600',
  },
  resendButton: {
    borderRadius: radiusPixels.lg,
    paddingVertical: spacingPixels[4],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacingPixels[4],
  },
  errorText: {
    textAlign: 'center',
    marginBottom: spacingPixels[2],
  },
  continueButton: {
    borderRadius: radiusPixels.lg,
    paddingVertical: spacingPixels[4],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default OTPVerificationStep;
