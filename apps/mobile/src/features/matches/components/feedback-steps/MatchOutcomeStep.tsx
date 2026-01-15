/**
 * Match Outcome Step
 *
 * First step of the feedback wizard asking whether the match happened
 * or was mutually cancelled.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { lightHaptic, selectionHaptic } from '@rallia/shared-utils';
import type { MatchOutcomeEnum, CancellationReasonEnum } from '@rallia/shared-types';
import type { TranslationKey } from '../../../../hooks/useTranslation';

// =============================================================================
// TYPES
// =============================================================================

interface MatchOutcomeStepProps {
  /** Current outcome value */
  outcome: MatchOutcomeEnum | null;
  /** Current cancellation reason */
  cancellationReason: CancellationReasonEnum | null;
  /** Current cancellation notes */
  cancellationNotes: string;
  /** Callback when form values change */
  onOutcomeChange: (
    outcome: MatchOutcomeEnum | null,
    cancellationReason?: CancellationReasonEnum | null,
    cancellationNotes?: string
  ) => void;
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
  };
  /** Translation function */
  t: (key: TranslationKey) => string;
  /** Whether dark mode is active */
  isDark: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CANCELLATION_REASONS: Array<{
  value: CancellationReasonEnum;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
}> = [
  {
    value: 'weather',
    icon: 'rainy-outline',
    labelKey: 'matchFeedback.cancellationReasons.weather',
  },
  {
    value: 'court_unavailable',
    icon: 'close-circle-outline',
    labelKey: 'matchFeedback.cancellationReasons.courtUnavailable',
  },
  {
    value: 'emergency',
    icon: 'warning-outline',
    labelKey: 'matchFeedback.cancellationReasons.emergency',
  },
  {
    value: 'other',
    icon: 'chatbox-ellipses-outline',
    labelKey: 'matchFeedback.cancellationReasons.other',
  },
];

// =============================================================================
// OPTION CARD COMPONENT
// =============================================================================

interface OptionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  colors: MatchOutcomeStepProps['colors'];
}

const OptionCard: React.FC<OptionCardProps> = ({
  icon,
  title,
  description,
  selected,
  onPress,
  colors,
}) => (
  <TouchableOpacity
    style={[
      styles.optionCard,
      {
        backgroundColor: selected ? `${colors.buttonActive}15` : colors.buttonInactive,
        borderColor: selected ? colors.buttonActive : colors.border,
      },
    ]}
    onPress={() => {
      selectionHaptic();
      onPress();
    }}
    activeOpacity={0.7}
  >
    <View style={styles.optionContent}>
      <Ionicons name={icon} size={24} color={selected ? colors.buttonActive : colors.textMuted} />
      <View style={styles.optionTextContainer}>
        <Text
          size="base"
          weight={selected ? 'semibold' : 'regular'}
          color={selected ? colors.buttonActive : colors.text}
        >
          {title}
        </Text>
        {description && (
          <Text size="xs" color={colors.textMuted}>
            {description}
          </Text>
        )}
      </View>
    </View>
    {selected && <Ionicons name="checkmark-circle" size={24} color={colors.buttonActive} />}
  </TouchableOpacity>
);

// =============================================================================
// CANCELLATION REASON CARD
// =============================================================================

interface ReasonCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: MatchOutcomeStepProps['colors'];
}

const ReasonCard: React.FC<ReasonCardProps> = ({ icon, label, selected, onPress, colors }) => (
  <TouchableOpacity
    style={[
      styles.reasonCard,
      {
        backgroundColor: selected ? `${colors.buttonActive}15` : colors.buttonInactive,
        borderColor: selected ? colors.buttonActive : colors.border,
      },
    ]}
    onPress={() => {
      lightHaptic();
      onPress();
    }}
    activeOpacity={0.7}
  >
    <Ionicons name={icon} size={20} color={selected ? colors.buttonActive : colors.textMuted} />
    <Text
      size="sm"
      weight={selected ? 'semibold' : 'regular'}
      color={selected ? colors.buttonActive : colors.text}
      style={styles.reasonLabel}
    >
      {label}
    </Text>
    {selected && <Ionicons name="checkmark-circle" size={18} color={colors.buttonActive} />}
  </TouchableOpacity>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const MatchOutcomeStep: React.FC<MatchOutcomeStepProps> = ({
  outcome,
  cancellationReason,
  cancellationNotes,
  onOutcomeChange,
  colors,
  t,
  isDark: _isDark,
}) => {
  const handleOutcomeChange = useCallback(
    (newOutcome: MatchOutcomeEnum) => {
      onOutcomeChange(newOutcome, null, '');
    },
    [onOutcomeChange]
  );

  const handleCancellationReasonChange = useCallback(
    (reason: CancellationReasonEnum) => {
      onOutcomeChange(outcome, reason, reason === 'other' ? cancellationNotes : '');
    },
    [onOutcomeChange, outcome, cancellationNotes]
  );

  const handleCancellationNotesChange = useCallback(
    (notes: string) => {
      onOutcomeChange(outcome, cancellationReason, notes);
    },
    [onOutcomeChange, outcome, cancellationReason]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title */}
      <View style={styles.header}>
        <Text size="xl" weight="bold" color={colors.text}>
          {t('matchFeedback.outcomeStep.title' as TranslationKey)}
        </Text>
        <Text size="sm" color={colors.textMuted} style={styles.subtitle}>
          {t('matchFeedback.outcomeStep.subtitle' as TranslationKey)}
        </Text>
      </View>

      {/* Outcome Options */}
      <View style={styles.optionsContainer}>
        <OptionCard
          icon="checkmark-circle-outline"
          title={t('matchFeedback.outcomeStep.matchPlayed' as TranslationKey)}
          description={t('matchFeedback.outcomeStep.matchPlayedDescription' as TranslationKey)}
          selected={outcome === 'played'}
          onPress={() => handleOutcomeChange('played')}
          colors={colors}
        />
        <OptionCard
          icon="close-circle-outline"
          title={t('matchFeedback.outcomeStep.matchCancelled' as TranslationKey)}
          description={t('matchFeedback.outcomeStep.matchCancelledDescription' as TranslationKey)}
          selected={outcome === 'mutual_cancel'}
          onPress={() => handleOutcomeChange('mutual_cancel')}
          colors={colors}
        />
      </View>

      {/* Cancellation Reasons (only if cancelled selected) */}
      {outcome === 'mutual_cancel' && (
        <View style={styles.reasonsSection}>
          <Text
            size="sm"
            weight="semibold"
            color={colors.textSecondary}
            style={styles.reasonsLabel}
          >
            {t('matchFeedback.outcomeStep.whyCancelled' as TranslationKey)}
          </Text>
          <View style={styles.reasonsGrid}>
            {CANCELLATION_REASONS.map(reason => (
              <ReasonCard
                key={reason.value}
                value={reason.value}
                icon={reason.icon}
                label={t(reason.labelKey as TranslationKey)}
                selected={cancellationReason === reason.value}
                onPress={() => handleCancellationReasonChange(reason.value)}
                colors={colors}
              />
            ))}
          </View>

          {/* Other reason text input */}
          {cancellationReason === 'other' && (
            <View style={styles.notesContainer}>
              <BottomSheetTextInput
                style={[
                  styles.notesInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.buttonInactive,
                    color: colors.text,
                  },
                ]}
                value={cancellationNotes}
                onChangeText={handleCancellationNotesChange}
                placeholder={t(
                  'matchFeedback.outcomeStep.otherReasonPlaceholder' as TranslationKey
                )}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacingPixels[4],
    paddingBottom: spacingPixels[8],
  },
  header: {
    marginBottom: spacingPixels[6],
  },
  subtitle: {
    marginTop: spacingPixels[1],
  },
  optionsContainer: {
    gap: spacingPixels[3],
    marginBottom: spacingPixels[6],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacingPixels[3],
  },
  optionTextContainer: {
    flex: 1,
  },
  reasonsSection: {
    marginBottom: spacingPixels[6],
  },
  reasonsLabel: {
    marginBottom: spacingPixels[3],
  },
  reasonsGrid: {
    gap: spacingPixels[2],
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingPixels[3],
    paddingHorizontal: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    gap: spacingPixels[2],
  },
  reasonLabel: {
    flex: 1,
    flexShrink: 1, // Allow text to shrink if needed
  },
  notesContainer: {
    marginTop: spacingPixels[3],
  },
  notesInput: {
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

export default MatchOutcomeStep;
