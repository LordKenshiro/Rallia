import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MatchCard,
  Text,
  Heading,
  Button,
  Spinner,
} from '@rallia/shared-components';
import { useAuth } from '../hooks';
import { useOverlay } from '../context';
import { useProfile } from '@rallia/shared-hooks';
import { Logger } from '@rallia/shared-services';
import { getMockMatches } from '../features/matches/data/mockMatches';
import { Match } from '../types';

const Home = () => {
  // Use custom hooks for auth, profile, and overlay context
  const { session, loading } = useAuth();
  const { profile } = useProfile();
  const { startOnboarding, startLogin, setOnHomeScreen } = useOverlay();

  const [matches, setMatches] = useState<Match[]>([]);
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.contentWrapper}>
        {!session && (
          <View style={styles.matchesSection}>
            <Heading level={3}>🎾 Your Matches</Heading>
            <Text size="sm" color="#666" style={styles.sectionSubtitle}>
              You must sign in to create and access your matches
            </Text>
            <View style={styles.authButtonsContainer}>
              <Button
                variant="primary"
                onPress={startOnboarding}
                style={styles.signInButton}
              >
                Sign Up
              </Button>
              <Button
                variant="primary"
                onPress={startLogin}
                style={styles.logInButton}
              >
                Log In
              </Button>
            </View>
          </View>
        )}

        {session && showWelcome && (
          <Animated.View style={[styles.welcomeSection, { opacity: welcomeOpacity }]}>
            <Text size="lg" weight="bold" color="#333" style={styles.welcomeText}>
              Welcome back! 👋
            </Text>
            <Text size="sm" color="#666">
              {displayName || session.user.email?.split('@')[0] || 'User'}
            </Text>
          </Animated.View>
        )}

        <View style={styles.sectionHeader}>
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
                onPress={() => { Logger.logUserAction('match_pressed', { matchId: match.id }); }}
              />
            ))
          ) : (
            <View style={styles.placeholderContainer}>
              <Text size="base" color="#999" style={styles.placeholderText}>
                No matches available
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* All overlays are now managed by OverlayProvider in App.tsx */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  welcomeSection: {
    backgroundColor: '#C8F2EF',
    padding: 20,
    margin: 16,
    marginTop: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  welcomeText: {
    marginBottom: 8,
  },
  sectionSubtitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  authButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
    justifyContent: 'center',
  },
  signInButton: {
    flex: 1,
    backgroundColor: '#EF6F7B', // Same pink color as Continue button in AuthOverlay (COLORS.buttonPrimary)
  },
  logInButton: {
    flex: 1,
    // Uses default primary color (#00B8A9 teal)
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    textAlign: 'center',
  },
});

export default Home;

