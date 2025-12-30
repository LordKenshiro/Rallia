/**
 * MatchFiltersBar Component
 * A horizontally scrollable row of filter chips for match filtering.
 */

import React, { useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Text } from '@rallia/shared-components';
import { useTheme, DISTANCE_OPTIONS } from '@rallia/shared-hooks';
import { useThemeStyles, useTranslation } from '../../../hooks';
import type { TranslationKey } from '@rallia/shared-translations';
import { spacingPixels, radiusPixels, primary, neutral, secondary } from '@rallia/design-system';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import { selectionHaptic, lightHaptic } from '../../../utils/haptics';
import type {
  FormatFilter,
  MatchTypeFilter,
  DateRangeFilter,
  TimeOfDayFilter,
  SkillLevelFilter,
  GenderFilter,
  CostFilter,
  JoinModeFilter,
  DistanceFilter,
} from '@rallia/shared-hooks';

// Animated pressable for scale effect
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MatchFiltersBarProps {
  /** Current format filter */
  format: FormatFilter;
  /** Current match type filter */
  matchType: MatchTypeFilter;
  /** Current date range filter */
  dateRange: DateRangeFilter;
  /** Current time of day filter */
  timeOfDay: TimeOfDayFilter;
  /** Current skill level filter */
  skillLevel: SkillLevelFilter;
  /** Current gender filter */
  gender: GenderFilter;
  /** Current cost filter */
  cost: CostFilter;
  /** Current join mode filter */
  joinMode: JoinModeFilter;
  /** Current distance filter */
  distance: DistanceFilter;
  /** Called when format changes */
  onFormatChange: (format: FormatFilter) => void;
  /** Called when match type changes */
  onMatchTypeChange: (matchType: MatchTypeFilter) => void;
  /** Called when date range changes */
  onDateRangeChange: (dateRange: DateRangeFilter) => void;
  /** Called when time of day changes */
  onTimeOfDayChange: (timeOfDay: TimeOfDayFilter) => void;
  /** Called when skill level changes */
  onSkillLevelChange: (skillLevel: SkillLevelFilter) => void;
  /** Called when gender changes */
  onGenderChange: (gender: GenderFilter) => void;
  /** Called when cost changes */
  onCostChange: (cost: CostFilter) => void;
  /** Called when join mode changes */
  onJoinModeChange: (joinMode: JoinModeFilter) => void;
  /** Called when distance changes */
  onDistanceChange: (distance: DistanceFilter) => void;
  /** Called when reset button is pressed */
  onReset?: () => void;
  /** Whether any filter is active */
  hasActiveFilters?: boolean;
}

// Filter option definitions
const FORMAT_OPTIONS: FormatFilter[] = ['all', 'singles', 'doubles'];
const MATCH_TYPE_OPTIONS: MatchTypeFilter[] = ['all', 'practice', 'competitive'];
const DATE_RANGE_OPTIONS: DateRangeFilter[] = ['all', 'today', 'week', 'weekend'];
const TIME_OF_DAY_OPTIONS: TimeOfDayFilter[] = ['all', 'morning', 'afternoon', 'evening'];
const SKILL_LEVEL_OPTIONS: SkillLevelFilter[] = ['all', 'beginner', 'intermediate', 'advanced'];
const GENDER_OPTIONS: GenderFilter[] = ['all', 'male', 'female'];
const COST_OPTIONS: CostFilter[] = ['all', 'free', 'paid'];
const JOIN_MODE_OPTIONS: JoinModeFilter[] = ['all', 'direct', 'request'];

// Icon mappings for specific filters
const TIME_OF_DAY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  morning: 'sunny-outline',
  afternoon: 'partly-sunny-outline',
  evening: 'moon-outline',
};

const COST_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  free: 'checkmark-circle-outline',
  paid: 'cash-outline',
};

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  isDark: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
}

function FilterChip({
  label,
  isActive,
  onPress,
  isDark,
  icon,
  accessibilityLabel,
}: FilterChipProps) {
  const scale = useSharedValue(1);
  const activeBackground = isDark ? primary[600] : primary[500];
  const inactiveBackground = isDark ? neutral[800] : neutral[100];
  const activeBorder = isDark ? primary[500] : primary[400];
  const inactiveBorder = isDark ? neutral[700] : neutral[200];
  const textColor = isActive ? '#ffffff' : isDark ? neutral[300] : neutral[600];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    selectionHaptic(); // Immediate haptic feedback on touch
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.chip,
        {
          backgroundColor: isActive ? activeBackground : inactiveBackground,
          borderColor: isActive ? activeBorder : inactiveBorder,
        },
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ selected: isActive }}
    >
      {icon && <Ionicons name={icon} size={14} color={textColor} style={styles.chipIcon} />}
      <Text size="sm" weight={isActive ? 'semibold' : 'medium'} color={textColor}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

interface FilterGroupProps {
  title?: string;
  children: React.ReactNode;
  isDark: boolean;
  /** Whether this filter group has a non-default selection */
  hasActiveSelection?: boolean;
}

function FilterGroup({ title, children, isDark, hasActiveSelection = false }: FilterGroupProps) {
  return (
    <Animated.View style={styles.filterGroup} layout={Layout.springify()}>
      <View style={styles.filterGroupTitleContainer}>
        <Text
          size="xs"
          weight="medium"
          color={
            hasActiveSelection
              ? isDark
                ? primary[400]
                : primary[600]
              : isDark
                ? neutral[500]
                : neutral[500]
          }
          style={styles.filterGroupTitle}
        >
          {title || '\u00A0'}
        </Text>
        {hasActiveSelection && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[
              styles.activeIndicator,
              { backgroundColor: isDark ? primary[400] : primary[500] },
            ]}
          />
        )}
      </View>
      <View style={styles.filterGroupChips}>{children}</View>
    </Animated.View>
  );
}

export function MatchFiltersBar({
  format,
  matchType,
  dateRange,
  timeOfDay,
  skillLevel,
  gender,
  cost,
  joinMode,
  distance,
  onFormatChange,
  onMatchTypeChange,
  onDateRangeChange,
  onTimeOfDayChange,
  onSkillLevelChange,
  onGenderChange,
  onCostChange,
  onJoinModeChange,
  onDistanceChange,
  onReset,
  hasActiveFilters = false,
}: MatchFiltersBarProps) {
  const { theme } = useTheme();
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  // Translation helper
  const getFilterLabel = (type: string, value: string): string => {
    return t(`publicMatches.filters.${type}.${value}` as TranslationKey);
  };

  // Count active filters (non-default selections)
  // Distance default is 'all' (no distance filter)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (format !== 'all') count++;
    if (matchType !== 'all') count++;
    if (dateRange !== 'all') count++;
    if (timeOfDay !== 'all') count++;
    if (skillLevel !== 'all') count++;
    if (gender !== 'all') count++;
    if (cost !== 'all') count++;
    if (joinMode !== 'all') count++;
    if (distance !== 'all') count++;
    return count;
  }, [format, matchType, dateRange, timeOfDay, skillLevel, gender, cost, joinMode, distance]);

  // Helper to get distance label
  const getDistanceLabel = (option: DistanceFilter): string => {
    if (option === 'all') {
      return t('publicMatches.filters.distance.all' as TranslationKey);
    }
    return `${option} km`;
  };

  // Handle reset with haptic feedback
  const handleReset = useCallback(() => {
    lightHaptic();
    onReset?.();
  }, [onReset]);

  // Gradient colors for fade effect - subtle fade to indicate scrollable content
  const gradientColors = useMemo(() => {
    const bg = colors.background;
    // Very subtle gradient: transparent -> 40% opacity -> 80% opacity -> full opacity
    // Creates a gentle fade that's noticeable but not distracting
    return [bg + '00', bg + '66', bg + 'CC', bg] as const;
  }, [colors.background]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Reset Button - Enhanced with icon and count */}
        {hasActiveFilters && onReset && (
          <FilterGroup title="" isDark={isDark}>
            <AnimatedPressable
              onPress={handleReset}
              style={[
                styles.resetButton,
                {
                  backgroundColor: isDark ? secondary[900] + '40' : secondary[50],
                  borderColor: isDark ? secondary[700] : secondary[200],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('publicMatches.filters.reset' as TranslationKey)}
              accessibilityHint="Clears all active filters"
            >
              <Ionicons
                name="close-circle"
                size={16}
                color={isDark ? secondary[400] : secondary[600]}
              />
              <Text size="sm" weight="semibold" color={isDark ? secondary[400] : secondary[600]}>
                {t('publicMatches.filters.reset' as TranslationKey)}
              </Text>
              {activeFilterCount > 0 && (
                <View
                  style={[
                    styles.filterCountBadge,
                    { backgroundColor: isDark ? secondary[600] : secondary[500] },
                  ]}
                >
                  <Text size="xs" weight="bold" color="#ffffff" style={styles.badgeText}>
                    {activeFilterCount}
                  </Text>
                </View>
              )}
            </AnimatedPressable>
          </FilterGroup>
        )}

        {/* Distance Filter - First for prominence */}
        <FilterGroup
          title={t('publicMatches.filters.distance.label' as TranslationKey)}
          isDark={isDark}
          hasActiveSelection={distance !== 'all'}
        >
          {DISTANCE_OPTIONS.map(option => (
            <FilterChip
              key={String(option)}
              label={getDistanceLabel(option)}
              isActive={distance === option}
              onPress={() => onDistanceChange(option)}
              isDark={isDark}
              accessibilityLabel={
                option === 'all'
                  ? t('publicMatches.filters.distance.all' as TranslationKey)
                  : `Distance ${option} kilometers`
              }
            />
          ))}
        </FilterGroup>

        {/* Date Range Filter */}
        <FilterGroup
          title={t('publicMatches.filters.dateRange.label' as TranslationKey)}
          isDark={isDark}
          hasActiveSelection={dateRange !== 'all'}
        >
          {DATE_RANGE_OPTIONS.map(option => (
            <FilterChip
              key={option}
              label={getFilterLabel('dateRange', option)}
              isActive={dateRange === option}
              onPress={() => onDateRangeChange(option)}
              isDark={isDark}
            />
          ))}
        </FilterGroup>

        {/* Time of Day Filter - With icons */}
        <FilterGroup
          title={t('publicMatches.filters.timeOfDay.label' as TranslationKey)}
          isDark={isDark}
          hasActiveSelection={timeOfDay !== 'all'}
        >
          {TIME_OF_DAY_OPTIONS.map(option => (
            <FilterChip
              key={option}
              label={getFilterLabel('timeOfDay', option)}
              isActive={timeOfDay === option}
              onPress={() => onTimeOfDayChange(option)}
              isDark={isDark}
              icon={TIME_OF_DAY_ICONS[option]}
            />
          ))}
        </FilterGroup>

        {/* Format Filter */}
        <FilterGroup
          title={t('publicMatches.filters.format.label' as TranslationKey)}
          isDark={isDark}
          hasActiveSelection={format !== 'all'}
        >
          {FORMAT_OPTIONS.map(option => (
            <FilterChip
              key={option}
              label={getFilterLabel('format', option)}
              isActive={format === option}
              onPress={() => onFormatChange(option)}
              isDark={isDark}
            />
          ))}
        </FilterGroup>

        {/* Match Type Filter */}
        <FilterGroup
          title={t('publicMatches.filters.matchType.label' as TranslationKey)}
          isDark={isDark}
          hasActiveSelection={matchType !== 'all'}
        >
          {MATCH_TYPE_OPTIONS.map(option => (
            <FilterChip
              key={option}
              label={getFilterLabel('matchType', option)}
              isActive={matchType === option}
              onPress={() => onMatchTypeChange(option)}
              isDark={isDark}
            />
          ))}
        </FilterGroup>

        {/* Skill Level Filter */}
        <FilterGroup
          title={t('publicMatches.filters.skillLevel.label' as TranslationKey)}
          isDark={isDark}
          hasActiveSelection={skillLevel !== 'all'}
        >
          {SKILL_LEVEL_OPTIONS.map(option => (
            <FilterChip
              key={option}
              label={getFilterLabel('skillLevel', option)}
              isActive={skillLevel === option}
              onPress={() => onSkillLevelChange(option)}
              isDark={isDark}
            />
          ))}
        </FilterGroup>

        {/* Gender Filter */}
        <FilterGroup
          title={t('publicMatches.filters.gender.label' as TranslationKey)}
          isDark={isDark}
          hasActiveSelection={gender !== 'all'}
        >
          {GENDER_OPTIONS.map(option => (
            <FilterChip
              key={option}
              label={getFilterLabel('gender', option)}
              isActive={gender === option}
              onPress={() => onGenderChange(option)}
              isDark={isDark}
            />
          ))}
        </FilterGroup>

        {/* Cost Filter - With icons */}
        <FilterGroup
          title={t('publicMatches.filters.cost.label' as TranslationKey)}
          isDark={isDark}
          hasActiveSelection={cost !== 'all'}
        >
          {COST_OPTIONS.map(option => (
            <FilterChip
              key={option}
              label={getFilterLabel('cost', option)}
              isActive={cost === option}
              onPress={() => onCostChange(option)}
              isDark={isDark}
              icon={COST_ICONS[option]}
            />
          ))}
        </FilterGroup>

        {/* Join Mode Filter */}
        <FilterGroup
          title={t('publicMatches.filters.joinMode.label' as TranslationKey)}
          isDark={isDark}
          hasActiveSelection={joinMode !== 'all'}
        >
          {JOIN_MODE_OPTIONS.map(option => (
            <FilterChip
              key={option}
              label={getFilterLabel('joinMode', option)}
              isActive={joinMode === option}
              onPress={() => onJoinModeChange(option)}
              isDark={isDark}
            />
          ))}
        </FilterGroup>
      </ScrollView>

      {/* Right edge fade gradient */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fadeGradient}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacingPixels[2],
    position: 'relative',
  },
  scrollContent: {
    paddingHorizontal: spacingPixels[4],
    paddingRight: spacingPixels[12], // Extra padding for fade gradient
    gap: spacingPixels[4],
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  filterGroup: {
    gap: spacingPixels[1.5],
  },
  filterGroupTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[1.5],
  },
  filterGroupTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterGroupChips: {
    flexDirection: 'row',
    gap: spacingPixels[1.5],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[1.5],
    borderRadius: radiusPixels.full,
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: spacingPixels[1],
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[1.5],
    borderRadius: radiusPixels.full,
    borderWidth: 1,
    gap: spacingPixels[1.5],
  },
  filterCountBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacingPixels[1],
    marginLeft: spacingPixels[0.5],
  },
  badgeText: {
    textAlign: 'center',
    lineHeight: 14,
    includeFontPadding: false,
  },
  fadeGradient: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 32, // Reduced width for more subtle effect
  },
});

export default MatchFiltersBar;
