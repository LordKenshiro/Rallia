import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Animated,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MatchCard, MyMatchCard, Text, Heading, Button, Skeleton, SkeletonMatchCard } from '@rallia/shared-components';
import { lightHaptic } from '@rallia/shared-utils';
import {
  useAuth,
  useThemeStyles,
  useTranslation,
  useUserLocation,
  type TranslationKey,
} from '../hooks';
import { useOverlay, useActionsSheet, useSport, useMatchDetailSheet } from '../context';
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
  const { location: _realLocation } = useUserLocation();
  const { player, maxTravelDistanceKm, loading: playerLoading } = usePlayer();
  const { selectedSport, isLoading: sportLoading } = useSport();

  // TODO: Remove this hardcoded Montreal location after testing
  // Using downtown Montreal coordinates for development/testing
  const MONTREAL_DEV_LOCATION = { latitude: 45.5017, longitude: -73.5673 };
  const location = MONTREAL_DEV_LOCATION; // Use hardcoded location for testing
  // const location = _realLocation; // Uncomment to use real location

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
    maxDistanceKm: maxTravelDistanceKm,
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
        <SkeletonMatchCard 
          backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
          highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
          style={{ backgroundColor: colors.card, marginHorizontal: 16 }}
        />
      </View>
    );
  }, [isFetchingNextPage, colors.card, isDark]);

  // Render empty state with helpful message about travel distance
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
          {t('home.nearbyEmpty.description', { distance: maxTravelDistanceKm })}
        </Text>
        <Text size="sm" color={colors.textMuted} style={styles.emptySuggestion}>
          {t('home.nearbyEmpty.suggestion')}
        </Text>
        {session && (
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
        )}
      </View>
    ),
    [colors.card, colors.text, colors.textMuted, t, maxTravelDistanceKm, session, appNavigation]
  );

  // Render section header with "Soon & Nearby" title and "View All" button
  const renderSectionHeader = useCallback(() => {
    return (
      <View style={[styles.sectionHeader]}>
        <Text size="xl" weight="bold" color={colors.text}>
          {t('home.soonAndNearby' as TranslationKey)}
        </Text>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => {
            lightHaptic();
            navigation.navigate('PublicMatches');
          }}
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
  }, [colors.text, colors.primary, navigation, t]);

  // Render "My Matches" section with horizontal scroll
  const renderMyMatchesSection = useCallback(() => {
    // Only show for authenticated users
    if (!session) return null;

    return (
      <View style={styles.myMatchesSection}>
        {/* Header with title and "See All" button */}
        <View style={[styles.sectionHeader]}>
          <Text size="xl" weight="bold" color={colors.text}>
            {t('home.myMatches' as TranslationKey)}
          </Text>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => {
              lightHaptic();
              navigation.navigate('PlayerMatches');
            }}
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.myMatchSkeletonCard, { backgroundColor: colors.card, marginRight: 12 }]}>
                  <Skeleton width={120} height={16} backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'} highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'} style={{ marginBottom: 8 }} />
                  <Skeleton width={80} height={14} backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'} highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'} style={{ marginBottom: 6 }} />
                  <Skeleton width={100} height={12} backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'} highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'} />
                </View>
              ))}
            </ScrollView>
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
            {myMatches.slice(0, 5).map((match: MatchWithDetails) => (
              <MyMatchCard
                key={match.id}
                match={match}
                isDark={isDark}
                t={
                  t as (key: string, options?: Record<string, string | number | boolean>) => string
                }
                locale={locale}
                onPress={() => {
                  Logger.logUserAction('my_match_pressed', { matchId: match.id });
                  openMatchDetail(match);
                }}
              />
            ))}
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
          {/* Welcome skeleton */}
          <View style={styles.skeletonWelcome}>
            <Skeleton 
              width={200} 
              height={24} 
              backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
              highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
              style={{ marginBottom: 8 }}
            />
            <Skeleton 
              width={150} 
              height={16} 
              backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
              highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
            />
          </View>
          
          {/* My Matches skeleton */}
          <View style={styles.skeletonSection}>
            <Skeleton 
              width={120} 
              height={20} 
              backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
              highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
              style={{ marginBottom: 12, marginHorizontal: 16 }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.myMatchSkeletonCard, { backgroundColor: colors.card, marginRight: 12 }]}>
                  <Skeleton width={120} height={16} backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'} highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'} style={{ marginBottom: 8 }} />
                  <Skeleton width={80} height={14} backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'} highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'} style={{ marginBottom: 6 }} />
                  <Skeleton width={100} height={12} backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'} highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'} />
                </View>
              ))}
            </ScrollView>
          </View>
          
          {/* Nearby Matches skeleton */}
          <View style={styles.skeletonSection}>
            <Skeleton 
              width={150} 
              height={20} 
              backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
              highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
              style={{ marginBottom: 12, marginHorizontal: 16 }}
            />
            {[1, 2, 3].map((i) => (
              <SkeletonMatchCard 
                key={i}
                backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
                highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
                style={{ backgroundColor: colors.card, marginHorizontal: 16, marginBottom: 12 }}
              />
            ))}
          </View>
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
          {/* Skeleton for matches list */}
          <View style={styles.skeletonSection}>
            <Skeleton 
              width={150} 
              height={20} 
              backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
              highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
              style={{ marginBottom: 12, marginHorizontal: 16 }}
            />
            {[1, 2, 3].map((i) => (
              <SkeletonMatchCard 
                key={i}
                backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
                highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
                style={{ backgroundColor: colors.card, marginHorizontal: 16, marginBottom: 12 }}
              />
            ))}
          </View>
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
    paddingTop: spacingPixels[8],
  },
  skeletonWelcome: {
    paddingHorizontal: spacingPixels[4],
    marginBottom: spacingPixels[6],
  },
  skeletonSection: {
    marginBottom: spacingPixels[6],
  },
  myMatchSkeletonCard: {
    width: 160,
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
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
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevronIcon: {
    marginLeft: spacingPixels[1],
  },
  myMatchesSection: {
    marginTop: spacingPixels[2],
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
    paddingLeft: spacingPixels[4],
    paddingRight: spacingPixels[4],
    paddingBottom: spacingPixels[2],
    gap: spacingPixels[2],
  },
});

export default Home;
