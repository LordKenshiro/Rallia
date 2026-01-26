/**
 * EditGroupModal
 * Modal for editing group name, description, and cover image
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
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Text } from '@rallia/shared-components';
import { useThemeStyles, useAuth, useTranslation } from '../../../hooks';
import { useUpdateGroup, type Group } from '@rallia/shared-hooks';
import { uploadImage, replaceImage } from '../../../services/imageUpload';
import { primary } from '@rallia/design-system';

interface EditGroupModalProps {
  visible: boolean;
  onClose: () => void;
  group: Group;
  onSuccess: () => void;
}

export function EditGroupModal({ visible, onClose, group, onSuccess }: EditGroupModalProps) {
  const { colors, isDark } = useThemeStyles();
  const { session } = useAuth();
  const { t } = useTranslation();
  const playerId = session?.user?.id;

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [coverImage, setCoverImage] = useState<string | null>(group.cover_image_url || null);
  const [newCoverImage, setNewCoverImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateGroupMutation = useUpdateGroup();

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setName(group.name);
      setDescription(group.description || '');
      setCoverImage(group.cover_image_url || null);
      setNewCoverImage(null);
      setError(null);
    }
  }, [visible, group]);

  const handleClose = useCallback(() => {
    setError(null);
    setNewCoverImage(null);
    onClose();
  }, [onClose]);

  const handlePickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('groups.permissionRequired'), t('groups.photoAccessRequiredEdit'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setNewCoverImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert(t('common.error'), t('groups.failedToPickImage'));
    }
  }, [t]);

  const handleRemoveImage = useCallback(() => {
    setCoverImage(null);
    setNewCoverImage(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!playerId) return;

    if (!name.trim()) {
      setError(t('groups.nameRequired'));
      return;
    }

    if (name.trim().length < 2) {
      setError(t('groups.nameTooShort'));
      return;
    }

    if (name.trim().length > 50) {
      setError(t('groups.nameTooLong'));
      return;
    }

    setError(null);

    let coverImageUrl: string | null | undefined = undefined;

    // Handle image upload if there's a new image
    if (newCoverImage) {
      setIsUploadingImage(true);
      try {
        if (group.cover_image_url) {
          // Replace existing image
          const { url, error: uploadError } = await replaceImage(
            newCoverImage,
            group.cover_image_url,
            'group-images'
          );
          if (uploadError) {
            console.error('Error replacing image:', uploadError);
            Alert.alert(t('common.warning'), t('groups.failedToUpdateImage'));
          } else {
            coverImageUrl = url;
          }
        } else {
          // Upload new image
          const { url, error: uploadError } = await uploadImage(newCoverImage, 'group-images');
          if (uploadError) {
            console.error('Error uploading image:', uploadError);
            Alert.alert(t('common.warning'), t('groups.failedToUploadImage'));
          } else if (url) {
            coverImageUrl = url;
          }
        }
      } catch (err) {
        console.error('Error uploading image:', err);
      } finally {
        setIsUploadingImage(false);
      }
    } else if (coverImage === null && group.cover_image_url) {
      // User removed the image
      coverImageUrl = null;
    }

    try {
      await updateGroupMutation.mutateAsync({
        groupId: group.id,
        playerId,
        input: {
          name: name.trim(),
          description: description.trim() || undefined,
          ...(coverImageUrl !== undefined && { cover_image_url: coverImageUrl || undefined }),
        },
      });
      onSuccess();
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('groups.failedToUpdateGroup')
      );
    }
  }, [
    name,
    description,
    group.id,
    group.cover_image_url,
    playerId,
    updateGroupMutation,
    onSuccess,
    newCoverImage,
    coverImage,
    t,
  ]);

  const hasChanges =
    name !== group.name ||
    description !== (group.description || '') ||
    newCoverImage !== null ||
    (coverImage === null && group.cover_image_url !== null);

  const displayImage = newCoverImage || coverImage;
  const isSubmitting = updateGroupMutation.isPending || isUploadingImage;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text weight="semibold" size="lg" style={{ color: colors.text }}>
              {t('groups.editGroup')}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
            {/* Cover Image Picker */}
            <View style={styles.inputGroup}>
              <Text weight="medium" size="sm" style={{ color: colors.text, marginBottom: 8 }}>
                {t('groups.groupImage')}
              </Text>
              {displayImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: displayImage }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={[styles.removeImageButton, { backgroundColor: colors.cardBackground }]}
                    onPress={handleRemoveImage}
                  >
                    <Ionicons name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.changeImageButton, { backgroundColor: colors.primary }]}
                    onPress={handlePickImage}
                  >
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                    <Text size="xs" weight="semibold" style={{ color: '#FFFFFF', marginLeft: 4 }}>
                      {t('common.change')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.imagePicker,
                    {
                      backgroundColor: isDark ? primary[900] : primary[100],
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handlePickImage}
                >
                  <View
                    style={[styles.imagePickerIcon, { backgroundColor: colors.cardBackground }]}
                  >
                    <Ionicons name="camera" size={24} color={colors.primary} />
                  </View>
                  <Text size="sm" style={{ color: colors.textSecondary, marginTop: 8 }}>
                    {t('groups.addCoverImage')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text weight="medium" size="sm" style={{ color: colors.text, marginBottom: 8 }}>
                {t('groups.groupName')} *
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
                placeholder={t('groups.enterGroupName')}
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
                {t('groups.descriptionOptional')}
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
                placeholder={t('groups.descriptionPlaceholder')}
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
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={{ color: colors.text }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                (!hasChanges || isSubmitting) && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={!hasChanges || isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text weight="semibold" style={{ color: '#FFFFFF' }}>
                  {t('common.saveChanges')}
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
    maxHeight: '85%',
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
  scrollContent: {
    maxHeight: 400,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 0,
  },
  imagePicker: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
