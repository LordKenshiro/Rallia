import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppNavigation } from '../navigation/hooks';
import { Text, Skeleton, SkeletonAvatar, useToast } from '@rallia/shared-components';
import { supabase, Logger } from '@rallia/shared-services';
import { usePlayerReputation } from '@rallia/shared-hooks';
import { ReputationBadge } from '../components/ReputationBadge';
import { replaceImage } from '../services/imageUpload';
import { useImagePicker, useThemeStyles, useTranslation } from '../hooks';
import { withTimeout, getNetworkErrorMessage } from '../utils/networkTimeout';
import { getProfilePictureUrl } from '@rallia/shared-utils';
import { formatDate as formatDateUtil, formatDateMonthYear } from '../utils/dateFormatting';
import PersonalInformationOverlay from '../features/onboarding/components/overlays/PersonalInformationOverlay';
import PlayerInformationOverlay from '../features/onboarding/components/overlays/PlayerInformationOverlay';
import PlayerAvailabilitiesOverlay from '../features/onboarding/components/overlays/PlayerAvailabilitiesOverlay';
import ImagePickerSheet from '../components/ImagePickerSheet';
import type { Profile, Player, Sport } from '@rallia/shared-types';
import {
  spacingPixels,
  radiusPixels,
  fontSizePixels,
  fontWeightNumeric,
  primary,
  shadowsNative,
} from '@rallia/design-system';

interface SportWithRating extends Sport {
  isActive: boolean;
  isPrimary: boolean;
  ratingLabel?: string;
}

type PeriodKey = 'morning' | 'afternoon' | 'evening';

interface DayPeriods {
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
}

interface AvailabilityGrid {
  [key: string]: DayPeriods;
}

// Types matching PlayerAvailabilitiesOverlay's expectations
type TimeSlot = 'AM' | 'PM' | 'EVE';
type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

interface DayAvailability {
  AM: boolean;
  PM: boolean;
  EVE: boolean;
}

type WeeklyAvailability = Record<DayOfWeek, DayAvailability>;

const UserProfile = () => {
  const navigation = useAppNavigation();
  const { colors, isDark } = useThemeStyles();
  const { t, locale } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [sports, setSports] = useState<SportWithRating[]>([]);
  const [availabilities, setAvailabilities] = useState<AvailabilityGrid>({});
  const [pendingReferenceRequestsCount, setPendingReferenceRequestsCount] = useState(0);
  const [showPersonalInfoOverlay, setShowPersonalInfoOverlay] = useState(false);
  const [showPlayerInfoOverlay, setShowPlayerInfoOverlay] = useState(false);
  const [showAvailabilitiesOverlay, setShowAvailabilitiesOverlay] = useState(false);

  // Use custom hook for image picker (for profile picture editing)
  const {
    image: newProfileImage,
    showPicker,
    openPicker,
    closePicker,
    pickFromCamera,
    pickFromGallery,
    permissions,
  } = useImagePicker();

  // Player reputation data
  const { display: reputationDisplay, loading: reputationLoading } = usePlayerReputation(
    player?.id
  );

  // Check authentication on mount and redirect if not logged in
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // User is not authenticated, go back
        Alert.alert(t('alerts.error'), t('errors.unauthorized'));
        navigation.goBack();
        return;
      }
      fetchUserProfileData();
    };
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch data when screen comes into focus (e.g., when navigating back from SportProfile)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsubscribe = navigation.addListener('focus', () => {
      Logger.debug('user_profile_screen_focused');
      fetchUserProfileData();
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  // Upload profile picture when a new image is selected
  useEffect(() => {
    if (newProfileImage && profile?.id) {
      uploadProfilePicture(newProfileImage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newProfileImage]);

  const uploadProfilePicture = async (imageUri: string) => {
    try {
      setUploadingImage(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('alerts.error'), t('errors.unauthorized'));
        return;
      }

      // Upload new image and delete the old one (if exists) using replaceImage
      const oldImageUrl = profile?.profile_picture_url;
      const { url, error: uploadError } = await replaceImage(
        imageUri,
        oldImageUrl,
        'profile-pictures',
        user.id
      );

      if (uploadError) throw uploadError;
      if (!url) throw new Error('Failed to get upload URL');

      // Update profile with new picture URL
      const updateResult = await withTimeout(
        (async () =>
          supabase.from('profile').update({ profile_picture_url: url }).eq('id', user.id))(),
        10000,
        'Failed to update profile - connection timeout'
      );

      if (updateResult.error) throw updateResult.error;

      // Update local state
      setProfile(prev => (prev ? { ...prev, profile_picture_url: url } : null));

      toast.success(t('profile.changePhoto'));
    } catch (error) {
      Logger.error('Failed to upload profile picture', error as Error, { userId: profile?.id });
      toast.error(getNetworkErrorMessage(error));
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchUserProfileData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('alerts.error'), t('errors.userNotAuthenticated'));
        return;
      }

      // Run all queries in parallel for better performance
      const [
        profileResult,
        playerResult,
        sportsResult,
        playerSportsResult,
        ratingsResult,
        availResult,
        referenceRequestsResult,
      ] = await Promise.all([
        // Fetch profile data
        withTimeout(
          (async () => supabase.from('profile').select('*').eq('id', user.id).single())(),
          15000,
          'Failed to load profile - connection timeout'
        ),

        // Fetch player data
        withTimeout(
          (async () => supabase.from('player').select('*').eq('id', user.id).single())(),
          15000,
          'Failed to load player data - connection timeout'
        ),

        // Fetch all sports
        withTimeout(
          (async () => supabase.from('sport').select('*').eq('is_active', true).order('name'))(),
          15000,
          'Failed to load sports - connection timeout'
        ),

        // Fetch player's selected sports
        withTimeout(
          (async () =>
            supabase
              .from('player_sport')
              .select('sport_id, is_primary, is_active')
              .eq('player_id', user.id))(),
          15000,
          'Failed to load player sports - connection timeout'
        ),

        // Fetch player's ratings with source info
        withTimeout(
          (async () =>
            supabase
              .from('player_rating_score')
              .select(
                `
              *,
              rating_score!player_rating_scores_rating_score_id_fkey (
                label,
                rating_system (
                  sport_id
                )
              )
            `
              )
              .eq('player_id', user.id)
              .order('is_certified', { ascending: false })
              .order('created_at', { ascending: false }))(),
          15000,
          'Failed to load ratings - connection timeout'
        ),

        // Fetch player availabilities
        withTimeout(
          (async () =>
            supabase
              .from('player_availability')
              .select('day, period, is_active')
              .eq('player_id', user.id)
              .eq('is_active', true))(),
          15000,
          'Failed to load availability - connection timeout'
        ),

        // Fetch pending reference requests count (where user is referee)
        withTimeout(
          (async () =>
            supabase
              .from('rating_reference_request')
              .select('id', { count: 'exact', head: true })
              .eq('referee_id', user.id)
              .eq('status', 'pending'))(),
          15000,
          'Failed to load reference requests - connection timeout'
        ),
      ]);

      // Process profile
      if (profileResult.error) throw profileResult.error;
      setProfile(profileResult.data);

      // Process player (PGRST116 = no rows is okay)
      if (playerResult.error && playerResult.error.code !== 'PGRST116') {
        throw playerResult.error;
      }
      setPlayer(playerResult.data);

      // Process sports
      if (sportsResult.error) throw sportsResult.error;
      const allSports = sportsResult.data;

      // Process player sports (PGRST116 = no rows is okay)
      if (playerSportsResult.error && playerSportsResult.error.code !== 'PGRST116') {
        throw playerSportsResult.error;
      }
      const playerSports = playerSportsResult.data;

      // Process ratings (PGRST116 = no rows is okay)
      if (ratingsResult.error && ratingsResult.error.code !== 'PGRST116') {
        throw ratingsResult.error;
      }
      const ratingsData = ratingsResult.data;

      // Map sports with active status and ratings
      const playerSportsMap = new Map(
        (playerSports || []).map(ps => [
          ps.sport_id,
          { isPrimary: ps.is_primary || false, isActive: ps.is_active || false },
        ])
      );

      // Map ratings - use the first certified or most recent
      const ratingsMap = new Map<string, string>();
      (ratingsData || []).forEach(rating => {
        const ratingScore = rating.rating_score as {
          label?: string;
          rating_system?: { sport_id?: string };
        } | null;
        const sportId = ratingScore?.rating_system?.sport_id;
        const displayLabel = ratingScore?.label || '';

        // Only set if not already set (results are ordered by is_certified desc, created_at desc)
        if (sportId && !ratingsMap.has(sportId)) {
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

      // Process availabilities (PGRST116 = no rows is okay)
      if (availResult.error && availResult.error.code !== 'PGRST116') {
        throw availResult.error;
      }
      const availData = availResult.data;

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
        const day = avail.day as keyof AvailabilityGrid;
        const period = avail.period as keyof AvailabilityGrid[keyof AvailabilityGrid];
        if (availGrid[day] && period in availGrid[day]) {
          availGrid[day][period] = true;
        }
      });

      setAvailabilities(availGrid);

      // Process pending reference requests count
      if (!referenceRequestsResult.error) {
        setPendingReferenceRequestsCount(referenceRequestsResult.count || 0);
      }
    } catch (error) {
      Logger.error('Failed to fetch user profile data', error as Error);
      Alert.alert(t('alerts.error'), getNetworkErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Convert DB format to UI format for the overlay
  const convertToUIFormat = (dbAvailabilities: AvailabilityGrid): WeeklyAvailability => {
    const dayMap: Record<string, DayOfWeek> = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
    };

    // Start with defaults for all days
    const defaultAvailability: DayAvailability = { AM: false, PM: false, EVE: false };
    const uiFormat: WeeklyAvailability = {
      Mon: { ...defaultAvailability },
      Tue: { ...defaultAvailability },
      Wed: { ...defaultAvailability },
      Thu: { ...defaultAvailability },
      Fri: { ...defaultAvailability },
      Sat: { ...defaultAvailability },
      Sun: { ...defaultAvailability },
    };

    // Override with actual data if available
    if (dbAvailabilities && Object.keys(dbAvailabilities).length > 0) {
      Object.keys(dbAvailabilities).forEach(day => {
        const uiDay = dayMap[day];
        const dayData = dbAvailabilities[day];
        if (uiDay && dayData) {
          uiFormat[uiDay] = {
            AM: dayData.morning ?? false,
            PM: dayData.afternoon ?? false,
            EVE: dayData.evening ?? false,
          };
        }
      });
    }

    return uiFormat;
  };

  // Handle saving availabilities from the overlay
  const handleSaveAvailabilities = async (uiAvailabilities: WeeklyAvailability) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('alerts.error'), t('errors.unauthorized'));
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
        Alert.alert(t('alerts.error'), t('errors.noPrimarySport'));
        return;
      }

      // Delete existing availabilities for this player
      const deleteResult = await withTimeout(
        (async () => supabase.from('player_availability').delete().eq('player_id', user.id))(),
        10000,
        'Failed to update availability - connection timeout'
      );

      if (deleteResult.error) throw deleteResult.error;

      // Prepare new availability data
      const availabilityData: Array<{
        player_id: string;
        day: string;
        period: string;
        is_active: boolean;
      }> = [];

      (Object.keys(uiAvailabilities) as DayOfWeek[]).forEach(day => {
        (Object.keys(uiAvailabilities[day]) as TimeSlot[]).forEach(slot => {
          if (uiAvailabilities[day][slot]) {
            availabilityData.push({
              player_id: user.id,
              day: dayMap[day],
              period: timeMap[slot],
              is_active: true,
            });
          }
        });
      });

      // Upsert new availabilities (handles duplicates gracefully)
      if (availabilityData.length > 0) {
        const insertResult = await withTimeout(
          (async () =>
            supabase.from('player_availability').upsert(availabilityData, {
              onConflict: 'player_id,day,period',
              ignoreDuplicates: false,
            }))(),
          10000,
          'Failed to save availability - connection timeout'
        );

        if (insertResult.error) throw insertResult.error;
      }

      // Refresh the data
      await fetchUserProfileData();

      // Close the overlay
      setShowAvailabilitiesOverlay(false);

      toast.success(t('alerts.availabilitiesUpdated'));
    } catch (error) {
      Logger.error('Failed to save availabilities', error as Error, { playerId: player?.id });
      toast.error(getNetworkErrorMessage(error));
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return t('profile.notSet');
    return formatDateUtil(dateString, locale);
  };

  const formatJoinedDate = (dateString: string | null): string => {
    if (!dateString) return '';
    return formatDateMonthYear(dateString, locale);
  };

  const formatGender = (gender: string | null): string => {
    if (!gender) return t('profile.notSet');
    const genderMap: { [key: string]: string } = {
      male: t('profile.genderValues.male'),
      female: t('profile.genderValues.female'),
      other: t('profile.genderValues.other'),
      prefer_not_to_say: t('profile.genderValues.preferNotToSay'),
    };
    return genderMap[gender] || gender;
  };

  const formatPlayingHand = (hand: string | null): string => {
    if (!hand) return t('profile.notSet');
    const handMap: { [key: string]: string } = {
      left: t('profile.hand.left'),
      right: t('profile.hand.right'),
      both: t('profile.hand.both'),
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
        <View style={styles.loadingContainer}>
          {/* Profile Header Skeleton */}
          <View style={[styles.profileHeader, { backgroundColor: colors.card }]}>
            <SkeletonAvatar
              size={120}
              backgroundColor={colors.cardBackground}
              highlightColor={colors.border}
            />
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Skeleton
                width={150}
                height={18}
                borderRadius={4}
                backgroundColor={colors.cardBackground}
                highlightColor={colors.border}
              />
              <Skeleton
                width={100}
                height={14}
                borderRadius={4}
                backgroundColor={colors.cardBackground}
                highlightColor={colors.border}
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
          {/* Profile Details Skeleton */}
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Skeleton
                width={120}
                height={18}
                borderRadius={4}
                backgroundColor={colors.cardBackground}
                highlightColor={colors.border}
              />
              <View style={{ marginTop: 12, gap: 12 }}>
                <Skeleton
                  width="100%"
                  height={44}
                  borderRadius={8}
                  backgroundColor={colors.cardBackground}
                  highlightColor={colors.border}
                />
                <Skeleton
                  width="100%"
                  height={44}
                  borderRadius={8}
                  backgroundColor={colors.cardBackground}
                  highlightColor={colors.border}
                />
                <Skeleton
                  width="100%"
                  height={44}
                  borderRadius={8}
                  backgroundColor={colors.cardBackground}
                  highlightColor={colors.border}
                />
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Picture with Edit Overlay - Same as PersonalInformationOverlay */}
        <View style={[styles.profileHeader, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[
              styles.profilePicContainer,
              { borderColor: colors.primary, backgroundColor: colors.inputBackground },
            ]}
            activeOpacity={0.8}
            onPress={openPicker}
            disabled={uploadingImage}
          >
            {profile?.profile_picture_url || newProfileImage ? (
              <Image
                source={{
                  uri: newProfileImage || getProfilePictureUrl(profile?.profile_picture_url) || '',
                }}
                style={styles.profileImage}
              />
            ) : (
              <Ionicons name="camera" size={32} color={colors.primary} />
            )}
            {uploadingImage && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color={colors.primaryForeground} />
                <Text style={[styles.uploadingText, { color: colors.primaryForeground }]}>
                  {t('profile.uploading')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Name and Username */}
          <Text style={[styles.profileName, { color: colors.text }]}>
            {profile?.display_name ||
              `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
              t('profile.user')}
          </Text>
          <Text style={[styles.username, { color: colors.textMuted }]}>
            @{profile?.display_name?.toLowerCase().replace(/\s/g, '') || t('profile.username')}
          </Text>

          {/* Reputation Badge */}
          {!reputationLoading && player?.id && (
            <View style={styles.reputationContainer}>
              <ReputationBadge
                tier={reputationDisplay.tier}
                score={reputationDisplay.score}
                isVisible={reputationDisplay.isVisible}
                size="md"
                showLabel
                showScore={reputationDisplay.isVisible}
              />
            </View>
          )}

          {/* Joined Date */}
          <View style={styles.joinedContainer}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.joinedText, { color: colors.textMuted }]}>
              {t('profile.joined')} {formatJoinedDate(player?.created_at || null)}
            </Text>
          </View>
        </View>

        {/* My Personal Information with Edit Icon */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {t('profile.sections.personalInformation')}
            </Text>
            <TouchableOpacity
              style={styles.editIconButton}
              onPress={() => setShowPersonalInfoOverlay(true)}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.compactRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                {t('profile.fields.firstName')}
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {profile?.first_name || '-'}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.compactRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                {t('profile.fields.lastName')}
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {profile?.last_name || '-'}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.compactRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                {t('profile.fields.email')}
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>{profile?.email || '-'}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.compactRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                {t('profile.fields.phoneNumber')}
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>{profile?.phone || '-'}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.compactRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                {t('profile.fields.dateOfBirth')}
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {formatDate(profile?.birth_date || null)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.compactRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>{t('profile.gender')}</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {formatGender(player?.gender || null)}
              </Text>
            </View>
          </View>
        </View>

        {/* My Player Information with Edit Icon */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {t('profile.sections.playerInformation')}
            </Text>
            <TouchableOpacity
              style={styles.editIconButton}
              onPress={() => setShowPlayerInfoOverlay(true)}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {/* Bio - Vertical Layout */}
            <View style={styles.verticalField}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                {t('profile.bio')}
              </Text>
              <Text style={[styles.fieldValue, { color: colors.text }]}>
                {profile?.bio || t('profile.status.noBio')}
              </Text>
            </View>

            {/* Playing Hand and Max Travel Distance - Side by Side */}
            <View style={styles.horizontalFieldsContainer}>
              <View style={styles.halfField}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                  {t('profile.fields.playingHand')}
                </Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>
                  {formatPlayingHand(player?.playing_hand || null)}
                </Text>
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                  {t('profile.fields.maxTravelDistance')}
                </Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>
                  {player?.max_travel_distance ? `${player.max_travel_distance} km` : '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* My Sports - Horizontal Cards with Chevrons - Show ALL sports */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {t('profile.sections.sports')}
            </Text>
            <TouchableOpacity style={styles.editIconButton}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.sportsCardsContainer}>
            {sports.map(sport => (
              <TouchableOpacity
                key={sport.id}
                style={[
                  styles.sportCard,
                  {
                    backgroundColor: sport.isActive ? colors.card : colors.inputBackground,
                  },
                  !sport.isActive && styles.sportCardInactive,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  navigation.navigate('SportProfile', {
                    sportId: sport.id,
                    sportName: sport.display_name as 'tennis' | 'pickleball',
                  });
                }}
              >
                <View style={styles.sportCardLeft}>
                  <Text
                    style={[
                      styles.sportName,
                      {
                        color: sport.isActive ? colors.text : colors.textMuted,
                      },
                    ]}
                  >
                    {sport.display_name}
                  </Text>
                  {sport.isActive ? (
                    <View
                      style={[
                        styles.activeBadge,
                        { backgroundColor: isDark ? primary[900] : primary[100] },
                      ]}
                    >
                      <Text
                        style={[
                          styles.activeBadgeText,
                          { color: isDark ? primary[100] : primary[600] },
                        ]}
                      >
                        {t('profile.status.active')}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[styles.inactiveBadge, { backgroundColor: colors.inputBackground }]}
                    >
                      <Text style={[styles.inactiveBadgeText, { color: colors.textMuted }]}>
                        {t('profile.status.inactive')}
                      </Text>
                    </View>
                  )}
                  {sport.isActive && sport.ratingLabel && (
                    <View
                      style={[
                        styles.ratingBadge,
                        { backgroundColor: isDark ? primary[900] : primary[100] },
                      ]}
                    >
                      <Text
                        style={[
                          styles.ratingBadgeText,
                          { color: isDark ? primary[100] : primary[600] },
                        ]}
                      >
                        {sport.ratingLabel}
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
            {sports.length === 0 && (
              <Text style={[styles.noDataText, { color: colors.textMuted }]}>
                {t('profile.status.noSports')}
              </Text>
            )}
          </View>
        </View>

        {/* My Availabilities with Edit Icon */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {t('profile.sections.availabilities')}
            </Text>
            <TouchableOpacity
              style={styles.editIconButton}
              onPress={() => setShowAvailabilitiesOverlay(true)}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {/* Availability Grid - Same as PlayerAvailabilitiesOverlay */}
            <View style={styles.gridContainer}>
              {/* Header Row */}
              <View style={styles.gridRow}>
                <View style={styles.dayCell} />
                {['AM', 'PM', 'EVE'].map(slot => (
                  <View key={slot} style={styles.headerCell}>
                    <Text size="xs" weight="semibold" color={colors.textMuted}>
                      {slot}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Day Rows */}
              {Object.keys(availabilities).map(day => (
                <View key={day} style={styles.gridRow}>
                  <View style={styles.dayCell}>
                    <Text size="sm" weight="medium" color={colors.text}>
                      {getDayLabel(day)}
                    </Text>
                  </View>
                  {(['morning', 'afternoon', 'evening'] as PeriodKey[]).map(period => (
                    <View key={period} style={styles.timeSlotWrapper}>
                      <View
                        style={[
                          styles.timeSlotCell,
                          {
                            backgroundColor: colors.inputBackground,
                          },
                          availabilities[day]?.[period] && [
                            styles.timeSlotCellSelected,
                            { backgroundColor: colors.primary, borderColor: colors.primary },
                          ],
                        ]}
                      >
                        <Text
                          size="xs"
                          weight="semibold"
                          color={
                            availabilities[day]?.[period]
                              ? colors.primaryForeground
                              : colors.textMuted
                          }
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

        {/* Reference Requests Section - Only show if there are pending requests */}
        {pendingReferenceRequestsCount > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                {t('referenceRequest.incomingTitle')}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('IncomingReferenceRequests')}
              activeOpacity={0.7}
            >
              <View style={styles.referenceRequestRow}>
                <View style={styles.referenceRequestLeft}>
                  <View
                    style={[
                      styles.referenceRequestIcon,
                      { backgroundColor: isDark ? primary[900] : primary[100] },
                    ]}
                  >
                    <Ionicons
                      name="person-add"
                      size={20}
                      color={isDark ? primary[100] : primary[600]}
                    />
                  </View>
                  <View style={styles.referenceRequestTextContainer}>
                    <Text style={[styles.referenceRequestTitle, { color: colors.text }]}>
                      {t('referenceRequest.pendingRequests')}
                    </Text>
                    <Text style={[styles.referenceRequestSubtitle, { color: colors.textMuted }]}>
                      {t('referenceRequest.helpCertifyRatings')}
                    </Text>
                  </View>
                </View>
                <View style={styles.referenceRequestRight}>
                  <View style={[styles.referenceRequestBadge, { backgroundColor: colors.primary }]}>
                    <Text
                      style={[
                        styles.referenceRequestBadgeText,
                        { color: colors.primaryForeground },
                      ]}
                    >
                      {pendingReferenceRequestsCount}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Personal Information Edit Overlay */}
      <PersonalInformationOverlay
        visible={showPersonalInfoOverlay}
        onClose={() => setShowPersonalInfoOverlay(false)}
        onSave={() => {
          // Only refresh data when save is successful
          fetchUserProfileData();
        }}
        mode="edit"
        initialData={{
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          username: profile?.display_name || '',
          email: profile?.email || '',
          dateOfBirth: profile?.birth_date || '',
          gender: player?.gender || '',
          phoneNumber: profile?.phone || '',
          profilePictureUrl: profile?.profile_picture_url || undefined,
        }}
      />

      {/* Player Information Edit Overlay */}
      <PlayerInformationOverlay
        visible={showPlayerInfoOverlay}
        onClose={() => setShowPlayerInfoOverlay(false)}
        onSave={() => {
          // Only refresh data when save is successful
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

      {/* Image Picker Sheet */}
      <ImagePickerSheet
        visible={showPicker}
        onClose={closePicker}
        onTakePhoto={pickFromCamera}
        onChooseFromGallery={pickFromGallery}
        title={t('profile.profilePicture')}
        cameraLabel={t('profile.takePhoto')}
        galleryLabel={t('profile.chooseFromGallery')}
        cancelLabel={t('common.cancel')}
        cameraDisabled={!permissions.camera}
        galleryDisabled={!permissions.library}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacingPixels[1],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacingPixels[3],
  },
  scrollView: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSizePixels.lg,
    fontWeight: fontWeightNumeric.semibold,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacingPixels[6],
    paddingHorizontal: spacingPixels[4],
  },
  profilePicContainer: {
    width: spacingPixels[20],
    height: spacingPixels[20],
    borderRadius: radiusPixels.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacingPixels[3],
    borderWidth: 2,
  },
  profileImage: {
    width: spacingPixels[20],
    height: spacingPixels[20],
    borderRadius: radiusPixels.full,
  },
  profileName: {
    fontSize: fontSizePixels.xl,
    fontWeight: fontWeightNumeric.bold,
    marginBottom: spacingPixels[1],
  },
  username: {
    fontSize: fontSizePixels.sm,
    marginBottom: spacingPixels[2],
  },
  reputationContainer: {
    marginTop: spacingPixels[2],
    marginBottom: spacingPixels[1],
  },
  joinedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[1],
    marginTop: spacingPixels[1],
  },
  joinedText: {
    fontSize: fontSizePixels.xs,
  },
  section: {
    marginTop: spacingPixels[5],
    paddingHorizontal: spacingPixels[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacingPixels[3],
  },
  sectionTitle: {
    fontSize: fontSizePixels.xs,
    fontWeight: fontWeightNumeric.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  editIconButton: {
    padding: spacingPixels[1],
  },
  card: {
    borderRadius: radiusPixels.xl,
    padding: spacingPixels[4],
    ...shadowsNative.sm,
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacingPixels[2.5],
  },
  label: {
    fontSize: fontSizePixels.sm,
    flex: 1,
  },
  value: {
    fontSize: fontSizePixels.sm,
    fontWeight: fontWeightNumeric.medium,
    flex: 1,
    textAlign: 'right',
  },
  bioText: {
    textAlign: 'right',
  },
  divider: {
    height: 1,
  },
  // Vertical Field Layout (for Player Information)
  verticalField: {
    marginBottom: spacingPixels[4],
  },
  fieldLabel: {
    fontSize: fontSizePixels.xs,
    marginBottom: spacingPixels[1.5],
    fontWeight: fontWeightNumeric.medium,
  },
  fieldValue: {
    fontSize: fontSizePixels.base,
    lineHeight: fontSizePixels.base * 1.375,
  },
  // Horizontal Fields Container (for Playing Hand and Max Travel Distance side by side)
  horizontalFieldsContainer: {
    flexDirection: 'row',
    gap: spacingPixels[4],
  },
  halfField: {
    flex: 1,
  },
  noDataText: {
    fontSize: fontSizePixels.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacingPixels[5],
  },
  // Sports Cards - Horizontal Layout
  sportsCardsContainer: {
    gap: spacingPixels[3],
  },
  sportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radiusPixels.xl,
    padding: spacingPixels[4],
    ...shadowsNative.sm,
  },
  sportCardInactive: {
    opacity: 0.7,
  },
  sportCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
    flex: 1,
  },
  sportName: {
    fontSize: fontSizePixels.base,
    fontWeight: fontWeightNumeric.semibold,
  },
  sportNameInactive: {},
  activeBadge: {
    paddingHorizontal: spacingPixels[2.5],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.xl,
  },
  activeBadgeText: {
    fontSize: fontSizePixels.xs,
    fontWeight: fontWeightNumeric.semibold,
  },
  inactiveBadge: {
    paddingHorizontal: spacingPixels[2.5],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.xl,
  },
  inactiveBadgeText: {
    fontSize: fontSizePixels.xs,
    fontWeight: fontWeightNumeric.semibold,
  },
  ratingBadge: {
    paddingHorizontal: spacingPixels[2.5],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.xl,
  },
  ratingBadgeText: {
    fontSize: fontSizePixels.xs,
    fontWeight: fontWeightNumeric.semibold,
  },
  // Availability Grid Styles - Same as PlayerAvailabilitiesOverlay
  gridContainer: {
    marginTop: spacingPixels[2],
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: spacingPixels[2],
    alignItems: 'center',
  },
  dayCell: {
    width: 50, // 12.5 * 4px base unit
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
    paddingHorizontal: spacingPixels[1],
  },
  timeSlotCell: {
    width: '100%',
    borderRadius: radiusPixels.lg,
    paddingVertical: spacingPixels[3],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeSlotCellSelected: {},
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: radiusPixels.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    marginTop: spacingPixels[2],
    fontSize: fontSizePixels.xs,
    fontWeight: fontWeightNumeric.semibold,
  },
  // Reference Request Styles
  referenceRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referenceRequestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[3],
    flex: 1,
  },
  referenceRequestIcon: {
    width: 44,
    height: 44,
    borderRadius: radiusPixels.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  referenceRequestTextContainer: {
    flex: 1,
  },
  referenceRequestTitle: {
    fontSize: fontSizePixels.base,
    fontWeight: fontWeightNumeric.semibold,
  },
  referenceRequestSubtitle: {
    fontSize: fontSizePixels.sm,
    marginTop: spacingPixels[0.5],
  },
  referenceRequestRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
  },
  referenceRequestBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: radiusPixels.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[2],
  },
  referenceRequestBadgeText: {
    fontSize: fontSizePixels.sm,
    fontWeight: fontWeightNumeric.bold,
  },
});

export default UserProfile;
