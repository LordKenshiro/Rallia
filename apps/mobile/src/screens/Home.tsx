import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MatchCard,
  LocationPermissionOverlay,
  CalendarAccessOverlay,
  Text,
  Heading,
  Button,
  Spinner,
} from '@rallia/shared-components';
import {
  AuthOverlay,
  AuthSuccessOverlay,
  PersonalInformationOverlay,
  SportSelectionOverlay,
  TennisRatingOverlay,
  PickleballRatingOverlay,
  PlayerPreferencesOverlay,
  PlayerAvailabilitiesOverlay,
} from '../features/onboarding/components';
import { useAuth, useOnboardingFlow } from '../hooks';
import { useProfile } from '@rallia/shared-hooks';
import { Logger } from '@rallia/shared-services';
import { getMockMatches } from '../features/matches/data/mockMatches';
import { Match } from '../types';

const Home = () => {
  // Use custom hooks for auth, profile, and onboarding flow
  const { session, loading } = useAuth();
  const { profile } = useProfile();
  const onboarding = useOnboardingFlow();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const welcomeOpacity = useState(new Animated.Value(1))[0];

  // Extract display name from profile
  const displayName = profile?.display_name || null;

  // Show location permission overlay on first load
  useEffect(() => {
    onboarding.showLocationPermissionOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                onPress={onboarding.startOnboarding}
                style={styles.signInButton}
              >
                Sign Up
              </Button>
              <Button
                variant="primary"
                onPress={onboarding.startLogin}
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

      {/* Auth Overlay */}
      <AuthOverlay
        visible={onboarding.showAuthOverlay}
        onClose={onboarding.closeAuthOverlay}
        onAuthSuccess={onboarding.handleAuthSuccess}
        onReturningUser={() => {
          Logger.debug('returning_user_skip_onboarding');
          onboarding.closeAuthOverlay();
          // Returning users go directly to the app (overlay closes)
        }}
        currentStep={onboarding.currentStep}
        totalSteps={onboarding.totalSteps}
        mode={onboarding.authMode}
      />

      {/* Location Permission Overlay */}
      <LocationPermissionOverlay
        visible={onboarding.showLocationPermission}
        onAccept={onboarding.handleAcceptLocation}
        onRefuse={onboarding.handleRefuseLocation}
      />

      {/* Calendar Access Overlay */}
      <CalendarAccessOverlay
        visible={onboarding.showCalendarAccess}
        onAccept={onboarding.handleAcceptCalendar}
        onRefuse={onboarding.handleRefuseCalendar}
      />

      {/* Personal Information Overlay */}
      <PersonalInformationOverlay
        visible={onboarding.showPersonalInfo}
        onClose={onboarding.closePersonalInfo}
        onBack={onboarding.backFromPersonalInfo}
        onContinue={onboarding.handlePersonalInfoContinue}
        currentStep={onboarding.currentStep}
        totalSteps={onboarding.totalSteps}
      />

      {/* Sport Selection Overlay */}
      <SportSelectionOverlay
        visible={onboarding.showSportSelection}
        onClose={onboarding.closeSportSelection}
        onBack={onboarding.backFromSportSelection}
        onContinue={onboarding.handleSportSelectionContinue}
        currentStep={onboarding.currentStep}
        totalSteps={onboarding.totalSteps}
      />

      {/* Tennis Rating Overlay */}
      <TennisRatingOverlay
        visible={onboarding.showTennisRating}
        onClose={onboarding.closeTennisRating}
        onBack={onboarding.backFromTennisRating}
        onContinue={onboarding.handleTennisRatingContinue}
        currentStep={onboarding.currentStep}
        totalSteps={onboarding.totalSteps}
      />

      {/* Pickleball Rating Overlay */}
      <PickleballRatingOverlay
        visible={onboarding.showPickleballRating}
        onClose={onboarding.closePickleballRating}
        onBack={onboarding.backFromPickleballRating}
        onContinue={onboarding.handlePickleballRatingContinue}
        currentStep={onboarding.currentStep}
        totalSteps={onboarding.totalSteps}
      />

      {/* Player Preferences Overlay */}
      <PlayerPreferencesOverlay
        visible={onboarding.showPlayerPreferences}
        onClose={onboarding.closePlayerPreferences}
        onBack={onboarding.backFromPlayerPreferences}
        onContinue={onboarding.handlePlayerPreferencesContinue}
        selectedSports={onboarding.selectedSports}
        currentStep={onboarding.currentStep}
        totalSteps={onboarding.totalSteps}
      />

      {/* Player Availabilities Overlay */}
      <PlayerAvailabilitiesOverlay
        visible={onboarding.showPlayerAvailabilities}
        onClose={onboarding.closePlayerAvailabilities}
        onBack={onboarding.backFromPlayerAvailabilities}
        onContinue={onboarding.handlePlayerAvailabilitiesContinue}
        selectedSportIds={onboarding.selectedSportIds}
        currentStep={onboarding.currentStep}
        totalSteps={onboarding.totalSteps}
      />

      {/* Auth Success Overlay - Not counted in progress */}
      <AuthSuccessOverlay
        visible={onboarding.showAuthSuccess}
        onClose={onboarding.closeAuthSuccess}
      />
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

