import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Text, Button } from '@rallia/shared-components';
import { COLORS } from '@rallia/shared-constants';
import { supabase } from '@rallia/shared-services';
import * as Haptics from 'expo-haptics';
import TennisRatingOverlay from '../features/onboarding/components/overlays/TennisRatingOverlay';
import PickleballRatingOverlay from '../features/onboarding/components/overlays/PickleballRatingOverlay';
import PeerRatingRequestOverlay from '../features/sport-profile/components/PeerRatingRequestOverlay';
import ReferenceRequestOverlay from '../features/sport-profile/components/ReferenceRequestOverlay';
import { TennisPreferencesOverlay } from '../features/sport-profile/components/TennisPreferencesOverlay';
import { PickleballPreferencesOverlay } from '../features/sport-profile/components/PickleballPreferencesOverlay';

type SportProfileRouteProp = RouteProp<{
  params: {
    sportId: string;
    sportName: string;
  };
}, 'params'>;

interface RatingInfo {
  ratingScoreId: string; // ID of the rating_score record
  ratingTypeName: string;
  displayLabel: string;
  scoreValue: number;
  skillLevel: string;
  isVerified: boolean;
  verifiedAt: string | null;
  minValue: number;
  maxValue: number;
  description: string;
}

interface PreferencesInfo {
  matchDuration: string | null;
  matchType: string | null;
  facilityName: string | null;
  playingStyle: string | null;
}

interface PlayAttributeValue {
  attributeName: string;
  attributeValue: string;
}

const SportProfile = () => {
  const navigation = useNavigation();
  const route = useRoute<SportProfileRouteProp>();
  const { sportId, sportName } = route.params;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [isActive, setIsActive] = useState(false);
  const [playerSportId, setPlayerSportId] = useState<string | null>(null);
  const [ratingInfo, setRatingInfo] = useState<RatingInfo | null>(null);
  const [preferences, setPreferences] = useState<PreferencesInfo>({
    matchDuration: null,
    matchType: null,
    facilityName: null,
    playingStyle: null,
  });
  const [playAttributes] = useState<PlayAttributeValue[]>([]);
  const [showTennisRatingOverlay, setShowTennisRatingOverlay] = useState(false);
  const [showPickleballRatingOverlay, setShowPickleballRatingOverlay] = useState(false);
  const [showPeerRatingRequestOverlay, setShowPeerRatingRequestOverlay] = useState(false);
  const [showReferenceRequestOverlay, setShowReferenceRequestOverlay] = useState(false);
  const [showPreferencesOverlay, setShowPreferencesOverlay] = useState(false);

  useEffect(() => {
    fetchSportProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSportProfileData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      setUserId(user.id);

      // Fetch player's sport connection
      const { data: playerSportData, error: playerSportError } = await supabase
        .from('player_sport')
        .select('id, is_active, preferred_match_duration, preferred_match_type, is_primary')
        .eq('player_id', user.id)
        .eq('sport_id', sportId)
        .maybeSingle();

      if (playerSportError && playerSportError.code !== 'PGRST116') {
        throw playerSportError;
      }

      if (playerSportData) {
        setIsActive(playerSportData.is_active || false);
        setPlayerSportId(playerSportData.id);
        setPreferences(prev => ({
          ...prev,
          matchDuration: playerSportData.preferred_match_duration || null,
          matchType: playerSportData.preferred_match_type || null,
        }));
      } else {
        setIsActive(false);
        setPlayerSportId(null);
      }

      // Only fetch rating and preferences if sport is active
      if (playerSportData?.is_active) {
        // Fetch player's rating for this sport
        // First, get all player ratings and filter by sport manually
        console.log('Fetching ratings for player:', user.id);
        const { data: ratingDataList, error: ratingError } = await supabase
          .from('player_rating_score')
          .select(`
            rating_score_id,
            is_verified,
            verified_at,
            rating_score (
              id,
              score_value,
              display_label,
              skill_level,
              rating (
                rating_type,
                display_name,
                description,
                min_value,
                max_value,
                sport_id
              )
            )
          `)
          .eq('player_id', user.id);

        if (ratingError && ratingError.code !== 'PGRST116') {
          console.error('Rating fetch error:', ratingError);
        }

        console.log('All ratings fetched:', JSON.stringify(ratingDataList, null, 2));
        console.log('Looking for sport:', sportName, 'with ID:', sportId);

        // Filter by sport_id in JavaScript since nested filtering doesn't work well
        const ratingData = ratingDataList?.find(item => {
          const ratingScore = item.rating_score as {
            id?: string;
            rating?: { sport_id?: string };
          } | null;
          console.log('Checking rating_score:', ratingScore?.id, 'sport:', ratingScore?.rating?.sport_id);
          return ratingScore?.rating?.sport_id === sportId;
        }) || null;

        console.log('Rating data found for', sportName, ':', JSON.stringify(ratingData, null, 2));

        if (ratingData) {
          const ratingScore = ratingData.rating_score as {
            id?: string;
            display_label?: string;
            score_value?: number;
            skill_level?: string;
            rating?: {
              display_name?: string;
              min_value?: number;
              max_value?: number;
              description?: string;
            };
          } | null;
          const rating = ratingScore?.rating;
          const newRatingInfo = {
            ratingScoreId: ratingScore?.id || ratingData.rating_score_id || '',
            ratingTypeName: rating?.display_name || '',
            displayLabel: ratingScore?.display_label || '',
            scoreValue: ratingScore?.score_value || 0,
            skillLevel: ratingScore?.skill_level || '',
            isVerified: ratingData.is_verified || false,
            verifiedAt: ratingData.verified_at || null,
            minValue: rating?.min_value || 0,
            maxValue: rating?.max_value || 10,
            description: rating?.description || '',
          };
          console.log('Setting rating info:', newRatingInfo);
          setRatingInfo(newRatingInfo);
        } else {
          console.log('No rating data found, clearing rating info');
          setRatingInfo(null);
        }

        // Note: Facility preference would come from a separate player_facility table
        // For now, we'll leave it as null since the table doesn't exist yet
      }

    } catch (error) {
      console.error('Error fetching sport profile data:', error);
      Alert.alert('Error', 'Failed to load sport profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRating = async (ratingScoreId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      console.log('=== SAVING RATING (NEW SOURCE_TYPE LOGIC) ===');
      console.log('New rating_score_id:', ratingScoreId);
      console.log('Current sport ID:', sportId);

      // Step 1: Get ALL player ratings with source_type
      const { data: allPlayerRatings, error: fetchError } = await supabase
        .from('player_rating_score')
        .select(`
          id,
          rating_score_id,
          source_type,
          is_verified,
          rating_score (
            id,
            rating (
              sport_id
            )
          )
        `)
        .eq('player_id', user.id);

      if (fetchError) {
        console.error('Error fetching player ratings:', fetchError);
        throw fetchError;
      }

      console.log('All player ratings before save:', allPlayerRatings);

      // Step 2: Find and DELETE only SELF_REPORTED ratings for this specific sport
      const ratingsToDelete = allPlayerRatings?.filter(item => {
        const ratingScoreData = Array.isArray(item.rating_score) ? item.rating_score[0] : item.rating_score;
        if (!ratingScoreData) return false;
        
        const ratingData = Array.isArray(ratingScoreData.rating) ? ratingScoreData.rating[0] : ratingScoreData.rating;
        const itemSportId = ratingData?.sport_id;
        const sourceType = item.source_type || 'self_reported'; // Default to self_reported for old data
        
        // Only delete self_reported ratings for current sport
        const shouldDelete = itemSportId === sportId && sourceType === 'self_reported';
        
        console.log('Rating ID:', item.id, 'sport:', itemSportId, 'source:', sourceType, 'delete:', shouldDelete);
        return shouldDelete;
      }) || [];

      console.log('Self-reported ratings to delete for sport', sportId, ':', ratingsToDelete.length);

      // Delete only self_reported ratings (keep peer_verified, api_verified, admin_verified)
      for (const rating of ratingsToDelete) {
        console.log('Deleting self_reported rating:', rating.id);
        const { error: deleteError } = await supabase
          .from('player_rating_score')
          .delete()
          .eq('id', rating.id);

        if (deleteError) {
          console.error('Error deleting rating:', rating.id, deleteError);
          throw deleteError;
        }
        console.log('✓ Deleted self_reported rating:', rating.id);
      }

      // Step 3: Insert the new self_reported rating
      console.log('Inserting new self_reported rating...');
      const { error: insertError } = await supabase
        .from('player_rating_score')
        .insert({
          player_id: user.id,
          rating_score_id: ratingScoreId,
          source_type: 'self_reported', // NEW: Explicitly self-reported
          is_verified: false,
          is_primary: true, // NEW: Mark as primary display rating
        });

      if (insertError) {
        console.error('Error inserting new rating:', insertError);
        throw insertError;
      }

      console.log('✅ Rating save completed successfully (self_reported)');

      // Close overlays first
      setShowTennisRatingOverlay(false);
      setShowPickleballRatingOverlay(false);

      // Clear current rating state to force refresh
      setRatingInfo(null);

      // Add a small delay to ensure database has committed the transaction
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh data
      console.log('Refreshing sport profile data...');
      await fetchSportProfileData();
      console.log('Sport profile data refreshed');

      // Show success message
      Alert.alert('Success', 'Your rating has been updated!');
    } catch (error) {
      console.error('Error saving rating:', error);
      Alert.alert('Error', 'Failed to save rating. Please try again.');
    }
  };

  const handleToggleActive = async (newValue: boolean) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      if (playerSportId) {
        // Entry exists: Update is_active field
        const { error: updateError } = await supabase
          .from('player_sport')
          .update({ is_active: newValue })
          .eq('id', playerSportId);

        if (updateError) throw updateError;

        setIsActive(newValue);

        // Show success message
        const message = newValue 
          ? `${sportName} activated successfully!` 
          : `${sportName} deactivated`;
        
        if (Platform.OS === 'android') {
          ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
          Alert.alert('Success', message);
        }

        // Refresh data if activated
        if (newValue) {
          await fetchSportProfileData();
        }
      } else {
        // No entry exists
        if (newValue) {
          // User wants to play this sport: Create new entry with is_active = true
          const { data: newRecord, error: insertError } = await supabase
            .from('player_sport')
            .insert({
              player_id: user.id,
              sport_id: sportId,
              is_active: true,
              is_primary: false,
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          if (newRecord) setPlayerSportId(newRecord.id);

          setIsActive(true);

          // Show success message
          const message = `${sportName} added and activated successfully!`;
          if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.SHORT);
          } else {
            Alert.alert('Success', message);
          }

          // Refresh data to load ratings and preferences
          await fetchSportProfileData();
        } else {
          // User doesn't want to play this sport: Don't create entry, just update UI
          setIsActive(false);
          
          // Optional: Show a subtle message
          if (Platform.OS === 'android') {
            ToastAndroid.show(`${sportName} not added`, ToastAndroid.SHORT);
          }
        }
      }

    } catch (error) {
      console.error('Error toggling sport active status:', error);
      Alert.alert('Error', 'Failed to update sport status');
    }
  };

  const formatMatchDuration = (duration: string | null): string => {
    if (!duration) return 'Not set';
    return duration.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatMatchType = (type: string | null): string => {
    if (!type) return 'Not set';
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleSendPeerRatingRequests = async (selectedPlayerIds: string[]) => {
    try {
      // TODO: Implement peer rating request logic
      // This will insert records into peer_rating_request table
      console.log('Sending peer rating requests to:', selectedPlayerIds);
      
      // For now, just show a success message
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          `Peer rating requests sent to ${selectedPlayerIds.length} player(s)`,
          ToastAndroid.SHORT
        );
      } else {
        Alert.alert(
          'Success',
          `Peer rating requests sent to ${selectedPlayerIds.length} player(s)`
        );
      }
      
      setShowPeerRatingRequestOverlay(false);
    } catch (error) {
      console.error('Error sending peer rating requests:', error);
      Alert.alert('Error', 'Failed to send peer rating requests');
    }
  };

  const handleSendReferenceRequests = async (selectedPlayerIds: string[]) => {
    try {
      // TODO: Implement reference request logic
      // This will insert records into reference_request table
      console.log('Sending reference requests to:', selectedPlayerIds);
      
      // For now, just show a success message
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          `Reference requests sent to ${selectedPlayerIds.length} certified player(s)`,
          ToastAndroid.SHORT
        );
      } else {
        Alert.alert(
          'Success',
          `Reference requests sent to ${selectedPlayerIds.length} certified player(s)`
        );
      }
      
      setShowReferenceRequestOverlay(false);
    } catch (error) {
      console.error('Error sending reference requests:', error);
      Alert.alert('Error', 'Failed to send reference requests');
    }
  };

  const handleSavePreferences = async (updatedPreferences: {
    matchDuration?: string;
    matchType?: string;
    court?: string;
    playStyle?: string;
    playAttributes?: string[];
  }) => {
    try {
      if (!playerSportId) {
        Alert.alert('Error', 'Player sport profile not found');
        return;
      }

      const { error } = await supabase
        .from('player_sport')
        .update({
          preferred_match_duration: updatedPreferences.matchDuration,
          preferred_match_type: updatedPreferences.matchType,
          preferred_court: updatedPreferences.court,
          preferred_play_style: updatedPreferences.playStyle,
          preferred_play_attributes: updatedPreferences.playAttributes,
        })
        .eq('id', playerSportId);

      if (error) throw error;

      // Update local state
      setPreferences({
        matchDuration: updatedPreferences.matchDuration || null,
        matchType: updatedPreferences.matchType || null,
        facilityName: updatedPreferences.court || null,
        playingStyle: updatedPreferences.playStyle || null,
      });

      // Close overlay
      setShowPreferencesOverlay(false);

      // Show success message
      if (Platform.OS === 'android') {
        ToastAndroid.show('Preferences updated successfully', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Preferences updated successfully');
      }

      // Refresh data
      await fetchSportProfileData();
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{sportName} Profile</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading {sportName} profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Do you play this sport? Toggle */}
        <View style={styles.card}>
          <Text style={styles.questionText}>Do you play {sportName}?</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                isActive && styles.toggleButtonActive,
              ]}
              onPress={() => handleToggleActive(true)}
            >
              <Text style={
                isActive 
                  ? [styles.toggleButtonText, styles.toggleButtonTextActive]
                  : styles.toggleButtonText
              }>
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                !isActive && styles.toggleButtonInactive,
              ]}
              onPress={() => handleToggleActive(false)}
            >
              <Text style={
                !isActive
                  ? [styles.toggleButtonText, styles.toggleButtonTextActive]
                  : styles.toggleButtonText
              }>
                No
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Show blank space when not active */}
        {!isActive && (
          <View style={styles.inactiveContainer}>
            <Ionicons name="information-circle-outline" size={48} color="#ccc" />
            <Text style={styles.inactiveText}>
              Activate {sportName} to view and manage your rating and preferences
            </Text>
          </View>
        )}

        {/* My Rating Section - Only show when active */}
        {isActive && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>MY RATING</Text>
              <TouchableOpacity 
                style={styles.editIconButton}
                onPress={() => {
                  // Determine which overlay to show based on sport name
                  if (sportName.toLowerCase() === 'tennis') {
                    setShowTennisRatingOverlay(true);
                  } else if (sportName.toLowerCase() === 'pickleball') {
                    setShowPickleballRatingOverlay(true);
                  }
                }}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              {ratingInfo ? (
                <>
                  {/* Rating Level Display */}
                  <View style={styles.ratingDisplay}>
                    <View style={styles.ratingBadgeLarge}>
                      <Text style={styles.ratingLevelText}>{ratingInfo.displayLabel}</Text>
                      <Text style={styles.ratingTypeText}>{ratingInfo.ratingTypeName}</Text>
                    </View>
                    {ratingInfo.isVerified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.verifiedText}>Certified</Text>
                      </View>
                    )}
                  </View>

                  {/* Rating Description */}
                  {ratingInfo.description && (
                    <Text style={styles.ratingDescription}>{ratingInfo.description}</Text>
                  )}

                  {/* Rating Details */}
                  <View style={styles.ratingDetails}>
                    <View style={styles.ratingDetailRow}>
                      <Text style={styles.detailLabel}>Skill Level:</Text>
                      <Text style={styles.detailValue}>{ratingInfo.skillLevel || 'N/A'}</Text>
                    </View>
                    <View style={styles.ratingDetailRow}>
                      <Text style={styles.detailLabel}>Score:</Text>
                      <Text style={styles.detailValue}>
                        {ratingInfo.scoreValue} / {ratingInfo.maxValue}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => {}}
                      style={styles.actionButton}
                      leftIcon={<Ionicons name="people" size={16} color={COLORS.primary} />}
                    >
                      6 References
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => {}}
                      style={styles.actionButton}
                      leftIcon={<Ionicons name="star" size={16} color={COLORS.primary} />}
                    >
                      2 Peer Rating
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => {}}
                      style={styles.actionButton}
                      leftIcon={<Ionicons name="document-text" size={16} color={COLORS.primary} />}
                    >
                      1 Rating Proof
                    </Button>
                  </View>

                  {/* Request Buttons */}
                  <View style={styles.requestButtons}>
                    <Button
                      variant="secondary"
                      size="md"
                      onPress={() => setShowReferenceRequestOverlay(true)}
                      style={styles.requestButton}
                      leftIcon={<Ionicons name="add-circle" size={18} color="#fff" />}
                    >
                      Request reference
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onPress={() => setShowPeerRatingRequestOverlay(true)}
                      style={styles.requestButton}
                      leftIcon={<Ionicons name="add-circle" size={18} color="#fff" />}
                    >
                      Request peer rating
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onPress={() => {}}
                      style={styles.requestButton}
                      leftIcon={<Ionicons name="folder-open" size={18} color="#fff" />}
                    >
                      Manage rating proofs
                    </Button>
                  </View>
                </>
              ) : (
                <View style={styles.noRatingContainer}>
                  <Text style={styles.noRatingText}>No rating information yet</Text>
                  <Text style={styles.noRatingSubtext}>
                    Set up your rating to start playing
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* My Preferences Section - Only show when active */}
        {isActive && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>MY PREFERENCES</Text>
              <TouchableOpacity 
                style={styles.editIconButton}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowPreferencesOverlay(true);
                }}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              {/* Match Duration */}
              <View style={styles.preferenceRow}>
                <Text style={styles.preferenceLabel}>Match Duration</Text>
                <Text style={styles.preferenceValue}>
                  {formatMatchDuration(preferences.matchDuration)}
                </Text>
              </View>

              {/* Match Type */}
              <View style={styles.preferenceRow}>
                <Text style={styles.preferenceLabel}>Match Type</Text>
                <Text style={styles.preferenceValue}>
                  {formatMatchType(preferences.matchType)}
                </Text>
              </View>

              {/* Facility */}
              <View style={styles.preferenceRow}>
                <Text style={styles.preferenceLabel}>Facility</Text>
                <Text style={styles.preferenceValue}>
                  {preferences.facilityName || 'Not set'}
                </Text>
              </View>

              {/* Playing Style (for Tennis: Server & Volley, etc.) */}
              <View style={styles.preferenceRow}>
                <Text style={styles.preferenceLabel}>Playing Style</Text>
                <Text style={styles.preferenceValue}>
                  {preferences.playingStyle || 'Not set'}
                </Text>
              </View>

              {/* Play Attributes */}
              {playAttributes.length > 0 && (
                <View style={styles.playAttributesContainer}>
                  <Text style={styles.playAttributesTitle}>Play Attributes</Text>
                  <View style={styles.attributeTags}>
                    {playAttributes.map((attr, index) => (
                      <View key={index} style={styles.attributeTag}>
                        <Text style={styles.attributeTagText}>{attr.attributeValue}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Tennis Rating Edit Overlay */}
      <TennisRatingOverlay
        visible={showTennisRatingOverlay}
        onClose={() => setShowTennisRatingOverlay(false)}
        mode="edit"
        initialRating={ratingInfo?.ratingScoreId}
        onSave={handleSaveRating}
      />

      {/* Pickleball Rating Edit Overlay */}
      <PickleballRatingOverlay
        visible={showPickleballRatingOverlay}
        onClose={() => setShowPickleballRatingOverlay(false)}
        mode="edit"
        initialRating={ratingInfo?.ratingScoreId}
        onSave={handleSaveRating}
      />

      {/* Peer Rating Request Overlay */}
      <PeerRatingRequestOverlay
        visible={showPeerRatingRequestOverlay}
        onClose={() => setShowPeerRatingRequestOverlay(false)}
        currentUserId={userId}
        sportId={sportId}
        onSendRequests={handleSendPeerRatingRequests}
      />

      {/* Reference Request Overlay */}
      <ReferenceRequestOverlay
        visible={showReferenceRequestOverlay}
        onClose={() => setShowReferenceRequestOverlay(false)}
        currentUserId={userId}
        sportId={sportId}
        onSendRequests={handleSendReferenceRequests}
      />

      {/* Tennis Preferences Overlay */}
      {sportName === 'Tennis' && (
        <TennisPreferencesOverlay
          visible={showPreferencesOverlay}
          onClose={() => setShowPreferencesOverlay(false)}
          onSave={handleSavePreferences}
          initialPreferences={{
            matchDuration: preferences.matchDuration || undefined,
            matchType: preferences.matchType || undefined,
            court: preferences.facilityName || undefined,
            playStyle: (preferences.playingStyle as 'counterpuncher' | 'aggressive_baseliner' | 'serve_and_volley' | 'all_court') || undefined,
            playAttributes: [],
          }}
        />
      )}

      {/* Pickleball Preferences Overlay */}
      {sportName === 'Pickleball' && (
        <PickleballPreferencesOverlay
          visible={showPreferencesOverlay}
          onClose={() => setShowPreferencesOverlay(false)}
          onSave={handleSavePreferences}
          initialPreferences={{
            matchDuration: preferences.matchDuration || undefined,
            matchType: preferences.matchType || undefined,
            court: preferences.facilityName || undefined,
            playStyle: (preferences.playingStyle as 'counterpuncher' | 'aggressive_baseliner' | 'serve_and_volley' | 'all_court') || undefined,
            playAttributes: [],
          }}
        />
      )}
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleButtonInactive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  inactiveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 32,
  },
  inactiveText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 1,
  },
  editIconButton: {
    padding: 4,
  },
  ratingDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingBadgeLarge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingLevelText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ratingTypeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  ratingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  ratingDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 16,
    marginBottom: 16,
  },
  ratingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    minWidth: '30%',
  },
  requestButtons: {
    gap: 10,
  },
  requestButton: {
    width: '100%',
  },
  noRatingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noRatingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  noRatingSubtext: {
    fontSize: 14,
    color: '#999',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  preferenceLabel: {
    fontSize: 14,
    color: '#666',
  },
  preferenceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  playAttributesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  playAttributesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  attributeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attributeTag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  attributeTagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default SportProfile;
