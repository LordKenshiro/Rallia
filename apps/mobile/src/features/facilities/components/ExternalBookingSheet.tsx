/**
 * ExternalBookingSheet Component
 * Bottom sheet for redirecting to external booking providers.
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useToast } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import type { FormattedSlot } from '@rallia/shared-hooks';
import type { FacilityWithDetails } from '@rallia/shared-services';
import { Logger } from '@rallia/shared-services';
import { mediumHaptic } from '@rallia/shared-utils';
import type { TranslationKey, TranslationOptions } from '../../../hooks';

interface ExternalBookingSheetProps {
  visible: boolean;
  onClose: () => void;
  facility: FacilityWithDetails;
  slot: FormattedSlot;
  colors: {
    card: string;
    text: string;
    textMuted: string;
    primary: string;
    border: string;
    background: string;
  };
  t: (key: TranslationKey, options?: TranslationOptions) => string;
}

export default function ExternalBookingSheet({
  visible,
  onClose,
  facility,
  slot,
  colors,
  t,
}: ExternalBookingSheetProps) {
  const toast = useToast();

  // Handle opening external booking URL
  const handleOpenBookingSite = useCallback(async () => {
    if (!slot.bookingUrl) {
      toast.error('Booking URL not available');
      return;
    }

    mediumHaptic();

    Logger.logUserAction('external_booking_opened', {
      facilityId: facility.id,
      facilityName: facility.name,
      slotTime: slot.time,
      bookingUrl: slot.bookingUrl,
    });

    try {
      const canOpen = await Linking.canOpenURL(slot.bookingUrl);
      if (canOpen) {
        await Linking.openURL(slot.bookingUrl);
        onClose();
      } else {
        toast.error('Unable to open booking site');
      }
    } catch (error) {
      Logger.error('Failed to open external booking URL', error as Error);
      toast.error('Failed to open booking site');
    }
  }, [slot.bookingUrl, slot.time, facility, onClose, toast]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <Text size="lg" weight="bold" color={colors.text}>
            {t('booking.external.title')}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* External booking icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="open-outline" size={48} color={colors.primary} />
          </View>

          {/* Description */}
          <Text size="base" color={colors.text} style={styles.description}>
            {t('booking.external.description')}
          </Text>

          {/* Booking details */}
          <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
            <View style={styles.detailRow}>
              <Text size="sm" color={colors.textMuted}>
                Facility
              </Text>
              <Text size="sm" weight="medium" color={colors.text}>
                {facility.name}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text size="sm" color={colors.textMuted}>
                Date
              </Text>
              <Text size="sm" weight="medium" color={colors.text}>
                {slot.datetime.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text size="sm" color={colors.textMuted}>
                Time
              </Text>
              <Text size="sm" weight="medium" color={colors.text}>
                {slot.time}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text size="sm" color={colors.textMuted}>
                Courts Available
              </Text>
              <Text size="sm" weight="medium" color={colors.text}>
                {slot.courtCount}
              </Text>
            </View>
          </View>

          {/* Instructions */}
          <Text size="sm" color={colors.textMuted} style={styles.instructions}>
            {t('booking.external.instructions')}
          </Text>
        </View>

        {/* Open booking site button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.openButton, { backgroundColor: colors.primary }]}
            onPress={handleOpenBookingSite}
            activeOpacity={0.8}
          >
            <Ionicons name="open-outline" size={20} color="#fff" />
            <Text size="base" weight="semibold" color="#fff">
              {t('booking.external.openSite')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: radiusPixels.xl,
    borderTopRightRadius: radiusPixels.xl,
    paddingBottom: spacingPixels[8],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacingPixels[2],
    marginBottom: spacingPixels[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    padding: spacingPixels[4],
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacingPixels[4],
  },
  description: {
    textAlign: 'center',
    marginBottom: spacingPixels[4],
  },
  detailsCard: {
    width: '100%',
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    gap: spacingPixels[2],
    marginBottom: spacingPixels[4],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instructions: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: spacingPixels[4],
    paddingTop: spacingPixels[3],
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    gap: spacingPixels[2],
  },
});
