/**
 * ReportUserModal
 * Modal for reporting a user with reason selection and optional description
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';
import { 
  createReport, 
  type ReportReason, 
  REPORT_REASON_LABELS 
} from '@rallia/shared-services';
import { radiusPixels, primary, status } from '@rallia/design-system';

interface ReportUserModalProps {
  visible: boolean;
  onClose: () => void;
  reporterId: string;
  reportedId: string;
  reportedName: string;
  conversationId?: string;
}

const REPORT_REASONS: ReportReason[] = [
  'inappropriate_behavior',
  'harassment', 
  'spam',
  'cheating',
  'other',
];

export function ReportUserModal({
  visible,
  onClose,
  reporterId,
  reportedId,
  reportedName,
  conversationId,
}: ReportUserModalProps) {
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();
  
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setSelectedReason(null);
    setDescription('');
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) {
      Alert.alert(t('common.error' as any), t('chat.report.pleaseSelectReason' as any));
      return;
    }

    setIsSubmitting(true);
    try {
      await createReport({
        reporterId,
        reportedId,
        reason: selectedReason,
        description: description.trim() || undefined,
        conversationId,
      });
      
      Alert.alert(
        t('chat.report.submitted' as any),
        t('chat.report.thankYou' as any),
        [{ text: t('common.ok' as any), onPress: handleClose }]
      );
    } catch (error) {
      Alert.alert(
        t('common.error' as any),
        error instanceof Error ? error.message : t('chat.report.failedToSubmit' as any)
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedReason, description, reporterId, reportedId, conversationId, handleClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text weight="semibold" size="lg" style={{ color: colors.text }}>
              {t('chat.report.reportUser' as any, { name: reportedName })}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Warning text */}
            <View style={[styles.warningBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)' }]}>
              <Ionicons name="warning-outline" size={20} color={status.warning.DEFAULT} />
              <Text size="sm" style={{ color: isDark ? status.warning.light : status.warning.dark, flex: 1, marginLeft: 8 }}>
                {t('chat.report.warningText' as any)}
              </Text>
            </View>

            {/* Reason selection */}
            <Text weight="medium" style={{ color: colors.text, marginBottom: 12, marginTop: 16 }}>
              {t('chat.report.selectReason' as any)}
            </Text>
            
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  {
                    backgroundColor: selectedReason === reason 
                      ? (isDark ? primary[900] : primary[50])
                      : (isDark ? '#2C2C2E' : '#F2F2F7'),
                    borderColor: selectedReason === reason 
                      ? primary[500]
                      : 'transparent',
                  },
                ]}
                onPress={() => setSelectedReason(reason)}
                activeOpacity={0.7}
              >
                <Text 
                  style={{ 
                    color: selectedReason === reason ? primary[500] : colors.text,
                    flex: 1,
                  }}
                >
                  {REPORT_REASON_LABELS[reason]}
                </Text>
                {selectedReason === reason && (
                  <Ionicons name="checkmark-circle" size={20} color={primary[500]} />
                )}
              </TouchableOpacity>
            ))}

            {/* Description input */}
            <Text weight="medium" style={{ color: colors.text, marginBottom: 12, marginTop: 20 }}>
              {t('chat.report.additionalDetails' as any)}
            </Text>
            <TextInput
              style={[
                styles.descriptionInput,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder={t('chat.report.provideContext' as any)}
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text size="xs" style={{ color: colors.textMuted, textAlign: 'right', marginTop: 4 }}>
              {description.length}/500
            </Text>
          </ScrollView>

          {/* Submit button */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: selectedReason ? status.error.DEFAULT : colors.textMuted,
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={!selectedReason || isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="flag-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text weight="semibold" color="#fff">
                    Submit Report
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radiusPixels.md,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radiusPixels.md,
    marginBottom: 8,
    borderWidth: 2,
  },
  descriptionInput: {
    borderRadius: radiusPixels.md,
    padding: 12,
    minHeight: 100,
    borderWidth: 1,
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: radiusPixels.lg,
  },
});
