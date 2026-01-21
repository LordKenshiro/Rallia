import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useAppNavigation } from '../navigation/hooks';
import type { RootStackParamList } from '../navigation/types';
import { Text, Button, Skeleton, useToast } from '@rallia/shared-components';
import { supabase, Logger } from '@rallia/shared-services';
import { MATCH_DURATION_ENUM_LABELS } from '@rallia/shared-types';
import { useThemeStyles, useTranslation, type TranslationKey } from '../hooks';
import {
  spacingPixels,
  radiusPixels,
  fontSizePixels,
  fontWeightNumeric,
  shadowsNative,
  primary,
  status,
} from '@rallia/design-system';

const BASE_BLACK = '#000000';

import { mediumHaptic, selectionHaptic } from '@rallia/shared-utils';
import { withTimeout, getNetworkErrorMessage } from '../utils/networkTimeout';
import TennisRatingOverlay from '../features/onboarding/components/overlays/TennisRatingOverlay';
import PickleballRatingOverlay from '../features/onboarding/components/overlays/PickleballRatingOverlay';
import PeerRatingRequestOverlay from '../features/sport-profile/components/PeerRatingRequestOverlay';
import ReferenceRequestOverlay from '../features/sport-profile/components/ReferenceRequestOverlay';
import { TennisPreferencesOverlay } from '../features/sport-profile/components/TennisPreferencesOverlay';
import { PickleballPreferencesOverlay } from '../features/sport-profile/components/PickleballPreferencesOverlay';

type SportProfileRouteProp = RouteProp<RootStackParamList, 'SportProfile'>;

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
  const navigation = useAppNavigation();
  const route = useRoute<SportProfileRouteProp>();
  const { sportId, sportName } = route.params;
  const { colors, shadows, isDark } = useThemeStyles();
  const { t } = useTranslation();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [isActive, setIsActive] = useState(false);
  const [playerSportId, setPlayerSportId] = useState<string | null>(null);
  const [playerRatingScoreId, setPlayerRatingScoreId] = useState<string | null>(null);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('alerts.error'), t('errors.userNotAuthenticated'));
        return;
      }
      setUserId(user.id);

      // Fetch both queries in parallel for better performance
      const [playerSportResult, ratingResult] = await Promise.all([
        // Fetch player's sport connection
        withTimeout(
          (async () =>
            supabase
              .from('player_sport')
              .select('id, is_active, preferred_match_duration, preferred_match_type, is_primary')
              .eq('player_id', user.id)
              .eq('sport_id', sportId)
              .maybeSingle())(),
          15000,
          'Failed to load sport profile - connection timeout'
        ),

        // Fetch player's ratings (fetch in parallel, process only if sport is active)
        withTimeout(
          (async () =>
            supabase
              .from('player_rating_score')
              .select(
                `
              id,
              rating_score_id,
              is_certified,
              certified_at,
              rating_score!player_rating_scores_rating_score_id_fkey (
                id,
                value,
                label,
                description,
                skill_level,
                rating_system (
                  code,
                  name,
                  description,
                  min_value,
                  max_value,
                  sport_id
                )
              )
            `
              )
              .eq('player_id', user.id))(),
          15000,
          'Failed to load ratings - connection timeout'
        ),
      ]);

      // Process player sport data
      const { data: playerSportData, error: playerSportError } = playerSportResult;

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

      // Only process rating data if sport is active
      if (playerSportData?.is_active) {
        const { data: ratingDataList, error: ratingError } = ratingResult;

        if (ratingError && ratingError.code !== 'PGRST116') {
          Logger.error('Failed to fetch player ratings', ratingError as Error, {
            playerId: user.id,
            sportId,
          });
        }

        Logger.debug('ratings_fetched', { count: ratingDataList?.length, sportName, sportId });

        // Filter by sport_id in JavaScript since nested filtering doesn't work well
        const ratingData =
          ratingDataList?.find(item => {
            const ratingScore = item.rating_score as {
              id?: string;
              rating_system?: { sport_id?: string };
            } | null;
            return ratingScore?.rating_system?.sport_id === sportId;
          }) || null;

        Logger.debug('rating_data_search_complete', { sportName, found: !!ratingData });

        if (ratingData) {
          const ratingScore = ratingData.rating_score as {
            id?: string;
            label?: string;
            value?: number;
            description?: string;
            skill_level?: string | null;
            rating_system?: {
              name?: string;
              min_value?: number;
              max_value?: number;
              description?: string;
            };
          } | null;
          const ratingSystem = ratingScore?.rating_system;
          const newRatingInfo = {
            ratingScoreId: ratingScore?.id || ratingData.rating_score_id || '',
            ratingTypeName: ratingSystem?.name || '',
            displayLabel: ratingScore?.label || '',
            scoreValue: ratingScore?.value || 0,
            skillLevel: ratingScore?.skill_level
              ? ratingScore.skill_level.charAt(0).toUpperCase() + ratingScore.skill_level.slice(1)
              : '',
            isVerified: ratingData.is_certified || false,
            verifiedAt: ratingData.certified_at || null,
            minValue: ratingSystem?.min_value || 0,
            maxValue: ratingSystem?.max_value || 10,
            description: ratingSystem?.description || '',
          };
          Logger.debug('rating_info_set', {
            ratingScoreId: newRatingInfo.ratingScoreId,
            displayLabel: newRatingInfo.displayLabel,
          });
          setRatingInfo(newRatingInfo);
          setPlayerRatingScoreId(ratingData.id || null);
        } else {
          Logger.debug('no_rating_data_found', { sportName, sportId });
          setRatingInfo(null);
          setPlayerRatingScoreId(null);
        }
      }
    } catch (error) {
      Logger.error('Failed to fetch sport profile data', error as Error, { sportId, sportName });
      Alert.alert(t('alerts.error'), getNetworkErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRating = async (ratingScoreId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('alerts.error'), t('errors.userNotAuthenticated'));
        return;
      }

      Logger.debug('save_rating_start', { ratingScoreId, sportId, sportName });

      // Step 1: Get ALL player ratings with source info
      const ratingsResult = await withTimeout(
        (async () =>
          supabase
            .from('player_rating_score')
            .select(
              `
            id,
            rating_score_id,
            source,
            is_certified,
            rating_score!player_rating_scores_rating_score_id_fkey (
              id,
              rating_system (
                sport_id
              )
            )
          `
            )
            .eq('player_id', user.id))(),
        15000,
        'Failed to fetch ratings - connection timeout'
      );

      const { data: allPlayerRatings, error: fetchError } = ratingsResult;

      if (fetchError) {
        Logger.error('Failed to fetch player ratings', fetchError as Error, { playerId: user.id });
        throw fetchError;
      }

      Logger.debug('player_ratings_fetched', { count: allPlayerRatings?.length });

      // Step 2: Find and DELETE only SELF_REPORTED ratings for this specific sport
      const ratingsToDelete =
        allPlayerRatings?.filter(item => {
          const ratingScoreData = Array.isArray(item.rating_score)
            ? item.rating_score[0]
            : item.rating_score;
          if (!ratingScoreData) return false;

          const ratingSystemData = Array.isArray(ratingScoreData.rating_system)
            ? ratingScoreData.rating_system[0]
            : ratingScoreData.rating_system;
          const itemSportId = ratingSystemData?.sport_id;
          const source = item.source || 'self_reported'; // Default to self_reported for old data

          // Only delete self_reported ratings for current sport
          const shouldDelete = itemSportId === sportId && source === 'self_reported';

          Logger.debug('rating_delete_check', {
            ratingId: item.id,
            sportId: itemSportId,
            source,
            shouldDelete,
          });
          return shouldDelete;
        }) || [];

      Logger.debug('ratings_to_delete', { sportId, count: ratingsToDelete.length });

      // Delete only self_reported ratings (keep peer_verified, api_verified, admin_verified)
      for (const rating of ratingsToDelete) {
        Logger.debug('deleting_rating', { ratingId: rating.id });
        const deleteResult = await withTimeout(
          (async () => supabase.from('player_rating_score').delete().eq('id', rating.id))(),
          10000,
          'Failed to delete rating - connection timeout'
        );

        if (deleteResult.error) {
          Logger.error('Failed to delete rating', deleteResult.error as Error, {
            ratingId: rating.id,
          });
          throw deleteResult.error;
        }
        Logger.debug('rating_deleted', { ratingId: rating.id });
      }

      // Step 3: Upsert the new self_reported rating (insert or update if exists)
      Logger.debug('upserting_new_rating', { ratingScoreId, playerId: user.id });
      const insertResult = await withTimeout(
        (async () =>
          supabase.from('player_rating_score').upsert(
            {
              player_id: user.id,
              rating_score_id: ratingScoreId,
              source: 'self_reported', // Explicitly self-reported
              is_certified: false,
            },
            {
              onConflict: 'player_id,rating_score_id',
            }
          ))(),
        10000,
        'Failed to save rating - connection timeout'
      );

      if (insertResult.error) {
        Logger.error('Failed to insert new rating', insertResult.error as Error, {
          ratingScoreId,
          playerId: user.id,
        });
        throw insertResult.error;
      }

      Logger.info('rating_save_complete', { ratingScoreId, sportId, sourceType: 'self_reported' });

      // Close overlays first
      setShowTennisRatingOverlay(false);
      setShowPickleballRatingOverlay(false);

      // Clear current rating state to force refresh
      setRatingInfo(null);

      // Add a small delay to ensure database has committed the transaction
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh data
      Logger.debug('refreshing_sport_profile_data', { sportId });
      await fetchSportProfileData();
      Logger.debug('sport_profile_data_refreshed', { sportId });

      // Show success message
      toast.success(t('alerts.availabilitiesUpdated'));
    } catch (error) {
      Logger.error('Failed to save rating', error as Error, { sportId, ratingScoreId });
      toast.error(getNetworkErrorMessage(error));
    }
  };

  const handleManageProofs = () => {
    if (!playerRatingScoreId || !ratingInfo) {
      Alert.alert(t('alerts.error'), t('errors.notFound'));
      return;
    }
    navigation.navigate('RatingProofs', {
      playerRatingScoreId: playerRatingScoreId,
      sportName: sportName,
      ratingValue: ratingInfo.scoreValue,
      isOwnProfile: true,
    });
  };

  const handleToggleActive = async (newValue: boolean) => {
    try {
      mediumHaptic();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('alerts.error'), t('errors.userNotAuthenticated'));
        return;
      }

      if (playerSportId) {
        // Entry exists: Update is_active field
        const updateResult = await withTimeout(
          (async () =>
            supabase
              .from('player_sport')
              .update({ is_active: newValue })
              .eq('id', playerSportId))(),
          10000,
          'Failed to update availability - connection timeout'
        );

        if (updateResult.error) throw updateResult.error;

        setIsActive(newValue);

        // Show success message
        const message = newValue
          ? t('alerts.sportActivated', { sport: sportName })
          : t('alerts.sportDeactivated', { sport: sportName });

        toast.success(message);

        // Refresh data if activated
        if (newValue) {
          await fetchSportProfileData();
        }
      } else {
        // No entry exists
        if (newValue) {
          // User wants to play this sport: Create new entry with is_active = true
          const insertResult = await withTimeout(
            (async () =>
              supabase
                .from('player_sport')
                .insert({
                  player_id: user.id,
                  sport_id: sportId,
                  is_active: true,
                  is_primary: false,
                })
                .select('id')
                .single())(),
            10000,
            'Failed to create sport profile - connection timeout'
          );

          if (insertResult.error) throw insertResult.error;
          const { data: newRecord } = insertResult;
          if (newRecord) setPlayerSportId(newRecord.id);

          setIsActive(true);

          // Show success message
          const message = t('alerts.sportAdded', { sport: sportName });
          toast.success(message);

          // Refresh data to load ratings and preferences
          await fetchSportProfileData();
        } else {
          // User doesn't want to play this sport: Don't create entry, just update UI
          setIsActive(false);

          // Optional: Show a subtle message
          toast.info(t('alerts.sportNotAdded', { sport: sportName }));
        }
      }
    } catch (error) {
      Logger.error('Failed to toggle sport active status', error as Error, { sportId, sportName });
      toast.error(getNetworkErrorMessage(error));
    }
  };

  const formatMatchDuration = (duration: string | null): string => {
    if (!duration) return t('profile.notSet');

    // Use translation keys for enum values
    const translationKey = `profile.preferences.durations.${duration}`;
    const translated = t(translationKey as TranslationKey);

    // If translation exists (not the same as key), use it
    if (translated !== translationKey) {
      return translated;
    }

    // Fallback to shared constant for enum values
    if (duration in MATCH_DURATION_ENUM_LABELS) {
      return MATCH_DURATION_ENUM_LABELS[duration as keyof typeof MATCH_DURATION_ENUM_LABELS];
    }

    // Legacy values (for backward compatibility during migration)
    const legacyMap: Record<string, string> = {
      '1h': t('matchCreation.duration.60'),
      '1.5h': t('matchCreation.duration.90'),
      '2h': t('matchCreation.duration.120'),
    };

    return legacyMap[duration] || duration.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatMatchType = (type: string | null): string => {
    if (!type) return t('profile.notSet');

    // Use translation keys for match types
    const translationKey = `profile.preferences.matchTypes.${type.toLowerCase()}`;
    const translated = t(translationKey as TranslationKey);

    // If translation exists (not the same as key), use it
    if (translated !== translationKey) {
      return translated;
    }

    // Fallback: capitalize first letter of each word
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatPlayingStyle = (style: string | null): string => {
    if (!style) return t('profile.notSet');

    // Use translation keys for play styles
    const translationKey = `profile.preferences.playStyles.${style}`;
    const translated = t(translationKey as TranslationKey);

    // If translation exists (not the same as key), use it
    if (translated !== translationKey) {
      return translated;
    }

    // Fallback: capitalize first letter of each word
    return style.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatPlayAttribute = (attribute: string): string => {
    // Use translation keys for play attributes
    const translationKey = `profile.preferences.playAttributes.${attribute}`;
    const translated = t(translationKey as TranslationKey);

    // If translation exists (not the same as key), use it
    if (translated !== translationKey) {
      return translated;
    }

    // Fallback: capitalize first letter of each word
    return attribute.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleSendPeerRatingRequests = async (selectedPlayerIds: string[]) => {
    try {
      // TODO: Implement peer rating request logic
      // This will insert records into peer_rating_request table
      Logger.logUserAction('send_peer_rating_requests', {
        count: selectedPlayerIds.length,
        sportId,
      });

      // For now, just show a success message
      toast.success(t('alerts.peerRatingRequestsSent', { count: selectedPlayerIds.length }));

      setShowPeerRatingRequestOverlay(false);
    } catch (error) {
      Logger.error('Failed to send peer rating requests', error as Error, {
        count: selectedPlayerIds.length,
        sportId,
      });
      toast.error(t('alerts.failedToSendPeerRatingRequests'));
    }
  };

  const handleSendReferenceRequests = async (selectedPlayerIds: string[]) => {
    try {
      // TODO: Implement reference request logic
      // This will insert records into reference_request table
      Logger.logUserAction('send_reference_requests', { count: selectedPlayerIds.length, sportId });

      // For now, just show a success message
      toast.success(t('alerts.referenceRequestsSent', { count: selectedPlayerIds.length }));

      setShowReferenceRequestOverlay(false);
    } catch (error) {
      Logger.error('Failed to send reference requests', error as Error, {
        count: selectedPlayerIds.length,
        sportId,
      });
      toast.error(t('alerts.failedToSendReferenceRequests'));
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
        Alert.alert(t('alerts.error'), t('errors.notFound'));
        return;
      }

      const updateResult = await withTimeout(
        (async () =>
          supabase
            .from('player_sport')
            .update({
              preferred_match_duration: updatedPreferences.matchDuration,
              preferred_match_type: updatedPreferences.matchType,
              preferred_court: updatedPreferences.court,
              preferred_play_style: updatedPreferences.playStyle,
              preferred_play_attributes: updatedPreferences.playAttributes,
            })
            .eq('id', playerSportId))(),
        10000,
        'Failed to save preferences - connection timeout'
      );

      if (updateResult.error) throw updateResult.error;

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
      toast.success(t('alerts.preferencesUpdated'));

      // Refresh data
      await fetchSportProfileData();
    } catch (error) {
      Logger.error('Failed to save sport preferences', error as Error, { sportId, playerSportId });
      toast.error(getNetworkErrorMessage(error));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
        <View style={styles.loadingContainer}>
          {/* Sport Profile Skeleton */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Skeleton width={180} height={18} borderRadius={4} backgroundColor={colors.cardBackground} highlightColor={colors.border} />
            <View style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
              <Skeleton width={80} height={40} borderRadius={8} backgroundColor={colors.cardBackground} highlightColor={colors.border} />
              <Skeleton width={80} height={40} borderRadius={8} backgroundColor={colors.cardBackground} highlightColor={colors.border} />
            </View>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, marginTop: 16 }]}>
            <Skeleton width={120} height={18} borderRadius={4} backgroundColor={colors.cardBackground} highlightColor={colors.border} />
            <Skeleton width="100%" height={60} borderRadius={12} backgroundColor={colors.cardBackground} highlightColor={colors.border} style={{ marginTop: 12 }} />
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, marginTop: 16 }]}>
            <Skeleton width={150} height={18} borderRadius={4} backgroundColor={colors.cardBackground} highlightColor={colors.border} />
            <View style={{ marginTop: 12, gap: 8 }}>
              <Skeleton width="100%" height={48} borderRadius={8} backgroundColor={colors.cardBackground} highlightColor={colors.border} />
              <Skeleton width="100%" height={48} borderRadius={8} backgroundColor={colors.cardBackground} highlightColor={colors.border} />
              <Skeleton width="100%" height={48} borderRadius={8} backgroundColor={colors.cardBackground} highlightColor={colors.border} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Do you play this sport? Toggle */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.questionText, { color: colors.text }]}>
            {t('profile.doYouPlay', { sport: sportName })}
          </Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                },
                isActive && [
                  styles.toggleButtonActive,
                  { backgroundColor: colors.primary, borderColor: colors.primary },
                ],
              ]}
              onPress={() => handleToggleActive(true)}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  { color: colors.textMuted },
                  ...(isActive
                    ? [styles.toggleButtonTextActive, { color: colors.primaryForeground }]
                    : []),
                ]}
              >
                {t('common.yes')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                },
                !isActive && [
                  styles.toggleButtonInactive,
                  { backgroundColor: colors.error, borderColor: colors.error },
                ],
              ]}
              onPress={() => handleToggleActive(false)}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  { color: colors.textMuted },
                  ...(!isActive
                    ? [styles.toggleButtonTextActive, { color: colors.primaryForeground }]
                    : []),
                ]}
              >
                {t('common.no')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Show blank space when not active */}
        {!isActive && (
          <View style={styles.inactiveContainer}>
            <Ionicons name="information-circle-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.inactiveText, { color: colors.textMuted }]}>
              {t('profile.activateSportMessage', { sport: sportName })}
            </Text>
          </View>
        )}

        {/* My Rating Section - Only show when active */}
        {isActive && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                {t('profile.sections.rating')}
              </Text>
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
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {ratingInfo ? (
                <>
                  {/* Rating Level Display */}
                  <View style={styles.ratingDisplay}>
                    <View
                      style={[styles.ratingBadgeLarge, { backgroundColor: colors.inputBackground }]}
                    >
                      <Text style={[styles.ratingLevelText, { color: colors.text }]}>
                        {ratingInfo.displayLabel}
                      </Text>
                      <Text style={[styles.ratingTypeText, { color: colors.textMuted }]}>
                        {ratingInfo.ratingTypeName}
                      </Text>
                    </View>
                    {ratingInfo.isVerified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        <Text style={[styles.verifiedText, { color: colors.text }]}>
                          {t('profile.status.certified')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Rating Description */}
                  {ratingInfo.description && (
                    <Text style={[styles.ratingDescription, { color: colors.textMuted }]}>
                      {ratingInfo.description}
                    </Text>
                  )}

                  {/* Rating Details */}
                  <View style={[styles.ratingDetails, { borderTopColor: colors.border }]}>
                    <View style={styles.ratingDetailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                        {t('profile.rating.skillLevel')}:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {ratingInfo.skillLevel || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.ratingDetailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                        {t('profile.rating.score')}:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
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
                      leftIcon={<Ionicons name="people" size={16} color={colors.primary} />}
                    >
                      {t('profile.rating.references', { count: 6 })}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => {}}
                      style={styles.actionButton}
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
                      leftIcon={<Ionicons name="star" size={16} color={colors.primary} />}
                    >
                      {t('profile.rating.peerRating', { count: 2 })}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => {}}
                      style={styles.actionButton}
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
                      leftIcon={<Ionicons name="document-text" size={16} color={colors.primary} />}
                    >
                      {t('profile.rating.ratingProof', { count: 1 })}
                    </Button>
                  </View>

                  {/* Request Buttons */}
                  <View style={styles.requestButtons}>
                    <Button
                      variant="primary"
                      size="md"
                      onPress={() => setShowReferenceRequestOverlay(true)}
                      style={[styles.requestButton, styles.coralButton]}
                      leftIcon={
                        <Ionicons name="add-circle" size={18} color={colors.primaryForeground} />
                      }
                    >
                      {t('profile.rating.requestReference')}
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      onPress={() => setShowPeerRatingRequestOverlay(true)}
                      style={[styles.requestButton, styles.coralButton]}
                      leftIcon={
                        <Ionicons name="add-circle" size={18} color={colors.primaryForeground} />
                      }
                    >
                      {t('profile.rating.requestPeerRating')}
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      onPress={handleManageProofs}
                      style={[styles.requestButton, styles.coralButton]}
                      leftIcon={
                        <Ionicons name="folder-open" size={18} color={colors.primaryForeground} />
                      }
                    >
                      {t('profile.rating.manageRatingProofs')}
                    </Button>
                  </View>
                </>
              ) : (
                <View style={styles.noRatingContainer}>
                  <Text style={[styles.noRatingText, { color: colors.text }]}>
                    {t('profile.status.noRating')}
                  </Text>
                  <Text style={[styles.noRatingSubtext, { color: colors.textMuted }]}>
                    {t('profile.status.noRatingSubtext')}
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
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                {t('profile.sections.preferences')}
              </Text>
              <TouchableOpacity
                style={styles.editIconButton}
                onPress={() => {
                  selectionHaptic();
                  setShowPreferencesOverlay(true);
                }}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {/* Match Duration */}
              <View style={[styles.preferenceRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.preferenceLabel, { color: colors.textMuted }]}>
                  {t('profile.fields.matchDuration')}
                </Text>
                <Text style={[styles.preferenceValue, { color: colors.text }]}>
                  {formatMatchDuration(preferences.matchDuration)}
                </Text>
              </View>

              {/* Match Type */}
              <View style={[styles.preferenceRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.preferenceLabel, { color: colors.textMuted }]}>
                  {t('profile.fields.matchType')}
                </Text>
                <Text style={[styles.preferenceValue, { color: colors.text }]}>
                  {formatMatchType(preferences.matchType)}
                </Text>
              </View>

              {/* Facility */}
              <View style={[styles.preferenceRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.preferenceLabel, { color: colors.textMuted }]}>
                  {t('profile.fields.facility')}
                </Text>
                <Text style={[styles.preferenceValue, { color: colors.text }]}>
                  {preferences.facilityName || t('profile.notSet')}
                </Text>
              </View>

              {/* Playing Style (for Tennis: Server & Volley, etc.) */}
              <View style={styles.preferenceRow}>
                <Text style={[styles.preferenceLabel, { color: colors.textMuted }]}>
                  {t('profile.fields.playingStyle')}
                </Text>
                <Text style={[styles.preferenceValue, { color: colors.text }]}>
                  {formatPlayingStyle(preferences.playingStyle)}
                </Text>
              </View>

              {/* Play Attributes */}
              {playAttributes.length > 0 && (
                <View style={[styles.playAttributesContainer, { borderTopColor: colors.border }]}>
                  <Text style={[styles.playAttributesTitle, { color: colors.textMuted }]}>
                    {t('profile.fields.playAttributes')}
                  </Text>
                  <View style={styles.attributeTags}>
                    {playAttributes.map((attr, index) => (
                      <View
                        key={index}
                        style={[
                          styles.attributeTag,
                          { backgroundColor: isDark ? primary[900] : primary[50] },
                        ]}
                      >
                        <Text style={[styles.attributeTagText, { color: colors.primary }]}>
                          {formatPlayAttribute(attr.attributeValue)}
                        </Text>
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
      {sportName.toLowerCase() === 'tennis' && (
        <TennisPreferencesOverlay
          visible={showPreferencesOverlay}
          onClose={() => setShowPreferencesOverlay(false)}
          onSave={handleSavePreferences}
          initialPreferences={{
            matchDuration: preferences.matchDuration || undefined,
            matchType: preferences.matchType || undefined,
            court: preferences.facilityName || undefined,
            playStyle:
              (preferences.playingStyle as
                | 'counterpuncher'
                | 'aggressive_baseliner'
                | 'serve_and_volley'
                | 'all_court') || undefined,
            playAttributes: [],
          }}
        />
      )}

      {/* Pickleball Preferences Overlay */}
      {sportName.toLowerCase() === 'pickleball' && (
        <PickleballPreferencesOverlay
          visible={showPreferencesOverlay}
          onClose={() => setShowPreferencesOverlay(false)}
          onSave={handleSavePreferences}
          initialPreferences={{
            matchDuration: preferences.matchDuration || undefined,
            matchType: preferences.matchType || undefined,
            court: preferences.facilityName || undefined,
            playStyle:
              (preferences.playingStyle as
                | 'counterpuncher'
                | 'aggressive_baseliner'
                | 'serve_and_volley'
                | 'all_court') || undefined,
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: BASE_BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
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
    alignItems: 'center',
  },
  toggleButtonActive: {
    // backgroundColor and borderColor applied via inline styles
  },
  toggleButtonInactive: {
    // backgroundColor and borderColor applied via inline styles
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    // color applied inline
  },
  inactiveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingPixels[12],
    marginTop: spacingPixels[8],
  },
  inactiveText: {
    fontSize: fontSizePixels.base,
    textAlign: 'center',
    marginTop: spacingPixels[4],
    lineHeight: fontSizePixels.base * 1.375,
  },
  section: {
    marginBottom: spacingPixels[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingPixels[3],
  },
  sectionTitle: {
    fontSize: fontSizePixels.xs,
    fontWeight: fontWeightNumeric.bold,
    letterSpacing: 1,
  },
  editIconButton: {
    padding: spacingPixels[1],
  },
  ratingDisplay: {
    alignItems: 'center',
    marginBottom: spacingPixels[4],
  },
  ratingBadgeLarge: {
    paddingHorizontal: spacingPixels[6],
    paddingVertical: spacingPixels[4],
    borderRadius: radiusPixels.xl,
    alignItems: 'center',
    marginBottom: spacingPixels[2],
  },
  ratingLevelText: {
    fontSize: fontSizePixels['2xl'],
    fontWeight: fontWeightNumeric.bold,
  },
  ratingTypeText: {
    fontSize: fontSizePixels.xs,
    marginTop: spacingPixels[1],
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[1.5],
    borderRadius: radiusPixels.full,
    gap: spacingPixels[1],
  },
  verifiedText: {
    fontSize: fontSizePixels.xs,
    fontWeight: fontWeightNumeric.semibold,
  },
  ratingDescription: {
    fontSize: fontSizePixels.sm,
    lineHeight: fontSizePixels.sm * 1.43,
    marginBottom: spacingPixels[4],
    textAlign: 'center',
  },
  ratingDetails: {
    borderTopWidth: 1,
    paddingTop: spacingPixels[4],
    marginBottom: spacingPixels[4],
  },
  ratingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacingPixels[2],
  },
  detailLabel: {
    fontSize: fontSizePixels.sm,
  },
  detailValue: {
    fontSize: fontSizePixels.sm,
    fontWeight: fontWeightNumeric.semibold,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: spacingPixels[2],
    marginBottom: spacingPixels[4],
  },
  actionButton: {
    width: '100%',
  },
  requestButtons: {
    gap: spacingPixels[2.5],
  },
  requestButton: {
    width: '100%',
  },
  coralButton: {},
  noRatingContainer: {
    alignItems: 'center',
    paddingVertical: spacingPixels[6],
  },
  noRatingText: {
    fontSize: fontSizePixels.base,
    fontWeight: fontWeightNumeric.semibold,
    marginBottom: spacingPixels[2],
  },
  noRatingSubtext: {
    fontSize: fontSizePixels.sm,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacingPixels[3],
    borderBottomWidth: 1,
  },
  preferenceLabel: {
    fontSize: fontSizePixels.sm,
  },
  preferenceValue: {
    fontSize: fontSizePixels.sm,
    fontWeight: fontWeightNumeric.semibold,
  },
  playAttributesContainer: {
    marginTop: spacingPixels[4],
    paddingTop: spacingPixels[4],
    borderTopWidth: 1,
  },
  playAttributesTitle: {
    fontSize: fontSizePixels.sm,
    fontWeight: fontWeightNumeric.semibold,
    marginBottom: spacingPixels[3],
  },
  attributeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attributeTag: {
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[1.5],
    borderRadius: radiusPixels.full,
  },
  attributeTagText: {
    fontSize: fontSizePixels.xs,
    fontWeight: fontWeightNumeric.semibold,
  },
});

export default SportProfile;
