import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import AppHeader from '../components/AppHeader';
import { MatchCard } from '../features/matches/components';
import {
  AuthOverlay,
  PersonalInformationOverlay,
  SportSelectionOverlay,
} from '../features/onboarding/components';
import {
  LocationPermissionOverlay,
  CalendarAccessOverlay,
} from '../components/overlays';
import { useAuth, useOnboardingFlow } from '../hooks';
import { getMockMatches } from '../features/matches/data/mockMatches';
import { COLORS } from '../constants';
import { Match } from '../types';

const Home = () => {
  // Use custom hooks for auth and onboarding flow
  const { session, loading, signOut } = useAuth();
  const onboarding = useOnboardingFlow();
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Show location permission overlay on first load
  useEffect(() => {
    onboarding.showLocationPermissionOnMount();
  }, []);

  // Fetch matches from Supabase
  useEffect(() => {
    fetchMatches();
  }, []);

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
      console.error('Error fetching matches:', error);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader backgroundColor="#C8F2EF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B8A9" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader backgroundColor="#C8F2EF" />
      
      <View style={styles.contentWrapper}>
        {!session && (
          <View style={styles.matchesSection}>
            <Text style={styles.sectionTitle}>🎾 Your Matches</Text>
            <Text style={styles.sectionSubtitle}>
              You must sign in to create and{'\n'}access your matches
            </Text>
            <TouchableOpacity style={styles.signInButton} onPress={onboarding.startOnboarding}>
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {session && (
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back! 👋</Text>
            <Text style={styles.userEmail}>{session.user.email}</Text>
          </View>
        )}
        
        <View style={styles.sectionHeader}>
          <Text style={styles.nearbyTitle}>🔍 Soon & Nearby</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View All &gt;</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loadingMatches ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00B8A9" />
            </View>
          ) : matches.length > 0 ? (
            matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onPress={() => console.log('Match pressed:', match.id)}
              />
            ))
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>No matches available</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Auth Overlay */}
      <AuthOverlay 
        visible={onboarding.showAuthOverlay} 
        onClose={onboarding.closeAuthOverlay}
        onAuthSuccess={onboarding.handleAuthSuccess}
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
        onContinue={onboarding.handlePersonalInfoContinue}
      />

      {/* Sport Selection Overlay */}
      <SportSelectionOverlay
        visible={onboarding.showSportSelection}
        onClose={onboarding.closeSportSelection}
        onContinue={onboarding.handleSportSelectionContinue}
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  signInButton: {
    backgroundColor: '#FF7B9C',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  nearbyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAll: {
    fontSize: 14,
    color: '#666',
  },
  placeholderContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default Home;
