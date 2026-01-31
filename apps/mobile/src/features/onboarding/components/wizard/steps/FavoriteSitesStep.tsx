/**
 * FavoriteSitesStep Component
 *
 * Onboarding step to select up to 3 favorite facilities/sites.
 * Uses useFacilitySearch hook for searching facilities by name and location.
 * Placed after PreferencesStep and before AvailabilitiesStep.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { lightHaptic, selectionHaptic, successHaptic, warningHaptic } from '@rallia/shared-utils';
import { useFacilitySearch } from '@rallia/shared-hooks';
import type { FacilitySearchResult } from '@rallia/shared-types';
import type { TranslationKey } from '@rallia/shared-translations';
import type { OnboardingFormData } from '../../../hooks/useOnboardingWizard';
import { useUserLocation } from '../../../../../hooks/useUserLocation';

// =============================================================================
// TYPES
// =============================================================================

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
}

interface FavoriteSitesStepProps {
  formData: OnboardingFormData;
  onUpdateFormData: (updates: Partial<OnboardingFormData>) => void;
  colors: ThemeColors;
  t: (key: TranslationKey) => string;
  isDark: boolean;
  /** Sport ID for filtering facilities (uses first selected sport) */
  sportId: string | undefined;
  /** User's latitude for distance calculation */
  latitude: number | null;
  /** User's longitude for distance calculation */
  longitude: number | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_FAVORITES = 3;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format distance in meters to human-readable string
 */
function formatDistance(meters: number | null): string {
  if (meters === null) return '';
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface FacilityCardProps {
  facility: FacilitySearchResult;
  isSelected: boolean;
  onPress: () => void;
  colors: ThemeColors;
}

const FacilityCard: React.FC<FacilityCardProps> = ({ facility, isSelected, onPress, colors }) => (
  <TouchableOpacity
    style={[
      styles.facilityCard,
      {
        backgroundColor: isSelected ? `${colors.buttonActive}15` : colors.buttonInactive,
        borderColor: isSelected ? colors.buttonActive : colors.border,
      },
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.facilityCardContent}>
      {/* Facility icon */}
      <View
        style={[
          styles.facilityIconContainer,
          { backgroundColor: isSelected ? colors.buttonActive : colors.border },
        ]}
      >
        <Ionicons
          name="business"
          size={20}
          color={isSelected ? colors.buttonTextActive : colors.textMuted}
        />
      </View>

      {/* Facility info */}
      <View style={styles.facilityInfo}>
        <Text
          size="base"
          weight={isSelected ? 'semibold' : 'medium'}
          color={isSelected ? colors.buttonActive : colors.text}
          numberOfLines={1}
        >
          {facility.name}
        </Text>
        <Text size="sm" color={colors.textMuted} numberOfLines={1}>
          {[facility.address, facility.city].filter(Boolean).join(', ')}
        </Text>
      </View>

      {/* Distance and selection indicator */}
      <View style={styles.facilityCardRight}>
        {facility.distance_meters !== null && (
          <Text size="xs" color={colors.textSecondary} style={styles.distanceText}>
            {formatDistance(facility.distance_meters)}
          </Text>
        )}
        {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.buttonActive} />}
      </View>
    </View>
  </TouchableOpacity>
);

interface SelectedFacilityBadgeProps {
  facility: FacilitySearchResult;
  onRemove: () => void;
  colors: ThemeColors;
  order: number;
}

const SelectedFacilityBadge: React.FC<SelectedFacilityBadgeProps> = ({
  facility,
  onRemove,
  colors,
  order,
}) => (
  <View
    style={[
      styles.selectedBadge,
      { backgroundColor: `${colors.buttonActive}15`, borderColor: colors.buttonActive },
    ]}
  >
    <View style={[styles.orderBadge, { backgroundColor: colors.buttonActive }]}>
      <Text size="xs" weight="bold" color={colors.buttonTextActive}>
        {order}
      </Text>
    </View>
    <Text
      size="sm"
      weight="medium"
      color={colors.text}
      numberOfLines={1}
      style={styles.selectedBadgeName}
    >
      {facility.name}
    </Text>
    <TouchableOpacity
      onPress={onRemove}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.removeBadgeButton}
    >
      <Ionicons name="close-circle" size={20} color={colors.buttonActive} />
    </TouchableOpacity>
  </View>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const FavoriteSitesStep: React.FC<FavoriteSitesStepProps> = ({
  formData,
  onUpdateFormData,
  colors,
  t,
  isDark: _isDark,
  sportId,
  latitude: propLatitude,
  longitude: propLongitude,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Get device location as fallback if props don't have coordinates
  // This handles cases where user typed city manually without using autocomplete
  const { location: deviceLocation, loading: locationLoading } = useUserLocation();

  // Use props coordinates first (from address autocomplete), fallback to device location
  const latitude = propLatitude ?? deviceLocation?.latitude ?? null;
  const longitude = propLongitude ?? deviceLocation?.longitude ?? null;

  // Use facility search hook
  const {
    facilities: searchResults,
    isLoading: facilitiesLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useFacilitySearch({
    sportId,
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
    searchQuery,
    enabled: !!sportId && latitude !== null && longitude !== null,
  });

  // Combined loading state
  const isLoading = facilitiesLoading || (locationLoading && latitude === null);

  // Get selected facilities from form data (array of FacilitySearchResult)
  // Memoize to prevent dependency changes on every render
  const selectedFacilities = useMemo(
    () => formData.favoriteFacilities || [],
    [formData.favoriteFacilities]
  );
  const selectedFacilityIds = useMemo(
    () => selectedFacilities.map(f => f.id),
    [selectedFacilities]
  );

  // Check if a facility is selected
  const isFacilitySelected = useCallback(
    (facilityId: string) => selectedFacilityIds.includes(facilityId),
    [selectedFacilityIds]
  );

  // Handle facility selection toggle
  const handleFacilityPress = useCallback(
    (facility: FacilitySearchResult) => {
      const isCurrentlySelected = isFacilitySelected(facility.id);

      if (isCurrentlySelected) {
        // Remove from selection
        lightHaptic();
        const newFacilities = selectedFacilities.filter(f => f.id !== facility.id);
        onUpdateFormData({ favoriteFacilities: newFacilities });
      } else {
        // Add to selection (if under max)
        if (selectedFacilities.length >= MAX_FAVORITES) {
          warningHaptic();
          return;
        }
        successHaptic();
        const newFacilities = [...selectedFacilities, facility];
        onUpdateFormData({ favoriteFacilities: newFacilities });
      }
    },
    [isFacilitySelected, selectedFacilities, onUpdateFormData]
  );

  // Handle removing a selected facility
  const handleRemoveFacility = useCallback(
    (facilityId: string) => {
      selectionHaptic();
      const newFacilities = selectedFacilities.filter(f => f.id !== facilityId);
      onUpdateFormData({ favoriteFacilities: newFacilities });
    },
    [selectedFacilities, onUpdateFormData]
  );

  // Filter out already selected facilities from search results
  const filteredSearchResults = useMemo(() => {
    return searchResults.filter(f => !selectedFacilityIds.includes(f.id));
  }, [searchResults, selectedFacilityIds]);

  // Handle scroll to load more
  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        layoutMeasurement: { height: number };
        contentOffset: { y: number };
        contentSize: { height: number };
      };
    }) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const paddingToBottom = 100;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

      if (isCloseToBottom && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  // Render empty state when no facilities found
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.buttonActive} />
          <Text size="sm" color={colors.textMuted} style={styles.emptyStateText}>
            {t('onboarding.favoriteSitesStep.loading' as TranslationKey)}
          </Text>
        </View>
      );
    }

    if (!sportId) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text size="sm" color={colors.textMuted} style={styles.emptyStateText}>
            {t('onboarding.favoriteSitesStep.noSportSelected' as TranslationKey)}
          </Text>
        </View>
      );
    }

    if (latitude === null || longitude === null) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={48} color={colors.textMuted} />
          <Text size="sm" color={colors.textMuted} style={styles.emptyStateText}>
            {t('onboarding.favoriteSitesStep.noLocation' as TranslationKey)}
          </Text>
        </View>
      );
    }

    if (searchQuery && filteredSearchResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text size="sm" color={colors.textMuted} style={styles.emptyStateText}>
            {t('onboarding.favoriteSitesStep.noResults' as TranslationKey)}
          </Text>
        </View>
      );
    }

    if (filteredSearchResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={48} color={colors.textMuted} />
          <Text size="sm" color={colors.textMuted} style={styles.emptyStateText}>
            {t('onboarding.favoriteSitesStep.noFacilitiesNearby' as TranslationKey)}
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <BottomSheetScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      onScroll={handleScroll}
      scrollEventThrottle={400}
    >
      {/* Title */}
      <Text size="xl" weight="bold" color={colors.text} style={styles.title}>
        {t('onboarding.favoriteSitesStep.title' as TranslationKey)}
      </Text>
      <Text size="base" color={colors.textSecondary} style={styles.subtitle}>
        {t('onboarding.favoriteSitesStep.subtitle' as TranslationKey)}
      </Text>

      {/* Optional hint - at top so users see it before scrolling */}
      <View style={styles.hintContainer}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
        <Text size="xs" color={colors.textMuted} style={styles.hintText}>
          {t('onboarding.favoriteSitesStep.hint' as TranslationKey)}
        </Text>
      </View>

      {/* Selection counter */}
      <View style={styles.counterContainer}>
        <Text
          size="sm"
          weight="semibold"
          color={selectedFacilities.length > 0 ? colors.buttonActive : colors.textMuted}
        >
          {selectedFacilities.length} / {MAX_FAVORITES}{' '}
          {t('onboarding.favoriteSitesStep.selected' as TranslationKey)}
        </Text>
      </View>

      {/* Selected facilities badges */}
      {selectedFacilities.length > 0 && (
        <View style={styles.selectedContainer}>
          {selectedFacilities.map((facility, index) => (
            <SelectedFacilityBadge
              key={facility.id}
              facility={facility}
              onRemove={() => handleRemoveFacility(facility.id)}
              colors={colors}
              order={index + 1}
            />
          ))}
        </View>
      )}

      {/* Search input */}
      <View style={styles.searchSection}>
        <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
          {t('onboarding.favoriteSitesStep.searchLabel' as TranslationKey)}
        </Text>
        <View
          style={[
            styles.searchInputContainer,
            { borderColor: colors.border, backgroundColor: colors.buttonInactive },
          ]}
        >
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <BottomSheetTextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('onboarding.favoriteSitesStep.searchPlaceholder' as TranslationKey)}
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Facility list */}
      <View style={styles.facilityListSection}>
        {filteredSearchResults.length > 0 ? (
          <>
            {filteredSearchResults.map(facility => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                isSelected={isFacilitySelected(facility.id)}
                onPress={() => handleFacilityPress(facility)}
                colors={colors}
              />
            ))}
            {isFetchingNextPage && (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.buttonActive} />
              </View>
            )}
          </>
        ) : (
          renderEmptyState()
        )}
      </View>
    </BottomSheetScrollView>
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
    paddingHorizontal: spacingPixels[4],
    paddingBottom: spacingPixels[12],
  },
  title: {
    marginTop: spacingPixels[4],
    marginBottom: spacingPixels[2],
  },
  subtitle: {
    marginBottom: spacingPixels[6],
  },
  counterContainer: {
    marginBottom: spacingPixels[4],
  },
  selectedContainer: {
    marginBottom: spacingPixels[6],
    gap: spacingPixels[2],
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingPixels[2],
    paddingHorizontal: spacingPixels[3],
    borderRadius: radiusPixels.md,
    borderWidth: 1,
  },
  orderBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingPixels[2],
  },
  selectedBadgeName: {
    flex: 1,
    marginRight: spacingPixels[2],
  },
  removeBadgeButton: {
    padding: spacingPixels[1],
  },
  searchSection: {
    marginBottom: spacingPixels[4],
  },
  label: {
    marginBottom: spacingPixels[2],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[2],
    borderRadius: radiusPixels.md,
    borderWidth: 1,
    gap: spacingPixels[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacingPixels[1],
  },
  facilityListSection: {
    minHeight: 200,
  },
  facilityCard: {
    borderRadius: radiusPixels.md,
    borderWidth: 1,
    marginBottom: spacingPixels[2],
    overflow: 'hidden',
  },
  facilityCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
  },
  facilityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radiusPixels.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingPixels[3],
  },
  facilityInfo: {
    flex: 1,
    marginRight: spacingPixels[2],
  },
  facilityCardRight: {
    alignItems: 'flex-end',
    gap: spacingPixels[1],
  },
  distanceText: {
    marginBottom: spacingPixels[1],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[10],
  },
  emptyStateText: {
    marginTop: spacingPixels[4],
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: spacingPixels[4],
    alignItems: 'center',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacingPixels[4],
    paddingHorizontal: spacingPixels[2],
    gap: spacingPixels[2],
  },
  hintText: {
    flex: 1,
    lineHeight: 18,
  },
});
