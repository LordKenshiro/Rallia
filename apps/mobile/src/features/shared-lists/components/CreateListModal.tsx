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
import { useTranslation } from '../../../hooks';
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
  const { t } = useTranslation();
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

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (isEditing && editingList) {
      return (
        name.trim() !== editingList.name || description.trim() !== (editingList.description || '')
      );
    }
    return name.trim() !== '' || description.trim() !== '';
  };

  // Handle close with discard confirmation
  const handleClose = () => {
    if (hasUnsavedChanges()) {
      Alert.alert(t('sharedLists.discardChanges'), t('sharedLists.discardChangesMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('sharedLists.discard'), style: 'destructive', onPress: () => onClose() },
      ]);
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(t('alerts.error'), t('sharedLists.errors.nameRequired'));
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
      Alert.alert(
        t('alerts.error'),
        isEditing ? t('sharedLists.errors.failedToUpdate') : t('sharedLists.errors.failedToCreate')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
            <Text size="base" color={colors.primary}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
          <Text size="lg" weight="semibold" color={colors.text}>
            {isEditing ? t('sharedLists.editList') : t('sharedLists.newList')}
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
                {isEditing ? t('common.save') : t('sharedLists.createList')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text size="sm" weight="medium" color={colors.textSecondary}>
                {t('sharedLists.listName')} *
              </Text>
              <Text size="xs" color={colors.textMuted}>
                {name.length}/100
              </Text>
            </View>
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
              placeholder={t('sharedLists.listNamePlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={100}
              editable={!isSubmitting}
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text size="sm" weight="medium" color={colors.textSecondary}>
                {t('sharedLists.listDescription')}
              </Text>
              <Text size="xs" color={colors.textMuted}>
                {description.length}/500
              </Text>
            </View>
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
              placeholder={t('sharedLists.listDescriptionPlaceholder')}
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
              {t('sharedLists.createListHint')}
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingPixels[2],
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
