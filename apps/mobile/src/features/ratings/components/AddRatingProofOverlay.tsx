import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ActionSheet, { SheetManager, SheetProps } from 'react-native-actions-sheet';
import { Text } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';
import { lightHaptic } from '@rallia/shared-utils';
import { spacingPixels, radiusPixels } from '@rallia/design-system';

interface AddRatingProofOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSelectProofType: (type: 'external_link' | 'video' | 'image' | 'document') => void;
}

interface ProofTypeOption {
  type: 'external_link' | 'video' | 'image' | 'document';
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  descriptionKey: string;
}

export function AddRatingProofActionSheet({ payload }: SheetProps<'add-rating-proof'>) {
  const onClose = () => SheetManager.hide('add-rating-proof');
  const onSelectProofType = payload?.onSelectProofType;
  const { colors } = useThemeStyles();
  const { t } = useTranslation();

  const proofTypes: ProofTypeOption[] = [
    {
      type: 'external_link',
      icon: 'link-outline',
      titleKey: 'profile.ratingProofs.proofTypes.externalLink.title',
      descriptionKey: 'profile.ratingProofs.proofTypes.externalLink.description',
    },
    {
      type: 'video',
      icon: 'videocam-outline',
      titleKey: 'profile.ratingProofs.proofTypes.video.title',
      descriptionKey: 'profile.ratingProofs.proofTypes.video.description',
    },
    {
      type: 'image',
      icon: 'image-outline',
      titleKey: 'profile.ratingProofs.proofTypes.image.title',
      descriptionKey: 'profile.ratingProofs.proofTypes.image.description',
    },
    {
      type: 'document',
      icon: 'document-text-outline',
      titleKey: 'profile.ratingProofs.proofTypes.document.title',
      descriptionKey: 'profile.ratingProofs.proofTypes.document.description',
    },
  ];

  const handleSelectType = (type: 'external_link' | 'video' | 'image' | 'document') => {
    lightHaptic();
    onSelectProofType?.(type);
    // Don't hide here - let the parent handle closing and opening the next sheet
  };

  return (
    <ActionSheet
      gestureEnabled
      containerStyle={[styles.sheetBackground, { backgroundColor: colors.card }]}
      indicatorStyle={[styles.handleIndicator, { backgroundColor: colors.border }]}
    >
      <View style={styles.modalContent}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerCenter}>
            <Text
              weight="semibold"
              size="lg"
              style={{ color: colors.text }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t('profile.ratingProofs.addProof')}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text size="sm" color={colors.textMuted} style={styles.subtitle}>
            {t('profile.ratingProofs.chooseProofType')}
          </Text>

          <View style={styles.optionsContainer}>
            {proofTypes.map(option => (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleSelectType(option.type)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name={option.icon} size={24} color={colors.primary} />
                </View>
                <View style={styles.optionContent}>
                  <Text size="base" weight="semibold" color={colors.text}>
                    {t(option.titleKey as never)}
                  </Text>
                  <Text size="sm" color={colors.textMuted} numberOfLines={2}>
                    {t(option.descriptionKey as never)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </ActionSheet>
  );
}

// Keep old export for backwards compatibility during migration
const AddRatingProofOverlay: React.FC<AddRatingProofOverlayProps> = ({
  visible,
  onClose,
  onSelectProofType,
}) => {
  React.useEffect(() => {
    if (visible) {
      SheetManager.show('add-rating-proof', {
        payload: {
          onSelectProofType,
        },
      });
    }
  }, [visible, onSelectProofType]);

  React.useEffect(() => {
    if (!visible) {
      SheetManager.hide('add-rating-proof');
    }
  }, [visible]);

  return null;
};

const styles = StyleSheet.create({
  sheetBackground: {
    flex: 1,
    borderTopLeftRadius: radiusPixels['2xl'],
    borderTopRightRadius: radiusPixels['2xl'],
  },
  handleIndicator: {
    width: spacingPixels[10],
    height: 4,
    borderRadius: 4,
    alignSelf: 'center',
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingPixels[4],
    borderBottomWidth: 1,
    position: 'relative',
    minHeight: 56,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacingPixels[12],
  },
  closeButton: {
    padding: spacingPixels[1],
    position: 'absolute',
    right: spacingPixels[4],
    zIndex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: spacingPixels[4],
    paddingBottom: spacingPixels[6],
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacingPixels[5],
  },
  optionsContainer: {
    gap: spacingPixels[3],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radiusPixels.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacingPixels[3],
  },
  optionContent: {
    flex: 1,
    marginRight: spacingPixels[2],
  },
});

export default AddRatingProofOverlay;
