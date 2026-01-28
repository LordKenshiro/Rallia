/**
 * FacilitiesDirectory Screen
 * Displays facilities with search, filtering, infinite scroll, and favorites.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, Skeleton, useToast } from '@rallia/shared-components';
import { SearchBar } from '../../matches/components';
import {
  useFacilitySearch,
  useFavoriteFacilities,
  usePlayer,
  useDebounce,
  DEFAULT_FACILITY_FILTERS,
  type FacilityFilters,
} from '@rallia/shared-hooks';
import type { FacilitySearchResult } from '@rallia/shared-types';
import {
  useThemeStyles,
  useTranslation,
  useEffectiveLocation,
  type TranslationKey,
  type TranslationOptions,
} from '../../../hooks';
import { useSport, useUserHomeLocation } from '../../../context';
import { useCourtsNavigation } from '../../../navigation/hooks';
import { Logger } from '@rallia/shared-services';
import { spacingPixels } from '@rallia/design-system';
import { FacilityCard, FacilityFiltersBar } from '../components';
import { lightHaptic } from '@rallia/shared-utils';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface EmptyStateProps {
  hasActiveSearch: boolean;
  hasLocation: boolean;
  colors: ReturnType<typeof useThemeStyles>['colors'];
  t: (key: TranslationKey, options?: TranslationOptions) => string;
}

function EmptyState({ hasActiveSearch, hasLocation, colors, t }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
        <Ionicons
          name={
            hasActiveSearch
              ? 'search-outline'
              : hasLocation
                ? 'business-outline'
                : 'location-outline'
          }
          size={48}
          color={colors.textMuted}
        />
      </View>
      <Text size="lg" weight="semibold" color={colors.text} style={styles.emptyTitle}>
        {!hasLocation
          ? t('facilitiesTab.empty.noLocation')
          : hasActiveSearch
            ? t('facilitiesTab.empty.title')
            : t('facilitiesTab.empty.title')}
      </Text>
      <Text size="sm" color={colors.textMuted} style={styles.emptyDescription}>
        {hasLocation ? t('facilitiesTab.empty.description') : t('facilitiesTab.empty.noLocation')}
      </Text>
    </View>
  );
}

function LoadingSkeleton({
  colors,
  isDark,
}: {
  colors: ReturnType<typeof useThemeStyles>['colors'];
  isDark: boolean;
}) {
  // Theme-aware skeleton colors
  const skeletonBg = isDark ? '#262626' : '#E1E9EE'; // neutral[800] : light default
  const skeletonHighlight = isDark ? '#404040' : '#F2F8FC'; // neutral[700] : light default

  return (
    <View style={styles.skeletonContainer}>
      {/* Results count skeleton */}
      <View style={styles.skeletonResultsInfo}>
        <Skeleton
          width={100}
          height={16}
          backgroundColor={skeletonBg}
          highlightColor={skeletonHighlight}
        />
      </View>

      {/* Facility card skeletons */}
      {[1, 2, 3, 4, 5].map(i => (
        <View
          key={i}
          style={[
            styles.skeletonCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.skeletonCardContent}>
            {/* Name skeleton */}
            <Skeleton
              width="55%"
              height={18}
              backgroundColor={skeletonBg}
              highlightColor={skeletonHighlight}
            />
            {/* Address skeleton */}
            <View style={styles.skeletonRow}>
              <Skeleton
                width={14}
                height={14}
                backgroundColor={skeletonBg}
                highlightColor={skeletonHighlight}
                style={{ borderRadius: 7 }}
              />
              <Skeleton
                width="70%"
                height={14}
                backgroundColor={skeletonBg}
                highlightColor={skeletonHighlight}
              />
            </View>
            {/* Distance skeleton */}
            <View style={styles.skeletonRow}>
              <Skeleton
                width={14}
                height={14}
                backgroundColor={skeletonBg}
                highlightColor={skeletonHighlight}
                style={{ borderRadius: 7 }}
              />
              <Skeleton
                width={50}
                height={14}
                backgroundColor={skeletonBg}
                highlightColor={skeletonHighlight}
              />
            </View>
          </View>
          {/* Chevron placeholder */}
          <Skeleton
            width={20}
            height={20}
            backgroundColor={skeletonBg}
            highlightColor={skeletonHighlight}
            style={{ borderRadius: 10, marginLeft: spacingPixels[2] }}
          />
        </View>
      ))}
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FacilitiesDirectory() {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeStyles();
  const toast = useToast();
  const navigation = useCourtsNavigation();

  // Location and preferences
  const { location, locationMode, setLocationMode, hasHomeLocation, hasBothLocationOptions } =
    useEffectiveLocation();
  const { homeLocation } = useUserHomeLocation();
  const { player } = usePlayer();
  const { selectedSport, isLoading: sportLoading } = useSport();

  // Home location label for display
  const homeLocationLabel =
    homeLocation?.postalCode || homeLocation?.formattedAddress?.split(',')[0];

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const hasActiveSearch = debouncedSearchQuery.length > 0;

  // Filter state
  const [filters, setFilters] = useState<FacilityFilters>(DEFAULT_FACILITY_FILTERS);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.distance !== 'all' ||
      filters.facilityType !== 'all' ||
      filters.surfaceType !== 'all' ||
      filters.courtType !== 'all' ||
      filters.lighting !== 'all' ||
      filters.membership !== 'all'
    );
  }, [filters]);

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FACILITY_FILTERS);
  }, []);

  // Determine if we should enable the query
  // Must check latitude/longitude exist, not just that location object exists
  const showFacilities =
    !!location &&
    location.latitude !== undefined &&
    location.longitude !== undefined &&
    !!selectedSport;

  // Fetch facilities
  const {
    facilities,
    totalCount,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error: queryError,
  } = useFacilitySearch({
    sportId: selectedSport?.id,
    latitude: location?.latitude,
    longitude: location?.longitude,
    searchQuery: debouncedSearchQuery,
    filters,
    enabled: showFacilities,
  });

  // Favorites management
  const { favorites, isFavorite, addFavorite, removeFavorite, isMaxReached } =
    useFavoriteFacilities(player?.id ?? null);

  // Sort facilities: favorites first, then by distance
  const sortedFacilities = useMemo(() => {
    const favoriteIds = new Set(favorites.map(f => f.facilityId));

    // Split into favorites and non-favorites
    const favoriteFacilities = facilities.filter(f => favoriteIds.has(f.id));
    const otherFacilities = facilities.filter(f => !favoriteIds.has(f.id));

    // Sort each group by distance
    const sortByDistance = (a: FacilitySearchResult, b: FacilitySearchResult) =>
      (a.distance_meters ?? Infinity) - (b.distance_meters ?? Infinity);

    return [
      ...favoriteFacilities.sort(sortByDistance), // Favorites first, sorted by distance
      ...otherFacilities.sort(sortByDistance), // Then others, sorted by distance
    ];
  }, [facilities, favorites]);

  // Handle infinite scroll
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle facility press
  const handleFacilityPress = useCallback(
    (facility: FacilitySearchResult) => {
      Logger.logUserAction('facility_pressed', { facilityId: facility.id });
      navigation.navigate('FacilityDetail', { facilityId: facility.id });
    },
    [navigation]
  );

  // Handle favorite toggle
  const handleToggleFavorite = useCallback(
    async (facility: FacilitySearchResult) => {
      if (!player?.id) {
        // User not authenticated - would need to show auth sheet
        return;
      }

      lightHaptic();
      const wasAdded = isFavorite(facility.id);

      if (wasAdded) {
        const success = await removeFavorite(facility.id);
        if (success) {
          toast.success(t('facilitiesTab.favorites.removedFromFavorites'));
        }
      } else {
        if (isMaxReached) {
          toast.info(t('facilitiesTab.favorites.maxReached'));
          return;
        }
        const success = await addFavorite(facility);
        if (success) {
          toast.success(t('facilitiesTab.favorites.addedToFavorites'));
        }
      }
    },
    [player?.id, isFavorite, removeFavorite, addFavorite, isMaxReached, t, toast]
  );

  // Render facility card
  const renderFacilityCard = useCallback(
    ({ item }: { item: FacilitySearchResult }) => (
      <FacilityCard
        facility={item}
        isFavorite={isFavorite(item.id)}
        onPress={() => handleFacilityPress(item)}
        onToggleFavorite={handleToggleFavorite}
        isMaxFavoritesReached={isMaxReached}
        colors={colors}
        t={t}
      />
    ),
    [isFavorite, handleFacilityPress, handleToggleFavorite, isMaxReached, colors, t]
  );

  // Render results count
  const renderResultsInfo = useCallback(() => {
    if (isLoading || !showFacilities) return null;

    // Use totalCount from database if available, otherwise fall back to displayed count
    const count = totalCount ?? sortedFacilities.length;
    const countText =
      count === 1
        ? t('facilitiesTab.results.countSingular')
        : t('facilitiesTab.results.count').replace('{count}', String(count));

    return (
      <View style={styles.resultsInfo}>
        <Text size="sm" color={colors.textMuted}>
          {countText}
        </Text>
      </View>
    );
  }, [isLoading, showFacilities, totalCount, sortedFacilities.length, colors.textMuted, t]);

  // Render footer (loading indicator for infinite scroll)
  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isFetchingNextPage, colors.primary]);

  // Render empty state
  const renderEmptyComponent = useCallback(() => {
    if (isLoading) return null;
    return (
      <EmptyState
        hasActiveSearch={hasActiveSearch}
        hasLocation={!!location}
        colors={colors}
        t={t}
      />
    );
  }, [isLoading, hasActiveSearch, location, colors, t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      {/* Header with title */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text size="xl" weight="bold" color={colors.text}>
          {t('facilitiesTab.title')}
        </Text>
      </View>

      {/* Search bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('facilitiesTab.searchPlaceholder')}
          onClear={() => setSearchQuery('')}
        />
      </View>

      {/* Filters bar */}
      <FacilityFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        showLocationSelector={hasBothLocationOptions}
        locationMode={locationMode}
        onLocationModeChange={setLocationMode}
        hasHomeLocation={hasHomeLocation}
        homeLocationLabel={homeLocationLabel}
      />

      {/* Error display */}
      {queryError && (
        <View style={[styles.errorContainer, { backgroundColor: colors.card }]}>
          <Text size="sm" color={colors.error || '#ef4444'}>
            {t('common.error')}: {queryError.message}
          </Text>
        </View>
      )}

      {/* Main content */}
      {isLoading || sportLoading ? (
        <LoadingSkeleton colors={colors} isDark={isDark} />
      ) : (
        <FlatList
          data={sortedFacilities}
          renderItem={renderFacilityCard}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderResultsInfo}
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isFetchingNextPage && !isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            sortedFacilities.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacingPixels[4],
    paddingTop: spacingPixels[4],
    paddingBottom: spacingPixels[2],
  },
  searchContainer: {
    paddingHorizontal: spacingPixels[4],
    paddingTop: spacingPixels[2],
    paddingBottom: spacingPixels[2],
  },
  listContent: {
    paddingTop: spacingPixels[3],
    paddingBottom: spacingPixels[4],
  },
  emptyListContent: {
    flex: 1,
  },
  resultsInfo: {
    paddingHorizontal: spacingPixels[4],
    paddingBottom: spacingPixels[2],
  },
  footerLoader: {
    paddingVertical: spacingPixels[4],
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[6],
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacingPixels[4],
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: spacingPixels[2],
  },
  emptyDescription: {
    textAlign: 'center',
  },
  skeletonContainer: {
    paddingTop: spacingPixels[3],
    paddingBottom: spacingPixels[4],
  },
  skeletonResultsInfo: {
    paddingHorizontal: spacingPixels[4],
    paddingBottom: spacingPixels[2],
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacingPixels[4],
    marginBottom: spacingPixels[3],
    padding: spacingPixels[4],
    borderRadius: 12,
    borderWidth: 1,
  },
  skeletonCardContent: {
    flex: 1,
    gap: spacingPixels[2],
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[1],
  },
  errorContainer: {
    padding: spacingPixels[4],
    margin: spacingPixels[4],
    borderRadius: 8,
  },
});
