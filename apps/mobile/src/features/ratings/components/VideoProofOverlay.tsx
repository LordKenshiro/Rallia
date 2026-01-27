import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { Overlay, Text, Heading, Button, useToast } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';
import { lightHaptic, mediumHaptic } from '@rallia/shared-utils';
import { 
  uploadRatingProofFile, 
  validateProofFile,
  getMaxFileSizes,
  getSupportedVideoFormats,
} from '../../../services/ratingProofUpload';
import { isBackblazeConfigured, getBackblazeConfigStatus } from '../../../services/backblazeUpload';
import { Logger, supabase } from '@rallia/shared-services';
import {
  spacingPixels,
  radiusPixels,
  fontSizePixels,
} from '@rallia/design-system';

interface VideoProofOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  playerRatingScoreId: string;
}

const MAX_VIDEO_DURATION_SECONDS = 300; // 5 minutes

const VideoProofOverlay: React.FC<VideoProofOverlayProps> = ({
  visible,
  onClose,
  onSuccess,
  playerRatingScoreId,
}) => {
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const toast = useToast();

  const [selectedVideo, setSelectedVideo] = useState<{
    uri: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    duration?: number;
  } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const resetForm = () => {
    setSelectedVideo(null);
    setTitle('');
    setDescription('');
    setUploadProgress(0);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleVideoSelected = (
    uri: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    duration?: number,
  ) => {
    // Validate file
    const validation = validateProofFile(fileName, fileSize, 'video');
    if (!validation.valid) {
      toast.error(validation.error || t('profile.ratingProofs.upload.invalidFormat'));
      return;
    }

    // Check duration
    if (duration && duration > MAX_VIDEO_DURATION_SECONDS) {
      toast.error(t('profile.ratingProofs.proofTypes.video.maxDuration'));
      return;
    }

    setSelectedVideo({ uri, fileName, fileSize, mimeType, duration });
  };

  const handleRecordVideo = async () => {
    lightHaptic();

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `video_${Date.now()}.mp4`;
        const fileSize = asset.fileSize || 0;
        const mimeType = asset.mimeType || 'video/mp4';
        const duration = asset.duration ? asset.duration / 1000 : undefined; // Convert ms to seconds

        handleVideoSelected(asset.uri, fileName, fileSize, mimeType, duration);
      }
    } catch (error) {
      Logger.error('Failed to record video', error as Error);
      toast.error(t('common.error'));
    }
  };

  const handleSelectFromGallery = async () => {
    lightHaptic();

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `video_${Date.now()}.mp4`;
        const fileSize = asset.fileSize || 0;
        const mimeType = asset.mimeType || 'video/mp4';
        const duration = asset.duration ? asset.duration / 1000 : undefined;

        handleVideoSelected(asset.uri, fileName, fileSize, mimeType, duration);
      }
    } catch (error) {
      Logger.error('Failed to select video', error as Error);
      toast.error(t('common.error'));
    }
  };

  const handleRemoveVideo = () => {
    lightHaptic();
    setSelectedVideo(null);
  };

  const handleSubmit = async () => {
    if (!selectedVideo) {
      toast.error(t('profile.ratingProofs.errors.fileRequired'));
      return;
    }

    if (!title.trim()) {
      toast.error(t('profile.ratingProofs.errors.titleRequired'));
      return;
    }

    // Check if Backblaze is configured (for videos)
    if (!isBackblazeConfigured()) {
      Logger.warn('Backblaze not configured', getBackblazeConfigStatus());
      // Fall back to Supabase for video upload (will work but less optimal)
    }

    mediumHaptic();
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get actual file size if not available
      let fileSize = selectedVideo.fileSize;
      if (!fileSize || fileSize === 0) {
        const response = await fetch(selectedVideo.uri);
        const blob = await response.blob();
        fileSize = blob.size;
      }

      const result = await uploadRatingProofFile({
        fileUri: selectedVideo.uri,
        fileType: 'video',
        originalName: selectedVideo.fileName,
        mimeType: selectedVideo.mimeType,
        fileSize,
        userId: user.id,
        playerRatingScoreId,
        title: title.trim(),
        description: description.trim() || undefined,
        onProgress: setUploadProgress,
      });

      if (result.success) {
        toast.success(t('profile.ratingProofs.upload.success'));
        resetForm();
        onSuccess();
        onClose();
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      Logger.error('Failed to upload video proof', error as Error);
      toast.error(t('profile.ratingProofs.errors.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const maxSizeMB = Math.round(getMaxFileSizes().video / (1024 * 1024));
  const supportedFormats = getSupportedVideoFormats().join(', ').toUpperCase();

  return (
    <Overlay visible={visible} onClose={handleClose} type="bottom">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.iconHeader, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="videocam-outline" size={32} color={colors.primary} />
            </View>
            <Heading level={3} color={colors.text} style={styles.title}>
              {t('profile.ratingProofs.proofTypes.video.title')}
            </Heading>
            <Text size="sm" color={colors.textMuted} style={styles.subtitle}>
              {t('profile.ratingProofs.proofTypes.video.description')}
            </Text>
          </View>

          {/* Video Selection */}
          {!selectedVideo ? (
            <View style={styles.selectionContainer}>
              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                ]}
                onPress={handleRecordVideo}
                activeOpacity={0.7}
                disabled={isSubmitting}
              >
                <View style={[styles.selectionIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="videocam" size={28} color={colors.primary} />
                </View>
                <View style={styles.selectionContent}>
                  <Text size="base" weight="semibold" color={colors.text}>
                    {t('profile.ratingProofs.proofTypes.video.recordVideo')}
                  </Text>
                  <Text size="xs" color={colors.textMuted}>
                    Record a new video now
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                ]}
                onPress={handleSelectFromGallery}
                activeOpacity={0.7}
                disabled={isSubmitting}
              >
                <View style={[styles.selectionIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="folder-open-outline" size={28} color={colors.primary} />
                </View>
                <View style={styles.selectionContent}>
                  <Text size="base" weight="semibold" color={colors.text}>
                    {t('profile.ratingProofs.proofTypes.video.selectFromGallery')}
                  </Text>
                  <Text size="xs" color={colors.textMuted}>
                    Choose an existing video
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text size="xs" color={colors.textMuted}>
                    {t('profile.ratingProofs.proofTypes.video.maxDuration')}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="cloud-upload-outline" size={14} color={colors.textMuted} />
                  <Text size="xs" color={colors.textMuted}>
                    Max size: {maxSizeMB} MB
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="document-outline" size={14} color={colors.textMuted} />
                  <Text size="xs" color={colors.textMuted}>
                    Formats: {supportedFormats}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.previewContainer}>
              <View style={styles.videoPreviewWrapper}>
                <Video
                  source={{ uri: selectedVideo.uri }}
                  style={styles.videoPreview}
                  resizeMode={ResizeMode.COVER}
                  useNativeControls
                  isLooping={false}
                />
                <TouchableOpacity
                  style={[styles.removeButton, { backgroundColor: colors.error }]}
                  onPress={handleRemoveVideo}
                  disabled={isSubmitting}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.videoInfo}>
                <Text size="sm" color={colors.text} weight="medium">
                  {selectedVideo.fileName}
                </Text>
                <View style={styles.videoMeta}>
                  {selectedVideo.duration && (
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                      <Text size="xs" color={colors.textMuted}>
                        {formatDuration(selectedVideo.duration)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.metaItem}>
                    <Ionicons name="document-outline" size={12} color={colors.textMuted} />
                    <Text size="xs" color={colors.textMuted}>
                      {formatFileSize(selectedVideo.fileSize)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text size="sm" weight="medium" color={colors.text} style={styles.label}>
              {t('profile.ratingProofs.form.title')} *
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder={t('profile.ratingProofs.form.titlePlaceholder')}
              placeholderTextColor={colors.textMuted}
              maxLength={100}
              returnKeyType="next"
              editable={!isSubmitting}
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text size="sm" weight="medium" color={colors.text} style={styles.label}>
              {t('profile.ratingProofs.form.description')}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('profile.ratingProofs.form.descriptionPlaceholder')}
              placeholderTextColor={colors.textMuted}
              maxLength={500}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>

          {/* Upload Progress */}
          {isSubmitting && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.primary, width: `${uploadProgress}%` },
                  ]}
                />
              </View>
              <Text size="xs" color={colors.textMuted} style={styles.progressText}>
                {uploadProgress < 100 
                  ? `${t('profile.ratingProofs.upload.uploading')} ${uploadProgress}%`
                  : t('profile.ratingProofs.upload.processing')}
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <Button
            variant="primary"
            onPress={handleSubmit}
            disabled={isSubmitting || !selectedVideo || !title.trim()}
            style={styles.submitButton}
          >
            {isSubmitting ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primaryForeground} />
                <Text size="base" weight="semibold" color={colors.primaryForeground} style={styles.loadingText}>
                  {uploadProgress < 100 
                    ? t('profile.ratingProofs.upload.uploading')
                    : t('profile.ratingProofs.upload.processing')}
                </Text>
              </View>
            ) : (
              t('profile.ratingProofs.form.submit')
            )}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    maxHeight: '90%',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacingPixels[4],
    paddingBottom: spacingPixels[6],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacingPixels[4],
  },
  iconHeader: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacingPixels[3],
  },
  title: {
    textAlign: 'center',
    marginBottom: spacingPixels[1],
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: spacingPixels[4],
  },
  selectionContainer: {
    gap: spacingPixels[3],
    marginBottom: spacingPixels[4],
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    gap: spacingPixels[3],
  },
  selectionIcon: {
    width: 48,
    height: 48,
    borderRadius: radiusPixels.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionContent: {
    flex: 1,
  },
  infoContainer: {
    padding: spacingPixels[3],
    gap: spacingPixels[2],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
  },
  previewContainer: {
    marginBottom: spacingPixels[4],
  },
  videoPreviewWrapper: {
    position: 'relative',
    borderRadius: radiusPixels.lg,
    overflow: 'hidden',
  },
  videoPreview: {
    width: '100%',
    height: 200,
    borderRadius: radiusPixels.lg,
  },
  removeButton: {
    position: 'absolute',
    top: spacingPixels[2],
    right: spacingPixels[2],
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    marginTop: spacingPixels[2],
    paddingHorizontal: spacingPixels[2],
  },
  videoMeta: {
    flexDirection: 'row',
    gap: spacingPixels[4],
    marginTop: spacingPixels[1],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[1],
  },
  inputGroup: {
    marginBottom: spacingPixels[4],
  },
  label: {
    marginBottom: spacingPixels[2],
  },
  textInput: {
    borderWidth: 1,
    borderRadius: radiusPixels.md,
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[3],
    fontSize: fontSizePixels.base,
  },
  textArea: {
    minHeight: 80,
  },
  progressContainer: {
    marginBottom: spacingPixels[4],
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    textAlign: 'center',
    marginTop: spacingPixels[2],
  },
  submitButton: {
    marginTop: spacingPixels[2],
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: spacingPixels[2],
  },
});

export default VideoProofOverlay;
