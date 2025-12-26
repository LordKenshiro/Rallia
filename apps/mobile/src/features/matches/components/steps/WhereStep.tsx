/**
 * Where Step
 *
 * Step 2 of the match creation wizard.
 * Handles location type selection and facility/custom location input.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { lightHaptic, successHaptic } from '@rallia/shared-utils';
import { useFacilitySearch } from '@rallia/shared-hooks';
import type { MatchFormSchemaData, FacilitySearchResult } from '@rallia/shared-types';
import type { TranslationKey, TranslationOptions } from '../../../../hooks/useTranslation';
import { useUserLocation } from '../../../../hooks/useUserLocation';
import { supabase } from '../../../../lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

interface WhereStepProps {
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
  t: (key: TranslationKey, options?: TranslationOptions) => string;
  isDark: boolean;
  sportId: string | undefined;
}

interface LocationTypeCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  colors: WhereStepProps['colors'];
}

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
// LOCATION TYPE CARD
// =============================================================================

const LocationTypeCard: React.FC<LocationTypeCardProps> = ({
  icon,
  title,
  description,
  selected,
  onPress,
  colors,
}) => (
  <TouchableOpacity
    style={[
      styles.locationCard,
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
    <View
      style={[
        styles.locationIconContainer,
        { backgroundColor: selected ? colors.buttonActive : colors.border },
      ]}
    >
      <Ionicons
        name={icon}
        size={24}
        color={selected ? colors.buttonTextActive : colors.textMuted}
      />
    </View>
    <View style={styles.locationTextContainer}>
      <Text
        size="base"
        weight={selected ? 'semibold' : 'regular'}
        color={selected ? colors.buttonActive : colors.text}
      >
        {title}
      </Text>
      <Text size="xs" color={colors.textMuted}>
        {description}
      </Text>
    </View>
    {selected && <Ionicons name="checkmark-circle" size={22} color={colors.buttonActive} />}
  </TouchableOpacity>
);

// =============================================================================
// FACILITY ITEM
// =============================================================================

interface FacilityItemProps {
  facility: FacilitySearchResult;
  onSelect: (facility: FacilitySearchResult) => void;
  colors: WhereStepProps['colors'];
}

const FacilityItem: React.FC<FacilityItemProps> = ({ facility, onSelect, colors }) => (
  <TouchableOpacity
    style={[
      styles.facilityItem,
      { backgroundColor: colors.buttonInactive, borderColor: colors.border },
    ]}
    onPress={() => {
      lightHaptic();
      onSelect(facility);
    }}
    activeOpacity={0.7}
  >
    <View style={styles.facilityItemContent}>
      <Text size="base" weight="medium" color={colors.text} numberOfLines={1}>
        {facility.name}
      </Text>
      <Text size="sm" color={colors.textMuted} numberOfLines={1}>
        {[facility.address, facility.city].filter(Boolean).join(', ')}
      </Text>
    </View>
    {facility.distance_meters !== null && (
      <View style={styles.distanceBadge}>
        <Text size="xs" color={colors.textSecondary}>
          {formatDistance(facility.distance_meters)}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

// =============================================================================
// SELECTED FACILITY DISPLAY
// =============================================================================

interface SelectedFacilityProps {
  facility: FacilitySearchResult;
  onClear: () => void;
  colors: WhereStepProps['colors'];
}

const SelectedFacility: React.FC<SelectedFacilityProps> = ({ facility, onClear, colors }) => (
  <View
    style={[
      styles.selectedFacility,
      { backgroundColor: `${colors.buttonActive}15`, borderColor: colors.buttonActive },
    ]}
  >
    <View style={styles.selectedFacilityContent}>
      <Ionicons name="business" size={20} color={colors.buttonActive} />
      <View style={styles.selectedFacilityText}>
        <Text size="base" weight="semibold" color={colors.text}>
          {facility.name}
        </Text>
        <Text size="sm" color={colors.textMuted} numberOfLines={1}>
          {[facility.address, facility.city].filter(Boolean).join(', ')}
        </Text>
      </View>
    </View>
    <TouchableOpacity
      onPress={() => {
        lightHaptic();
        onClear();
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="close-circle" size={24} color={colors.textMuted} />
    </TouchableOpacity>
  </View>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const WhereStep: React.FC<WhereStepProps> = ({ form, colors, t, isDark, sportId }) => {
  const {
    setValue,
    control,
    formState: { errors },
  } = form;

  // Use useWatch for reliable reactivity when form values change from parent components
  const locationType = useWatch({ control, name: 'locationType' });
  const locationName = useWatch({ control, name: 'locationName' });
  const locationAddress = useWatch({ control, name: 'locationAddress' });
  const facilityId = useWatch({ control, name: 'facilityId' });

  // Local state for search and selected facility
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<FacilitySearchResult | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const addressFieldRef = useRef<View>(null);

  // Track which facility ID we've already fetched to avoid duplicate fetches
  const fetchedFacilityIdRef = useRef<string | null>(null);

  // Reset state when sportId changes (when switching sports)
  useEffect(() => {
    setSelectedFacility(null);
    fetchedFacilityIdRef.current = null;
    setSearchQuery('');
  }, [sportId]);

  // Get user location
  const { location, loading: locationLoading, error: locationError } = useUserLocation();

  // Facility search hook
  // Enable search if we need to find a facility from draft (facilityId exists but selectedFacility is null)
  const needsToFindFacility = locationType === 'facility' && !!facilityId && !selectedFacility;
  const {
    facilities,
    isLoading: facilitiesLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: facilitiesError,
  } = useFacilitySearch({
    sportId,
    latitude: location?.latitude,
    longitude: location?.longitude,
    searchQuery,
    enabled: locationType === 'facility' && (!selectedFacility || needsToFindFacility),
  });

  // Sync selectedFacility with form's facilityId when resuming a draft or when preferred facility is set
  useEffect(() => {
    // Skip if no facilityId or already have the correct facility selected
    if (!facilityId || (selectedFacility && selectedFacility.id === facilityId)) {
      return;
    }

    // First, try to find the facility in the loaded facilities list
    if (facilities.length > 0) {
      const foundFacility = facilities.find(f => f.id === facilityId);
      if (foundFacility) {
        setSelectedFacility(foundFacility);
        fetchedFacilityIdRef.current = facilityId;
        return;
      }
    }

    // Skip if we've already fetched this facility ID (prevents duplicate fetches)
    if (fetchedFacilityIdRef.current === facilityId) {
      return;
    }

    // Mark as fetching to prevent duplicate requests
    fetchedFacilityIdRef.current = facilityId;

    // If not found in loaded facilities, fetch it directly from the database
    // This handles the case when preferred_facility_id is set but the facility
    // isn't in the search results (e.g., it's far away or filtered out)
    const fetchPreferredFacility = async () => {
      try {
        const { data, error } = await supabase
          .from('facility')
          .select('id, name, address, city, latitude, longitude')
          .eq('id', facilityId)
          .eq('is_active', true)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to fetch preferred facility:', error);
          return;
        }

        if (data) {
          // Calculate distance if we have user location
          let distance_meters: number | null = null;
          if (
            location?.latitude &&
            location?.longitude &&
            data.latitude !== null &&
            data.longitude !== null
          ) {
            // Simple haversine distance calculation
            const R = 6371000; // Earth radius in meters
            const lat1 = (location.latitude * Math.PI) / 180;
            const lat2 = (Number(data.latitude) * Math.PI) / 180;
            const deltaLat = ((Number(data.latitude) - location.latitude) * Math.PI) / 180;
            const deltaLon = ((Number(data.longitude) - location.longitude) * Math.PI) / 180;

            const a =
              Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            distance_meters = R * c;
          }

          const facilityResult: FacilitySearchResult = {
            id: data.id,
            name: data.name,
            address: data.address,
            city: data.city,
            distance_meters,
          };

          setSelectedFacility(facilityResult);
          // Also update form values for display
          setValue('locationName', data.name, { shouldDirty: false });
          const fullAddress = [data.address, data.city].filter(Boolean).join(', ');
          setValue('locationAddress', fullAddress || undefined, { shouldDirty: false });
        }
      } catch (error) {
        console.error('Error fetching preferred facility:', error);
      }
    };

    fetchPreferredFacility();
  }, [facilityId, selectedFacility, facilities, location, setValue]);

  // Handle facility selection
  const handleSelectFacility = useCallback(
    (facility: FacilitySearchResult) => {
      successHaptic();
      setSelectedFacility(facility);
      setValue('facilityId', facility.id, { shouldValidate: true, shouldDirty: true });
      // Also set location name and address for display purposes
      setValue('locationName', facility.name, { shouldDirty: true });
      // Combine address and city for locationAddress
      const fullAddress = [facility.address, facility.city].filter(Boolean).join(', ');
      setValue('locationAddress', fullAddress || undefined, { shouldDirty: true });
    },
    [setValue]
  );

  // Handle clearing selected facility
  const handleClearFacility = useCallback(() => {
    setSelectedFacility(null);
    fetchedFacilityIdRef.current = null; // Reset so we can re-fetch if needed
    setValue('facilityId', undefined, { shouldValidate: true, shouldDirty: true });
    setValue('locationName', undefined, { shouldDirty: true });
    setValue('locationAddress', undefined, { shouldDirty: true });
    setSearchQuery('');
  }, [setValue]);

  // Handle location type changes - reset fields appropriately
  const handleLocationTypeChange = useCallback(
    (newLocationType: 'facility' | 'custom' | 'tbd') => {
      lightHaptic();

      if (newLocationType === 'facility') {
        // Switching to facility: clear custom location fields
        setValue('locationName', undefined, { shouldDirty: true });
        setValue('locationAddress', undefined, { shouldDirty: true });
      } else if (newLocationType === 'custom') {
        // Switching to custom: clear facility fields
        setSelectedFacility(null);
        fetchedFacilityIdRef.current = null; // Reset so we can re-fetch if needed
        setValue('facilityId', undefined, { shouldValidate: true, shouldDirty: true });
        setSearchQuery('');
        // Clear locationName and locationAddress that might have been set by facility selection
        setValue('locationName', undefined, { shouldDirty: true });
        setValue('locationAddress', undefined, { shouldDirty: true });
      } else if (newLocationType === 'tbd') {
        // Switching to TBD: clear both facility and custom location fields
        setSelectedFacility(null);
        fetchedFacilityIdRef.current = null; // Reset so we can re-fetch if needed
        setValue('facilityId', undefined, { shouldValidate: true, shouldDirty: true });
        setValue('locationName', undefined, { shouldDirty: true });
        setValue('locationAddress', undefined, { shouldDirty: true });
        setSearchQuery('');
      }

      setValue('locationType', newLocationType, { shouldValidate: true, shouldDirty: true });
    },
    [setValue]
  );

  // Handle infinite scroll via ScrollView
  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        layoutMeasurement: { height: number };
        contentOffset: { y: number };
        contentSize: { height: number };
      };
    }) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const paddingToBottom = 200; // Trigger load more when 200px from bottom
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

      if (isCloseToBottom && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  // Render empty state
  const renderEmptyState = useCallback(() => {
    if (facilitiesLoading || locationLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color={colors.buttonActive} />
          <Text size="sm" color={colors.textMuted} style={styles.emptyStateText}>
            {locationLoading
              ? t('matchCreation.fields.gettingLocation' as TranslationKey)
              : t('matchCreation.fields.searchingFacilities' as TranslationKey)}
          </Text>
        </View>
      );
    }

    if (locationError) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={32} color={colors.textMuted} />
          <Text size="sm" color={colors.textMuted} style={styles.emptyStateText}>
            {t('matchCreation.fields.locationAccessNeeded' as TranslationKey)}
          </Text>
        </View>
      );
    }

    if (facilitiesError) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.textMuted} />
          <Text size="sm" color={colors.textMuted} style={styles.emptyStateText}>
            {t('matchCreation.fields.failedToLoadFacilities' as TranslationKey)}
          </Text>
        </View>
      );
    }

    if (searchQuery && facilities.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={32} color={colors.textMuted} />
          <Text size="sm" color={colors.textMuted} style={styles.emptyStateText}>
            {t('matchCreation.fields.noFacilitiesFound' as TranslationKey, { query: searchQuery })}
          </Text>
        </View>
      );
    }

    if (!searchQuery && facilities.length === 0 && !isFetching) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={32} color={colors.textMuted} />
          <Text size="sm" color={colors.textMuted} style={styles.emptyStateText}>
            {t('matchCreation.fields.noFacilitiesAvailable' as TranslationKey)}
          </Text>
        </View>
      );
    }

    return null;
  }, [
    facilitiesLoading,
    locationLoading,
    locationError,
    facilitiesError,
    searchQuery,
    facilities.length,
    isFetching,
    colors,
  ]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        locationType === 'custom' && styles.contentContainerWithKeyboard,
      ]}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={400}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {/* Step title */}
      <View style={styles.stepHeader}>
        <Text size="lg" weight="bold" color={colors.text}>
          {t('matchCreation.step2Title' as TranslationKey)}
        </Text>
        <Text size="sm" color={colors.textMuted}>
          {t('matchCreation.step2Description' as TranslationKey)}
        </Text>
      </View>

      {/* Location type selection */}
      <View style={styles.fieldGroup}>
        <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
          {t('matchCreation.fields.locationType' as TranslationKey)}
        </Text>

        <View style={styles.locationCards}>
          <LocationTypeCard
            icon="business-outline"
            title={t('matchCreation.fields.locationTypeFacility' as TranslationKey)}
            description={t(
              'matchCreation.fields.locationTypeFacilityDescription' as TranslationKey
            )}
            selected={locationType === 'facility'}
            onPress={() => handleLocationTypeChange('facility')}
            colors={colors}
          />

          <LocationTypeCard
            icon="location-outline"
            title={t('matchCreation.fields.locationTypeCustom' as TranslationKey)}
            description={t('matchCreation.fields.locationTypeCustomDescription' as TranslationKey)}
            selected={locationType === 'custom'}
            onPress={() => handleLocationTypeChange('custom')}
            colors={colors}
          />

          <LocationTypeCard
            icon="help-circle-outline"
            title={t('matchCreation.fields.locationTypeTbd' as TranslationKey)}
            description={t('matchCreation.fields.locationTypeTbdDescription' as TranslationKey)}
            selected={locationType === 'tbd'}
            onPress={() => handleLocationTypeChange('tbd')}
            colors={colors}
          />
        </View>
      </View>

      {/* Facility selection (when locationType === 'facility') */}
      {locationType === 'facility' && (
        <View style={styles.fieldGroup}>
          <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
            {t('matchCreation.fields.facility' as TranslationKey)}
          </Text>

          {/* Show selected facility or search UI */}
          {selectedFacility ? (
            <SelectedFacility
              facility={selectedFacility}
              onClear={handleClearFacility}
              colors={colors}
            />
          ) : (
            <>
              {/* Search input */}
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
                  placeholder={t('matchCreation.fields.facilityPlaceholder' as TranslationKey)}
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

              {/* Facility list */}
              {facilities.length > 0 ? (
                <View style={styles.facilityListContainer}>
                  {facilities.map(facility => (
                    <FacilityItem
                      key={facility.id}
                      facility={facility}
                      onSelect={handleSelectFacility}
                      colors={colors}
                    />
                  ))}
                  {isFetchingNextPage && (
                    <View style={styles.footerLoader}>
                      <ActivityIndicator size="small" color={colors.buttonActive} />
                    </View>
                  )}
                </View>
              ) : (
                renderEmptyState()
              )}
            </>
          )}
        </View>
      )}

      {/* Custom location input (when locationType === 'custom') */}
      {locationType === 'custom' && (
        <>
          <View style={styles.fieldGroup}>
            <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
              {t('matchCreation.fields.locationName' as TranslationKey)}
            </Text>
            <BottomSheetTextInput
              style={[
                styles.textInput,
                {
                  borderColor: errors.locationName ? '#ef4444' : colors.border,
                  backgroundColor: colors.buttonInactive,
                  color: colors.text,
                },
              ]}
              value={locationName ?? ''}
              onChangeText={text =>
                setValue('locationName', text, { shouldValidate: true, shouldDirty: true })
              }
              placeholder={t('matchCreation.fields.locationNamePlaceholder' as TranslationKey)}
              placeholderTextColor={colors.textMuted}
            />
            {errors.locationName && (
              <Text size="xs" color="#ef4444" style={styles.errorText}>
                {errors.locationName.message}
              </Text>
            )}
          </View>

          <View ref={addressFieldRef} style={styles.fieldGroup}>
            <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
              {t('matchCreation.fields.locationAddress' as TranslationKey)}
            </Text>
            <BottomSheetTextInput
              style={[
                styles.textInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.buttonInactive,
                  color: colors.text,
                },
              ]}
              value={locationAddress ?? ''}
              onChangeText={text => setValue('locationAddress', text, { shouldDirty: true })}
              placeholder={t('matchCreation.fields.locationAddressPlaceholder' as TranslationKey)}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
              onFocus={() => {
                // Scroll to address field with extra offset to ensure it's well above keyboard
                // Use a delay to allow keyboard animation to start
                setTimeout(() => {
                  addressFieldRef.current?.measureLayout(
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
          </View>
        </>
      )}

      {/* TBD info message */}
      {locationType === 'tbd' && (
        <View
          style={[
            styles.infoBox,
            { backgroundColor: `${colors.buttonActive}10`, borderColor: colors.buttonActive },
          ]}
        >
          <Ionicons name="information-circle-outline" size={20} color={colors.buttonActive} />
          <Text size="sm" color={colors.textSecondary} style={styles.infoText}>
            {t('matchCreation.fields.tbdLocationInfo' as TranslationKey)}
          </Text>
        </View>
      )}
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
  },
  contentContainerWithKeyboard: {
    paddingBottom: spacingPixels[32], // Extra padding when custom location is selected to allow scrolling above keyboard
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
  locationCards: {
    gap: spacingPixels[3],
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[4],
    borderRadius: radiusPixels.xl,
    borderWidth: 1,
    gap: spacingPixels[3],
  },
  locationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radiusPixels.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextContainer: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    gap: spacingPixels[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacingPixels[1],
  },
  facilityListContainer: {
    marginTop: spacingPixels[3],
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    marginBottom: spacingPixels[2],
  },
  facilityItemContent: {
    flex: 1,
  },
  distanceBadge: {
    marginLeft: spacingPixels[2],
  },
  selectedFacility: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
  },
  selectedFacilityContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[3],
  },
  selectedFacilityText: {
    flex: 1,
  },
  textInput: {
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    fontSize: 16,
  },
  errorText: {
    marginTop: spacingPixels[1],
  },
  infoBox: {
    flexDirection: 'row',
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    gap: spacingPixels[3],
  },
  infoText: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacingPixels[6],
    gap: spacingPixels[2],
  },
  emptyStateText: {
    textAlign: 'center',
  },
  footerLoader: {
    alignItems: 'center',
    paddingVertical: spacingPixels[4],
  },
});

export default WhereStep;
