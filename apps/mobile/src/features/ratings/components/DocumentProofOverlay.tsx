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
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Overlay, Text, Heading, Button, useToast } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';
import { lightHaptic, mediumHaptic } from '@rallia/shared-utils';
import { 
  uploadRatingProofFile, 
  validateProofFile,
  getMaxFileSizes,
  getSupportedDocumentFormats,
} from '../../../services/ratingProofUpload';
import { Logger, supabase } from '@rallia/shared-services';
import {
  spacingPixels,
  radiusPixels,
  fontSizePixels,
} from '@rallia/design-system';

interface DocumentProofOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  playerRatingScoreId: string;
}

const DocumentProofOverlay: React.FC<DocumentProofOverlayProps> = ({
  visible,
  onClose,
  onSuccess,
  playerRatingScoreId,
}) => {
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const toast = useToast();

  const [selectedDocument, setSelectedDocument] = useState<{
    uri: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const resetForm = () => {
    setSelectedDocument(null);
    setTitle('');
    setDescription('');
    setUploadProgress(0);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSelectDocument = async () => {
    lightHaptic();

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const doc = result.assets[0];
        
        // Validate file
        const validation = validateProofFile(doc.name, doc.size || 0, 'document');
        if (!validation.valid) {
          toast.error(validation.error || t('profile.ratingProofs.upload.invalidFormat'));
          return;
        }

        setSelectedDocument({
          uri: doc.uri,
          fileName: doc.name,
          fileSize: doc.size || 0,
          mimeType: doc.mimeType || 'application/octet-stream',
        });
      }
    } catch (error) {
      Logger.error('Failed to select document', error as Error);
      toast.error(t('common.error'));
    }
  };

  const handleRemoveDocument = () => {
    lightHaptic();
    setSelectedDocument(null);
  };

  const handleSubmit = async () => {
    if (!selectedDocument) {
      toast.error(t('profile.ratingProofs.errors.fileRequired'));
      return;
    }

    if (!title.trim()) {
      toast.error(t('profile.ratingProofs.errors.titleRequired'));
      return;
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
      let fileSize = selectedDocument.fileSize;
      if (!fileSize || fileSize === 0) {
        const response = await fetch(selectedDocument.uri);
        const blob = await response.blob();
        fileSize = blob.size;
      }

      const result = await uploadRatingProofFile({
        fileUri: selectedDocument.uri,
        fileType: 'document',
        originalName: selectedDocument.fileName,
        mimeType: selectedDocument.mimeType,
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
      Logger.error('Failed to upload document proof', error as Error);
      toast.error(t('profile.ratingProofs.errors.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocumentIcon = (mimeType: string): string => {
    if (mimeType === 'application/pdf') return 'document-text';
    if (mimeType.includes('word')) return 'document';
    if (mimeType === 'text/plain') return 'document-outline';
    return 'document-attach';
  };

  const getDocumentTypeLabel = (mimeType: string): string => {
    if (mimeType === 'application/pdf') return 'PDF Document';
    if (mimeType.includes('word')) return 'Word Document';
    if (mimeType === 'text/plain') return 'Text File';
    return 'Document';
  };

  const maxSizeMB = Math.round(getMaxFileSizes().document / (1024 * 1024));
  const supportedFormats = getSupportedDocumentFormats().map(f => f.toUpperCase().replace('.', '')).join(', ');

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
              <Ionicons name="document-text-outline" size={32} color={colors.primary} />
            </View>
            <Heading level={3} color={colors.text} style={styles.title}>
              {t('profile.ratingProofs.proofTypes.document.title')}
            </Heading>
            <Text size="sm" color={colors.textMuted} style={styles.subtitle}>
              {t('profile.ratingProofs.proofTypes.document.description')}
            </Text>
          </View>

          {/* Document Selection */}
          {!selectedDocument ? (
            <View style={styles.selectionContainer}>
              <TouchableOpacity
                style={[
                  styles.uploadArea,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                ]}
                onPress={handleSelectDocument}
                activeOpacity={0.7}
                disabled={isSubmitting}
              >
                <View style={[styles.uploadIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
                </View>
                <Text size="base" weight="semibold" color={colors.text} style={styles.uploadTitle}>
                  {t('profile.ratingProofs.proofTypes.document.selectDocument')}
                </Text>
                <Text size="sm" color={colors.textMuted} style={styles.uploadSubtitle}>
                  Tap to browse your files
                </Text>
              </TouchableOpacity>

              <View style={styles.supportedFormatsContainer}>
                <Text size="xs" weight="medium" color={colors.textMuted} style={styles.formatLabel}>
                  Supported formats
                </Text>
                <View style={styles.formatTags}>
                  {['PDF', 'DOC', 'DOCX', 'TXT'].map((format) => (
                    <View 
                      key={format} 
                      style={[styles.formatTag, { backgroundColor: colors.border }]}
                    >
                      <Text size="xs" color={colors.textMuted}>{format}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Ionicons name="cloud-upload-outline" size={14} color={colors.textMuted} />
                  <Text size="xs" color={colors.textMuted}>
                    Max size: {maxSizeMB} MB
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
                  <Text size="xs" color={colors.textMuted}>
                    Documents are stored securely
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.previewContainer}>
              <View 
                style={[
                  styles.documentPreview, 
                  { backgroundColor: colors.cardBackground, borderColor: colors.border }
                ]}
              >
                <View style={[styles.documentIconWrapper, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons 
                    name={getDocumentIcon(selectedDocument.mimeType) as any} 
                    size={40} 
                    color={colors.primary} 
                  />
                </View>
                <View style={styles.documentInfo}>
                  <Text size="sm" weight="medium" color={colors.text} numberOfLines={2}>
                    {selectedDocument.fileName}
                  </Text>
                  <View style={styles.documentMeta}>
                    <Text size="xs" color={colors.textMuted}>
                      {getDocumentTypeLabel(selectedDocument.mimeType)}
                    </Text>
                    <Text size="xs" color={colors.textMuted}>•</Text>
                    <Text size="xs" color={colors.textMuted}>
                      {formatFileSize(selectedDocument.fileSize)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.removeButton, { backgroundColor: colors.error }]}
                  onPress={handleRemoveDocument}
                  disabled={isSubmitting}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.changeButton}
                onPress={handleSelectDocument}
                disabled={isSubmitting}
              >
                <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} />
                <Text size="sm" color={colors.primary}>
                  Choose different file
                </Text>
              </TouchableOpacity>
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
            disabled={isSubmitting || !selectedDocument || !title.trim()}
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
    marginBottom: spacingPixels[4],
  },
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingPixels[6],
    borderRadius: radiusPixels.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  uploadIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacingPixels[3],
  },
  uploadTitle: {
    marginBottom: spacingPixels[1],
  },
  uploadSubtitle: {
    textAlign: 'center',
  },
  supportedFormatsContainer: {
    alignItems: 'center',
    marginTop: spacingPixels[4],
  },
  formatLabel: {
    marginBottom: spacingPixels[2],
  },
  formatTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacingPixels[2],
  },
  formatTag: {
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.full,
  },
  infoContainer: {
    marginTop: spacingPixels[4],
    gap: spacingPixels[2],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacingPixels[2],
  },
  previewContainer: {
    marginBottom: spacingPixels[4],
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
  },
  documentIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: radiusPixels.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
    marginHorizontal: spacingPixels[3],
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
    marginTop: spacingPixels[1],
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacingPixels[2],
    paddingVertical: spacingPixels[3],
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

export default DocumentProofOverlay;
