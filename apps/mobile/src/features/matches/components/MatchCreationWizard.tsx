/**
 * Match Creation Wizard
 *
 * A 3-step wizard for creating matches with horizontal slide animations,
 * progress indicator, swipe gestures, and full i18n/theme support.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import { Text, Button } from '@rallia/shared-components';
import {
  lightTheme,
  darkTheme,
  spacingPixels,
  radiusPixels,
  primary,
  neutral,
} from '@rallia/design-system';

const BASE_WHITE = '#ffffff';
import { lightHaptic, successHaptic, warningHaptic } from '@rallia/shared-utils';
import { useCreateMatch, useUpdateMatch } from '@rallia/shared-hooks';

import { useTheme } from '@rallia/shared-hooks';
import { useTranslation, type TranslationKey } from '../../../hooks/useTranslation';
import { useSport, type MatchDetailData } from '../../../context';
import { useAuth } from '../../../hooks';
import { useMatchForm, useMatchDraft, calculateEndTime, matchToFormData } from '../hooks';
import { supabase } from '../../../lib/supabase';
import type { MatchFormSchemaData } from '@rallia/shared-types';

import { WhenFormatStep } from './steps/WhenFormatStep';
import { WhereStep } from './steps/WhereStep';
import { PreferencesStep } from './steps/PreferencesStep';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;
const TOTAL_STEPS = 3;

// =============================================================================
// TYPES
// =============================================================================

interface MatchCreationWizardProps {
  /** Callback when wizard should be closed (closes entire sheet) */
  onClose: () => void;
  /** Callback to go back to the action sheet landing slide */
  onBackToLanding: () => void;
  /** Callback when match is created/updated successfully */
  onSuccess?: (matchId: string) => void;
  /** If provided, wizard is in edit mode with pre-filled data */
  editMatch?: MatchDetailData;
}

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
  progressActive: string;
  progressInactive: string;
}

// =============================================================================
// PROGRESS BAR COMPONENT
// =============================================================================

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  colors: ThemeColors;
  t: (key: TranslationKey) => string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps, colors, t }) => {
  const progress = useSharedValue((currentStep / totalSteps) * 100);

  // Animate progress when step changes
  useEffect(() => {
    progress.value = withTiming((currentStep / totalSteps) * 100, {
      duration: 300,
    });
  }, [currentStep, totalSteps]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  // Get step name for current step
  const stepNames = [
    t('matchCreation.stepNames.when' as TranslationKey),
    t('matchCreation.stepNames.where' as TranslationKey),
    t('matchCreation.stepNames.preferences' as TranslationKey),
  ];
  const currentStepName = stepNames[currentStep - 1] || '';

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text size="sm" weight="semibold" color={colors.textMuted}>
          {t('matchCreation.step' as TranslationKey)
            .replace('{current}', String(currentStep))
            .replace('{total}', String(totalSteps))}
        </Text>
        <Text size="sm" weight="bold" color={colors.progressActive}>
          {currentStepName}
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
  sportName: string;
  colors: ThemeColors;
  t: (key: TranslationKey) => string;
}

const WizardHeader: React.FC<WizardHeaderProps> = ({
  currentStep,
  onBack,
  onBackToLanding,
  onClose,
  sportName,
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
            accessibilityLabel="Back to actions"
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
            accessibilityLabel={t('matchCreation.accessibility.previousStep' as TranslationKey)}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.buttonActive} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sport badge */}
      <View style={[styles.sportBadge, { backgroundColor: colors.buttonActive }]}>
        <Ionicons name="tennisball" size={14} color={BASE_WHITE} />
        <Text size="sm" weight="semibold" color={BASE_WHITE}>
          {sportName}
        </Text>
      </View>

      {/* Close button */}
      <View style={styles.headerRight}>
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            lightHaptic();
            onClose();
          }}
          style={styles.headerButton}
          accessibilityLabel={t('matchCreation.accessibility.closeWizard' as TranslationKey)}
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// =============================================================================
// MAIN WIZARD COMPONENT
// =============================================================================

export const MatchCreationWizard: React.FC<MatchCreationWizardProps> = ({
  onClose,
  onBackToLanding,
  onSuccess,
  editMatch,
}) => {
  const { theme } = useTheme();
  const { t, locale } = useTranslation();
  const { session } = useAuth();
  const { selectedSport } = useSport();
  const isDark = theme === 'dark';

  // Determine if we're in edit mode
  const isEditMode = !!editMatch;

  // State
  const [currentStep, setCurrentStep] = useState(1);

  // Track last saved state to detect unsaved changes
  const lastSavedStep = useRef<number | null>(null);
  const hasUnsavedChanges = useRef(false);

  // Theme colors
  const themeColors = isDark ? darkTheme : lightTheme;
  const colors: ThemeColors = {
    background: themeColors.background,
    cardBackground: themeColors.card,
    text: themeColors.foreground,
    textSecondary: isDark ? primary[300] : neutral[600],
    textMuted: themeColors.mutedForeground,
    border: themeColors.border,
    buttonActive: isDark ? primary[500] : primary[600],
    buttonInactive: themeColors.muted,
    buttonTextActive: BASE_WHITE,
    progressActive: isDark ? primary[500] : primary[600],
    progressInactive: themeColors.muted,
  };

  // Form state
  const sportId = editMatch?.sport_id ?? selectedSport?.id ?? '';
  // Get device timezone from calendar settings (memoized to avoid re-renders)
  const timezone = useMemo(() => {
    const calendars = Localization.getCalendars();
    return calendars[0]?.timeZone || 'UTC';
  }, []);

  // State for player preferences
  const [playerPreferences, setPlayerPreferences] = useState<Partial<MatchFormSchemaData> | null>(
    null
  );
  const [preferencesLoading, setPreferencesLoading] = useState(true);

  // Reset preferences when sportId changes (handles sport switching)
  useEffect(() => {
    setPlayerPreferences(null);
    setPreferencesLoading(true);
  }, [sportId]);

  // Fetch player preferences for the selected sport
  useEffect(() => {
    if (isEditMode || !session?.user?.id || !sportId) {
      setPreferencesLoading(false);
      return;
    }

    const fetchPlayerPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('player_sport')
          .select('preferred_match_duration, preferred_match_type, preferred_facility_id')
          .eq('player_id', session.user.id)
          .eq('sport_id', sportId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to fetch player preferences:', error);
          setPreferencesLoading(false);
          return;
        }

        if (data) {
          // Map preferences to form values
          const mappedPreferences: Partial<MatchFormSchemaData> = {};

          // Map duration: '1h' → '60', '1.5h' → '90', '2h' → '120'
          if (data.preferred_match_duration) {
            const durationMap: Record<string, '30' | '60' | '90' | '120'> = {
              '1h': '60',
              '1.5h': '90',
              '2h': '120',
            };
            mappedPreferences.duration = durationMap[data.preferred_match_duration] || '60';
          }

          // Map match type: 'casual' → 'practice', 'competitive' → 'competitive', 'both' → 'both'
          if (data.preferred_match_type) {
            const typeMap: Record<string, 'practice' | 'competitive' | 'both'> = {
              casual: 'practice',
              competitive: 'competitive',
              both: 'both',
            };
            mappedPreferences.playerExpectation = typeMap[data.preferred_match_type] || 'both';
          }

          // Map preferred facility: if preferred_facility_id exists, set locationType to 'facility' and facilityId
          if (data.preferred_facility_id) {
            mappedPreferences.locationType = 'facility';
            mappedPreferences.facilityId = data.preferred_facility_id;
          }

          setPlayerPreferences(mappedPreferences);
        }
      } catch (error) {
        console.error('Error fetching player preferences:', error);
      } finally {
        setPreferencesLoading(false);
      }
    };

    fetchPlayerPreferences();
  }, [session?.user?.id, sportId, isEditMode]);

  // Calculate initial values from editMatch if in edit mode, or merge with player preferences
  const initialValues = useMemo(() => {
    if (editMatch) {
      return matchToFormData(editMatch, timezone);
    }
    // Merge player preferences with defaults (will be handled in useMatchForm)
    return playerPreferences || undefined;
  }, [editMatch, timezone, playerPreferences]);

  const { form, values, isDirty, validateStep, resetForm, loadFromDraft } = useMatchForm({
    sportId,
    timezone,
    initialValues,
  });

  // Draft persistence
  const {
    hasDraft,
    draft,
    saveDraft,
    clearDraft,
    isDraftForSport,
    isLoading: isDraftLoading,
  } = useMatchDraft();

  // Apply player preferences to form when they're loaded (only if not in edit mode and no draft for this sport)
  useEffect(() => {
    // Skip if there's a draft for the current sport (user might want to resume it)
    const hasDraftForCurrentSport = hasDraft && isDraftForSport(sportId);

    if (
      isEditMode ||
      preferencesLoading ||
      !playerPreferences ||
      hasDraftForCurrentSport ||
      Object.keys(playerPreferences).length === 0
    ) {
      return;
    }

    // Apply preferences to form
    Object.entries(playerPreferences).forEach(([key, value]) => {
      if (value !== undefined) {
        form.setValue(key as keyof MatchFormSchemaData, value as never, { shouldDirty: false });
      }
    });
  }, [playerPreferences, preferencesLoading, isEditMode, hasDraft, isDraftForSport, sportId, form]);

  // Delayed success state for smoother UX
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMatchId, setSuccessMatchId] = useState<string | null>(null);

  // Match creation mutation
  const { createMatch, isCreating } = useCreateMatch({
    onSuccess: match => {
      // Add a small delay so the creation doesn't feel too instant
      // This gives the user time to see the loading state
      setTimeout(() => {
        successHaptic();
        clearDraft();
        setSuccessMatchId(match.id);
        setShowSuccess(true);
      }, 800); // 800ms delay for perceived effort
    },
    onError: err => {
      warningHaptic();
      Alert.alert(t('errors.unknown' as TranslationKey), err.message);
    },
  });

  // Match update mutation (for edit mode)
  const { updateMatch, isUpdating } = useUpdateMatch({
    onSuccess: match => {
      setTimeout(() => {
        successHaptic();
        setSuccessMatchId(match.id);
        setShowSuccess(true);
      }, 800);
    },
    onError: err => {
      warningHaptic();
      Alert.alert(t('matchCreation.updateError' as TranslationKey), err.message);
    },
  });

  // Combined loading state
  const isSubmitting = isCreating || isUpdating;

  // Animation values
  const translateX = useSharedValue(0);
  const gestureTranslateX = useSharedValue(0);

  // Track if initial draft check has been done
  const hasCheckedDraft = useRef(false);

  // Check for draft on mount (only once, after loading completes)
  // Skip draft handling when in edit mode
  useEffect(() => {
    // Skip draft handling in edit mode
    if (isEditMode) {
      hasCheckedDraft.current = true;
      return;
    }

    // Only check once on initial mount
    if (hasCheckedDraft.current) return;

    // Wait for draft loading to complete before checking
    if (isDraftLoading) return;

    // Now we know the loading is complete
    if (hasDraft && draft && isDraftForSport(sportId)) {
      hasCheckedDraft.current = true;
      Alert.alert(
        t('matchCreation.resumeDraft' as TranslationKey),
        t('matchCreation.resumeDraftMessage' as TranslationKey),
        [
          {
            text: t('matchCreation.discardDraft' as TranslationKey),
            style: 'destructive',
            onPress: () => {
              clearDraft();
              resetForm();
              lastSavedStep.current = null;
              hasUnsavedChanges.current = false;
            },
          },
          {
            text: t('matchCreation.resumeDraft' as TranslationKey),
            onPress: () => {
              loadFromDraft(draft.data);
              setCurrentStep(draft.currentStep);
              // Mark draft as already saved at this step
              lastSavedStep.current = draft.currentStep;
              hasUnsavedChanges.current = false;
            },
          },
        ]
      );
    } else {
      // No draft exists (loading complete, no draft found), mark as checked
      hasCheckedDraft.current = true;
    }
  }, [isDraftLoading, hasDraft, draft, sportId, isEditMode]);

  // Track form changes to detect unsaved modifications
  useEffect(() => {
    if (isDirty) {
      hasUnsavedChanges.current = true;
    }
  }, [isDirty, values]);

  // Animate step changes
  useEffect(() => {
    translateX.value = withSpring(-((currentStep - 1) * SCREEN_WIDTH), {
      damping: 80,
      stiffness: 600,
      overshootClamping: false,
    });
  }, [currentStep]);

  // Navigate to next step
  const goToNextStep = useCallback(async () => {
    Keyboard.dismiss();

    // Special handling for step 2: show alert if facility is not selected
    if (currentStep === 2 && values.locationType === 'facility' && !values.facilityId) {
      warningHaptic();
      Alert.alert(t('matchCreation.validation.facilityRequired' as TranslationKey), '', [
        { text: t('common.ok' as TranslationKey) },
      ]);
      return;
    }

    const isValid = await validateStep(currentStep as 1 | 2 | 3);

    if (!isValid) {
      warningHaptic();
      return;
    }

    lightHaptic();

    // Only save draft when not in edit mode
    if (!isEditMode) {
      saveDraft(values, currentStep + 1, sportId);
      // Mark as saved
      lastSavedStep.current = currentStep + 1;
      hasUnsavedChanges.current = false;
    }

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, validateStep, values, sportId, saveDraft, isEditMode, t]);

  // Navigate to previous step
  const goToPrevStep = useCallback(() => {
    Keyboard.dismiss();
    lightHaptic();
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();
    const isValid = await validateStep(3);

    if (!isValid) {
      warningHaptic();
      return;
    }

    if (!session?.user?.id) {
      Alert.alert(t('alerts.error'), t('errors.mustBeLoggedIn'));
      return;
    }

    // Calculate end time
    const endTime = calculateEndTime(
      values.startTime,
      values.duration,
      values.customDurationMinutes
    );

    const matchData = {
      sportId: values.sportId,
      createdBy: session.user.id,
      matchDate: values.matchDate,
      startTime: values.startTime,
      endTime,
      timezone: values.timezone,
      format: values.format,
      playerExpectation: values.playerExpectation,
      duration: values.duration,
      // Only include customDurationMinutes when duration is 'custom'
      customDurationMinutes:
        values.duration === 'custom' ? values.customDurationMinutes : undefined,
      locationType: values.locationType,
      facilityId: values.facilityId,
      courtId: values.courtId,
      locationName: values.locationName,
      locationAddress: values.locationAddress,
      customLatitude: values.customLatitude,
      customLongitude: values.customLongitude,
      courtStatus: values.courtStatus,
      isCourtFree: values.isCourtFree,
      costSplitType: values.costSplitType,
      estimatedCost: values.estimatedCost,
      minRatingScoreId: values.minRatingScoreId,
      preferredOpponentGender: values.preferredOpponentGender,
      visibility: values.visibility,
      joinMode: values.joinMode,
      notes: values.notes,
    };

    if (isEditMode && editMatch) {
      // Update existing match
      updateMatch({
        matchId: editMatch.id,
        updates: matchData,
      });
    } else {
      // Create new match
      createMatch(matchData);
    }
  }, [validateStep, values, session, createMatch, updateMatch, isEditMode, editMatch]);

  // Handle close with confirmation
  const handleClose = useCallback(() => {
    Keyboard.dismiss();

    // In edit mode, just ask if they want to discard changes (no draft saving)
    if (isEditMode) {
      if (isDirty) {
        Alert.alert(
          t('matchCreation.discardChanges' as TranslationKey),
          t('matchCreation.discardEditMessage' as TranslationKey),
          [
            { text: t('matchCreation.keepEditing' as TranslationKey), style: 'cancel' },
            {
              text: t('matchCreation.discardChanges' as TranslationKey),
              style: 'destructive',
              onPress: onClose,
            },
          ]
        );
      } else {
        onClose();
      }
      return;
    }

    // Check if there are unsaved changes:
    // 1. Form is dirty (has changes from initial/loaded values)
    // 2. OR we have unsaved changes since last save
    // 3. OR we're on a step beyond 1 and haven't saved yet (user has progressed)
    const hasFormData = isDirty || hasUnsavedChanges.current;
    const hasProgressedWithoutSave = currentStep > 1 && lastSavedStep.current === null;
    const hasChangedSinceLastSave =
      lastSavedStep.current !== null &&
      (currentStep !== lastSavedStep.current || hasUnsavedChanges.current);

    const shouldAskToSave = hasFormData || hasProgressedWithoutSave || hasChangedSinceLastSave;

    if (shouldAskToSave) {
      Alert.alert(
        t('matchCreation.discardChanges' as TranslationKey),
        t('matchCreation.discardChangesMessage' as TranslationKey),
        [
          { text: t('matchCreation.keepEditing' as TranslationKey), style: 'cancel' },
          {
            text: t('matchCreation.saveDraft' as TranslationKey),
            onPress: () => {
              saveDraft(values, currentStep, sportId);
              lastSavedStep.current = currentStep;
              hasUnsavedChanges.current = false;
              onClose();
            },
          },
          {
            text: t('matchCreation.discardDraft' as TranslationKey),
            style: 'destructive',
            onPress: () => {
              clearDraft();
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  }, [isDirty, values, currentStep, sportId, saveDraft, clearDraft, onClose, t, isEditMode]);

  // Swipe gesture handler
  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      gestureTranslateX.value = e.translationX;
    })
    .onEnd(e => {
      if (e.translationX > SWIPE_THRESHOLD && currentStep > 1) {
        // Swipe right - go to previous step
        runOnJS(goToPrevStep)();
      } else if (e.translationX < -SWIPE_THRESHOLD && currentStep < TOTAL_STEPS) {
        // Swipe left - attempt to go to next step
        runOnJS(goToNextStep)();
      }
      gestureTranslateX.value = withTiming(0);
    });

  // Animated styles for step container
  const animatedStepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value + gestureTranslateX.value }],
  }));

  // Success animation values
  const successOpacity = useSharedValue(0);
  const successScale = useSharedValue(0.8);
  const formOpacity = useSharedValue(1);

  // Trigger success animation when showSuccess becomes true
  useEffect(() => {
    if (showSuccess) {
      // Fade out form
      formOpacity.value = withTiming(0, { duration: 200 });
      // Fade in and scale up success view
      successOpacity.value = withTiming(1, { duration: 400 });
      successScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    }
  }, [showSuccess]);

  // Animated style for success view
  const successAnimatedStyle = useAnimatedStyle(() => ({
    opacity: successOpacity.value,
    transform: [{ scale: successScale.value }],
  }));

  // Animated style for form (fades out on success)
  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  // Success view - overlay on top with fade animation
  if (showSuccess && successMatchId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
        <Animated.View style={[styles.successContainer, successAnimatedStyle]}>
          {/* Close button */}
          <TouchableOpacity
            onPress={() => {
              lightHaptic();
              onClose();
            }}
            style={[
              styles.successCloseButton,
              { backgroundColor: isDark ? neutral[800] : neutral[100] },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.successIcon, { backgroundColor: colors.buttonActive }]}>
            <Ionicons
              name={isEditMode ? 'checkmark-circle' : 'trophy'}
              size={48}
              color={BASE_WHITE}
            />
          </View>
          <Text size="xl" weight="bold" color={colors.text} style={styles.successTitle}>
            {isEditMode
              ? t('matchCreation.updateSuccess' as TranslationKey)
              : t('matchCreation.success' as TranslationKey)}
          </Text>
          <Text size="base" color={colors.textMuted} style={styles.successDescription}>
            {isEditMode
              ? t('matchCreation.updateSuccessDescription' as TranslationKey)
              : t('matchCreation.successDescription' as TranslationKey)}
          </Text>
          <View style={styles.successButtons}>
            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: colors.buttonActive }]}
              onPress={() => onSuccess?.(successMatchId)}
            >
              <Text size="base" weight="semibold" color={colors.buttonTextActive}>
                {t('matchCreation.viewMatch' as TranslationKey)}
              </Text>
            </TouchableOpacity>
            {!isEditMode && (
              <TouchableOpacity
                style={[styles.successButton, { backgroundColor: colors.buttonInactive }]}
                onPress={() => {
                  // Reset animations and state for next creation
                  successOpacity.value = 0;
                  successScale.value = 0.8;
                  formOpacity.value = 1;
                  setShowSuccess(false);
                  setSuccessMatchId(null);
                  resetForm();
                  setCurrentStep(1);
                }}
              >
                <Text size="base" weight="semibold" color={colors.buttonActive}>
                  {t('matchCreation.createAnother' as TranslationKey)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      {/* Header */}
      <WizardHeader
        currentStep={currentStep}
        onBack={goToPrevStep}
        onBackToLanding={onBackToLanding}
        onClose={handleClose}
        sportName={selectedSport?.display_name ?? 'Sport'}
        colors={colors}
        t={t}
      />

      {/* Progress bar */}
      <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} colors={colors} t={t} />

      {/* Step content with swipe */}
      <View style={styles.stepsViewport}>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.stepsContainer,
              { width: SCREEN_WIDTH * TOTAL_STEPS },
              animatedStepStyle,
            ]}
          >
            {/* Step 1: When & Format */}
            <View style={[styles.stepWrapper, { width: SCREEN_WIDTH }]}>
              <WhenFormatStep form={form} colors={colors} t={t} isDark={isDark} locale={locale} />
            </View>

            {/* Step 2: Where */}
            <View style={[styles.stepWrapper, { width: SCREEN_WIDTH }]}>
              <WhereStep
                form={form}
                colors={colors}
                t={t}
                isDark={isDark}
                sportId={selectedSport?.id}
              />
            </View>

            {/* Step 3: Preferences */}
            <View style={[styles.stepWrapper, { width: SCREEN_WIDTH }]}>
              <PreferencesStep
                form={form}
                colors={colors}
                t={t}
                isDark={isDark}
                sportName={selectedSport?.name}
                sportId={selectedSport?.id}
                userId={session?.user?.id}
              />
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Navigation buttons */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {currentStep < TOTAL_STEPS ? (
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: colors.buttonActive }]}
            onPress={goToNextStep}
            accessibilityLabel={t('matchCreation.accessibility.nextStep' as TranslationKey)}
            accessibilityRole="button"
          >
            <Text size="lg" weight="semibold" color={colors.buttonTextActive}>
              {t('matchCreation.next' as TranslationKey)}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.buttonTextActive} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: colors.buttonActive },
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            accessibilityLabel={
              isEditMode
                ? t('matchCreation.saveChanges' as TranslationKey)
                : t('matchCreation.createMatch' as TranslationKey)
            }
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.buttonTextActive} />
            ) : (
              <>
                <Text size="lg" weight="semibold" color={colors.buttonTextActive}>
                  {isEditMode
                    ? t('matchCreation.saveChanges' as TranslationKey)
                    : t('matchCreation.createMatch' as TranslationKey)}
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
    flexDirection: 'column',
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
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerButton: {
    padding: spacingPixels[1],
  },
  headerButtonPlaceholder: {
    width: 24,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[1.5],
    borderRadius: radiusPixels.full,
    gap: spacingPixels[1.5],
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
    height: '100%',
  },
  stepWrapper: {
    height: '100%',
  },
  footer: {
    padding: spacingPixels[4],
    borderTopWidth: 1,
    paddingBottom: spacingPixels[8],
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
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingPixels[6],
    position: 'relative',
  },
  successCloseButton: {
    position: 'absolute',
    top: spacingPixels[4],
    right: spacingPixels[4],
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: radiusPixels.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacingPixels[4],
  },
  successTitle: {
    textAlign: 'center',
    marginBottom: spacingPixels[2],
  },
  successDescription: {
    textAlign: 'center',
    marginBottom: spacingPixels[6],
  },
  successButtons: {
    gap: spacingPixels[3],
    width: '100%',
  },
  successButton: {
    paddingVertical: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    alignItems: 'center',
  },
});

export default MatchCreationWizard;
