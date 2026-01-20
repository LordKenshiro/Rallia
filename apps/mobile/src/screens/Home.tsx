import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Animated,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  MatchCard,
  MyMatchCard,
  Text,
  Heading,
  Button,
  Spinner,
  LocationSelector,
} from '@rallia/shared-components';
import {
  useAuth,
  useThemeStyles,
  useTranslation,
  useEffectiveLocation,
  type TranslationKey,
} from '../hooks';
import {
  useOverlay,
  useActionsSheet,
  useSport,
  useMatchDetailSheet,
  useUserHomeLocation,
} from '../context';
import {
  useProfile,
  useTheme,
  usePlayer,
  useNearbyMatches,
  usePlayerMatches,
} from '@rallia/shared-hooks';
import type { NearbyMatch } from '@rallia/shared-hooks';
import type { MatchWithDetails } from '@rallia/shared-types';
import { Logger } from '@rallia/shared-services';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { useHomeNavigation, useAppNavigation } from '../navigation/hooks';

const Home = () => {
  // Use custom hooks for auth, profile, and overlay context
  const { session, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { setOnHomeScreen } = useOverlay();
  const { openSheet } = useActionsSheet();
  const { openSheet: openMatchDetail } = useMatchDetailSheet();
  const { colors } = useThemeStyles();
  const { t, locale } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigation = useHomeNavigation();
  const appNavigation = useAppNavigation();

  // Get user's current location and player preferences for nearby matches
  const {
    location,
    locationMode,
    setLocationMode,
    hasHomeLocation,
    hasBothLocationOptions,
  } = useEffectiveLocation();
  const { homeLocation } = useUserHomeLocation();
  const { player, maxTravelDistanceKm, loading: playerLoading } = usePlayer();
  const { selectedSport, isLoading: sportLoading } = useSport();

  // Default search radius for signed-out users (10km)
  const GUEST_SEARCH_RADIUS_KM = 15;

  // Use player's travel distance if signed in, otherwise use guest default
  const searchRadiusKm = session ? maxTravelDistanceKm : GUEST_SEARCH_RADIUS_KM;

  // Determine if we should show the nearby matches section
  // For dev: always show since we're using hardcoded location
  const showNearbySection = !!location && !!selectedSport;

  // Use TanStack Query hook for fetching nearby matches with infinite scrolling
  // Query refetches automatically when sportId or player gender changes (included in query key)
  const {
    matches: allNearbyMatches,
    isLoading: loadingMatches,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error: matchesError,
  } = useNearbyMatches({
    latitude: location?.latitude,
    longitude: location?.longitude,
    maxDistanceKm: searchRadiusKm,
    sportId: selectedSport?.id,
    userGender: player?.gender,
    limit: 20,
    enabled: showNearbySection,
  });

  // Filter out matches where user is creator or participant (these show in "My Matches" section)
  const matches = useMemo(() => {
    if (!session?.user?.id) return allNearbyMatches;

    return allNearbyMatches.filter(match => {
      // Exclude if user is the creator
      if (match.created_by === session.user.id) return false;

      // Exclude if user is a participant
      const isParticipant = match.participants?.some(
        p => p.player_id === session.user.id && p.status === 'joined'
      );
      if (isParticipant) return false;

      return true;
    });
  }, [allNearbyMatches, session?.user?.id]);

  // Use TanStack Query hook for fetching player's upcoming matches
  // Filters by selected sport to match the Soon & Nearby section
  const {
    matches: myMatches,
    isLoading: loadingMyMatches,
    refetch: refetchMyMatches,
  } = usePlayerMatches({
    userId: session?.user?.id,
    timeFilter: 'upcoming',
    sportId: selectedSport?.id,
    limit: 5,
    enabled: !!session?.user?.id,
  });

  const [showWelcome, setShowWelcome] = useState(true);
  const welcomeOpacity = useState(new Animated.Value(1))[0];

  // Extract display name from profile
  const displayName = profile?.display_name || null;

  // Log errors from match fetching
  useEffect(() => {
    if (matchesError) {
      Logger.error('Failed to fetch matches', matchesError);
    }
  }, [matchesError]);

  // Notify OverlayContext that we're on Home screen (safe to show permission overlays)
  useEffect(() => {
    setOnHomeScreen(true);
    return () => setOnHomeScreen(false);
  }, [setOnHomeScreen]);

  // Auto-dismiss welcome message when user logs in
  useEffect(() => {
    if (session?.user && displayName) {
      // Auto-dismiss welcome message after 3 seconds (3000ms)
      const dismissTimer = setTimeout(() => {
        Animated.timing(welcomeOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setShowWelcome(false);
        });
      }, 3000);

      return () => clearTimeout(dismissTimer);
    } else {
      // Reset states when user logs out
      setShowWelcome(true);
      welcomeOpacity.setValue(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, displayName]);

  // Handle end reached for infinite scroll
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Render individual match card
  const renderMatchCard = useCallback(
    ({ item }: { item: NearbyMatch }) => (
      <MatchCard
        key={item.id}
        match={item}
        isDark={isDark}
        t={t as (key: string, options?: Record<string, string | number | boolean>) => string}
        locale={locale}
        currentPlayerId={player?.id}
        onPress={() => {
          Logger.logUserAction('match_pressed', { matchId: item.id });
          openMatchDetail(item);
        }}
      />
    ),
    [isDark, t, locale, openMatchDetail, player?.id]
  );

  // Render footer with loading indicator
  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isFetchingNextPage, colors.primary]);

  // Render empty state with helpful message about travel distance (signed in) or simple message (signed out)
  const renderEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="location-outline" size={48} color={colors.textMuted} />
        </View>
        <Text size="lg" weight="semibold" color={colors.text} style={styles.emptyTitle}>
          {t('home.nearbyEmpty.title')}
        </Text>
        <Text size="sm" color={colors.textMuted} style={styles.emptyDescription}>
          {session
            ? t('home.nearbyEmpty.description', { distance: maxTravelDistanceKm })
            : t('home.nearbyEmpty.guestDescription')}
        </Text>
        {session && (
          <>
            <Text size="sm" color={colors.textMuted} style={styles.emptySuggestion}>
              {t('home.nearbyEmpty.suggestion')}
            </Text>
            <Button
              variant="outline"
              onPress={() => appNavigation.navigate('Settings')}
              style={styles.updateSettingsButton}
              isDark={isDark}
              themeColors={{
                primary: colors.primary,
                primaryForeground: colors.primaryForeground,
                buttonActive: colors.buttonActive,
                buttonInactive: colors.buttonInactive,
                buttonTextActive: colors.buttonTextActive,
                buttonTextInactive: colors.buttonTextInactive,
                text: colors.text,
                textMuted: colors.textMuted,
                border: colors.border,
                background: colors.background,
              }}
            >
              {t('home.nearbyEmpty.updateSettings')}
            </Button>
          </>
        )}
      </View>
    ),
    [colors, t, maxTravelDistanceKm, session, appNavigation, isDark]
  );

  // Render section header with "Soon & Nearby" title, location selector, and "View All" button
  const renderSectionHeader = useCallback(() => {
    // Get a short label for the home location (postal code or city)
    const homeLocationLabel =
      homeLocation?.postalCode || homeLocation?.formattedAddress?.split(',')[0];

    return (
      <View style={[styles.sectionHeader]}>
        <View style={styles.sectionTitleRow}>
          <Text size="xl" weight="bold" color={colors.text}>
            {t('home.soonAndNearby' as TranslationKey)}
          </Text>
          {/* Only show LocationSelector when both GPS and home location are available */}
          {hasBothLocationOptions && (
            <View style={styles.locationSelectorWrapper}>
              <LocationSelector
                selectedMode={locationMode}
                onSelectMode={setLocationMode}
                hasHomeLocation={hasHomeLocation}
                homeLocationLabel={homeLocationLabel}
                isDark={isDark}
                t={t as (key: string) => string}
              />
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => navigation.navigate('PublicMatches')}
          activeOpacity={0.7}
        >
          <Text size="base" weight="medium" color={colors.primary}>
            {t('home.viewAll')}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.primary}
            style={styles.chevronIcon}
          />
        </TouchableOpacity>
      </View>
    );
  }, [
    colors.text,
    colors.primary,
    navigation,
    t,
    locationMode,
    setLocationMode,
    hasHomeLocation,
    hasBothLocationOptions,
    homeLocation,
    isDark,
  ]);

  // Render "My Matches" section with horizontal scroll
  const renderMyMatchesSection = useCallback(() => {
    // Only show for authenticated users
    if (!session) return null;

    return (
      <View style={styles.myMatchesSection}>
        {/* Header with title and "See All" button */}
        <View style={[styles.sectionHeader, { paddingVertical: spacingPixels[2] }]}>
          <Text size="xl" weight="bold" color={colors.text}>
            {t('home.myMatches' as TranslationKey)}
          </Text>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('PlayerMatches')}
            activeOpacity={0.7}
          >
            <Text size="base" weight="medium" color={colors.primary}>
              {t('home.viewAll')}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.primary}
              style={styles.chevronIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Content: horizontal scroll or empty state */}
        {loadingMyMatches ? (
          <View style={styles.myMatchesLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : myMatches.length === 0 ? (
          <View style={styles.myMatchesEmpty}>
            <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
            <Text size="sm" color={colors.textMuted} style={styles.myMatchesEmptyText}>
              {t('home.myMatchesEmpty.title' as TranslationKey)}
            </Text>
            <Text size="xs" color={colors.textMuted} style={styles.myMatchesEmptyDescription}>
              {t('home.myMatchesEmpty.description' as TranslationKey)}
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.myMatchesScrollContent}
          >
            {myMatches.slice(0, 5).map((match: MatchWithDetails) => {
              // Check if current player is invited (has pending invitation)
              const isInvited = !!(
                player?.id &&
                match.participants?.some(p => p.player_id === player.id && p.status === 'pending')
              );
              // Count pending join requests (only relevant if current user is creator)
              const pendingRequestCount =
                match.created_by === player?.id
                  ? (match.participants?.filter(p => p.status === 'requested').length ?? 0)
                  : 0;

              return (
                <MyMatchCard
                  key={match.id}
                  match={match}
                  isDark={isDark}
                  t={
                    t as (
                      key: string,
                      options?: Record<string, string | number | boolean>
                    ) => string
                  }
                  locale={locale}
                  isInvited={isInvited}
                  pendingRequestCount={pendingRequestCount}
                  onPress={() => {
                    Logger.logUserAction('my_match_pressed', { matchId: match.id });
                    openMatchDetail(match);
                  }}
                />
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  }, [
    session,
    colors.text,
    colors.primary,
    colors.textMuted,
    t,
    navigation,
    loadingMyMatches,
    myMatches,
    isDark,
    locale,
    openMatchDetail,
    player,
  ]);

  // Render list header (welcome section for logged-in users)
  const renderListHeader = useCallback(() => {
    const headerComponents = [];

    if (!session) {
      headerComponents.push(
        <View
          key="sign-in"
          style={[
            styles.matchesSection,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Heading level={3}>{t('home.yourMatches')}</Heading>
          <Text size="sm" color={colors.textMuted} style={styles.sectionSubtitle}>
            {t('home.signInPrompt')}
          </Text>
          <Button variant="primary" onPress={openSheet} style={styles.signInButton}>
            {t('auth.signIn')}
          </Button>
        </View>
      );
    } else {
      // Show welcome message for logged-in users
      if (showWelcome) {
        headerComponents.push(
          <Animated.View
            key="welcome"
            style={[
              styles.welcomeSection,
              {
                backgroundColor: colors.headerBackground,
                opacity: welcomeOpacity,
              },
            ]}
          >
            <Text size="lg" weight="bold" color={colors.text} style={styles.welcomeText}>
              {t('home.welcomeBack')}
            </Text>
            <Text size="sm" color={colors.textMuted}>
              {displayName || session.user.email?.split('@')[0] || t('home.user')}
            </Text>
          </Animated.View>
        );
      }

      // Add "My Matches" section for authenticated users
      headerComponents.push(<View key="my-matches">{renderMyMatchesSection()}</View>);
    }

    // Only show "Soon & Nearby" section header if we have location
    if (showNearbySection) {
      headerComponents.push(<View key="section-header">{renderSectionHeader()}</View>);
    }

    return <View>{headerComponents}</View>;
  }, [
    session,
    showWelcome,
    showNearbySection,
    colors.card,
    colors.border,
    colors.textMuted,
    colors.headerBackground,
    colors.text,
    t,
    openSheet,
    welcomeOpacity,
    displayName,
    renderMyMatchesSection,
    renderSectionHeader,
  ]);

  // Show loading if auth is loading, or if player/sport data is loading initially
  // Note: locationLoading is ignored when using hardcoded Montreal location for dev

  const isInitialLoading = authLoading || playerLoading || sportLoading;

  if (isInitialLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
        </View>
      </SafeAreaView>
    );
  }

  // If location is not available, only show the header (no matches list)
  if (!showNearbySection) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
        <FlatList
          data={[]}
          renderItem={renderMatchCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={null}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      {loadingMatches ? (
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatchCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
                if (session?.user?.id) {
                  refetchMyMatches();
                }
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
      {/* All overlays are now managed by OverlayProvider in App.tsx */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  matchesSection: {
    padding: spacingPixels[5],
    margin: spacingPixels[4],
    marginTop: spacingPixels[5],
    borderRadius: radiusPixels.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  welcomeSection: {
    padding: spacingPixels[5],
    margin: spacingPixels[4],
    marginTop: spacingPixels[5],
    borderRadius: radiusPixels.xl,
    alignItems: 'center',
  },
  welcomeText: {
    marginBottom: spacingPixels[2],
  },
  sectionSubtitle: {
    textAlign: 'center',
    marginBottom: spacingPixels[4],
  },
  signInButton: {
    marginTop: spacingPixels[2],
  },
  emptyContainer: {
    padding: spacingPixels[8],
    paddingTop: spacingPixels[10],
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
    marginBottom: spacingPixels[3],
    paddingHorizontal: spacingPixels[4],
  },
  emptySuggestion: {
    textAlign: 'center',
    marginBottom: spacingPixels[5],
    paddingHorizontal: spacingPixels[4],
  },
  updateSettingsButton: {
    marginTop: spacingPixels[2],
  },
  footerLoader: {
    padding: spacingPixels[4],
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[5],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
  },
  locationSelectorWrapper: {
    marginLeft: spacingPixels[1],
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevronIcon: {
    marginLeft: spacingPixels[1],
  },
  myMatchesSection: {
    marginTop: spacingPixels[2],
    overflow: 'visible', // Allow corner badges to extend outside cards
  },
  myMatchesLoading: {
    padding: spacingPixels[8],
    alignItems: 'center',
    justifyContent: 'center',
  },
  myMatchesEmpty: {
    padding: spacingPixels[6],
    marginHorizontal: spacingPixels[4],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusPixels.xl,
  },
  myMatchesEmptyText: {
    marginTop: spacingPixels[2],
    textAlign: 'center',
  },
  myMatchesEmptyDescription: {
    marginTop: spacingPixels[1],
    textAlign: 'center',
  },
  myMatchesScrollContent: {
    paddingTop: 10, // Minimal space for corner badges (badge extends 8px above card)
    paddingLeft: spacingPixels[4],
    paddingRight: spacingPixels[4],
    paddingBottom: spacingPixels[2],
    gap: spacingPixels[2],
  },
});

export default Home;
