import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Overlay, Text } from '@rallia/shared-components';
import { supabase, Logger } from '@rallia/shared-services';
import { selectionHaptic, mediumHaptic } from '../../../utils/haptics';
import { useThemeStyles, useTranslation } from '../../../hooks';
import { CertificationBadge } from '../../ratings/components';

interface ReferenceRequestOverlayProps {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  sportId: string;
  /** Current user's rating score for this sport */
  currentUserRatingScore?: number;
  /** Current user's player_rating_score_id for this sport */
  currentUserRatingScoreId?: string;
  /** The rating system code (e.g., 'NTRP', 'DUPR') */
  ratingSystemCode?: string;
  onSendRequests: (selectedPlayerIds: string[]) => Promise<void>;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  profile_picture_url: string | null;
  rating: string | null;
  ratingScore: number | null;
  isCertified: boolean;
  playerRatingScoreId: string | null;
}

// Interface for Supabase rating response
interface RatingResponse {
  id: string;
  player_id: string;
  source: string;
  is_certified: boolean;
  rating_score: {
    id: string;
    label: string;
    value: number;
    rating_system: {
      id: string;
      sport_id: string;
      code: string;
    }[];
  }[];
}

// Minimum level thresholds for requesting references
const MIN_LEVEL_THRESHOLDS: Record<string, number> = {
  NTRP: 3.0,
  DUPR: 3.5,
};

const ReferenceRequestOverlay: React.FC<ReferenceRequestOverlayProps> = ({
  visible,
  onClose,
  currentUserId,
  sportId,
  currentUserRatingScore,
  currentUserRatingScoreId: _currentUserRatingScoreId,
  ratingSystemCode,
  onSendRequests,
}) => {
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      fetchCertifiedPlayers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, currentUserId, sportId]);

  useEffect(() => {
    // Filter players based on search query
    if (searchQuery.trim() === '') {
      setFilteredPlayers(players);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = players.filter(
        player =>
          player.first_name.toLowerCase().includes(query) ||
          player.last_name.toLowerCase().includes(query) ||
          player.display_name?.toLowerCase().includes(query)
      );
      setFilteredPlayers(filtered);
    }
  }, [searchQuery, players]);

  // Trigger animations when overlay becomes visible
  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  // Get minimum level threshold for current rating system
  const getMinLevelThreshold = (): number => {
    if (ratingSystemCode && MIN_LEVEL_THRESHOLDS[ratingSystemCode]) {
      return MIN_LEVEL_THRESHOLDS[ratingSystemCode];
    }
    // Default to NTRP threshold if unknown
    return 3.0;
  };

  // Check if current user meets minimum level for requesting references
  const canRequestReferences = (): boolean => {
    if (!currentUserRatingScore) return false;
    return currentUserRatingScore >= getMinLevelThreshold();
  };

  const fetchCertifiedPlayers = async () => {
    try {
      setLoading(true);

      // Step 1: Find all players with CERTIFIED ratings for this sport at same/higher level
      const { data: certifiedRatings, error: ratingsError } = await supabase
        .from('player_rating_score')
        .select(
          `
          id,
          player_id,
          source,
          is_certified,
          badge_status,
          rating_score:rating_score_id (
            id,
            label,
            value,
            rating_system:rating_system_id (
              id,
              sport_id,
              code
            )
          )
        `
        )
        .or('is_certified.eq.true,badge_status.eq.certified')
        .neq('player_id', currentUserId); // Exclude current user

      if (ratingsError) throw ratingsError;

      // Filter by sport and level (same or higher than current user)
      const sportCertifiedRatings = ((certifiedRatings || []) as RatingResponse[]).filter(
        rating => {
          const ratingScore = Array.isArray(rating.rating_score)
            ? rating.rating_score[0]
            : rating.rating_score;
          const ratingSystem = Array.isArray(ratingScore?.rating_system)
            ? ratingScore?.rating_system[0]
            : ratingScore?.rating_system;

          // Must be same sport
          if (ratingSystem?.sport_id !== sportId) return false;

          // If current user has a rating, only show players at same or higher level
          if (currentUserRatingScore && ratingScore?.value) {
            return ratingScore.value >= currentUserRatingScore;
          }

          return true;
        }
      );

      const uniquePlayerIds = [...new Set(sportCertifiedRatings.map(r => r.player_id))];

      if (uniquePlayerIds.length === 0) {
        setPlayers([]);
        setFilteredPlayers([]);
        setLoading(false);
        return;
      }

      // Step 2: Fetch player profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profile')
        .select('id, first_name, last_name, display_name, profile_picture_url')
        .in('id', uniquePlayerIds);

      if (profilesError) throw profilesError;

      // Step 3: Map ratings by player_id (get certified rating)
      const ratingsMap = new Map<
        string,
        {
          display_label: string;
          ratingScore: number | null;
          isCertified: boolean;
          playerRatingScoreId: string;
        }
      >();

      sportCertifiedRatings.forEach(rating => {
        const ratingScore = Array.isArray(rating.rating_score)
          ? rating.rating_score[0]
          : rating.rating_score;
        const isCertified = rating.is_certified;

        if (!ratingsMap.has(rating.player_id)) {
          ratingsMap.set(rating.player_id, {
            display_label: ratingScore?.label || '',
            ratingScore: ratingScore?.value || null,
            isCertified,
            playerRatingScoreId: rating.id,
          });
        }
      });

      // Step 4: Combine profiles with ratings
      const playersWithRatings: Player[] = (profiles || []).map(
        (profile: {
          id: string;
          first_name: string;
          last_name: string;
          display_name: string | null;
          profile_picture_url: string | null;
        }) => {
          const ratingInfo = ratingsMap.get(profile.id);
          return {
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            display_name: profile.display_name,
            profile_picture_url: profile.profile_picture_url,
            rating: ratingInfo?.display_label || null,
            ratingScore: ratingInfo?.ratingScore || null,
            isCertified: ratingInfo?.isCertified || false,
            playerRatingScoreId: ratingInfo?.playerRatingScoreId || null,
          };
        }
      );

      // Sort by rating score (highest first)
      playersWithRatings.sort((a, b) => (b.ratingScore || 0) - (a.ratingScore || 0));

      setPlayers(playersWithRatings);
      setFilteredPlayers(playersWithRatings);
    } catch (error) {
      Logger.error('Failed to fetch certified players', error as Error, { sportId });
    } finally {
      setLoading(false);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    selectionHaptic();
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const handleSendRequests = async () => {
    if (selectedPlayers.size === 0) return;

    mediumHaptic();
    setSending(true);
    try {
      await onSendRequests(Array.from(selectedPlayers));
      setSelectedPlayers(new Set());
      setSearchQuery('');
    } catch (error) {
      Logger.error('Failed to send reference requests', error as Error, {
        count: selectedPlayers.size,
        sportId,
      });
    } finally {
      setSending(false);
    }
  };

  const renderPlayerCard = (player: Player) => {
    const isSelected = selectedPlayers.has(player.id);

    return (
      <TouchableOpacity
        key={player.id}
        style={[
          styles.playerCard,
          { backgroundColor: colors.inputBackground },
          isSelected && [
            styles.playerCardSelected,
            { borderColor: colors.primary, backgroundColor: colors.inputBackground },
          ],
        ]}
        onPress={() => togglePlayerSelection(player.id)}
        activeOpacity={0.8}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {player.profile_picture_url ? (
            <Image source={{ uri: player.profile_picture_url }} style={styles.avatar} />
          ) : (
            <View
              style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.divider }]}
            >
              <Ionicons name="person" size={24} color={colors.textMuted} />
            </View>
          )}
          {isSelected && (
            <View style={[styles.checkmarkContainer, { backgroundColor: colors.card }]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            </View>
          )}
        </View>

        {/* Player Info */}
        <View style={styles.playerInfo}>
          <View style={styles.playerNameRow}>
            <Text style={[styles.playerName, { color: colors.text }]}>
              {player.first_name} {player.last_name}
            </Text>
            {player.isCertified && (
              <CertificationBadge status="certified" size="sm" showLabel={false} />
            )}
          </View>
          {player.display_name && (
            <Text style={[styles.playerUsername, { color: colors.textMuted }]}>
              @{player.display_name}
            </Text>
          )}
        </View>

        {/* Rating Badge */}
        {player.rating && (
          <View style={[styles.ratingBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.ratingText, { color: colors.primaryForeground }]}>
              {player.rating}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Check if user can request references (meets minimum level)
  const userCanRequest = canRequestReferences();
  const minLevel = getMinLevelThreshold();

  return (
    <Overlay
      visible={visible}
      onClose={onClose}
      type="bottom"
      showBackButton={false}
      showCloseButton={true}
    >
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          {t('profile.certification.referenceRequest.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t('profile.certification.referenceRequest.description')}
        </Text>

        {/* Minimum Level Warning (if user doesn't meet threshold) */}
        {!userCanRequest && (
          <View style={[styles.warningBox, { backgroundColor: '#FFF8E1' }]}>
            <Ionicons name="information-circle" size={20} color={colors.warning} />
            <Text style={[styles.warningText, { color: '#F57C00' }]}>
              {t('profile.certification.referenceRequest.minimumLevelRequired', {
                level: minLevel,
              })}
            </Text>
          </View>
        )}

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('profile.certification.referenceRequest.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Players List */}
        <ScrollView style={styles.playersList} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                {t('common.loading')}
              </Text>
            </View>
          ) : filteredPlayers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {t('profile.certification.referenceRequest.noPlayersFound')}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                {players.length === 0
                  ? t('profile.certification.referenceRequest.noEligiblePlayers')
                  : t('common.tryDifferentSearch')}
              </Text>
            </View>
          ) : (
            <View style={styles.playersGrid}>
              {filteredPlayers.map(player => renderPlayerCard(player))}
            </View>
          )}
        </ScrollView>

        {/* Send Requests Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary },
            (selectedPlayers.size === 0 || sending || !userCanRequest) && [
              styles.sendButtonDisabled,
              { backgroundColor: colors.buttonInactive },
            ],
          ]}
          onPress={handleSendRequests}
          disabled={selectedPlayers.size === 0 || sending || !userCanRequest}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.sendButtonText, { color: colors.primaryForeground }]}>
              {t('profile.certification.referenceRequest.sendRequest')}
              {selectedPlayers.size > 0
                ? ` (${t('profile.certification.referenceRequest.selectedCount', { count: selectedPlayers.size })})`
                : ''}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    maxHeight: '90%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    fontSize: 14,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  playersList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  playersGrid: {
    gap: 12,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  playerCardSelected: {
    // borderColor and backgroundColor applied inline
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    borderRadius: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  playerUsername: {
    fontSize: 13,
  },
  ratingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sendButton: {
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default ReferenceRequestOverlay;
