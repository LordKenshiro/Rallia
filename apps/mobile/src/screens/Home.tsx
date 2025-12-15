import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MatchCard, Text, Heading, Button, Spinner } from '@rallia/shared-components';
import { useAuth, useThemeStyles, useTranslation } from '../hooks';
import { useOverlay, useActionsSheet } from '../context';
import { useProfile } from '@rallia/shared-hooks';
import { Logger } from '@rallia/shared-services';
import { getMockMatches } from '../features/matches/data/mockMatches';
import { MatchCardDisplay } from '../types';
import { spacingPixels, radiusPixels } from '@rallia/design-system';

const Home = () => {
  // Use custom hooks for auth, profile, and overlay context
  const { session, loading } = useAuth();
  const { profile } = useProfile();
  const { setOnHomeScreen } = useOverlay();
  const { openSheet } = useActionsSheet();
  const { colors } = useThemeStyles();
  const { t } = useTranslation();

  const [matches, setMatches] = useState<MatchCardDisplay[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const welcomeOpacity = useState(new Animated.Value(1))[0];

  // Extract display name from profile
  const displayName = profile?.display_name || null;

  // Notify OverlayContext that we're on Home screen (safe to show permission overlays)
  useEffect(() => {
    setOnHomeScreen(true);
    return () => setOnHomeScreen(false);
  }, [setOnHomeScreen]);

  // Fetch matches from Supabase
  useEffect(() => {
    fetchMatches();
  }, []);

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

  const fetchMatches = async () => {
    setLoadingMatches(true);
    try {
      // TODO: Replace with actual Supabase query when table is ready
      // const { data, error } = await supabase
      //   .from('matches')
      //   .select('*')
      //   .order('date', { ascending: true });

      // For now, using mock data
      const mockMatches = getMockMatches();
      setMatches(mockMatches);
    } catch (error) {
      Logger.error('Failed to fetch matches', error as Error);
    } finally {
      setLoadingMatches(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <View style={styles.contentWrapper}>
        {!session && (
          <View
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
        )}

        {session && showWelcome && (
          <Animated.View
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
        )}

        {/* <View style={styles.sectionHeader}>
          <Heading level={3}>🔍 Soon & Nearby</Heading>
          <TouchableOpacity>
            <Text size="sm" color="#666">
              View All &gt;
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loadingMatches ? (
            <View style={styles.loadingContainer}>
              <Spinner size="lg" />
            </View>
          ) : matches.length > 0 ? (
            matches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                onPress={() => {
                  Logger.logUserAction('match_pressed', { matchId: match.id });
                }}
              />
            ))
          ) : (
            <View style={styles.placeholderContainer}>
              <Text size="base" color="#999" style={styles.placeholderText}>
                No matches available
              </Text>
            </View>
          )}
        </ScrollView> */}
      </View>

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
  contentWrapper: {
    flex: 1,
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
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[4],
    marginTop: spacingPixels[4],
    marginBottom: spacingPixels[2],
  },
  placeholderContainer: {
    padding: spacingPixels[10],
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    textAlign: 'center',
  },
});

export default Home;
