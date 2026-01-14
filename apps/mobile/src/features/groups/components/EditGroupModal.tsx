/**
 * EditGroupModal
 * Modal for editing group name and description
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@rallia/shared-components';
import { useThemeStyles, useAuth } from '../../../hooks';
import { useUpdateGroup, type Group } from '@rallia/shared-hooks';

interface EditGroupModalProps {
  visible: boolean;
  onClose: () => void;
  group: Group;
  onSuccess: () => void;
}

export function EditGroupModal({
  visible,
  onClose,
  group,
  onSuccess,
}: EditGroupModalProps) {
  const { colors } = useThemeStyles();
  const { session } = useAuth();
  const playerId = session?.user?.id;

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [error, setError] = useState<string | null>(null);

  const updateGroupMutation = useUpdateGroup();

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setName(group.name);
      setDescription(group.description || '');
      setError(null);
    }
  }, [visible, group]);

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!playerId) return;

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

    try {
      await updateGroupMutation.mutateAsync({
        groupId: group.id,
        playerId,
        input: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      });
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update group');
    }
  }, [name, description, group.id, playerId, updateGroupMutation, onSuccess]);

  const hasChanges = name !== group.name || description !== (group.description || '');

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
              Edit Group
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
          </View>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={updateGroupMutation.isPending}
            >
              <Text style={{ color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                (!hasChanges || updateGroupMutation.isPending) && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={!hasChanges || updateGroupMutation.isPending || !name.trim()}
            >
              {updateGroupMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text weight="semibold" style={{ color: '#FFFFFF' }}>
                  Save Changes
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
