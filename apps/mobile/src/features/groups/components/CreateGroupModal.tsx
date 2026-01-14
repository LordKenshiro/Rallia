/**
 * CreateGroupModal
 * Modal for creating a new player group
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@rallia/shared-components';
import { useThemeStyles } from '../../../hooks';

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, description?: string) => Promise<void>;
  isLoading?: boolean;
}

export function CreateGroupModal({
  visible,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateGroupModalProps) {
  const { colors, isDark } = useThemeStyles();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setName('');
    setDescription('');
    setError(null);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    if (name.trim().length < 2) {
      setError('Group name must be at least 2 characters');
      return;
    }

    if (name.trim().length > 50) {
      setError('Group name must be less than 50 characters');
      return;
    }

    setError(null);
    await onSubmit(name.trim(), description.trim() || undefined);
    setName('');
    setDescription('');
  }, [name, description, onSubmit]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text weight="semibold" size="lg" style={{ color: colors.text }}>
              Create New Group
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.inputGroup}>
              <Text weight="medium" size="sm" style={{ color: colors.text, marginBottom: 8 }}>
                Group Name *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: error ? '#FF3B30' : colors.border,
                  },
                ]}
                placeholder="Enter group name..."
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                maxLength={50}
                autoFocus
              />
              {error && (
                <Text size="xs" style={{ color: '#FF3B30', marginTop: 4 }}>
                  {error}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text weight="medium" size="sm" style={{ color: colors.text, marginBottom: 8 }}>
                Description (optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="What's this group about?"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                maxLength={200}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text size="xs" style={{ color: colors.textMuted, marginTop: 4, textAlign: 'right' }}>
                {description.length}/200
              </Text>
            </View>

            <View style={[styles.infoBox, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text size="sm" style={{ color: colors.textSecondary, flex: 1, marginLeft: 8 }}>
                Groups can have up to 10 members. As the creator, you'll be a moderator with the ability to add and remove members.
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={{ color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                isLoading && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text weight="semibold" style={{ color: '#FFFFFF' }}>
                  Create Group
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    gap: 20,
  },
  inputGroup: {
    gap: 0,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
});
