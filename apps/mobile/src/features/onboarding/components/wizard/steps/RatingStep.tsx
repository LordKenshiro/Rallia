/**
 * RatingStep Component
 *
 * Generic rating step for Tennis (NTRP) and Pickleball (DUPR).
 * Migrated from TennisRatingOverlay/PickleballRatingOverlay with theme-aware colors.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import DatabaseService, { Logger } from '@rallia/shared-services';
import { selectionHaptic } from '@rallia/shared-utils';
import type { TranslationKey } from '@rallia/shared-translations';
import type { OnboardingFormData } from '../../../hooks/useOnboardingWizard';

interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  buttonActive: string;
  buttonInactive: string;
  buttonTextActive: string;
  inputBackground: string;
}

interface Rating {
  id: string;
  score_value: number;
  display_label: string;
  description: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'professional' | null;
}

/**
 * Maps NTRP score value to a user-friendly skill level name
 */
const getNtrpSkillLabel = (scoreValue: number): string => {
  const mapping: Record<number, string> = {
    1.5: 'Beginner 1',
    2.0: 'Beginner 2',
    2.5: 'Beginner 3',
    3.0: 'Intermediate 1',
    3.5: 'Intermediate 2',
    4.0: 'Intermediate 3',
    4.5: 'Advanced 1',
    5.0: 'Advanced 2',
    5.5: 'Advanced 3',
    6.0: 'Professional',
  };
  return mapping[scoreValue] || `Level ${scoreValue}`;
};

/**
 * Maps DUPR score value to a user-friendly skill level name
 */
const getDuprSkillLabel = (scoreValue: number): string => {
  const mapping: Record<number, string> = {
    1.0: 'Beginner 1',
    2.0: 'Beginner 2',
    2.5: 'Beginner 3',
    3.0: 'Intermediate 1',
    3.5: 'Intermediate 2',
    4.0: 'Intermediate 3',
    4.5: 'Advanced 1',
    5.0: 'Advanced 2',
    5.5: 'Advanced 3',
    6.0: 'Professional',
  };
  return mapping[scoreValue] || `Level ${scoreValue}`;
};

/**
 * Get skill category from score value for icon selection
 */
const getSkillCategory = (scoreValue: number): string => {
  if (scoreValue <= 2.5) return 'beginner';
  if (scoreValue <= 4.0) return 'intermediate';
  if (scoreValue <= 5.5) return 'advanced';
  return 'professional';
};

interface RatingStepProps {
  sport: 'tennis' | 'pickleball';
  formData: OnboardingFormData;
  onUpdateFormData: (updates: Partial<OnboardingFormData>) => void;
  onContinue: () => void;
  colors: ThemeColors;
  t: (key: TranslationKey) => string;
  isDark: boolean;
}

export const RatingStep: React.FC<RatingStepProps> = ({
  sport,
  formData,
  onUpdateFormData,
  onContinue: _onContinue,
  colors,
  t,
}) => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isTennis = sport === 'tennis';
  const ratingSystem = isTennis ? 'ntrp' : 'dupr';
  const sportDisplayName = isTennis
    ? t('onboarding.tennis' as TranslationKey)
    : t('onboarding.pickleball' as TranslationKey);
  const ratingSystemName = isTennis
    ? t('onboarding.ratingStep.ntrpSubtitle' as TranslationKey)
    : t('onboarding.ratingStep.duprSubtitle' as TranslationKey);
  const selectedRatingId = isTennis ? formData.tennisRatingId : formData.pickleballRatingId;
  const ratingFieldKey = isTennis ? 'tennisRatingId' : 'pickleballRatingId';

  // Load ratings from database
  useEffect(() => {
    const loadRatings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await DatabaseService.RatingScore.getRatingScoresBySport(
          sport,
          ratingSystem
        );

        if (error || !data) {
          Logger.error(`Failed to load ${sport} ratings`, error as Error, {
            sport,
            system: ratingSystem,
          });
          Alert.alert(
            t('alerts.error' as TranslationKey),
            t('onboarding.validation.failedToLoadRatings' as TranslationKey)
          );
          return;
        }

        const transformedRatings: Rating[] = data.map(rating => ({
          id: rating.id,
          score_value: rating.score_value,
          display_label: rating.display_label,
          description: rating.description || '',
          skill_level: rating.skill_level,
        }));

        setRatings(transformedRatings);
      } catch (error) {
        Logger.error(`Unexpected error loading ${sport} ratings`, error as Error);
        Alert.alert(
          t('alerts.error' as TranslationKey),
          t('onboarding.validation.unexpectedError' as TranslationKey)
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadRatings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, ratingSystem]);

  const handleRatingSelect = (ratingId: string) => {
    selectionHaptic();
    onUpdateFormData({ [ratingFieldKey]: ratingId });
  };

  const getRatingIcon = (skillLevel: string): keyof typeof Ionicons.glyphMap => {
    if (skillLevel === 'beginner') return 'star-outline';
    if (skillLevel === 'intermediate') return 'star-half';
    if (skillLevel === 'advanced') return 'star';
    return 'trophy';
  };

  const getRatingUrl = () => {
    return isTennis
      ? 'https://www.usta.com/en/home/improve/national-tennis-rating-program.html'
      : 'https://mydupr.com/';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Title */}
      <Text size="xl" weight="bold" color={colors.text} style={styles.title}>
        {t('onboarding.ratingStep.tennisTitle' as TranslationKey)}
      </Text>

      {/* Sport Badge */}
      <View style={[styles.sportBadge, { backgroundColor: colors.buttonActive }]}>
        <Text size="sm" weight="semibold" color={colors.buttonTextActive}>
          {sportDisplayName}
        </Text>
      </View>

      {/* Subtitle */}
      <Text size="base" color={colors.textSecondary} style={styles.subtitle}>
        {ratingSystemName}
      </Text>

      {/* Rating Options */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonActive} />
          <Text size="sm" color={colors.textMuted} style={styles.loadingText}>
            {t('common.loading' as TranslationKey)}
          </Text>
        </View>
      ) : (
        <View style={styles.ratingGrid}>
          {ratings.map(rating => {
            const isSelected = selectedRatingId === rating.id;

            return (
              <TouchableOpacity
                key={rating.id}
                style={[
                  styles.ratingCard,
                  {
                    backgroundColor: isSelected
                      ? `${colors.buttonActive}20`
                      : colors.inputBackground,
                    borderColor: isSelected ? colors.buttonActive : colors.border,
                  },
                ]}
                onPress={() => handleRatingSelect(rating.id)}
                activeOpacity={0.8}
              >
                <View style={styles.ratingHeader}>
                  <Ionicons
                    name={getRatingIcon(getSkillCategory(rating.score_value))}
                    size={20}
                    color={isSelected ? colors.buttonActive : colors.buttonActive}
                    style={styles.ratingIcon}
                  />
                  <Text
                    size="base"
                    weight="bold"
                    color={isSelected ? colors.buttonActive : colors.text}
                  >
                    {isTennis
                      ? getNtrpSkillLabel(rating.score_value)
                      : getDuprSkillLabel(rating.score_value)}
                  </Text>
                </View>
                <Text
                  size="sm"
                  weight="semibold"
                  color={isSelected ? colors.buttonActive : colors.textSecondary}
                  style={styles.ratingLabel}
                >
                  {rating.display_label}
                </Text>
                <Text
                  size="xs"
                  color={isSelected ? colors.text : colors.textSecondary}
                  style={styles.ratingDescription}
                >
                  {rating.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Learn More Link */}
      <TouchableOpacity
        style={styles.learnMore}
        onPress={() => Linking.openURL(getRatingUrl())}
        activeOpacity={0.7}
      >
        <Text size="sm" color={colors.buttonActive}>
          Learn more about the {ratingSystem.toUpperCase()} rating system
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacingPixels[4],
    paddingBottom: spacingPixels[8],
    flexGrow: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacingPixels[3],
  },
  sportBadge: {
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[1.5],
    borderRadius: radiusPixels.full,
    alignSelf: 'center',
    marginBottom: spacingPixels[4],
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacingPixels[4],
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacingPixels[10],
  },
  loadingText: {
    marginTop: spacingPixels[3],
  },
  ratingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacingPixels[2],
  },
  ratingCard: {
    width: '48%',
    borderRadius: radiusPixels.xl,
    padding: spacingPixels[3],
    marginBottom: spacingPixels[2],
    borderWidth: 2,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingPixels[1],
  },
  ratingIcon: {
    marginRight: spacingPixels[2],
  },
  ratingLabel: {
    marginBottom: spacingPixels[1.5],
  },
  ratingDescription: {
    lineHeight: 16,
  },
  learnMore: {
    paddingVertical: spacingPixels[3],
    alignItems: 'center',
  },
});

export default RatingStep;
