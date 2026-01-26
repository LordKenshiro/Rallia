import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Overlay } from '@rallia/shared-components';
import DatabaseService, { OnboardingService, SportService, Logger } from '@rallia/shared-services';
import type { OnboardingRating } from '@rallia/shared-types';
import ProgressIndicator from '../ProgressIndicator';
import { selectionHaptic, mediumHaptic } from '@rallia/shared-utils';
import { useThemeStyles, useTranslation } from '../../../../hooks';
import { primary } from '@rallia/design-system';
import type { TranslationKey } from '@rallia/shared-translations';

interface PickleballRatingOverlayProps {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  onContinue?: (rating: string) => void;
  currentStep?: number;
  totalSteps?: number;
  mode?: 'onboarding' | 'edit'; // Mode: onboarding (create) or edit (update)
  initialRating?: string; // Pre-selected rating ID for edit mode
  onSave?: (ratingId: string) => void; // Save callback for edit mode
}

interface Rating {
  id: string;
  score_value: number;
  display_label: string;
  description: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'professional' | null;
}

/**
 * Maps DUPR score value to a translation key
 */
const getDuprSkillLabelKey = (scoreValue: number): string => {
  const mapping: Record<number, string> = {
    1.0: 'onboarding.ratingStep.skillLevels.beginner1',
    2.0: 'onboarding.ratingStep.skillLevels.beginner2',
    2.5: 'onboarding.ratingStep.skillLevels.beginner3',
    3.0: 'onboarding.ratingStep.skillLevels.intermediate1',
    3.5: 'onboarding.ratingStep.skillLevels.intermediate2',
    4.0: 'onboarding.ratingStep.skillLevels.intermediate3',
    4.5: 'onboarding.ratingStep.skillLevels.advanced1',
    5.0: 'onboarding.ratingStep.skillLevels.advanced2',
    5.5: 'onboarding.ratingStep.skillLevels.advanced3',
    6.0: 'onboarding.ratingStep.skillLevels.professional',
  };
  return mapping[scoreValue] || '';
};

/**
 * Maps DUPR score value to a description translation key
 */
const getDuprDescriptionKey = (scoreValue: number): string => {
  return `onboarding.ratingStep.duprDescriptions.${scoreValue.toFixed(1)}`;
};

const PickleballRatingOverlay: React.FC<PickleballRatingOverlayProps> = ({
  visible,
  onClose,
  onBack,
  onContinue,
  currentStep = 1,
  totalSteps = 8,
  mode = 'onboarding',
  initialRating,
  onSave,
}) => {
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();
  const [selectedRating, setSelectedRating] = useState<string | null>(initialRating || null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Load ratings from database when overlay becomes visible
  useEffect(() => {
    const loadRatings = async () => {
      if (!visible) return;

      setIsLoading(true);
      try {
        const { data, error } = await DatabaseService.RatingScore.getRatingScoresBySport(
          'pickleball',
          'dupr'
        );

        if (error || !data) {
          Logger.error('Failed to load pickleball ratings', error as Error, {
            sport: 'pickleball',
            system: 'dupr',
          });
          Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.ratingOverlay.failedToLoadRatings' as TranslationKey));
          return;
        }

        // Transform database data to match UI expectations
        const transformedRatings: Rating[] = data.map(rating => ({
          id: rating.id,
          score_value: rating.score_value,
          display_label: rating.display_label,
          description: rating.description,
          skill_level: rating.skill_level,
        }));

        setRatings(transformedRatings);
      } catch (error) {
        Logger.error('Unexpected error loading pickleball ratings', error as Error);
        Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.ratingOverlay.unexpectedError' as TranslationKey));
      } finally {
        setIsLoading(false);
      }
    };

    loadRatings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Trigger animations when overlay becomes visible
  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  // Helper function to get skill category from DUPR score value
  const getSkillCategory = (scoreValue: number): string => {
    if (scoreValue <= 2.5) return 'beginner';
    if (scoreValue <= 4.0) return 'intermediate';
    if (scoreValue <= 5.5) return 'advanced';
    return 'professional';
  };

  // Helper function to get icon based on skill level
  const getRatingIcon = (skillLevel: string): keyof typeof Ionicons.glyphMap => {
    if (skillLevel === 'beginner') return 'star-outline';
    if (skillLevel === 'intermediate') return 'star-half';
    if (skillLevel === 'advanced') return 'star';
    return 'trophy'; // professional
  };

  const handleContinue = async () => {
    if (!selectedRating || isSaving) return;

    mediumHaptic();

    // Edit mode: use the onSave callback
    if (mode === 'edit' && onSave) {
      onSave(selectedRating);
      return;
    }

    // Onboarding mode: save to database
    if (onContinue) {
      setIsSaving(true);
      try {
        // Get pickleball sport ID
        const { data: pickleballSport, error: sportError } =
          await SportService.getSportByName('pickleball');

        if (sportError || !pickleballSport) {
          Logger.error('Failed to fetch pickleball sport', sportError as Error);
          setIsSaving(false);
          Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.ratingOverlay.failedToSaveRating' as TranslationKey), [{ text: t('common.ok' as TranslationKey) }]);
          return;
        }

        // Find the selected rating data
        const selectedRatingData = ratings.find(r => r.id === selectedRating);

        if (!selectedRatingData) {
          setIsSaving(false);
          Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.ratingOverlay.invalidRatingSelected' as TranslationKey));
          return;
        }

        // Save rating to database
        const ratingData: OnboardingRating = {
          sport_id: pickleballSport.id,
          sport_name: 'pickleball',
          rating_system_code: 'dupr',
          score_value: selectedRatingData.score_value,
          display_label: selectedRatingData.display_label,
        };

        const { error } = await OnboardingService.saveRatings([ratingData]);

        if (error) {
          Logger.error('Failed to save pickleball rating', error as Error, { ratingData });
          setIsSaving(false);
          Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.ratingOverlay.failedToSaveRating' as TranslationKey), [{ text: t('common.ok' as TranslationKey) }]);
          return;
        }

        Logger.debug('pickleball_rating_saved', { ratingData });
        onContinue(selectedRating);
      } catch (error) {
        Logger.error('Unexpected error saving pickleball rating', error as Error);
        setIsSaving(false);
        Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.ratingOverlay.unexpectedError' as TranslationKey), [{ text: t('common.ok' as TranslationKey) }]);
      }
    }
  };

  return (
    <Overlay
      visible={visible}
      onClose={onClose}
      onBack={onBack}
      type="bottom"
      showBackButton={false}
    >
      <Animated.View
        style={[
          styles.container,
          {
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Progress Indicator - only show in onboarding mode */}
        {mode === 'onboarding' && (
          <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
        )}

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={onBack || onClose} activeOpacity={0.7}>
          <Text style={[styles.backButtonText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          {mode === 'edit' 
            ? t('onboarding.ratingOverlay.editPickleballTitle' as TranslationKey) 
            : t('onboarding.ratingOverlay.title' as TranslationKey)}
        </Text>

        {/* Sport Badge */}
        <View style={[styles.sportBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.sportBadgeText, { color: colors.primaryForeground }]}>
            {t('onboarding.pickleball' as TranslationKey)}
          </Text>
        </View>

        {/* Subtitle with DUPR link */}
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {mode === 'edit' ? (
            <Text
              style={[styles.link, { color: colors.primary }]}
              onPress={() => Linking.openURL('https://mydupr.com/')}
            >
              {t('onboarding.ratingOverlay.learnMoreDupr' as TranslationKey)}
            </Text>
          ) : (
            t('onboarding.ratingOverlay.pickleballSubtitle' as TranslationKey)
          )}
        </Text>

        {/* Rating Options */}
        <ScrollView style={styles.ratingList} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                {t('onboarding.ratingOverlay.loading' as TranslationKey)}
              </Text>
            </View>
          ) : (
            <View style={styles.ratingGrid}>
              {ratings.map(rating => (
                <TouchableOpacity
                  key={rating.id}
                  style={[
                    styles.ratingCard,
                    { backgroundColor: colors.inputBackground },
                    selectedRating === rating.id && [
                      styles.ratingCardSelected,
                      {
                        borderColor: colors.primary,
                        backgroundColor: isDark ? colors.inputBackground : primary[50],
                      },
                    ],
                  ]}
                  onPress={() => {
                    selectionHaptic();
                    setSelectedRating(rating.id);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons
                      name={getRatingIcon(getSkillCategory(rating.score_value))}
                      size={20}
                      color={colors.primary}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.ratingLevel,
                        {
                          color: selectedRating === rating.id ? colors.text : colors.text,
                        },
                      ]}
                    >
                      {t(getDuprSkillLabelKey(rating.score_value) as TranslationKey)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.ratingDupr,
                      {
                        color: selectedRating === rating.id ? colors.text : colors.textMuted,
                      },
                    ]}
                  >
                    {rating.display_label}
                  </Text>
                  <Text
                    style={[
                      styles.ratingDescription,
                      {
                        color: selectedRating === rating.id ? colors.text : colors.textMuted,
                      },
                    ]}
                  >
                    {t(getDuprDescriptionKey(rating.score_value) as TranslationKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Continue/Save Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            { backgroundColor: colors.primary },
            (!selectedRating || isSaving) && [
              styles.continueButtonDisabled,
              { backgroundColor: colors.buttonInactive },
            ],
          ]}
          onPress={handleContinue}
          activeOpacity={selectedRating && !isSaving ? 0.8 : 1}
          disabled={!selectedRating || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text
              style={[
                styles.continueButtonText,
                { color: colors.primaryForeground },
                !selectedRating && [styles.continueButtonTextDisabled, { color: colors.textMuted }],
              ]}
            >
              {mode === 'edit' 
                ? t('onboarding.ratingOverlay.save' as TranslationKey) 
                : t('onboarding.ratingOverlay.continue' as TranslationKey)}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 0,
    padding: 10,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  sportBadge: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sportBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  ratingList: {
    flex: 1,
    marginBottom: 15,
  },
  ratingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  ratingCard: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ratingCardHighlighted: {
    // backgroundColor applied inline
  },
  ratingCardSelected: {
    // borderColor and backgroundColor applied inline
  },
  ratingLevel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ratingLevelHighlighted: {
    // color applied inline
  },
  ratingLevelSelected: {
    // color applied inline
  },
  ratingDupr: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  ratingDuprHighlighted: {
    // color applied inline
  },
  ratingDuprSelected: {
    // color applied inline
  },
  ratingDescription: {
    fontSize: 11,
    lineHeight: 16,
  },
  ratingDescriptionHighlighted: {
    // color applied inline
  },
  ratingDescriptionSelected: {
    // color applied inline
  },
  continueButton: {
    borderRadius: 10,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    // color applied inline
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
    // color will be set dynamically
  },
});

export default PickleballRatingOverlay;
