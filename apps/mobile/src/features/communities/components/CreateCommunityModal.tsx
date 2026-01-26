/**
 * CreateCommunityModal
 * Modal for creating a new community with visibility toggle
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
  Image,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Text } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';
import { uploadImage } from '../../../services/imageUpload';
import { primary } from '@rallia/design-system';

interface CreateCommunityModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    name: string,
    description?: string,
    coverImageUrl?: string,
    isPublic?: boolean
  ) => Promise<void>;
  isLoading?: boolean;
}

export function CreateCommunityModal({
  visible,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateCommunityModalProps) {
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setName('');
    setDescription('');
    setCoverImage(null);
    setIsPublic(true);
    setError(null);
    onClose();
  }, [onClose]);

  const handlePickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('community.permissionRequired'), t('community.photoAccessRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCoverImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert(t('common.error'), t('community.failedToPickImage'));
    }
  }, [t]);

  const handleRemoveImage = useCallback(() => {
    setCoverImage(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError(t('community.nameRequired'));
      return;
    }

    if (name.trim().length < 2) {
      setError(t('community.nameTooShort'));
      return;
    }

    if (name.trim().length > 100) {
      setError(t('community.nameTooLong'));
      return;
    }

    setError(null);

    let coverImageUrl: string | undefined;

    if (coverImage) {
      setIsUploadingImage(true);
      try {
        // Use 'group-images' bucket as it's shared for network cover images
        const { url, error: uploadError } = await uploadImage(coverImage, 'group-images');
        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          Alert.alert(t('common.warning'), t('community.failedToUploadImage'));
        } else if (url) {
          coverImageUrl = url;
        }
      } catch (err) {
        console.error('Error uploading image:', err);
      } finally {
        setIsUploadingImage(false);
      }
    }

    await onSubmit(name.trim(), description.trim() || undefined, coverImageUrl, isPublic);
    setName('');
    setDescription('');
    setCoverImage(null);
    setIsPublic(true);
  }, [name, description, coverImage, isPublic, onSubmit, t]);

  const isSubmitting = isLoading || isUploadingImage;

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
              {t('community.createCommunity')}
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
                {t('community.communityImage')}
              </Text>
              {coverImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: coverImage }} style={styles.imagePreview} />
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
                    {t('community.addCoverImage')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Community Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text weight="medium" size="sm" style={{ color: colors.text }}>
                  {t('community.communityName')} *
                </Text>
                <Text size="xs" style={{ color: colors.textMuted }}>
                  {name.length}/100
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: error ? '#FF3B30' : colors.border,
                  },
                ]}
                placeholder={t('community.enterCommunityName')}
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                maxLength={100}
              />
              {error && (
                <Text size="xs" style={{ color: '#FF3B30', marginTop: 4 }}>
                  {error}
                </Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text weight="medium" size="sm" style={{ color: colors.text }}>
                  {t('community.descriptionOptional')}
                </Text>
                <Text size="xs" style={{ color: colors.textMuted }}>
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
                placeholder={t('community.descriptionPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                maxLength={500}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Visibility Toggle */}
            <View
              style={[styles.visibilityToggle, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
            >
              <View style={styles.visibilityLeft}>
                <View
                  style={[
                    styles.visibilityIcon,
                    { backgroundColor: isPublic ? '#34C75920' : '#FF950020' },
                  ]}
                >
                  <Ionicons
                    name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
                    size={24}
                    color={isPublic ? '#34C759' : '#FF9500'}
                  />
                </View>
                <View style={styles.visibilityText}>
                  <Text weight="semibold" size="sm" style={{ color: colors.text }}>
                    {isPublic ? t('community.publicCommunity') : t('community.privateCommunity')}
                  </Text>
                  <Text size="xs" style={{ color: colors.textSecondary, marginTop: 2 }}>
                    {isPublic
                      ? t('community.publicDescription')
                      : t('community.privateDescription')}
                  </Text>
                </View>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: '#767577', true: colors.primary + '80' }}
                thumbColor={isPublic ? colors.primary : '#f4f3f4'}
              />
            </View>

            {/* Info Box */}
            <View style={[styles.infoBox, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text size="sm" style={{ color: colors.textSecondary, flex: 1, marginLeft: 8 }}>
                {t('community.createInfo')}
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
                isSubmitting && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text weight="semibold" style={{ color: '#FFFFFF' }}>
                  {t('community.createCommunityButton')}
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
    maxHeight: '90%',
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
    maxHeight: 480,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 0,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
  },
  visibilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  visibilityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  visibilityText: {
    flex: 1,
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
