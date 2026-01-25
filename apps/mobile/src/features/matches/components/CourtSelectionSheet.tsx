/**
 * Court Selection Sheet
 *
 * Modal for selecting which court to book when multiple courts
 * are available at the same time slot.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { lightHaptic, successHaptic } from '@rallia/shared-utils';
import type { CourtOption } from '@rallia/shared-hooks';
import type { TranslationKey } from '../../../hooks/useTranslation';

// =============================================================================
// TYPES
// =============================================================================

interface CourtSelectionSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Available court options */
  courts: CourtOption[];
  /** Time slot label (e.g., "5:00 PM") */
  timeLabel: string;
  /** Called when user selects a court */
  onSelect: (court: CourtOption) => void;
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
// COURT ITEM COMPONENT
// =============================================================================

interface CourtItemProps {
  court: CourtOption;
  onPress: () => void;
  colors: CourtSelectionSheetProps['colors'];
}

const CourtItem: React.FC<CourtItemProps> = ({ court, onPress, colors }) => (
  <TouchableOpacity
    style={[
      styles.courtItem,
      { backgroundColor: colors.buttonInactive, borderColor: colors.border },
    ]}
    onPress={() => {
      lightHaptic();
      onPress();
    }}
    activeOpacity={0.7}
  >
    <View style={[styles.courtIconContainer, { backgroundColor: `${colors.buttonActive}20` }]}>
      <Ionicons name="tennisball-outline" size={20} color={colors.buttonActive} />
    </View>
    <View style={styles.courtInfo}>
      <Text size="base" weight="medium" color={colors.text} numberOfLines={2}>
        {court.courtName}
      </Text>
      {court.price !== undefined && court.price > 0 && (
        <Text size="sm" color={colors.textMuted}>
          ${court.price.toFixed(2)}
        </Text>
      )}
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
  </TouchableOpacity>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CourtSelectionSheet: React.FC<CourtSelectionSheetProps> = ({
  visible,
  courts,
  timeLabel,
  onSelect,
  onCancel,
  colors,
  t,
}) => {
  const handleSelect = (court: CourtOption) => {
    successHaptic();
    onSelect(court);
  };

  const handleCancel = () => {
    lightHaptic();
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: `${colors.buttonActive}15` }]}>
                <Ionicons name="calendar-outline" size={24} color={colors.buttonActive} />
              </View>

              {/* Title */}
              <View style={styles.titleContainer}>
                <Text size="lg" weight="bold" color={colors.text}>
                  {t('matchCreation.booking.selectCourt' as TranslationKey)}
                </Text>
                <Text size="sm" color={colors.textMuted}>
                  {timeLabel} • {courts.length}{' '}
                  {courts.length === 1
                    ? t('matchCreation.booking.courtAvailable' as TranslationKey)
                    : t('matchCreation.booking.courtsAvailable' as TranslationKey)}
                </Text>
              </View>
            </View>

            {/* Close button */}
            <TouchableOpacity
              onPress={handleCancel}
              style={[styles.closeButton, { backgroundColor: colors.buttonInactive }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Court list */}
          <ScrollView style={styles.courtList} showsVerticalScrollIndicator={false}>
            {courts.map((court, index) => (
              <CourtItem
                key={`${court.facilityScheduleId}-${index}`}
                court={court}
                onPress={() => handleSelect(court)}
                colors={colors}
              />
            ))}
          </ScrollView>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.buttonInactive }]}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Text size="base" weight="medium" color={colors.textSecondary}>
              {t('common.cancel' as TranslationKey)}
            </Text>
          </TouchableOpacity>
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
    maxWidth: 380,
    maxHeight: '80%',
    borderRadius: radiusPixels['2xl'],
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacingPixels[5],
    paddingBottom: spacingPixels[4],
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radiusPixels.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radiusPixels.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacingPixels[2],
  },
  courtList: {
    paddingHorizontal: spacingPixels[4],
    maxHeight: 300,
  },
  courtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    marginBottom: spacingPixels[2],
    gap: spacingPixels[3],
  },
  courtIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radiusPixels.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courtInfo: {
    flex: 1,
  },
  cancelButton: {
    margin: spacingPixels[4],
    paddingVertical: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CourtSelectionSheet;
