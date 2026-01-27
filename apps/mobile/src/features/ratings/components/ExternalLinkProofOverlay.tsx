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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Overlay, Text, Heading, Button, useToast } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';
import { lightHaptic, mediumHaptic } from '@rallia/shared-utils';
import { createExternalLinkProof } from '../../../services/ratingProofUpload';
import { Logger } from '@rallia/shared-services';
import {
  spacingPixels,
  radiusPixels,
  fontSizePixels,
} from '@rallia/design-system';

interface ExternalLinkProofOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  playerRatingScoreId: string;
}

// Common rating/video platforms for quick suggestions
const SUGGESTED_PLATFORMS = [
  { name: 'YouTube', icon: 'logo-youtube', baseUrl: 'youtube.com' },
  { name: 'FFT', icon: 'globe-outline', baseUrl: 'fft.fr' },
  { name: 'WTN', icon: 'globe-outline', baseUrl: 'worldtennisnumber.com' },
  { name: 'UTR', icon: 'globe-outline', baseUrl: 'utrsports.net' },
  { name: 'DUPR', icon: 'globe-outline', baseUrl: 'mydupr.com' },
];

const ExternalLinkProofOverlay: React.FC<ExternalLinkProofOverlayProps> = ({
  visible,
  onClose,
  onSuccess,
  playerRatingScoreId,
}) => {
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const toast = useToast();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const resetForm = () => {
    setUrl('');
    setTitle('');
    setDescription('');
    setUrlError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateUrl = (urlString: string): boolean => {
    if (!urlString.trim()) {
      setUrlError(t('profile.ratingProofs.errors.invalidUrl'));
      return false;
    }

    try {
      // Add https:// if no protocol specified
      let normalizedUrl = urlString.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      const parsedUrl = new URL(normalizedUrl);
      if (!parsedUrl.hostname.includes('.')) {
        setUrlError(t('profile.ratingProofs.errors.invalidUrl'));
        return false;
      }

      setUrlError(null);
      return true;
    } catch {
      setUrlError(t('profile.ratingProofs.errors.invalidUrl'));
      return false;
    }
  };

  const normalizeUrl = (urlString: string): string => {
    let normalized = urlString.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  };

  const handleSubmit = async () => {
    if (!validateUrl(url)) return;

    if (!title.trim()) {
      toast.error(t('profile.ratingProofs.errors.titleRequired'));
      return;
    }

    mediumHaptic();
    setIsSubmitting(true);

    try {
      const normalizedUrl = normalizeUrl(url);

      const result = await createExternalLinkProof(
        playerRatingScoreId,
        normalizedUrl,
        title.trim(),
        description.trim() || undefined,
      );

      if (result.success) {
        toast.success(t('profile.ratingProofs.upload.success'));
        resetForm();
        onSuccess();
        onClose();
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      Logger.error('Failed to create external link proof', error as Error);
      toast.error(t('profile.ratingProofs.errors.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenUrl = () => {
    if (validateUrl(url)) {
      const normalizedUrl = normalizeUrl(url);
      Linking.openURL(normalizedUrl);
    }
  };

  const handlePlatformSuggestion = (baseUrl: string) => {
    lightHaptic();
    setUrl(`https://www.${baseUrl}/`);
  };

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
              <Ionicons name="link-outline" size={32} color={colors.primary} />
            </View>
            <Heading level={3} color={colors.text} style={styles.title}>
              {t('profile.ratingProofs.proofTypes.externalLink.title')}
            </Heading>
            <Text size="sm" color={colors.textMuted} style={styles.subtitle}>
              {t('profile.ratingProofs.proofTypes.externalLink.urlHint')}
            </Text>
          </View>

          {/* Platform Suggestions */}
          <View style={styles.suggestionsContainer}>
            <Text size="xs" color={colors.textMuted} style={styles.suggestionsLabel}>
              Popular platforms:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsScroll}
            >
              {SUGGESTED_PLATFORMS.map((platform) => (
                <TouchableOpacity
                  key={platform.name}
                  style={[
                    styles.suggestionChip,
                    { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  ]}
                  onPress={() => handlePlatformSuggestion(platform.baseUrl)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={platform.icon as keyof typeof Ionicons.glyphMap}
                    size={14}
                    color={colors.textMuted}
                  />
                  <Text size="xs" color={colors.text} style={styles.suggestionText}>
                    {platform.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* URL Input */}
          <View style={styles.inputGroup}>
            <Text size="sm" weight="medium" color={colors.text} style={styles.label}>
              {t('profile.ratingProofs.proofTypes.externalLink.urlLabel')} *
            </Text>
            <View
              style={[
                styles.urlInputContainer,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: urlError ? colors.error : colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.urlInput, { color: colors.text }]}
                value={url}
                onChangeText={(text) => {
                  setUrl(text);
                  setUrlError(null);
                }}
                placeholder={t('profile.ratingProofs.proofTypes.externalLink.placeholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="next"
                editable={!isSubmitting}
              />
              {url.length > 0 && (
                <TouchableOpacity onPress={handleOpenUrl} style={styles.urlPreviewButton}>
                  <Ionicons name="open-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            {urlError && (
              <Text size="xs" color={colors.error} style={styles.errorText}>
                {urlError}
              </Text>
            )}
          </View>

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

          {/* Submit Button */}
          <Button
            variant="primary"
            onPress={handleSubmit}
            disabled={isSubmitting || !url.trim() || !title.trim()}
            style={styles.submitButton}
          >
            {isSubmitting ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primaryForeground} />
                <Text size="base" weight="semibold" color={colors.primaryForeground} style={styles.loadingText}>
                  {t('profile.ratingProofs.upload.uploading')}
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
  suggestionsContainer: {
    marginBottom: spacingPixels[4],
  },
  suggestionsLabel: {
    marginBottom: spacingPixels[2],
  },
  suggestionsScroll: {
    gap: spacingPixels[2],
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[2],
    borderRadius: radiusPixels.full,
    borderWidth: 1,
    gap: spacingPixels[1],
  },
  suggestionText: {
    marginLeft: spacingPixels[1],
  },
  inputGroup: {
    marginBottom: spacingPixels[4],
  },
  label: {
    marginBottom: spacingPixels[2],
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radiusPixels.md,
    paddingHorizontal: spacingPixels[3],
  },
  urlInput: {
    flex: 1,
    fontSize: fontSizePixels.base,
    paddingVertical: spacingPixels[3],
  },
  urlPreviewButton: {
    padding: spacingPixels[2],
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
  errorText: {
    marginTop: spacingPixels[1],
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

export default ExternalLinkProofOverlay;
