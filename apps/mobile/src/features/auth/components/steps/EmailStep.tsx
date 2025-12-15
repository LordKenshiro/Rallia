/**
 * EmailStep Component
 *
 * First step of the AuthWizard - Email entry with social sign-in buttons.
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
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { lightHaptic } from '@rallia/shared-utils';
import { Logger } from '@rallia/shared-services';
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

interface EmailStepProps {
  email: string;
  onEmailChange: (email: string) => void;
  isEmailValid: boolean;
  isLoading: boolean;
  errorMessage: string;
  onContinue: () => void;
  colors: ThemeColors;
  t: (key: TranslationKey) => string;
  isDark: boolean;
  /** Whether this step is currently active/visible */
  isActive?: boolean;
}

export const EmailStep: React.FC<EmailStepProps> = ({
  email,
  onEmailChange,
  isEmailValid,
  isLoading,
  errorMessage,
  onContinue,
  colors,
  t,
  isDark: _isDark,
  isActive = true,
}) => {
  const emailInputRef = useRef<TextInput>(null);

  // Blur email input when step becomes inactive
  useEffect(() => {
    if (!isActive && emailInputRef.current) {
      emailInputRef.current.blur();
    }
  }, [isActive]);
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

  const canContinue = isEmailValid && !isLoading;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title */}
      <Text size="2xl" weight="bold" color={colors.text} style={styles.title}>
        {t('auth.signIn')}
      </Text>

      {/* Social Sign In Buttons */}
      <View style={styles.socialButtons}>
        <TouchableOpacity
          style={[styles.socialButton, { backgroundColor: colors.buttonActive }]}
          onPress={handleGoogleSignIn}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-google" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.socialButton, { backgroundColor: colors.buttonActive }]}
          onPress={handleAppleSignIn}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-apple" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.socialButton, { backgroundColor: colors.buttonActive }]}
          onPress={handleFacebookSignIn}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-facebook" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* OR Divider */}
      <View style={styles.dividerContainer}>
        <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
        <Text size="sm" weight="medium" color={colors.textMuted} style={styles.dividerText}>
          {t('auth.orDivider')}
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
      </View>

      {/* Email Input */}
      <TextInput
        ref={emailInputRef}
        style={[
          styles.emailInput,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
            color: colors.text,
          },
        ]}
        placeholder={t('auth.email')}
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={onEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={isActive}
      />

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
          { backgroundColor: canContinue ? colors.buttonActive : colors.buttonInactive },
        ]}
        onPress={canContinue ? onContinue : undefined}
        activeOpacity={canContinue ? 0.8 : 1}
        disabled={!canContinue}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.buttonTextActive} />
        ) : (
          <Text
            size="lg"
            weight="semibold"
            color={canContinue ? colors.buttonTextActive : colors.textMuted}
          >
            {t('common.continue')}
          </Text>
        )}
      </TouchableOpacity>

      {/* Terms Text */}
      <Text size="xs" color={colors.textMuted} style={styles.termsText}>
        {t('auth.termsText')}
      </Text>
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
    marginBottom: spacingPixels[6],
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacingPixels[4],
    marginBottom: spacingPixels[6],
  },
  socialButton: {
    width: 70,
    height: 50,
    borderRadius: radiusPixels.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingPixels[6],
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: spacingPixels[4],
  },
  emailInput: {
    borderRadius: radiusPixels.lg,
    paddingHorizontal: spacingPixels[5],
    paddingVertical: spacingPixels[4],
    fontSize: 16,
    marginBottom: spacingPixels[4],
    borderWidth: 1,
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
    marginBottom: spacingPixels[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  termsText: {
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default EmailStep;
