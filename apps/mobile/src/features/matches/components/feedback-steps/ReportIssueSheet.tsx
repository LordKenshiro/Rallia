/**
 * Report Issue Sheet
 *
 * A bottom sheet component for reporting issues with an opponent.
 * Opens from within the opponent feedback step without losing feedback state.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { lightHaptic, selectionHaptic } from '@rallia/shared-utils';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import type { MatchReportReasonEnum } from '@rallia/shared-types';
import { REPORT_REASON_ICONS } from '@rallia/shared-types';
import type { TranslationKey } from '../../../../hooks/useTranslation';

// =============================================================================
// TYPES
// =============================================================================

interface ReportIssueSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Opponent name for header */
  opponentName: string;
  /** Callback when sheet is closed */
  onClose: () => void;
  /** Callback when report is submitted */
  onSubmit: (reason: MatchReportReasonEnum, details?: string) => void;
  /** Whether submission is in progress */
  isSubmitting: boolean;
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
}

// =============================================================================
// CONSTANTS
// =============================================================================

const REPORT_REASONS: Array<{
  value: MatchReportReasonEnum;
  labelKey: string;
}> = [
  { value: 'harassment', labelKey: 'matchFeedback.report.reasons.harassment' },
  { value: 'unsportsmanlike', labelKey: 'matchFeedback.report.reasons.unsportsmanlike' },
  { value: 'safety', labelKey: 'matchFeedback.report.reasons.safety' },
  { value: 'misrepresented_level', labelKey: 'matchFeedback.report.reasons.misrepresented_level' },
  { value: 'inappropriate', labelKey: 'matchFeedback.report.reasons.inappropriate' },
];

// =============================================================================
// REASON CARD COMPONENT
// =============================================================================

interface ReasonCardProps {
  reason: MatchReportReasonEnum;
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReportIssueSheetProps['colors'];
}

const ReasonCard: React.FC<ReasonCardProps> = ({ reason, label, selected, onPress, colors }) => {
  const iconName = REPORT_REASON_ICONS[reason] as keyof typeof Ionicons.glyphMap;

  return (
    <TouchableOpacity
      style={[
        styles.reasonCard,
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
      <Ionicons
        name={iconName}
        size={20}
        color={selected ? colors.buttonActive : colors.textMuted}
      />
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
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ReportIssueSheet: React.FC<ReportIssueSheetProps> = ({
  visible,
  opponentName,
  onClose,
  onSubmit,
  isSubmitting,
  colors,
  t,
}) => {
  const [selectedReason, setSelectedReason] = useState<MatchReportReasonEnum | null>(null);
  const [details, setDetails] = useState('');

  // Reset state when sheet opens
  const handleClose = useCallback(() => {
    lightHaptic();
    setSelectedReason(null);
    setDetails('');
    onClose();
  }, [onClose]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!selectedReason) return;
    onSubmit(selectedReason, details.trim() || undefined);
  }, [selectedReason, details, onSubmit]);

  // Can submit if reason is selected
  const canSubmit = useMemo(() => selectedReason !== null, [selectedReason]);

  // Title with opponent name
  const title = t('matchFeedback.report.title' as TranslationKey).replace('{name}', opponentName);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.cardBackground }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <Text size="lg" weight="semibold" color={colors.text}>
            {title}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Reason Selection */}
          <View style={styles.section}>
            <Text
              size="sm"
              weight="semibold"
              color={colors.textSecondary}
              style={styles.sectionLabel}
            >
              {t('matchFeedback.report.selectReason' as TranslationKey)}
            </Text>
            <View style={styles.reasonsGrid}>
              {REPORT_REASONS.map(reason => (
                <ReasonCard
                  key={reason.value}
                  reason={reason.value}
                  label={t(reason.labelKey as TranslationKey)}
                  selected={selectedReason === reason.value}
                  onPress={() => setSelectedReason(reason.value)}
                  colors={colors}
                />
              ))}
            </View>
          </View>

          {/* Details Input */}
          <View style={styles.section}>
            <Text
              size="sm"
              weight="semibold"
              color={colors.textSecondary}
              style={styles.sectionLabel}
            >
              {t('matchFeedback.report.detailsLabel' as TranslationKey)}
            </Text>
            <BottomSheetTextInput
              style={[
                styles.detailsInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.buttonInactive,
                  color: colors.text,
                },
              ]}
              value={details}
              onChangeText={setDetails}
              placeholder={t('matchFeedback.report.detailsPlaceholder' as TranslationKey)}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text size="xs" color={colors.textMuted} style={styles.characterCount}>
              {details.length}/500
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor:
                  canSubmit && !isSubmitting ? colors.buttonActive : colors.buttonInactive,
              },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.buttonTextActive} />
            ) : (
              <Text
                size="lg"
                weight="semibold"
                color={canSubmit ? colors.buttonTextActive : colors.textMuted}
              >
                {t('matchFeedback.report.submit' as TranslationKey)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[4],
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: spacingPixels[1],
    width: 40,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: spacingPixels[4],
  },
  section: {
    marginBottom: spacingPixels[6],
  },
  sectionLabel: {
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
    gap: spacingPixels[3],
  },
  reasonLabel: {
    flex: 1,
  },
  detailsInput: {
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    textAlign: 'right',
    marginTop: spacingPixels[1],
  },
  footer: {
    padding: spacingPixels[4],
    paddingBottom: spacingPixels[8],
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[4],
    paddingHorizontal: spacingPixels[6],
    borderRadius: radiusPixels.lg,
  },
});

export default ReportIssueSheet;
