/**
 * Preferences Step
 *
 * Step 3 of the match creation wizard.
 * Handles court cost, visibility, join mode, and notes.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { UseFormReturn } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { lightHaptic } from '@rallia/shared-utils';
import { useRatingScoresForSport } from '@rallia/shared-hooks';
import type { MatchFormSchemaData } from '@rallia/shared-types';
import type { TranslationKey } from '../../../../hooks/useTranslation';

// =============================================================================
// TYPES
// =============================================================================

interface PreferencesStepProps {
  form: UseFormReturn<MatchFormSchemaData>;
  colors: {
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    buttonActive: string;
    buttonInactive: string;
    buttonTextActive: string;
    cardBackground: string;
  };
  t: (key: TranslationKey) => string;
  isDark: boolean;
  /** Sport name for fetching rating scores (e.g., "tennis", "pickleball") */
  sportName?: string;
  /** Sport ID for fetching player's current rating */
  sportId?: string;
}

interface OptionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  colors: PreferencesStepProps['colors'];
  compact?: boolean;
}

// =============================================================================
// OPTION CARD COMPONENT
// =============================================================================

const OptionCard: React.FC<OptionCardProps> = ({
  icon,
  title,
  description,
  selected,
  onPress,
  colors,
  compact = false,
}) => (
  <TouchableOpacity
    style={[
      compact ? styles.optionCardCompact : styles.optionCard,
      {
        backgroundColor: selected ? `${colors.buttonActive}15` : colors.buttonInactive,
        borderColor: selected ? colors.buttonActive : colors.border,
      },
    ]}
    onPress={() => {
      lightHaptic();
      onPress();
    }}
    activeOpacity={0.7}
  >
    {compact ? (
      // Compact layout: icon on top, title below
      <View style={styles.optionContentCompact}>
        <Ionicons name={icon} size={24} color={selected ? colors.buttonActive : colors.textMuted} />
        <Text
          size="sm"
          weight={selected ? 'semibold' : 'regular'}
          color={selected ? colors.buttonActive : colors.text}
          style={styles.compactTitle}
        >
          {title}
        </Text>
      </View>
    ) : (
      // Full layout: icon + text side by side
      <>
        <View style={styles.optionContent}>
          <Ionicons
            name={icon}
            size={20}
            color={selected ? colors.buttonActive : colors.textMuted}
          />
          <View style={styles.optionTextContainer}>
            <Text
              size="base"
              weight={selected ? 'semibold' : 'regular'}
              color={selected ? colors.buttonActive : colors.text}
            >
              {title}
            </Text>
            {description && (
              <Text size="xs" color={colors.textMuted}>
                {description}
              </Text>
            )}
          </View>
        </View>
        {selected && <Ionicons name="checkmark-circle" size={20} color={colors.buttonActive} />}
      </>
    )}
  </TouchableOpacity>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PreferencesStep: React.FC<PreferencesStepProps> = ({
  form,
  colors,
  t,
  isDark,
  sportName,
  sportId,
}) => {
  const {
    watch,
    setValue,
    formState: { errors },
  } = form;

  const isCourtFree = watch('isCourtFree');
  const costSplitType = watch('costSplitType');
  const estimatedCost = watch('estimatedCost');
  const visibility = watch('visibility');
  const joinMode = watch('joinMode');
  const preferredOpponentGender = watch('preferredOpponentGender');
  const minRatingScoreId = watch('minRatingScoreId');
  const notes = watch('notes');
  const courtStatus = watch('courtStatus');
  const locationType = watch('locationType');
  const facilityId = watch('facilityId');
  const locationName = watch('locationName');

  // Check if a location has been specified (facility selected or custom location entered)
  const hasLocationSpecified =
    (locationType === 'facility' && !!facilityId) || (locationType === 'custom' && !!locationName);

  // Fetch rating scores for the sport (also returns player's current rating)
  const {
    ratingScores,
    isLoading: isLoadingRatings,
    hasRatingSystem,
    playerRatingScoreId,
  } = useRatingScoresForSport(sportName, sportId);

  // Track if we've set the default rating to avoid overwriting user selection
  const hasSetDefaultRating = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const notesFieldRef = useRef<View>(null);

  // Reset the ref when minRatingScoreId becomes undefined (form reset)
  // and set player's rating as default when appropriate
  useEffect(() => {
    // Reset ref when minRatingScoreId becomes undefined (form reset)
    if (!minRatingScoreId) {
      hasSetDefaultRating.current = false;
    }

    // Set player's rating as default when loaded (only once, after ref reset)
    if (playerRatingScoreId && !hasSetDefaultRating.current && !minRatingScoreId) {
      setValue('minRatingScoreId', playerRatingScoreId, { shouldDirty: false });
      hasSetDefaultRating.current = true;
    }
  }, [playerRatingScoreId, minRatingScoreId, setValue]);

  // Set default court status to 'to_book' when location is specified and status is not set
  useEffect(() => {
    if (hasLocationSpecified && !courtStatus) {
      setValue('courtStatus', 'to_book', { shouldDirty: false });
    }
  }, [hasLocationSpecified, courtStatus, setValue]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {/* Step title */}
      <View style={styles.stepHeader}>
        <Text size="lg" weight="bold" color={colors.text}>
          {t('matchCreation.step3Title' as TranslationKey)}
        </Text>
        <Text size="sm" color={colors.textMuted}>
          {t('matchCreation.step3Description' as TranslationKey)}
        </Text>
      </View>

      {/* Court cost toggle */}
      <View style={styles.fieldGroup}>
        <View style={[styles.toggleRow, { borderColor: colors.border }]}>
          <View style={styles.toggleTextContainer}>
            <Text size="base" weight="semibold" color={colors.text}>
              {t('matchCreation.fields.isCourtFree' as TranslationKey)}
            </Text>
            <Text size="xs" color={colors.textMuted}>
              {isCourtFree
                ? t('matchCreation.fields.isCourtFreeYes' as TranslationKey)
                : t('matchCreation.fields.isCourtFreeNo' as TranslationKey)}
            </Text>
          </View>
          <Switch
            value={isCourtFree}
            onValueChange={value => {
              lightHaptic();
              setValue('isCourtFree', value, { shouldValidate: true, shouldDirty: true });
            }}
            trackColor={{ false: colors.border, true: colors.buttonActive }}
            thumbColor={colors.buttonTextActive}
          />
        </View>
      </View>

      {/* Cost options (only if not free) */}
      {!isCourtFree && (
        <>
          {/* Estimated cost input */}
          <View style={styles.fieldGroup}>
            <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
              {t('matchCreation.fields.estimatedCost' as TranslationKey)}
            </Text>
            <View
              style={[
                styles.costInputContainer,
                { borderColor: colors.border, backgroundColor: colors.cardBackground },
              ]}
            >
              <Text size="lg" weight="semibold" color={colors.textMuted}>
                $
              </Text>
              <BottomSheetTextInput
                style={[styles.costInput, { color: colors.text }]}
                value={estimatedCost?.toString() ?? ''}
                onChangeText={text => {
                  const numValue = parseFloat(text.replace(/[^0-9.]/g, ''));
                  setValue('estimatedCost', isNaN(numValue) ? undefined : numValue, {
                    shouldDirty: true,
                  });
                }}
                placeholder={t('matchCreation.fields.estimatedCostPlaceholder' as TranslationKey)}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Cost split type */}
          <View style={styles.fieldGroup}>
            <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
              {t('matchCreation.fields.costSplitType' as TranslationKey)}
            </Text>
            <View style={styles.optionsColumn}>
              <OptionCard
                icon="people-outline"
                title={t('matchCreation.fields.costSplitEqual' as TranslationKey)}
                description="Split cost equally among all players"
                selected={costSplitType === 'equal'}
                onPress={() =>
                  setValue('costSplitType', 'equal', { shouldValidate: true, shouldDirty: true })
                }
                colors={colors}
              />
              <OptionCard
                icon="person-outline"
                title={t('matchCreation.fields.costSplitCreator' as TranslationKey)}
                description="You cover the full cost"
                selected={costSplitType === 'creator_pays'}
                onPress={() =>
                  setValue('costSplitType', 'creator_pays', {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                colors={colors}
              />
            </View>
          </View>
        </>
      )}

      {/* Court booking status (only show if location is specified) */}
      {hasLocationSpecified && (
        <View style={styles.fieldGroup}>
          <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
            {t('matchCreation.fields.courtStatus' as TranslationKey)}
          </Text>
          <View style={styles.optionsColumn}>
            <OptionCard
              icon="checkmark-circle-outline"
              title={t('matchCreation.fields.courtStatusBooked' as TranslationKey)}
              description="Court is already reserved for this match"
              selected={courtStatus === 'booked'}
              onPress={() =>
                setValue('courtStatus', 'booked', { shouldValidate: true, shouldDirty: true })
              }
              colors={colors}
            />
            <OptionCard
              icon="calendar-outline"
              title={t('matchCreation.fields.courtStatusToBook' as TranslationKey)}
              description="Court still needs to be reserved"
              selected={courtStatus === 'to_book' || !courtStatus}
              onPress={() =>
                setValue('courtStatus', 'to_book', { shouldValidate: true, shouldDirty: true })
              }
              colors={colors}
            />
          </View>
        </View>
      )}

      {/* Visibility options */}
      <View style={styles.fieldGroup}>
        <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
          {t('matchCreation.fields.visibility' as TranslationKey)}
        </Text>
        <View style={styles.optionsColumn}>
          <OptionCard
            icon="globe-outline"
            title={t('matchCreation.fields.visibilityPublic' as TranslationKey)}
            description={t('matchCreation.fields.visibilityPublicDescription' as TranslationKey)}
            selected={visibility === 'public'}
            onPress={() =>
              setValue('visibility', 'public', { shouldValidate: true, shouldDirty: true })
            }
            colors={colors}
          />
          <OptionCard
            icon="lock-closed-outline"
            title={t('matchCreation.fields.visibilityPrivate' as TranslationKey)}
            description={t('matchCreation.fields.visibilityPrivateDescription' as TranslationKey)}
            selected={visibility === 'private'}
            onPress={() =>
              setValue('visibility', 'private', { shouldValidate: true, shouldDirty: true })
            }
            colors={colors}
          />
        </View>
      </View>

      {/* Join mode options */}
      <View style={styles.fieldGroup}>
        <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
          {t('matchCreation.fields.joinMode' as TranslationKey)}
        </Text>
        <View style={styles.optionsColumn}>
          <OptionCard
            icon="flash-outline"
            title={t('matchCreation.fields.joinModeDirect' as TranslationKey)}
            description={t('matchCreation.fields.joinModeDirectDescription' as TranslationKey)}
            selected={joinMode === 'direct'}
            onPress={() =>
              setValue('joinMode', 'direct', { shouldValidate: true, shouldDirty: true })
            }
            colors={colors}
          />
          <OptionCard
            icon="hand-right-outline"
            title={t('matchCreation.fields.joinModeRequest' as TranslationKey)}
            description={t('matchCreation.fields.joinModeRequestDescription' as TranslationKey)}
            selected={joinMode === 'request'}
            onPress={() =>
              setValue('joinMode', 'request', { shouldValidate: true, shouldDirty: true })
            }
            colors={colors}
          />
        </View>
      </View>

      {/* Opponent Preferences Section Header */}
      <View style={styles.sectionHeader}>
        <Text size="base" weight="bold" color={colors.text}>
          {t('matchCreation.fields.opponentPreferences' as TranslationKey)}
        </Text>
        <Text size="xs" color={colors.textMuted}>
          {t('matchCreation.fields.opponentPreferencesDescription' as TranslationKey)}
        </Text>
      </View>

      {/* Preferred opponent gender */}
      <View style={styles.fieldGroup}>
        <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
          {t('matchCreation.fields.preferredGender' as TranslationKey)}
        </Text>
        <View style={styles.optionsRow}>
          <OptionCard
            icon="people-outline"
            title={t('matchCreation.fields.genderAny' as TranslationKey)}
            selected={preferredOpponentGender === 'any' || !preferredOpponentGender}
            onPress={() =>
              setValue('preferredOpponentGender', 'any', {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            colors={colors}
            compact
          />
          <OptionCard
            icon="man-outline"
            title={t('matchCreation.fields.genderMale' as TranslationKey)}
            selected={preferredOpponentGender === 'male'}
            onPress={() =>
              setValue('preferredOpponentGender', 'male', {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            colors={colors}
            compact
          />
          <OptionCard
            icon="woman-outline"
            title={t('matchCreation.fields.genderFemale' as TranslationKey)}
            selected={preferredOpponentGender === 'female'}
            onPress={() =>
              setValue('preferredOpponentGender', 'female', {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            colors={colors}
            compact
          />
        </View>
      </View>

      {/* Minimum Rating Score - only show for sports with rating systems */}
      {hasRatingSystem && (
        <View style={styles.fieldGroup}>
          <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
            {t('matchCreation.fields.minRatingScore' as TranslationKey)}
          </Text>
          <Text size="xs" color={colors.textMuted} style={styles.fieldDescription}>
            {t('matchCreation.fields.minRatingScoreDescription' as TranslationKey)}
          </Text>
          {isLoadingRatings ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.buttonActive} />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ratingScrollContent}
            >
              {/* No minimum option */}
              <TouchableOpacity
                style={[
                  styles.ratingCard,
                  {
                    backgroundColor: !minRatingScoreId
                      ? `${colors.buttonActive}15`
                      : colors.buttonInactive,
                    borderColor: !minRatingScoreId ? colors.buttonActive : colors.border,
                  },
                ]}
                onPress={() => {
                  lightHaptic();
                  setValue('minRatingScoreId', undefined, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
              >
                <Text
                  size="sm"
                  weight={!minRatingScoreId ? 'bold' : 'regular'}
                  color={!minRatingScoreId ? colors.buttonActive : colors.text}
                >
                  {t('matchCreation.fields.noMinimum' as TranslationKey)}
                </Text>
              </TouchableOpacity>

              {/* Rating score options */}
              {ratingScores.map(score => {
                const isSelected = minRatingScoreId === score.id;
                const isPlayerRating = score.id === playerRatingScoreId;
                return (
                  <TouchableOpacity
                    key={score.id}
                    style={[
                      styles.ratingCard,
                      {
                        backgroundColor: isSelected
                          ? `${colors.buttonActive}15`
                          : colors.buttonInactive,
                        borderColor: isSelected ? colors.buttonActive : colors.border,
                      },
                    ]}
                    onPress={() => {
                      lightHaptic();
                      setValue('minRatingScoreId', score.id, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                  >
                    {isPlayerRating && (
                      <View
                        style={[
                          styles.yourRatingBadge,
                          {
                            backgroundColor: colors.buttonActive,
                            borderColor: colors.cardBackground,
                          },
                        ]}
                      >
                        <Ionicons name="person" size={10} color={colors.buttonTextActive} />
                      </View>
                    )}
                    <Text
                      size="base"
                      weight={isSelected ? 'bold' : 'semibold'}
                      color={isSelected ? colors.buttonActive : colors.text}
                    >
                      {score.label}
                    </Text>
                    {score.skillLevel && (
                      <Text
                        size="xs"
                        color={isSelected ? colors.buttonActive : colors.textMuted}
                        style={styles.ratingSkillLevel}
                      >
                        {score.skillLevel.charAt(0).toUpperCase() + score.skillLevel.slice(1, 3)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Notes */}
      <View ref={notesFieldRef} style={styles.fieldGroup}>
        <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
          {t('matchCreation.fields.notes' as TranslationKey)}
        </Text>
        <BottomSheetTextInput
          style={[
            styles.notesInput,
            {
              borderColor: colors.border,
              backgroundColor: colors.buttonInactive,
              color: colors.text,
            },
          ]}
          value={notes ?? ''}
          onChangeText={text => setValue('notes', text, { shouldDirty: true })}
          placeholder={t('matchCreation.fields.notesPlaceholder' as TranslationKey)}
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
          onFocus={() => {
            // Scroll to notes field when focused to ensure it's visible above keyboard
            // Use a delay to allow keyboard animation to start
            setTimeout(() => {
              notesFieldRef.current?.measureLayout(
                scrollViewRef.current as unknown as number,
                (x: number, y: number, _width: number, _height: number) => {
                  // Scroll to show the field with extra padding above it (200px)
                  scrollViewRef.current?.scrollTo({
                    y: Math.max(0, y - 200),
                    animated: true,
                  });
                },
                () => {
                  // Fallback: scroll to end if measure fails
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }
              );
            }, 300);
          }}
        />
        <Text size="xs" color={colors.textMuted} style={styles.characterCount}>
          {notes?.length ?? 0}/500
        </Text>
      </View>
    </ScrollView>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacingPixels[4],
    paddingBottom: spacingPixels[32], // Extra padding to allow scrolling above keyboard for notes field
  },
  stepHeader: {
    marginBottom: spacingPixels[6],
  },
  fieldGroup: {
    marginBottom: spacingPixels[5],
  },
  label: {
    marginBottom: spacingPixels[2],
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
  },
  toggleTextContainer: {
    flex: 1,
  },
  optionsColumn: {
    gap: spacingPixels[2],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacingPixels[3],
  },
  optionTextContainer: {
    flex: 1,
  },
  optionCardCompact: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingPixels[3],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    flex: 1,
    minHeight: 70,
  },
  optionContentCompact: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacingPixels[1],
  },
  compactTitle: {
    textAlign: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacingPixels[2],
  },
  sectionHeader: {
    marginTop: spacingPixels[4],
    marginBottom: spacingPixels[4],
    paddingTop: spacingPixels[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  costInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    gap: spacingPixels[2],
  },
  costInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    padding: 0,
  },
  notesInput: {
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 100,
  },
  characterCount: {
    textAlign: 'right',
    marginTop: spacingPixels[1],
  },
  // Rating picker styles
  fieldDescription: {
    marginBottom: spacingPixels[3],
  },
  loadingContainer: {
    padding: spacingPixels[4],
    alignItems: 'center',
  },
  ratingScrollContent: {
    gap: spacingPixels[2],
    paddingRight: spacingPixels[2],
    paddingTop: spacingPixels[3],
  },
  ratingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[3],
    paddingHorizontal: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    minWidth: 60,
  },
  ratingSkillLevel: {
    marginTop: spacingPixels[0.5],
  },
  yourRatingBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});

export default PreferencesStep;
