import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, Heading } from '@rallia/shared-components';
import { COLORS } from '@rallia/shared-constants';
import { supabase } from '@rallia/shared-services';
import { useImagePicker } from '../hooks';
import PersonalInformationOverlay from '../features/onboarding/components/overlays/PersonalInformationOverlay';
import PlayerInformationOverlay from '../features/onboarding/components/overlays/PlayerInformationOverlay';
import PlayerAvailabilitiesOverlay from '../features/onboarding/components/overlays/PlayerAvailabilitiesOverlay';
import type { 
  Profile, 
  Player, 
  Sport,
} from '@rallia/shared-types';

interface SportWithRating extends Sport {
  isActive: boolean;
  isPrimary: boolean;
  ratingLabel?: string;
}

interface AvailabilityGrid {
  [key: string]: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
}

const UserProfile = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [sports, setSports] = useState<SportWithRating[]>([]);
  const [availabilities, setAvailabilities] = useState<AvailabilityGrid>({});
  const [showPersonalInfoOverlay, setShowPersonalInfoOverlay] = useState(false);
  const [showPlayerInfoOverlay, setShowPlayerInfoOverlay] = useState(false);
  const [showAvailabilitiesOverlay, setShowAvailabilitiesOverlay] = useState(false);
  
  // Use custom hook for image picker (for profile picture editing)
  const { image: newProfileImage, pickImage } = useImagePicker();

  useEffect(() => {
    fetchUserProfileData();
  }, []);

  // Re-fetch data when screen comes into focus (e.g., when navigating back from SportProfile)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsubscribe = (navigation as any).addListener('focus', () => {
      console.log('UserProfile: Screen focused, refreshing data...');
      fetchUserProfileData();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchUserProfileData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profile')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch player data
      const { data: playerData, error: playerError } = await supabase
        .from('player')
        .select('*')
        .eq('id', user.id)
        .single();

      if (playerError && playerError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is okay
        throw playerError;
      }
      setPlayer(playerData);

      // Fetch all sports with player's selections
      const { data: allSports, error: sportsError } = await supabase
        .from('sport')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (sportsError) throw sportsError;

      // Fetch player's selected sports (include is_active flag)
      const { data: playerSports, error: playerSportsError } = await supabase
        .from('player_sport')
        .select('sport_id, is_primary, is_active')
        .eq('player_id', user.id);

      if (playerSportsError && playerSportsError.code !== 'PGRST116') {
        throw playerSportsError;
      }

      // Fetch player's ratings with source_type info
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('player_rating_score')
        .select(`
          *,
          rating_score (
            display_label,
            rating (
              sport_id
            )
          )
        `)
        .eq('player_id', user.id)
        .order('is_primary', { ascending: false }) // Primary ratings first
        .order('is_verified', { ascending: false }) // Then verified ratings
        .order('created_at', { ascending: false }); // Then most recent

      if (ratingsError && ratingsError.code !== 'PGRST116') {
        throw ratingsError;
      }

      // Map sports with active status and ratings
      const playerSportsMap = new Map(
        (playerSports || []).map(ps => [
          ps.sport_id, 
          { isPrimary: ps.is_primary || false, isActive: ps.is_active || false }
        ])
      );

      // Map ratings - prioritize is_primary=true ratings
      const ratingsMap = new Map<string, string>();
      (ratingsData || []).forEach(rating => {
        const ratingScore = rating.rating_score as { display_label?: string; rating?: { sport_id?: string } } | null;
        const sportId = ratingScore?.rating?.sport_id;
        const displayLabel = ratingScore?.display_label || '';
        
        // Only set if not already set, or if this is a primary rating
        if (sportId && (!ratingsMap.has(sportId) || rating.is_primary)) {
          ratingsMap.set(sportId, displayLabel);
        }
      });

      const sportsWithStatus: SportWithRating[] = (allSports || []).map(sport => {
        const sportInfo = playerSportsMap.get(sport.id);
        return {
          ...sport,
          isActive: sportInfo?.isActive || false,
          isPrimary: sportInfo?.isPrimary || false,
          ratingLabel: ratingsMap.get(sport.id),
        };
      });

      setSports(sportsWithStatus);

      // Fetch player availabilities
      const { data: availData, error: availError } = await supabase
        .from('player_availability')
        .select('day_of_week, time_period, is_active')
        .eq('player_id', user.id)
        .eq('is_active', true);

      if (availError && availError.code !== 'PGRST116') {
        throw availError;
      }

      // Convert availability data to grid format
      const availGrid: AvailabilityGrid = {
        monday: { morning: false, afternoon: false, evening: false },
        tuesday: { morning: false, afternoon: false, evening: false },
        wednesday: { morning: false, afternoon: false, evening: false },
        thursday: { morning: false, afternoon: false, evening: false },
        friday: { morning: false, afternoon: false, evening: false },
        saturday: { morning: false, afternoon: false, evening: false },
        sunday: { morning: false, afternoon: false, evening: false },
      };

      (availData || []).forEach(avail => {
        if (availGrid[avail.day_of_week]) {
          availGrid[avail.day_of_week][avail.time_period] = true;
        }
      });

      setAvailabilities(availGrid);

    } catch (error) {
      console.error('Error fetching user profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Convert DB format to UI format for the overlay
  const convertToUIFormat = (dbAvailabilities: AvailabilityGrid) => {
    const dayMap: { [key: string]: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun' } = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
    };

    const timeMap: { [key: string]: 'AM' | 'PM' | 'EVE' } = {
      morning: 'AM',
      afternoon: 'PM',
      evening: 'EVE',
    };

    const uiFormat: any = {};
    
    Object.keys(dbAvailabilities).forEach((day) => {
      const uiDay = dayMap[day];
      if (uiDay) {
        uiFormat[uiDay] = {
          AM: dbAvailabilities[day].morning,
          PM: dbAvailabilities[day].afternoon,
          EVE: dbAvailabilities[day].evening,
        };
      }
    });

    return uiFormat;
  };

  // Handle saving availabilities from the overlay
  const handleSaveAvailabilities = async (uiAvailabilities: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Convert UI format back to DB format
      const dayMap: { [key: string]: string } = {
        Mon: 'monday',
        Tue: 'tuesday',
        Wed: 'wednesday',
        Thu: 'thursday',
        Fri: 'friday',
        Sat: 'saturday',
        Sun: 'sunday',
      };

      const timeMap: { [key: string]: string } = {
        AM: 'morning',
        PM: 'afternoon',
        EVE: 'evening',
      };

      // Get the user's primary sport to save availabilities for
      const primarySport = sports.find(s => s.isPrimary && s.isActive);
      if (!primarySport) {
        Alert.alert('Error', 'No primary sport found. Please set a primary sport first.');
        return;
      }

      // Delete existing availabilities for this sport
      await supabase
        .from('player_availability')
        .delete()
        .eq('player_id', user.id)
        .eq('sport_id', primarySport.id);

      // Prepare new availability data
      const availabilityData: any[] = [];
      
      Object.keys(uiAvailabilities).forEach((day) => {
        Object.keys(uiAvailabilities[day]).forEach((slot) => {
          if (uiAvailabilities[day][slot]) {
            availabilityData.push({
              player_id: user.id,
              sport_id: primarySport.id,
              day_of_week: dayMap[day],
              time_period: timeMap[slot],
              is_active: true,
            });
          }
        });
      });

      // Insert new availabilities
      if (availabilityData.length > 0) {
        const { error } = await supabase
          .from('player_availability')
          .insert(availabilityData);

        if (error) throw error;
      }

      // Refresh the data
      await fetchUserProfileData();
      
      // Close the overlay
      setShowAvailabilitiesOverlay(false);
      
      Alert.alert('Success', 'Your availabilities have been updated!');
    } catch (error) {
      console.error('Error saving availabilities:', error);
      Alert.alert('Error', 'Failed to save availabilities. Please try again.');
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatJoinedDate = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long',
    });
  };

  const formatGender = (gender: string | null): string => {
    if (!gender) return 'Not set';
    const genderMap: { [key: string]: string } = {
      male: 'Male',
      female: 'Female',
      other: 'Non-binary',
      prefer_not_to_say: 'Prefer not to say',
    };
    return genderMap[gender] || gender;
  };

  const formatPlayingHand = (hand: string | null): string => {
    if (!hand) return 'Not set';
    const handMap: { [key: string]: string } = {
      left: 'Left',
      right: 'Right',
      both: 'Both',
    };
    return handMap[hand] || hand;
  };

  const getDayLabel = (day: string): string => {
    const dayMap: { [key: string]: string } = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
    };
    return dayMap[day] || day;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Heading level={3}>User Profile</Heading>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Picture with Edit Overlay - Same as PersonalInformationOverlay */}
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.profilePicContainer}
            activeOpacity={0.8}
            onPress={pickImage}
          >
            {profile?.profile_picture_url || newProfileImage ? (
              <Image 
                source={{ uri: newProfileImage || profile?.profile_picture_url || '' }} 
                style={styles.profileImage} 
              />
            ) : (
              <Ionicons name="camera" size={32} color={COLORS.primary} />
            )}
          </TouchableOpacity>
          
          {/* Name and Username */}
          <Text style={styles.profileName}>
            {profile?.display_name || profile?.full_name || 'User'}
          </Text>
          <Text style={styles.username}>
            @{profile?.display_name?.toLowerCase().replace(/\s/g, '') || 'username'}
          </Text>
          
          {/* Joined Date */}
          <View style={styles.joinedContainer}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.joinedText}>
              Joined {formatJoinedDate(player?.created_at || null)}
            </Text>
          </View>
        </View>

        {/* My Personal Information with Edit Icon */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MY PERSONAL INFORMATION</Text>
            <TouchableOpacity 
              style={styles.editIconButton}
              onPress={() => setShowPersonalInfoOverlay(true)}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.card}>
            <View style={styles.compactRow}>
              <Text style={styles.label}>Full Name</Text>
              <Text style={styles.value}>{profile?.full_name || '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.compactRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{profile?.email || '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.compactRow}>
              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.value}>{profile?.phone || '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.compactRow}>
              <Text style={styles.label}>Date of Birth</Text>
              <Text style={styles.value}>{formatDate(profile?.birth_date || null)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.compactRow}>
              <Text style={styles.label}>Gender</Text>
              <Text style={styles.value}>{formatGender(player?.gender || null)}</Text>
            </View>
          </View>
        </View>

        {/* My Player Information with Edit Icon */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MY PLAYER INFORMATION</Text>
            <TouchableOpacity 
              style={styles.editIconButton}
              onPress={() => setShowPlayerInfoOverlay(true)}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.card}>
            {/* Bio - Vertical Layout */}
            <View style={styles.verticalField}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <Text style={styles.fieldValue}>
                {profile?.bio || 'No bio yet'}
              </Text>
            </View>
            
            {/* Playing Hand and Max Travel Distance - Side by Side */}
            <View style={styles.horizontalFieldsContainer}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Playing Hand</Text>
                <Text style={styles.fieldValue}>
                  {formatPlayingHand(player?.playing_hand || null)}
                </Text>
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Max Travel Distance</Text>
                <Text style={styles.fieldValue}>
                  {player?.max_travel_distance ? `${player.max_travel_distance} km` : '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* My Sports - Horizontal Cards with Chevrons - Show ALL sports */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MY SPORTS</Text>
            <TouchableOpacity style={styles.editIconButton}>
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.sportsCardsContainer}>
            {sports.map(sport => (
              <TouchableOpacity 
                key={sport.id} 
                style={[
                  styles.sportCard,
                  !sport.isActive && styles.sportCardInactive,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  (navigation as any).navigate('SportProfile', {
                    sportId: sport.id,
                    sportName: sport.display_name,
                  });
                }}
              >
                <View style={styles.sportCardLeft}>
                  <Text style={
                    sport.isActive 
                      ? styles.sportName 
                      : [styles.sportName, styles.sportNameInactive]
                  }>
                    {sport.display_name}
                  </Text>
                  {sport.isActive ? (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  ) : (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveBadgeText}>Inactive</Text>
                    </View>
                  )}
                  {sport.isActive && sport.ratingLabel && (
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingBadgeText}>{sport.ratingLabel}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
            {sports.length === 0 && (
              <Text style={styles.noDataText}>No sports available</Text>
            )}
          </View>
        </View>

        {/* My Availabilities with Edit Icon */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MY AVAILABILITIES</Text>
            <TouchableOpacity 
              style={styles.editIconButton}
              onPress={() => setShowAvailabilitiesOverlay(true)}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.card}>
            {/* Availability Grid - Same as PlayerAvailabilitiesOverlay */}
            <View style={styles.gridContainer}>
              {/* Header Row */}
              <View style={styles.gridRow}>
                <View style={styles.dayCell} />
                {['AM', 'PM', 'EVE'].map((slot) => (
                  <View key={slot} style={styles.headerCell}>
                    <Text size="xs" weight="semibold" color="#666">{slot}</Text>
                  </View>
                ))}
              </View>

              {/* Day Rows */}
              {Object.keys(availabilities).map((day) => (
                <View key={day} style={styles.gridRow}>
                  <View style={styles.dayCell}>
                    <Text size="sm" weight="medium" color="#333">{getDayLabel(day)}</Text>
                  </View>
                  {['morning', 'afternoon', 'evening'].map((period) => (
                    <View key={period} style={styles.timeSlotWrapper}>
                      <View
                        style={[
                          styles.timeSlotCell,
                          availabilities[day][period] && styles.timeSlotCellSelected,
                        ]}
                      >
                        <Text
                          size="xs"
                          weight="semibold"
                          color={availabilities[day][period] ? '#fff' : '#666'}
                        >
                          {period === 'morning' ? 'AM' : period === 'afternoon' ? 'PM' : 'EVE'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Personal Information Edit Overlay */}
      <PersonalInformationOverlay
        visible={showPersonalInfoOverlay}
        onClose={() => {
          setShowPersonalInfoOverlay(false);
          // Refresh data after closing to show updated info
          fetchUserProfileData();
        }}
        mode="edit"
        initialData={{
          fullName: profile?.full_name || '',
          username: profile?.display_name || '',
          email: profile?.email || '',
          dateOfBirth: profile?.birth_date || '',
          gender: player?.gender || '',
          phoneNumber: profile?.phone || '',
        }}
      />

      {/* Player Information Edit Overlay */}
      <PlayerInformationOverlay
        visible={showPlayerInfoOverlay}
        onClose={() => {
          setShowPlayerInfoOverlay(false);
          // Refresh data after closing to show updated info
          fetchUserProfileData();
        }}
        initialData={{
          username: profile?.display_name || '',
          bio: profile?.bio || '',
          preferredPlayingHand: player?.playing_hand || '',
          maximumTravelDistance: player?.max_travel_distance || 5,
        }}
      />

      {/* Player Availabilities Edit Overlay */}
      <PlayerAvailabilitiesOverlay
        visible={showAvailabilitiesOverlay}
        onClose={() => setShowAvailabilitiesOverlay(false)}
        mode="edit"
        initialData={convertToUIFormat(availabilities)}
        onSave={handleSaveAvailabilities}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#C8F2EF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  profilePicContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  joinedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  joinedText: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  editIconButton: {
    padding: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  bioText: {
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  // Vertical Field Layout (for Player Information)
  verticalField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  // Horizontal Fields Container (for Playing Hand and Max Travel Distance side by side)
  horizontalFieldsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  halfField: {
    flex: 1,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Sports Cards - Horizontal Layout
  sportsCardsContainer: {
    gap: 12,
  },
  sportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sportCardInactive: {
    backgroundColor: '#F5F5F5',
    opacity: 0.7,
  },
  sportCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sportName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sportNameInactive: {
    color: '#999',
  },
  activeBadge: {
    backgroundColor: '#FFE5F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E91E63',
  },
  inactiveBadge: {
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inactiveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
  },
  ratingBadge: {
    backgroundColor: '#FFE5F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E91E63',
  },
  // Availability Grid Styles - Same as PlayerAvailabilitiesOverlay
  gridContainer: {
    marginTop: 8,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  dayCell: {
    width: 50,
    justifyContent: 'center',
  },
  headerCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSlotWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  timeSlotCell: {
    width: '100%',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeSlotCellSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});

export default UserProfile;
