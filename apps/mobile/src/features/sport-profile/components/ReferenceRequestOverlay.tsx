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
import { COLORS } from '@rallia/shared-constants';
import { supabase, Logger } from '@rallia/shared-services';
import { selectionHaptic, mediumHaptic } from '../../../utils/haptics';
import { useThemeStyles } from '../../../hooks';

interface ReferenceRequestOverlayProps {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  sportId: string;
  onSendRequests: (selectedPlayerIds: string[]) => Promise<void>;
}

interface Player {
  id: string;
  full_name: string;
  display_name: string | null;
  profile_picture_url: string | null;
  rating: string | null;
  isCertified: boolean;
}

const ReferenceRequestOverlay: React.FC<ReferenceRequestOverlayProps> = ({
  visible,
  onClose,
  currentUserId,
  sportId,
  onSendRequests,
}) => {
  const { colors } = useThemeStyles();
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
          player.full_name.toLowerCase().includes(query) ||
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

  const fetchCertifiedPlayers = async () => {
    try {
      setLoading(true);

      // Step 1: Find all players with CERTIFIED ratings for this sport
      const { data: certifiedRatings, error: ratingsError } = await supabase
        .from('player_rating_score')
        .select(
          `
          player_id,
          source,
          is_certified,
          rating_score!player_rating_scores_rating_score_id_fkey (
            id,
            label,
            rating_system (
              sport_id
            )
          )
        `
        )
        .eq('is_certified', true)
        .neq('source', 'self_reported')
        .neq('player_id', currentUserId); // Exclude current user

      if (ratingsError) throw ratingsError;

      // Filter by sport and get unique player IDs
      const sportCertifiedRatings =
        certifiedRatings?.filter(
          (rating: { rating_score: Array<{ rating_system: Array<{ sport_id: string }> }> }) => {
            const ratingScoreArray = rating.rating_score;
            const ratingSystemArray = ratingScoreArray?.[0]?.rating_system;
            return ratingSystemArray?.[0]?.sport_id === sportId;
          }
        ) || [];

      const uniquePlayerIds = [
        ...new Set(sportCertifiedRatings.map((r: { player_id: string }) => r.player_id)),
      ];

      if (uniquePlayerIds.length === 0) {
        setPlayers([]);
        setFilteredPlayers([]);
        setLoading(false);
        return;
      }

      // Step 2: Fetch player profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profile')
        .select('id, full_name, display_name, profile_picture_url')
        .in('id', uniquePlayerIds);

      if (profilesError) throw profilesError;

      // Step 3: Map ratings by player_id (get certified rating)
      const ratingsMap = new Map<string, { display_label: string; isCertified: boolean }>();
      sportCertifiedRatings.forEach(
        (rating: {
          player_id: string;
          source: string;
          is_certified: boolean;
          rating_score: unknown;
        }) => {
          const ratingScore = rating.rating_score as { label?: string };
          const isCertified = rating.is_certified;

          if (!ratingsMap.has(rating.player_id)) {
            ratingsMap.set(rating.player_id, {
              display_label: ratingScore?.label || '',
              isCertified,
            });
          }
        }
      );

      // Step 4: Combine profiles with ratings
      const playersWithRatings: Player[] = (profiles || []).map(
        (profile: {
          id: string;
          full_name: string;
          display_name: string | null;
          profile_picture_url: string | null;
        }) => {
          const ratingInfo = ratingsMap.get(profile.id);
          return {
            id: profile.id,
            full_name: profile.full_name,
            display_name: profile.display_name,
            profile_picture_url: profile.profile_picture_url,
            rating: ratingInfo?.display_label || null,
            isCertified: ratingInfo?.isCertified || false,
          };
        }
      );

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
          <Text style={[styles.playerName, { color: colors.text }]}>{player.full_name}</Text>
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
          Request references for your current rating
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Request references allow you to certify your rating by asking other higher-rated or
          certified players to confirm your declared rating
        </Text>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search players..."
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
                Loading certified players...
              </Text>
            </View>
          ) : filteredPlayers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No certified players found
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                {players.length === 0
                  ? 'No players with certified ratings for this sport yet'
                  : 'Try a different search term'}
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
            (selectedPlayers.size === 0 || sending) && [
              styles.sendButtonDisabled,
              { backgroundColor: colors.buttonInactive },
            ],
          ]}
          onPress={handleSendRequests}
          disabled={selectedPlayers.size === 0 || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.sendButtonText, { color: colors.primaryForeground }]}>
              Send Requests{selectedPlayers.size > 0 ? ` (${selectedPlayers.size})` : ''}
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
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
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
