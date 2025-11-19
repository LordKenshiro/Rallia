import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import AppHeader from '../components/AppHeader';
import MatchCard, { Match } from '../components/MatchCard';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

const Home = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
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
      
      // For now, using sample data
      const sampleMatches: Match[] = [
        {
          id: '1',
          title: "Jaad's Singles",
          ageRestriction: '25+',
          date: 'Nov 10',
          time: '6:00PM - 7:00PM',
          location: 'IGA Stadium',
          court: 'Court 3',
          tags: ['Competitive', 'Men Only', 'Open Access'],
          participantCount: 4,
          participantImages: [],
        },
        {
          id: '2',
          title: "Emy's Doubles",
          ageRestriction: '25+',
          date: 'Nov 11',
          time: '9:00AM - 11:00AM',
          location: 'MLK Tennis Courts',
          court: 'No Court',
          tags: ['Practice', 'All Gender', 'Closed Access'],
          participantCount: 6,
          participantImages: [],
        },
        {
          id: '3',
          title: "Sara's Singles",
          ageRestriction: '25+',
          date: 'Nov 11',
          time: '2:00PM - 3:30PM',
          location: 'Jeanne-Mance Park',
          court: 'Court 9',
          tags: ['Competitive', 'Women Only', 'Closed Access'],
          participantCount: 3,
          participantImages: [],
        },
      ];
      
      setMatches(sampleMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleSignIn = () => {
    // TODO: Navigate to sign-in screen or open auth modal
    console.log('Navigate to sign in');
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
            <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
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
