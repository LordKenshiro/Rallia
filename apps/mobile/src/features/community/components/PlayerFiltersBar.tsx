/**
 * PlayerFiltersBar Component
 * A horizontally scrollable row of filter chips for player filtering.
 * Follows the same pattern as SportSelector with compact toggle chips and dropdown modals.
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Text } from '@rallia/shared-components';
import { useTheme } from '@rallia/shared-hooks';
import { useThemeStyles } from '../../../hooks';
import {
  spacingPixels,
  radiusPixels,
  primary,
  neutral,
  secondary,
  duration,
  lightTheme,
  darkTheme,
} from '@rallia/design-system';
import { Ionicons } from '@expo/vector-icons';
import { lightHaptic, selectionHaptic } from '../../../utils/haptics';

// =============================================================================
// TYPES
// =============================================================================

export type GenderFilter = 'all' | 'male' | 'female' | 'other';
export type AvailabilityFilter = 'all' | 'morning' | 'afternoon' | 'evening';
export type PlayStyleFilter = 'all' | 'counterpuncher' | 'aggressive_baseliner' | 'serve_and_volley' | 'all_court';

// NTRP values for Tennis (1.0 to 7.0 in 0.5 increments)
export type NtrpFilter = 'all' | '1.0' | '1.5' | '2.0' | '2.5' | '3.0' | '3.5' | '4.0' | '4.5' | '5.0' | '5.5' | '6.0' | '6.5' | '7.0';

// DUPR values for Pickleball (2.0 to 8.0 in 0.5 increments)
export type DuprFilter = 'all' | '2.0' | '2.5' | '3.0' | '3.5' | '4.0' | '4.5' | '5.0' | '5.5' | '6.0' | '6.5' | '7.0' | '7.5' | '8.0';

// Distance in km (5km increments up to 50km)
export type DistanceFilter = 'all' | 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50;

export interface PlayerFilters {
  favorites: boolean;
  blocked: boolean;
  gender: GenderFilter;
  skillLevel: NtrpFilter | DuprFilter;
  maxDistance: DistanceFilter;
  availability: AvailabilityFilter;
  playStyle: PlayStyleFilter;
}

export const DEFAULT_PLAYER_FILTERS: PlayerFilters = {
  favorites: false,
  blocked: false,
  gender: 'all',
  skillLevel: 'all',
  maxDistance: 'all',
  availability: 'all',
  playStyle: 'all',
};

// =============================================================================
// FILTER OPTIONS
// =============================================================================

const GENDER_OPTIONS: GenderFilter[] = ['all', 'male', 'female', 'other'];
const AVAILABILITY_OPTIONS: AvailabilityFilter[] = ['all', 'morning', 'afternoon', 'evening'];
const PLAY_STYLE_OPTIONS: PlayStyleFilter[] = ['all', 'counterpuncher', 'aggressive_baseliner', 'serve_and_volley', 'all_court'];
const NTRP_OPTIONS: NtrpFilter[] = ['all', '1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0'];
const DUPR_OPTIONS: DuprFilter[] = ['all', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0'];
const DISTANCE_OPTIONS: DistanceFilter[] = ['all', 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

// Labels
const GENDER_LABELS: Record<GenderFilter, string> = {
  all: 'All',
  male: 'Men',
  female: 'Women',
  other: 'Other',
};

const AVAILABILITY_LABELS: Record<AvailabilityFilter, string> = {
  all: 'All',
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

const PLAY_STYLE_LABELS: Record<PlayStyleFilter, string> = {
  all: 'All',
  counterpuncher: 'Counterpuncher',
  aggressive_baseliner: 'Aggressive',
  serve_and_volley: 'Serve & Volley',
  all_court: 'All Court',
};

// =============================================================================
// FILTER CHIP COMPONENT (SportSelector style)
// =============================================================================

interface FilterChipProps {
  label: string;
  value: string;
  isActive: boolean;
  onPress: () => void;
  isDark: boolean;
  hasDropdown?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

function FilterChip({
  label,
  value,
  isActive,
  onPress,
  isDark,
  hasDropdown = true,
  icon,
}: FilterChipProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const bgColor = isActive ? primary[500] : isDark ? neutral[800] : neutral[100];
  const borderColor = isActive ? primary[400] : isDark ? neutral[700] : neutral[200];
  const textColor = isActive ? '#ffffff' : isDark ? neutral[300] : neutral[600];

  const handlePress = () => {
    lightHaptic();
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.chip,
          {
            backgroundColor: bgColor,
            borderColor: borderColor,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        {icon && (
          <Ionicons name={icon} size={14} color={textColor} style={styles.chipIcon} />
        )}
        <Text size="xs" weight={isActive ? 'semibold' : 'medium'} color={textColor}>
          {value === 'all' ? label : value}
        </Text>
        {hasDropdown && (
          <Ionicons
            name="chevron-down"
            size={12}
            color={textColor}
            style={styles.chipChevron}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// =============================================================================
// DROPDOWN MODAL COMPONENT (SportSelector style)
// =============================================================================

interface FilterDropdownProps<T extends string | number> {
  visible: boolean;
  title: string;
  options: T[];
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  isDark: boolean;
  getLabel: (value: T) => string;
}

function FilterDropdown<T extends string | number>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  isDark,
  getLabel,
}: FilterDropdownProps<T>) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const themeColors = isDark ? darkTheme : lightTheme;
  const colors = {
    dropdownBg: themeColors.card,
    dropdownBorder: themeColors.border,
    itemText: themeColors.foreground,
    itemTextSelected: primary[500],
    itemBg: 'transparent',
    itemBgSelected: isDark ? `${primary[500]}20` : `${primary[500]}10`,
    itemBorder: themeColors.border,
    overlayBg: 'rgba(0, 0, 0, 0.5)',
    checkmark: primary[500],
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: duration.fast,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, scaleAnim]);

  const handleSelect = (value: T) => {
    selectionHaptic();
    onSelect(value);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[
            styles.overlayBackground,
            {
              opacity: fadeAnim,
              backgroundColor: colors.overlayBg,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dropdownContainer,
            {
              backgroundColor: colors.dropdownBg,
              borderColor: colors.dropdownBorder,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.dropdownHeader, { borderBottomColor: colors.itemBorder }]}>
            <Text size="base" weight="semibold" color={themeColors.foreground}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={themeColors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Options list */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces={options.length > 6}
          >
            {options.map((option, index) => {
              const isSelected = selectedValue === option;
              const isLast = index === options.length - 1;

              return (
                <TouchableOpacity
                  key={String(option)}
                  style={[
                    styles.dropdownItem,
                    {
                      backgroundColor: isSelected ? colors.itemBgSelected : colors.itemBg,
                      borderBottomColor: isLast ? 'transparent' : colors.itemBorder,
                    },
                  ]}
                  onPress={() => handleSelect(option)}
                  activeOpacity={0.7}
                >
                  <Text
                    size="base"
                    weight={isSelected ? 'semibold' : 'regular'}
                    color={isSelected ? colors.itemTextSelected : colors.itemText}
                  >
                    {getLabel(option)}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.checkmark} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface PlayerFiltersBarProps {
  filters: PlayerFilters;
  sportName?: string; // 'Tennis' or 'Pickleball' to determine rating system
  maxTravelDistance?: number; // User's max travel distance preference (from onboarding)
  onFiltersChange: (filters: PlayerFilters) => void;
  onReset?: () => void;
}

export function PlayerFiltersBar({
  filters,
  sportName = 'Tennis',
  maxTravelDistance = 50,
  onFiltersChange,
  onReset,
}: PlayerFiltersBarProps) {
  const { theme } = useTheme();
  const { colors } = useThemeStyles();
  const isDark = theme === 'dark';

  // Dropdown visibility states
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [showDistanceDropdown, setShowDistanceDropdown] = useState(false);
  const [showAvailabilityDropdown, setShowAvailabilityDropdown] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);

  // Determine which skill options to use based on sport
  const isTennis = sportName?.toLowerCase().includes('tennis');
  const skillOptions = isTennis ? NTRP_OPTIONS : DUPR_OPTIONS;
  const skillLabel = isTennis ? 'NTRP' : 'DUPR';

  // Distance options - show all options (5km to 50km in 5km increments)
  // Users can filter to see players willing to travel at least X km
  const availableDistanceOptions = DISTANCE_OPTIONS;

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.favorites ||
      filters.blocked ||
      filters.gender !== 'all' ||
      filters.skillLevel !== 'all' ||
      filters.maxDistance !== 'all' ||
      filters.availability !== 'all' ||
      filters.playStyle !== 'all'
    );
  }, [filters]);

  // Handlers
  const handleFavoritesToggle = useCallback(() => {
    selectionHaptic();
    // Turn off blocked filter when enabling favorites
    onFiltersChange({ ...filters, favorites: !filters.favorites, blocked: filters.favorites ? filters.blocked : false });
  }, [filters, onFiltersChange]);

  const handleBlockedToggle = useCallback(() => {
    selectionHaptic();
    // Turn off favorites filter when enabling blocked
    onFiltersChange({ ...filters, blocked: !filters.blocked, favorites: filters.blocked ? filters.favorites : false });
  }, [filters, onFiltersChange]);

  const handleGenderChange = useCallback((value: GenderFilter) => {
    onFiltersChange({ ...filters, gender: value });
  }, [filters, onFiltersChange]);

  const handleSkillChange = useCallback((value: NtrpFilter | DuprFilter) => {
    onFiltersChange({ ...filters, skillLevel: value });
  }, [filters, onFiltersChange]);

  const handleDistanceChange = useCallback((value: DistanceFilter) => {
    onFiltersChange({ ...filters, maxDistance: value });
  }, [filters, onFiltersChange]);

  const handleAvailabilityChange = useCallback((value: AvailabilityFilter) => {
    onFiltersChange({ ...filters, availability: value });
  }, [filters, onFiltersChange]);

  const handleStyleChange = useCallback((value: PlayStyleFilter) => {
    onFiltersChange({ ...filters, playStyle: value });
  }, [filters, onFiltersChange]);

  const handleReset = useCallback(() => {
    lightHaptic();
    onReset?.();
  }, [onReset]);

  // Label getters
  const getGenderLabel = (v: GenderFilter) => GENDER_LABELS[v];
  const getSkillLabel = (v: string) => v === 'all' ? 'All' : `${v}+`;
  const getDistanceLabel = (v: DistanceFilter) => v === 'all' ? 'All' : `${v} km`;
  const getAvailabilityLabel = (v: AvailabilityFilter) => AVAILABILITY_LABELS[v];
  const getStyleLabel = (v: PlayStyleFilter) => PLAY_STYLE_LABELS[v];

  // Display values for chips
  const genderDisplay = filters.gender === 'all' ? 'Gender' : GENDER_LABELS[filters.gender];
  const skillDisplay = filters.skillLevel === 'all' ? skillLabel : `${filters.skillLevel}+`;
  const distanceDisplay = filters.maxDistance === 'all' ? 'Distance' : `${filters.maxDistance} km`;
  const availabilityDisplay = filters.availability === 'all' ? 'Time' : AVAILABILITY_LABELS[filters.availability];
  const styleDisplay = filters.playStyle === 'all' ? 'Style' : PLAY_STYLE_LABELS[filters.playStyle];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Favorites Toggle */}
        <FilterChip
          label="Favorites"
          value={filters.favorites ? 'Favorites' : 'Favorites'}
          isActive={filters.favorites}
          onPress={handleFavoritesToggle}
          isDark={isDark}
          hasDropdown={false}
          icon={filters.favorites ? 'heart' : 'heart-outline'}
        />

        {/* Blocked Toggle */}
        <FilterChip
          label="Blocked"
          value={filters.blocked ? 'Blocked' : 'Blocked'}
          isActive={filters.blocked}
          onPress={handleBlockedToggle}
          isDark={isDark}
          hasDropdown={false}
          icon={filters.blocked ? 'ban' : 'ban-outline'}
        />

        {/* Gender Filter */}
        <FilterChip
          label="Gender"
          value={genderDisplay}
          isActive={filters.gender !== 'all'}
          onPress={() => setShowGenderDropdown(true)}
          isDark={isDark}
        />

        {/* Skill Level Filter (NTRP/DUPR) */}
        <FilterChip
          label={skillLabel}
          value={skillDisplay}
          isActive={filters.skillLevel !== 'all'}
          onPress={() => setShowSkillDropdown(true)}
          isDark={isDark}
        />

        {/* Distance Filter */}
        <FilterChip
          label="Distance"
          value={distanceDisplay}
          isActive={filters.maxDistance !== 'all'}
          onPress={() => setShowDistanceDropdown(true)}
          isDark={isDark}
        />

        {/* Availability Filter */}
        <FilterChip
          label="Time"
          value={availabilityDisplay}
          isActive={filters.availability !== 'all'}
          onPress={() => setShowAvailabilityDropdown(true)}
          isDark={isDark}
          icon={
            filters.availability === 'morning' ? 'sunny-outline' :
            filters.availability === 'afternoon' ? 'partly-sunny-outline' :
            filters.availability === 'evening' ? 'moon-outline' : undefined
          }
        />

        {/* Play Style Filter */}
        <FilterChip
          label="Style"
          value={styleDisplay}
          isActive={filters.playStyle !== 'all'}
          onPress={() => setShowStyleDropdown(true)}
          isDark={isDark}
        />

        {/* Reset Button - only show when filters are active */}
        {hasActiveFilters && onReset && (
          <TouchableOpacity
            style={[
              styles.resetChip,
              {
                backgroundColor: isDark ? secondary[900] + '40' : secondary[50],
                borderColor: isDark ? secondary[700] : secondary[200],
              },
            ]}
            onPress={handleReset}
            activeOpacity={0.85}
          >
            <Ionicons
              name="close-circle"
              size={14}
              color={isDark ? secondary[400] : secondary[600]}
            />
            <Text size="xs" weight="semibold" color={isDark ? secondary[400] : secondary[600]}>
              Reset
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Dropdown Modals */}
      <FilterDropdown
        visible={showGenderDropdown}
        title="Select Gender"
        options={GENDER_OPTIONS}
        selectedValue={filters.gender}
        onSelect={handleGenderChange}
        onClose={() => setShowGenderDropdown(false)}
        isDark={isDark}
        getLabel={getGenderLabel}
      />

      <FilterDropdown
        visible={showSkillDropdown}
        title={`Select ${skillLabel} Level`}
        options={skillOptions as (NtrpFilter | DuprFilter)[]}
        selectedValue={filters.skillLevel}
        onSelect={handleSkillChange}
        onClose={() => setShowSkillDropdown(false)}
        isDark={isDark}
        getLabel={getSkillLabel}
      />

      <FilterDropdown
        visible={showDistanceDropdown}
        title="Select Max Distance"
        options={availableDistanceOptions}
        selectedValue={filters.maxDistance}
        onSelect={handleDistanceChange}
        onClose={() => setShowDistanceDropdown(false)}
        isDark={isDark}
        getLabel={getDistanceLabel}
      />

      <FilterDropdown
        visible={showAvailabilityDropdown}
        title="Select Availability"
        options={AVAILABILITY_OPTIONS}
        selectedValue={filters.availability}
        onSelect={handleAvailabilityChange}
        onClose={() => setShowAvailabilityDropdown(false)}
        isDark={isDark}
        getLabel={getAvailabilityLabel}
      />

      <FilterDropdown
        visible={showStyleDropdown}
        title="Select Play Style"
        options={PLAY_STYLE_OPTIONS}
        selectedValue={filters.playStyle}
        onSelect={handleStyleChange}
        onClose={() => setShowStyleDropdown(false)}
        isDark={isDark}
        getLabel={getStyleLabel}
      />
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacingPixels[2],
  },
  scrollContent: {
    paddingHorizontal: spacingPixels[4],
    gap: spacingPixels[2],
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[2],
    borderRadius: radiusPixels.full,
    borderWidth: 1,
    gap: spacingPixels[1],
  },
  chipIcon: {
    marginRight: 2,
  },
  chipChevron: {
    marginLeft: 2,
  },
  resetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[2],
    borderRadius: radiusPixels.full,
    borderWidth: 1,
    gap: spacingPixels[1],
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  dropdownContainer: {
    width: '80%',
    maxWidth: 320,
    maxHeight: '60%',
    borderRadius: radiusPixels.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderBottomWidth: 1,
  },
  scrollView: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

export default PlayerFiltersBar;
