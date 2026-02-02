/**
 * Booking Confirmation Sheet
 *
 * Modal displayed after user returns from external booking site.
 * Allows user to confirm they successfully booked a court.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import ActionSheet, { SheetManager, SheetProps } from 'react-native-actions-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { lightHaptic, successHaptic } from '@rallia/shared-utils';
import { useThemeStyles, useTranslation, type TranslationKey } from '../../../hooks';

// =============================================================================
// COMPONENT
// =============================================================================

export function BookingConfirmationActionSheet({ payload }: SheetProps<'booking-confirmation'>) {
  const onConfirm = payload?.onConfirm;
  const onCancel = payload?.onCancel;

  const { colors } = useThemeStyles();
  const { t } = useTranslation();

  const handleConfirm = useCallback(() => {
    successHaptic();
    onConfirm?.();
    SheetManager.hide('booking-confirmation');
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    lightHaptic();
    onCancel?.();
    SheetManager.hide('booking-confirmation');
  }, [onCancel]);

  return (
    <ActionSheet
      gestureEnabled={false}
      closable={false}
      containerStyle={[styles.sheetBackground, { backgroundColor: colors.cardBackground }]}
      indicatorStyle={{ display: 'none' }}
    >
      <View style={styles.container}>
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
            style={[styles.button, styles.confirmButton, { backgroundColor: colors.buttonActive }]}
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
            style={[styles.button, styles.cancelButton, { backgroundColor: colors.buttonInactive }]}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Text size="base" weight="medium" color={colors.textSecondary}>
              {t('matchCreation.booking.notYet' as TranslationKey)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ActionSheet>
  );
}

// Keep old export for backwards compatibility during migration
export const BookingConfirmationSheet = BookingConfirmationActionSheet;

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  sheetBackground: {
    flex: 1,
    borderTopLeftRadius: radiusPixels['2xl'],
    borderTopRightRadius: radiusPixels['2xl'],
  },
  container: {
    padding: spacingPixels[6],
    paddingBottom: spacingPixels[4],
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
