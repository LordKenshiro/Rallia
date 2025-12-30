/**
 * PublicMatches Screen
 * Displays public matches with search, filtering, and infinite scroll.
 */

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MatchCard, Text } from '@rallia/shared-components';
import {
  useTheme,
  usePlayer,
  usePublicMatches,
  usePublicMatchFilters,
  type PublicMatch,
} from '@rallia/shared-hooks';
import { useAuth, useThemeStyles, useTranslation, useUserLocation } from '../../../hooks';
import type { TranslationKey } from '@rallia/shared-translations';
import { useMatchDetailSheet, useSport } from '../../../context';
import { Logger } from '@rallia/shared-services';
import { spacingPixels, radiusPixels, neutral } from '@rallia/design-system';
import { SearchBar, MatchFiltersBar } from '../components';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface EmptyStateProps {
  hasActiveFilters: boolean;
  colors: ReturnType<typeof useThemeStyles>['colors'];
  t: (key: TranslationKey) => string;
}

function EmptyState({ hasActiveFilters, colors, t }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
        <Ionicons
          name={hasActiveFilters ? 'search-outline' : 'tennisball-outline'}
          size={48}
          color={colors.textMuted}
        />
      </View>
      <Text size="lg" weight="semibold" color={colors.text} style={styles.emptyTitle}>
        {t(
          hasActiveFilters
            ? ('publicMatches.empty.title' as TranslationKey)
            : ('publicMatches.empty.noFilters.title' as TranslationKey)
        )}
      </Text>
      <Text size="sm" color={colors.textMuted} style={styles.emptyDescription}>
        {t(
          hasActiveFilters
            ? ('publicMatches.empty.description' as TranslationKey)
            : ('publicMatches.empty.noFilters.description' as TranslationKey)
        )}
      </Text>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PublicMatches() {
  const { session } = useAuth();
  const { theme } = useTheme();
  const { t, locale } = useTranslation();
  const { colors } = useThemeStyles();
  const { openSheet: openMatchDetail } = useMatchDetailSheet();
  const isDark = theme === 'dark';

  // Get user location and preferences
  const { location: _realLocation } = useUserLocation();
  const { player, loading: playerLoading } = usePlayer();
  const { selectedSport, isLoading: sportLoading } = useSport();

  // TODO: Remove this hardcoded Montreal location after testing
  const MONTREAL_DEV_LOCATION = { latitude: 45.5017, longitude: -73.5673 };
  const location = MONTREAL_DEV_LOCATION; // Use hardcoded location for testing
  // const location = _realLocation; // Uncomment to use real location

  // Filter state - default is no distance filter (shows all location types)
  const {
    filters,
    debouncedSearchQuery,
    hasActiveFilters,
    setSearchQuery,
    setFormat,
    setMatchType,
    setDateRange,
    setTimeOfDay,
    setSkillLevel,
    setGender,
    setCost,
    setJoinMode,
    setDistance,
    resetFilters,
    clearSearch,
  } = usePublicMatchFilters();

  // Determine if we should enable the query
  const showMatches = !!location && !!selectedSport;

  // Fetch public matches - use distance from filters
  const {
    matches,
    isLoading,
    isFetching,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = usePublicMatches({
    latitude: location?.latitude,
    longitude: location?.longitude,
    maxDistanceKm: filters.distance,
    sportId: selectedSport?.id,
    filters,
    debouncedSearchQuery,
    enabled: showMatches,
  });

  // Filter out matches where user is creator or participant (show only joinable matches)
  const filteredMatches = useMemo(() => {
    if (!session?.user?.id) return matches;

    return matches.filter(match => {
      // Exclude if user is the creator
      if (match.created_by === session.user.id) return false;

      // Exclude if user is a participant
      const isParticipant = match.participants?.some(
        p => p.player_id === session.user.id && p.status === 'joined'
      );
      if (isParticipant) return false;

      return true;
    });
  }, [matches, session?.user?.id]);

  // Handle infinite scroll
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Render match card
  const renderMatchCard = useCallback(
    ({ item }: { item: PublicMatch }) => (
      <MatchCard
        match={item}
        isDark={isDark}
        t={t as (key: string, options?: Record<string, string | number | boolean>) => string}
        locale={locale}
        currentPlayerId={player?.id}
        onPress={() => {
          Logger.logUserAction('public_match_pressed', { matchId: item.id });
          openMatchDetail(item);
        }}
      />
    ),
    [isDark, t, locale, openMatchDetail, player?.id]
  );

  // Check if we're loading due to filter/search changes (not initial load)
  const isSearching = isFetching && !isLoading && !isRefetching;

  // Render results count or loading indicator in list
  const renderResultsInfo = useCallback(() => {
    // Show loading indicator when searching/filtering
    if (isSearching) {
      return (
        <View style={styles.listLoadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }

    // Show results count when we have matches
    if (!isLoading && filteredMatches.length > 0) {
      return (
        <View style={styles.resultsContainer}>
          <Text size="sm" color={colors.textMuted}>
            {filteredMatches.length === 1
              ? t('publicMatches.results.countSingular' as TranslationKey)
              : t('publicMatches.results.count' as TranslationKey, {
                  count: filteredMatches.length,
                })}
          </Text>
        </View>
      );
    }

    return null;
  }, [isSearching, isLoading, filteredMatches.length, colors.primary, colors.textMuted, t]);

  // Render empty state
  const renderEmptyComponent = useCallback(() => {
    // Don't show empty state while loading or searching
    if (isLoading || isSearching) return null;
    return <EmptyState hasActiveFilters={hasActiveFilters} colors={colors} t={t} />;
  }, [isLoading, isSearching, hasActiveFilters, colors, t]);

  // Render footer with loading indicator
  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isFetchingNextPage, colors.primary]);

  // Loading state for initial data
  const isInitialLoading = playerLoading || sportLoading;

  if (isInitialLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // No location/sport selected state
  if (!showMatches) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="location-outline" size={48} color={colors.textMuted} />
          <Text size="base" color={colors.textMuted} style={styles.noLocationText}>
            {t('home.nearbyEmpty.title' as TranslationKey)}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      {/* Fixed Header - Search and Filters always visible */}
      <View style={styles.headerContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={filters.searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('publicMatches.searchPlaceholder' as TranslationKey)}
            isLoading={isFetching && debouncedSearchQuery !== filters.searchQuery}
            onClear={clearSearch}
          />
        </View>

        {/* Filter Chips */}
        <MatchFiltersBar
          format={filters.format}
          matchType={filters.matchType}
          dateRange={filters.dateRange}
          timeOfDay={filters.timeOfDay}
          skillLevel={filters.skillLevel}
          gender={filters.gender}
          cost={filters.cost}
          joinMode={filters.joinMode}
          distance={filters.distance}
          onFormatChange={setFormat}
          onMatchTypeChange={setMatchType}
          onDateRangeChange={setDateRange}
          onTimeOfDayChange={setTimeOfDay}
          onSkillLevelChange={setSkillLevel}
          onGenderChange={setGender}
          onCostChange={setCost}
          onJoinModeChange={setJoinMode}
          onDistanceChange={setDistance}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </View>

      {/* Match List */}
      {isLoading ? (
        <View style={styles.listLoadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={isSearching ? [] : filteredMatches}
          renderItem={renderMatchCard}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderResultsInfo}
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          contentContainerStyle={[
            styles.listContent,
            (filteredMatches.length === 0 || isSearching) && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacingPixels[4],
  },
  listLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacingPixels[8],
  },
  noLocationText: {
    textAlign: 'center',
    marginTop: spacingPixels[2],
  },
  headerContainer: {
    paddingTop: spacingPixels[5],
  },
  searchContainer: {
    paddingHorizontal: spacingPixels[4],
    marginBottom: spacingPixels[2],
  },
  resultsContainer: {
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[2],
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacingPixels[5],
  },
  emptyListContent: {
    justifyContent: 'center',
    minHeight: '100%',
  },
  emptyContainer: {
    padding: spacingPixels[8],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacingPixels[4],
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: spacingPixels[2],
  },
  emptyDescription: {
    textAlign: 'center',
    paddingHorizontal: spacingPixels[4],
  },
  footerLoader: {
    padding: spacingPixels[4],
    alignItems: 'center',
  },
});
