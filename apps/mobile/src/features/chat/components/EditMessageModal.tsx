/**
 * EditMessageModal Component
 * Modal for editing a message
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';
import { spacingPixels, fontSizePixels, primary, neutral } from '@rallia/design-system';
import type { MessageWithSender } from '@rallia/shared-services';

interface EditMessageModalProps {
  visible: boolean;
  message: MessageWithSender | null;
  onClose: () => void;
  onSave: (newContent: string) => void;
  isSaving?: boolean;
}

function EditMessageModalComponent({
  visible,
  message,
  onClose,
  onSave,
  isSaving = false,
}: EditMessageModalProps) {
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();
  const [editedContent, setEditedContent] = useState('');

  // Reset content when modal opens with a new message
  useEffect(() => {
    if (visible && message) {
      setEditedContent(message.content);
    }
  }, [visible, message]);

  const handleSave = useCallback(() => {
    const trimmed = editedContent.trim();
    if (trimmed && trimmed !== message?.content) {
      onSave(trimmed);
    } else {
      onClose();
    }
  }, [editedContent, message, onSave, onClose]);

  const canSave = editedContent.trim().length > 0 && 
                  editedContent.trim() !== message?.content &&
                  !isSaving;

  if (!message) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>{t('chat.editMessage' as any)}</Text>
            <TouchableOpacity 
              onPress={handleSave} 
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              disabled={!canSave}
            >
              <Text style={[
                styles.saveButtonText, 
                { color: canSave ? primary[500] : colors.textMuted }
              ]}>
                {isSaving ? t('common.saving' as any) : t('common.save' as any)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Original message preview */}
          <View style={[styles.originalContainer, { backgroundColor: isDark ? neutral[800] : neutral[100] }]}>
            <Text style={[styles.originalLabel, { color: colors.textMuted }]}>{t('chat.original' as any)}:</Text>
            <Text style={[styles.originalText, { color: colors.textMuted }]} numberOfLines={2}>
              {message.content}
            </Text>
          </View>

          {/* Edit input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input, 
                { 
                  color: colors.text, 
                  backgroundColor: isDark ? neutral[800] : neutral[100],
                  borderColor: colors.border,
                }
              ]}
              value={editedContent}
              onChangeText={setEditedContent}
              placeholder={t('chat.editYourMessage' as any)}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              autoFocus
              textAlignVertical="top"
            />
          </View>

          {/* Character count */}
          <Text style={[styles.charCount, { color: colors.textMuted }]}>
            {editedContent.length} / 2000
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const EditMessageModal = memo(EditMessageModalComponent);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: spacingPixels[1],
  },
  title: {
    fontSize: fontSizePixels.lg,
    fontWeight: '600',
  },
  saveButton: {
    padding: spacingPixels[1],
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: fontSizePixels.base,
    fontWeight: '600',
  },
  originalContainer: {
    marginHorizontal: spacingPixels[4],
    marginTop: spacingPixels[3],
    padding: spacingPixels[3],
    borderRadius: 8,
  },
  originalLabel: {
    fontSize: fontSizePixels.xs,
    fontWeight: '500',
    marginBottom: spacingPixels[1],
  },
  originalText: {
    fontSize: fontSizePixels.sm,
    fontStyle: 'italic',
  },
  inputContainer: {
    padding: spacingPixels[4],
  },
  input: {
    fontSize: fontSizePixels.base,
    padding: spacingPixels[3],
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 100,
    maxHeight: 200,
  },
  charCount: {
    fontSize: fontSizePixels.xs,
    textAlign: 'right',
    paddingHorizontal: spacingPixels[4],
    paddingBottom: spacingPixels[4],
  },
});
