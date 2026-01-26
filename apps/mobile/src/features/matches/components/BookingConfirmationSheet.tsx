/**
 * Booking Confirmation Sheet
 *
 * Modal displayed after user returns from external booking site.
 * Allows user to confirm they successfully booked a court.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { lightHaptic, successHaptic } from '@rallia/shared-utils';
import type { TranslationKey } from '../../../hooks/useTranslation';

// =============================================================================
// TYPES
// =============================================================================

interface BookingConfirmationSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Called when user confirms booking */
  onConfirm: () => void;
  /** Called when user cancels/dismisses */
  onCancel: () => void;
  /** Theme colors */
  colors: {
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    buttonActive: string;
    buttonInactive: string;
    buttonTextActive: string;
    cardBackground: string;
    background: string;
  };
  /** Translation function */
  t: (key: TranslationKey) => string;
  /** Whether dark mode is active */
  isDark: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const BookingConfirmationSheet: React.FC<BookingConfirmationSheetProps> = ({
  visible,
  onConfirm,
  onCancel,
  colors,
  t,
}) => {
  const handleConfirm = () => {
    successHaptic();
    onConfirm();
  };

  const handleCancel = () => {
    lightHaptic();
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${colors.buttonActive}15` }]}>
            <Ionicons name="calendar-outline" size={32} color={colors.buttonActive} />
          </View>

          {/* Title */}
          <Text size="lg" weight="bold" color={colors.text} style={styles.title}>
            {t('matchCreation.booking.bookingConfirmTitle' as TranslationKey)}
          </Text>

          {/* Description */}
          <Text size="base" color={colors.textMuted} style={styles.description}>
            {t('matchCreation.booking.bookingConfirmMessage' as TranslationKey)}
          </Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            {/* Confirm Button */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: colors.buttonActive },
              ]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.buttonTextActive} />
              <Text size="base" weight="semibold" color={colors.buttonTextActive}>
                {t('matchCreation.booking.iBookedThisCourt' as TranslationKey)}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { backgroundColor: colors.buttonInactive },
              ]}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Text size="base" weight="medium" color={colors.textSecondary}>
                {t('matchCreation.booking.notYet' as TranslationKey)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacingPixels[4],
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radiusPixels['2xl'],
    padding: spacingPixels[6],
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: radiusPixels.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacingPixels[4],
  },
  title: {
    textAlign: 'center',
    marginBottom: spacingPixels[2],
  },
  description: {
    textAlign: 'center',
    marginBottom: spacingPixels[6],
  },
  buttons: {
    width: '100%',
    gap: spacingPixels[3],
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    gap: spacingPixels[2],
  },
  confirmButton: {
    // Primary button styling handled by backgroundColor prop
  },
  cancelButton: {
    // Secondary button styling handled by backgroundColor prop
  },
});

export default BookingConfirmationSheet;
