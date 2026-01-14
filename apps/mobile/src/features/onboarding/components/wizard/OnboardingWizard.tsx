/**
 * OnboardingWizard Component
 *
 * 4-6 step onboarding wizard (dynamic based on selected sports) with
 * horizontal slide animations, progress indicator, and full theme/i18n support.
 *
 * Steps:
 * 1. Personal Info
 * 2. Sport Selection
 * 3. Tennis Rating (if tennis selected)
 * 4. Pickleball Rating (if pickleball selected)
 * 5. Preferences
 * 6. Availabilities
 * 7. Success (final)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { lightHaptic, mediumHaptic, successHaptic, warningHaptic } from '@rallia/shared-utils';
import { OnboardingService, SportService, Logger, DatabaseService } from '@rallia/shared-services';
import { useProfile, usePlayer } from '@rallia/shared-hooks';
import { replaceImage } from '../../../../services/imageUpload';
import { useImagePicker } from '../../../../hooks';
import { useSport } from '../../../../context';
import type { TranslationKey } from '@rallia/shared-translations';
import type {
  OnboardingPlayerPreferences,
  OnboardingAvailability,
  DayEnum,
  PeriodEnum,
} from '@rallia/shared-types';

import { useOnboardingWizard, type OnboardingStepId } from '../../hooks/useOnboardingWizard';
import {
  PersonalInfoStep,
  SportSelectionStep,
  RatingStep,
  PreferencesStep,
  AvailabilitiesStep,
  SuccessStep,
} from './steps';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// =============================================================================
// TYPES
// =============================================================================

export interface OnboardingWizardColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  buttonActive: string;
  buttonInactive: string;
  buttonTextActive: string;
  progressActive: string;
  progressInactive: string;
  inputBackground: string;
  inputBorder: string;
  inputBorderFocused: string;
  error: string;
  success: string;
  divider: string;
}

interface OnboardingWizardProps {
  /** Callback when onboarding is complete */
  onComplete: () => void;
  /** Callback to close the entire sheet */
  onClose: () => void;
  /** Callback to go back to the actions landing */
  onBackToLanding: () => void;
  /** Theme colors */
  colors: OnboardingWizardColors;
  /** Translation function */
  t: (key: TranslationKey) => string;
  /** Whether dark mode is enabled */
  isDark: boolean;
}

// =============================================================================
// PROGRESS BAR COMPONENT
// =============================================================================

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  colors: OnboardingWizardColors;
  t: (key: TranslationKey) => string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  stepName,
  colors,
  t,
}) => {
  const progress = useSharedValue((currentStep / totalSteps) * 100);

  useEffect(() => {
    progress.value = withTiming((currentStep / totalSteps) * 100, { duration: 300 });
  }, [currentStep, totalSteps, progress]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text size="sm" weight="semibold" color={colors.textMuted}>
          {t('onboarding.step' as TranslationKey)
            .replace('{current}', String(currentStep))
            .replace('{total}', String(totalSteps))}
        </Text>
        <Text size="sm" weight="bold" color={colors.progressActive}>
          {stepName}
        </Text>
      </View>
      <View style={[styles.progressBarBg, { backgroundColor: colors.progressInactive }]}>
        <Animated.View
          style={[
            styles.progressBarFill,
            { backgroundColor: colors.progressActive },
            animatedProgressStyle,
          ]}
        />
      </View>
    </View>
  );
};

// =============================================================================
// WIZARD HEADER COMPONENT
// =============================================================================

interface WizardHeaderProps {
  currentStep: number;
  onBack: () => void;
  onBackToLanding: () => void;
  onClose: () => void;
  colors: OnboardingWizardColors;
  t: (key: TranslationKey) => string;
}

const WizardHeader: React.FC<WizardHeaderProps> = ({
  currentStep,
  onBack,
  onBackToLanding,
  onClose,
  colors,
  t,
}) => {
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      {/* Back button (visible on all steps) */}
      <View style={styles.headerLeft}>
        {currentStep === 1 ? (
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              lightHaptic();
              onBackToLanding();
            }}
            style={styles.headerButton}
            accessibilityLabel={t('common.back' as TranslationKey)}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.buttonActive} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              lightHaptic();
              onBack();
            }}
            style={styles.headerButton}
            accessibilityLabel={t('common.back' as TranslationKey)}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.buttonActive} />
          </TouchableOpacity>
        )}
      </View>

      {/* Empty center space - no title badge like match creation wizard */}
      <View style={styles.headerCenter} />

      {/* Close button */}
      <View style={styles.headerRight}>
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            lightHaptic();
            onClose();
          }}
          style={styles.headerButton}
          accessibilityLabel={t('common.close' as TranslationKey)}
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// =============================================================================
// STEP NAME MAPPING
// =============================================================================

const getStepName = (stepId: OnboardingStepId, t: (key: TranslationKey) => string): string => {
  const keys: Record<OnboardingStepId, string> = {
    personal: 'onboarding.stepNames.personal',
    sports: 'onboarding.stepNames.sports',
    'tennis-rating': 'onboarding.stepNames.tennisRating',
    'pickleball-rating': 'onboarding.stepNames.pickleballRating',
    preferences: 'onboarding.stepNames.preferences',
    availabilities: 'onboarding.stepNames.availability',
    success: 'onboarding.complete',
  };
  return t(keys[stepId] as TranslationKey) || '';
};

// =============================================================================
// MAIN WIZARD COMPONENT
// =============================================================================

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onComplete,
  onClose,
  onBackToLanding,
  colors,
  t,
  isDark,
}) => {
  const {
    currentStep,
    currentStepId,
    totalSteps,
    isLoadingData,
    formData,
    updateFormData,
    goToNextStep,
    goToPrevStep,
    canGoBack,
    isLastStep,
    resetWizard,
    hasTennis,
    hasPickleball,
    steps,
  } = useOnboardingWizard();

  const [isSaving, setIsSaving] = useState(false);
  // Track the last uploaded profile picture URL to clean up old uploads
  const [lastUploadedProfileUrl, setLastUploadedProfileUrl] = useState<string | null>(null);

  // Profile hook to refetch profile when onboarding completes
  const { refetch: refetchProfile } = useProfile();

  // Player hook to refetch player when onboarding completes
  // This is critical: the player record is created during onboarding (savePersonalInfo),
  // but PlayerContext was initialized with null before the record existed.
  // Without this refetch, the player stays null until sign out/sign in.
  const { refetch: refetchPlayer } = usePlayer();

  // Sport context to refetch player sports when onboarding completes
  const { refetch: refetchSports, setSelectedSport } = useSport();

  // State to store selected sports for SuccessStep
  const [selectedSportsForSuccess, setSelectedSportsForSuccess] = useState<
    Array<{ id: string; name: string; display_name: string; icon_url?: string | null }>
  >([]);

  // Image picker hook
  const { image: profileImage, pickImage } = useImagePicker();

  // Sync picked image to form data
  useEffect(() => {
    if (profileImage) {
      updateFormData({ profileImage });
    }
  }, [profileImage, updateFormData]);

  // Initialize lastUploadedProfileUrl from saved data
  useEffect(() => {
    if (formData.savedProfilePictureUrl && !lastUploadedProfileUrl) {
      setLastUploadedProfileUrl(formData.savedProfilePictureUrl);
    }
  }, [formData.savedProfilePictureUrl, lastUploadedProfileUrl]);

  // Fetch selected sports when reaching success step
  useEffect(() => {
    const fetchSelectedSports = async () => {
      if (currentStepId === 'success' && formData.selectedSportIds.length > 0) {
        try {
          const { data: allSports, error } = await DatabaseService.Sport.getAllSports();
          if (error) {
            Logger.error('Failed to fetch sports for success step', error as Error);
            return;
          }

          if (allSports) {
            // Filter to only selected sports and map to SuccessStep format
            const sports = allSports
              .filter(sport => formData.selectedSportIds.includes(sport.id))
              .map(sport => ({
                id: sport.id,
                name: sport.name,
                display_name: sport.display_name,
                icon_url: sport.icon_url,
              }));
            setSelectedSportsForSuccess(sports);
          }
        } catch (error) {
          Logger.error('Unexpected error fetching sports for success step', error as Error);
        }
      }
    };

    fetchSelectedSports();
  }, [currentStepId, formData.selectedSportIds]);

  // Wrapper to handle async setSelectedSport
  const handleSelectInitialSport = useCallback(
    async (sport: { id: string; name: string; display_name: string; icon_url?: string | null }) => {
      await setSelectedSport(sport);
    },
    [setSelectedSport]
  );

  // Animation values
  const translateX = useSharedValue(0);

  // Get current step index for animations
  const currentStepIndex = steps.indexOf(currentStepId);

  // Animate step changes
  useEffect(() => {
    translateX.value = withSpring(-currentStepIndex * SCREEN_WIDTH, {
      damping: 80,
      stiffness: 600,
      overshootClamping: false,
    });
  }, [currentStepIndex, translateX]);

  // Validate and save current step data
  const validateAndSaveStep = useCallback(async (): Promise<boolean> => {
    switch (currentStepId) {
      case 'personal':
        // Validate personal info
        if (
          !formData.firstName.trim() ||
          !formData.lastName.trim() ||
          !formData.username.trim() ||
          !formData.dateOfBirth ||
          !formData.gender ||
          !formData.phoneNumber.trim()
        ) {
          Alert.alert('Error', 'Please fill in all required fields');
          warningHaptic();
          return false;
        }

        setIsSaving(true);
        try {
          const formattedDate = formData.dateOfBirth.toISOString().split('T')[0];

          // Upload profile picture if present and different from saved URL
          // This avoids re-uploading an already-saved picture and cleans up old uploads
          let uploadedImageUrl: string | undefined;
          const hasNewImage =
            formData.profileImage && formData.profileImage !== formData.savedProfilePictureUrl;

          if (hasNewImage) {
            // Use replaceImage to upload new and delete old (if any)
            const { url, error: uploadError } = await replaceImage(
              formData.profileImage!,
              lastUploadedProfileUrl, // Delete the previous upload if exists
              'profile-pictures'
            );
            if (uploadError) {
              Logger.error('Failed to upload profile picture', uploadError as Error);
            } else if (url) {
              uploadedImageUrl = url;
              setLastUploadedProfileUrl(url); // Track for future replacements
            }
          } else if (formData.savedProfilePictureUrl) {
            // Keep existing saved URL
            uploadedImageUrl = formData.savedProfilePictureUrl;
          }

          const { error } = await OnboardingService.savePersonalInfo({
            first_name: formData.firstName,
            last_name: formData.lastName,
            display_name: formData.username,
            birth_date: formattedDate,
            gender: formData.gender as 'M' | 'F' | 'O' | 'prefer_not_to_say',
            phone: formData.phoneNumber,
            profile_picture_url: uploadedImageUrl,
          });

          if (error) {
            Logger.error('Failed to save personal info', error as Error);
            Alert.alert('Error', 'Failed to save your information. Please try again.');
            setIsSaving(false);
            return false;
          }

          setIsSaving(false);
          return true;
        } catch (error) {
          Logger.error('Unexpected error saving personal info', error as Error);
          Alert.alert('Error', 'An unexpected error occurred.');
          setIsSaving(false);
          return false;
        }

      case 'sports':
        if (formData.selectedSportIds.length === 0) {
          Alert.alert('Error', 'Please select at least one sport');
          warningHaptic();
          return false;
        }
        // Sports are saved optimistically during selection
        return true;

      case 'tennis-rating':
        if (!formData.tennisRatingId) {
          Alert.alert('Error', 'Please select your tennis rating');
          warningHaptic();
          return false;
        }

        setIsSaving(true);
        try {
          // Get current user ID for the rating
          const tennisUserId = await DatabaseService.Auth.getCurrentUserId();
          if (!tennisUserId) {
            Alert.alert('Error', 'User not authenticated');
            setIsSaving(false);
            return false;
          }

          const { error: tennisRatingError } = await DatabaseService.Rating.addPlayerRating({
            player_id: tennisUserId,
            rating_score_id: formData.tennisRatingId,
            source: 'self_reported',
            is_certified: false,
          });

          if (tennisRatingError) {
            Logger.error('Failed to save tennis rating', tennisRatingError as Error);
            Alert.alert('Error', 'Failed to save your tennis rating. Please try again.');
            setIsSaving(false);
            return false;
          }

          setIsSaving(false);
          return true;
        } catch (error) {
          Logger.error('Unexpected error saving tennis rating', error as Error);
          Alert.alert('Error', 'An unexpected error occurred.');
          setIsSaving(false);
          return false;
        }

      case 'pickleball-rating':
        if (!formData.pickleballRatingId) {
          Alert.alert('Error', 'Please select your pickleball rating');
          warningHaptic();
          return false;
        }

        setIsSaving(true);
        try {
          // Get current user ID for the rating
          const pickleballUserId = await DatabaseService.Auth.getCurrentUserId();
          if (!pickleballUserId) {
            Alert.alert('Error', 'User not authenticated');
            setIsSaving(false);
            return false;
          }

          const { error: pickleballRatingError } = await DatabaseService.Rating.addPlayerRating({
            player_id: pickleballUserId,
            rating_score_id: formData.pickleballRatingId,
            source: 'self_reported',
            is_certified: false,
          });

          if (pickleballRatingError) {
            Logger.error('Failed to save pickleball rating', pickleballRatingError as Error);
            Alert.alert('Error', 'Failed to save your pickleball rating. Please try again.');
            setIsSaving(false);
            return false;
          }

          setIsSaving(false);
          return true;
        } catch (error) {
          Logger.error('Unexpected error saving pickleball rating', error as Error);
          Alert.alert('Error', 'An unexpected error occurred.');
          setIsSaving(false);
          return false;
        }

      case 'preferences':
        setIsSaving(true);
        try {
          const sportsData: OnboardingPlayerPreferences['sports'] = [];

          if (hasTennis) {
            const { data: tennisSport } = await SportService.getSportByName('tennis');
            if (tennisSport) {
              sportsData.push({
                sport_id: tennisSport.id,
                sport_name: 'tennis',
                preferred_match_duration: (formData.tennisMatchDuration || '90') as
                  | '30'
                  | '60'
                  | '90'
                  | '120',
                preferred_match_type: formData.tennisMatchType,
                is_primary: true,
              });
            }
          }

          if (hasPickleball) {
            const { data: pickleballSport } = await SportService.getSportByName('pickleball');
            if (pickleballSport) {
              sportsData.push({
                sport_id: pickleballSport.id,
                sport_name: 'pickleball',
                preferred_match_duration: (formData.pickleballMatchDuration || '90') as
                  | '30'
                  | '60'
                  | '90'
                  | '120',
                preferred_match_type: formData.pickleballMatchType,
                is_primary: !hasTennis,
              });
            }
          }

          const { error } = await OnboardingService.savePreferences({
            playing_hand: formData.playingHand,
            max_travel_distance: formData.maxTravelDistance,
            sports: sportsData,
          });

          if (error) {
            Logger.error('Failed to save preferences', error as Error);
            Alert.alert('Error', 'Failed to save your preferences. Please try again.');
            setIsSaving(false);
            return false;
          }

          setIsSaving(false);
          return true;
        } catch (error) {
          Logger.error('Unexpected error saving preferences', error as Error);
          Alert.alert('Error', 'An unexpected error occurred.');
          setIsSaving(false);
          return false;
        }

      case 'availabilities':
        setIsSaving(true);
        try {
          const dayMap: Record<string, DayEnum> = {
            Mon: 'monday',
            Tue: 'tuesday',
            Wed: 'wednesday',
            Thu: 'thursday',
            Fri: 'friday',
            Sat: 'saturday',
            Sun: 'sunday',
          };

          const timeSlotMap: Record<string, PeriodEnum> = {
            AM: 'morning',
            PM: 'afternoon',
            EVE: 'evening',
          };

          const availabilityData: OnboardingAvailability[] = [];

          Object.entries(formData.availabilities).forEach(([day, slots]) => {
            Object.entries(slots).forEach(([slot, isActive]) => {
              if (isActive) {
                availabilityData.push({
                  day: dayMap[day],
                  period: timeSlotMap[slot],
                  is_active: true,
                });
              }
            });
          });

          const { error } = await OnboardingService.saveAvailability(availabilityData);

          if (error) {
            Logger.error('Failed to save availability', error as Error);
            Alert.alert('Error', 'Failed to save your availability. Please try again.');
            setIsSaving(false);
            return false;
          }

          // Mark onboarding as completed
          const { error: completeError } = await OnboardingService.completeOnboarding();

          if (completeError) {
            Logger.warn('Failed to mark onboarding as completed', { error: completeError });
          }

          // Refetch profile, player, and sports immediately after marking onboarding as completed
          // This ensures:
          // 1. Profile: header updates, onboarding_completed flag is recognized
          // 2. Player: critical - player was null before onboarding, now exists in DB
          // 3. Sports: sport selector updates with user's selected sports
          await Promise.all([refetchProfile(), refetchPlayer()]);
          refetchSports();

          successHaptic();
          setIsSaving(false);
          return true;
        } catch (error) {
          Logger.error('Unexpected error saving availability', error as Error);
          Alert.alert('Error', 'An unexpected error occurred.');
          setIsSaving(false);
          return false;
        }

      default:
        return true;
    }
  }, [
    currentStepId,
    formData,
    hasTennis,
    hasPickleball,
    refetchProfile,
    refetchPlayer,
    refetchSports,
  ]);

  // Handle next button press
  const handleNext = useCallback(async () => {
    Keyboard.dismiss();
    const isValid = await validateAndSaveStep();
    if (isValid) {
      mediumHaptic();
      goToNextStep();
    }
  }, [validateAndSaveStep, goToNextStep]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    Keyboard.dismiss();
    lightHaptic();
    goToPrevStep();
  }, [goToPrevStep]);

  // Handle back to landing
  const handleBackToLanding = useCallback(() => {
    Keyboard.dismiss();
    // Could add confirmation dialog here if form has data
    resetWizard();
    onBackToLanding();
  }, [resetWizard, onBackToLanding]);

  // Animated styles for step container
  const animatedStepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Render step content
  const renderStep = (stepId: OnboardingStepId, _index: number) => {
    switch (stepId) {
      case 'personal':
        return (
          <PersonalInfoStep
            formData={formData}
            onUpdateFormData={updateFormData}
            onPickImage={pickImage}
            colors={colors}
            t={t}
            isDark={isDark}
          />
        );
      case 'sports':
        return (
          <SportSelectionStep
            formData={formData}
            onUpdateFormData={updateFormData}
            colors={colors}
            t={t}
            isDark={isDark}
          />
        );
      case 'tennis-rating':
        return (
          <RatingStep
            sport="tennis"
            formData={formData}
            onUpdateFormData={updateFormData}
            onContinue={goToNextStep}
            colors={colors}
            t={t}
            isDark={isDark}
          />
        );
      case 'pickleball-rating':
        return (
          <RatingStep
            sport="pickleball"
            formData={formData}
            onUpdateFormData={updateFormData}
            onContinue={goToNextStep}
            colors={colors}
            t={t}
            isDark={isDark}
          />
        );
      case 'preferences':
        return (
          <PreferencesStep
            formData={formData}
            onUpdateFormData={updateFormData}
            hasTennis={hasTennis}
            hasPickleball={hasPickleball}
            colors={colors}
            t={t}
            isDark={isDark}
          />
        );
      case 'availabilities':
        return (
          <AvailabilitiesStep
            formData={formData}
            onUpdateFormData={updateFormData}
            colors={colors}
            t={t}
            isDark={isDark}
          />
        );
      case 'success':
        return (
          <SuccessStep
            onComplete={onComplete}
            colors={colors}
            t={t}
            isDark={isDark}
            selectedSports={selectedSportsForSuccess}
            onSelectInitialSport={handleSelectInitialSport}
          />
        );
      default:
        return null;
    }
  };

  // Show loading state while fetching existing data
  if (isLoadingData) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { backgroundColor: colors.cardBackground },
        ]}
      >
        <ActivityIndicator size="large" color={colors.buttonActive} />
      </View>
    );
  }

  // If showing success screen, render without header/progress/footer
  if (currentStepId === 'success') {
    return (
      <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
        <SuccessStep
          onComplete={onComplete}
          colors={colors}
          t={t}
          isDark={isDark}
          selectedSports={selectedSportsForSuccess}
          onSelectInitialSport={handleSelectInitialSport}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      {/* Fixed Header */}
      <WizardHeader
        currentStep={currentStep}
        onBack={handleBack}
        onBackToLanding={handleBackToLanding}
        onClose={onClose}
        colors={colors}
        t={t}
      />

      {/* Fixed Progress bar */}
      <ProgressBar
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepName={getStepName(currentStepId, t)}
        colors={colors}
        t={t}
      />

      {/* Scrollable Step content */}
      <View style={styles.stepsViewport}>
        <Animated.View
          style={[styles.stepsContainer, { width: SCREEN_WIDTH * steps.length }, animatedStepStyle]}
        >
          {steps.map((stepId, index) => (
            <View key={stepId} style={[styles.stepWrapper, { width: SCREEN_WIDTH }]}>
              {renderStep(stepId, index)}
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Fixed Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {!isLastStep ? (
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: colors.buttonActive }]}
            onPress={handleNext}
            disabled={isSaving}
            accessibilityLabel={t('common.next' as TranslationKey)}
            accessibilityRole="button"
          >
            {isSaving ? (
              <ActivityIndicator color={colors.buttonTextActive} />
            ) : (
              <>
                <Text size="lg" weight="semibold" color={colors.buttonTextActive}>
                  {t('common.next' as TranslationKey)}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={colors.buttonTextActive} />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: colors.buttonActive },
              isSaving && styles.buttonDisabled,
            ]}
            onPress={handleNext}
            disabled={isSaving}
            accessibilityLabel={t('onboarding.complete' as TranslationKey)}
            accessibilityRole="button"
          >
            {isSaving ? (
              <ActivityIndicator color={colors.buttonTextActive} />
            ) : (
              <>
                <Text size="lg" weight="semibold" color={colors.buttonTextActive}>
                  {t('onboarding.complete' as TranslationKey)}
                </Text>
                <Ionicons name="checkmark" size={20} color={colors.buttonTextActive} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerButton: {
    padding: spacingPixels[1],
  },
  progressContainer: {
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingPixels[2],
  },
  progressBarBg: {
    height: 4,
    borderRadius: radiusPixels.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radiusPixels.full,
  },
  stepsViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  stepsContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  stepWrapper: {
    flex: 1,
    height: '100%',
  },
  footer: {
    padding: spacingPixels[4],
    borderTopWidth: 1,
    // Footer is fixed at the bottom
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    gap: spacingPixels[2],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default OnboardingWizard;
