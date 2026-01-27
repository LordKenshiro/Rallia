import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Overlay, Text, Heading } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';
import { lightHaptic } from '@rallia/shared-utils';
import {
  spacingPixels,
  radiusPixels,
} from '@rallia/design-system';

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

const AddRatingProofOverlay: React.FC<AddRatingProofOverlayProps> = ({
  visible,
  onClose,
  onSelectProofType,
}) => {
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
    onSelectProofType(type);
    onClose();
  };

  return (
    <Overlay visible={visible} onClose={onClose} type="bottom">
      <View style={styles.container}>
        <Heading level={3} color={colors.text} style={styles.title}>
          {t('profile.ratingProofs.addProof')}
        </Heading>
        <Text size="sm" color={colors.textMuted} style={styles.subtitle}>
          {t('profile.ratingProofs.chooseProofType')}
        </Text>

        <View style={styles.optionsContainer}>
          {proofTypes.map((option) => (
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
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.primary + '20' },
                ]}
              >
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
      </View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacingPixels[4],
    paddingBottom: spacingPixels[6],
  },
  title: {
    textAlign: 'center',
    marginBottom: spacingPixels[1],
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
