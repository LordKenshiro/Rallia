/**
 * CreateGroupModal
 * Modal for creating a new player group with optional cover image
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Text } from '@rallia/shared-components';
import { useThemeStyles } from '../../../hooks';
import { uploadImage } from '../../../services/imageUpload';
import { primary } from '@rallia/design-system';

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, description?: string, coverImageUrl?: string) => Promise<void>;
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
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setName('');
    setDescription('');
    setCoverImage(null);
    setError(null);
    onClose();
  }, [onClose]);

  const handlePickImage = useCallback(async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photos to add a group image.'
        );
        return;
      }

      // Pick image
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
      Alert.alert('Error', 'Failed to pick image');
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setCoverImage(null);
  }, []);

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

    let coverImageUrl: string | undefined;

    // Upload image if selected
    if (coverImage) {
      setIsUploadingImage(true);
      try {
        const { url, error: uploadError } = await uploadImage(coverImage, 'group-images');
        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          Alert.alert(
            'Warning',
            'Failed to upload group image. Group will be created without image.'
          );
        } else if (url) {
          coverImageUrl = url;
        }
      } catch (err) {
        console.error('Error uploading image:', err);
      } finally {
        setIsUploadingImage(false);
      }
    }

    await onSubmit(name.trim(), description.trim() || undefined, coverImageUrl);
    setName('');
    setDescription('');
    setCoverImage(null);
  }, [name, description, coverImage, onSubmit]);

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
              Create New Group
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
                Group Image (optional)
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
                      Change
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
                    Add a cover image
                  </Text>
                </TouchableOpacity>
              )}
            </View>

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

            <View style={[styles.infoBox, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text size="sm" style={{ color: colors.textSecondary, flex: 1, marginLeft: 8 }}>
                Groups can have up to 10 members. As the creator, you'll be a moderator with the
                ability to add and remove members.
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
              <Text style={{ color: colors.text }}>Cancel</Text>
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
