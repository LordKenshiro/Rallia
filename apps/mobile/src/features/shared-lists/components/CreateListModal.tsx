/**
 * CreateListModal Component
 * Modal for creating or editing a shared contact list
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels, fontSizePixels } from '@rallia/design-system';
import { neutral } from '@rallia/design-system';
import {
  createSharedContactList,
  updateSharedContactList,
  type SharedContactList,
} from '@rallia/shared-services';

interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  inputBackground: string;
}

interface CreateListModalProps {
  visible: boolean;
  editingList: SharedContactList | null;
  colors: ThemeColors;
  isDark: boolean;
  onClose: (refreshNeeded?: boolean) => void;
}

const CreateListModal: React.FC<CreateListModalProps> = ({
  visible,
  editingList,
  colors,
  isDark,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!editingList;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      if (editingList) {
        setName(editingList.name);
        setDescription(editingList.description || '');
      } else {
        setName('');
        setDescription('');
      }
    }
  }, [visible, editingList]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a list name');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingList) {
        await updateSharedContactList({
          id: editingList.id,
          name: trimmedName,
          description: description.trim() || undefined,
        });
      } else {
        await createSharedContactList({
          name: trimmedName,
          description: description.trim() || undefined,
        });
      }
      onClose(true);
    } catch (error) {
      console.error('Failed to save list:', error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} the list. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => onClose()}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => onClose()} disabled={isSubmitting}>
            <Text size="base" color={colors.primary}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text size="lg" weight="semibold" color={colors.text}>
            {isEditing ? 'Edit List' : 'New List'}
          </Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                size="base"
                weight="semibold"
                color={name.trim() ? colors.primary : colors.textMuted}
              >
                {isEditing ? 'Save' : 'Create'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text size="sm" weight="medium" color={colors.textSecondary} style={styles.label}>
              List Name *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Tennis Buddies"
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={100}
              editable={!isSubmitting}
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text size="sm" weight="medium" color={colors.textSecondary} style={styles.label}>
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
              value={description}
              onChangeText={setDescription}
              placeholder="Add a description for this list..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>

          {/* Hint */}
          <View style={[styles.hint, { backgroundColor: isDark ? neutral[800] : neutral[100] }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            <Text size="sm" color={colors.textSecondary} style={styles.hintText}>
              After creating your list, you can add contacts from your phone or enter them manually.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderBottomWidth: 1,
  },
  form: {
    padding: spacingPixels[4],
  },
  inputGroup: {
    marginBottom: spacingPixels[4],
  },
  label: {
    marginBottom: spacingPixels[2],
  },
  input: {
    borderWidth: 1,
    borderRadius: radiusPixels.md,
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[3],
    fontSize: fontSizePixels.base,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacingPixels[3],
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacingPixels[3],
    borderRadius: radiusPixels.md,
    gap: spacingPixels[2],
    marginTop: spacingPixels[2],
  },
  hintText: {
    flex: 1,
    lineHeight: 20,
  },
});

export default CreateListModal;
