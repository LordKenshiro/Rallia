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

interface PeerRatingRequestOverlayProps {
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
}

const PeerRatingRequestOverlay: React.FC<PeerRatingRequestOverlayProps> = ({
  visible,
  onClose,
  currentUserId,
  sportId,
  onSendRequests,
}) => {
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
      fetchMatchedPlayers();
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
        (player) =>
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

  const fetchMatchedPlayers = async () => {
    try {
      setLoading(true);

      // Step 1: Find all matches where current user participated
      const { data: userMatches, error: matchError } = await supabase
        .from('match_participant')
        .select('match_id, match!inner(sport_id, status)')
        .eq('player_id', currentUserId);

      if (matchError) throw matchError;

      // Filter matches by sport and completed status
      const relevantMatchIds = userMatches
        ?.filter(
          (m: { match_id: string; match: Array<{ sport_id: string; status: string }> }) => {
            const matchData = m.match?.[0];
            return matchData?.sport_id === sportId && matchData?.status === 'completed';
          }
        )
        .map((m: { match_id: string }) => m.match_id) || [];

      if (relevantMatchIds.length === 0) {
        setPlayers([]);
        setFilteredPlayers([]);
        setLoading(false);
        return;
      }

      // Step 2: Find all OTHER participants in those matches
      const { data: opponents, error: opponentsError } = await supabase
        .from('match_participant')
        .select('player_id')
        .in('match_id', relevantMatchIds)
        .neq('player_id', currentUserId);

      if (opponentsError) throw opponentsError;

      // Get unique opponent IDs
      const uniqueOpponentIds = [
        ...new Set(opponents?.map((o: { player_id: string }) => o.player_id) || []),
      ];

      if (uniqueOpponentIds.length === 0) {
        setPlayers([]);
        setFilteredPlayers([]);
        setLoading(false);
        return;
      }

      // Step 3: Fetch opponent profiles
      const { data: opponentProfiles, error: profilesError } = await supabase
        .from('profile')
        .select('id, full_name, display_name, profile_picture_url')
        .in('id', uniqueOpponentIds);

      if (profilesError) throw profilesError;

      // Step 4: Fetch primary ratings for each opponent for this sport
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('player_rating_score')
        .select(`
          player_id,
          is_primary,
          rating_score (
            display_label,
            rating (
              sport_id
            )
          )
        `)
        .in('player_id', uniqueOpponentIds)
        .eq('is_primary', true);

      if (ratingsError) throw ratingsError;

      // Map ratings by player_id for this sport
      const ratingsMap = new Map<string, string>();
      ratingsData?.forEach((rating: { player_id: string; is_primary: boolean; rating_score: unknown }) => {
        const ratingScore = rating.rating_score as { display_label?: string; rating?: { sport_id?: string } };
        const sportIdFromRating = ratingScore?.rating?.sport_id;
        
        if (sportIdFromRating === sportId && rating.is_primary) {
          ratingsMap.set(rating.player_id, ratingScore?.display_label || '');
        }
      });

      // Combine profiles with ratings
      const playersWithRatings: Player[] = (opponentProfiles || []).map((profile: { id: string; full_name: string; display_name: string | null; profile_picture_url: string | null }) => ({
        id: profile.id,
        full_name: profile.full_name,
        display_name: profile.display_name,
        profile_picture_url: profile.profile_picture_url,
        rating: ratingsMap.get(profile.id) || null,
      }));

      setPlayers(playersWithRatings);
      setFilteredPlayers(playersWithRatings);
    } catch (error) {
      Logger.error('Failed to fetch matched players', error as Error, { sportId, currentUserId });
    } finally {
      setLoading(false);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    selectionHaptic();
    setSelectedPlayers((prev) => {
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
      Logger.error('Failed to send peer rating requests', error as Error, { selectedCount: selectedPlayers.size });
    } finally {
      setSending(false);
    }
  };

  const renderPlayerCard = (player: Player) => {
    const isSelected = selectedPlayers.has(player.id);
    
    return (
      <TouchableOpacity
        key={player.id}
        style={[styles.playerCard, isSelected && styles.playerCardSelected]}
        onPress={() => togglePlayerSelection(player.id)}
        activeOpacity={0.8}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {player.profile_picture_url ? (
            <Image
              source={{ uri: player.profile_picture_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={24} color="#999" />
            </View>
          )}
          {isSelected && (
            <View style={styles.checkmarkContainer}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            </View>
          )}
        </View>

        {/* Player Info */}
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{player.full_name}</Text>
          {player.display_name && (
            <Text style={styles.playerUsername}>@{player.display_name}</Text>
          )}
        </View>

        {/* Rating Badge */}
        {player.rating && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{player.rating}</Text>
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
        <Text style={styles.title}>Request peer ratings</Text>
        <Text style={styles.subtitle}>
          Request ratings from players you've competed with to validate your skill level
        </Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search players..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Players List */}
        <ScrollView
          style={styles.playersList}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading players...</Text>
            </View>
          ) : filteredPlayers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>No players found</Text>
              <Text style={styles.emptySubtext}>
                {players.length === 0
                  ? 'Complete matches to request peer ratings'
                  : 'Try a different search term'}
              </Text>
            </View>
          ) : (
            <View style={styles.playersGrid}>
              {filteredPlayers.map((player) => renderPlayerCard(player))}
            </View>
          )}
        </ScrollView>

        {/* Send Requests Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (selectedPlayers.size === 0 || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendRequests}
          disabled={selectedPlayers.size === 0 || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={18} color="#fff" style={styles.sendIcon} />
              <Text style={styles.sendButtonText}>
                Send {selectedPlayers.size > 0 ? `(${selectedPlayers.size})` : 'Requests'}
              </Text>
            </>
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
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
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
    color: '#333',
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
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  playerCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight || '#E0F9F7',
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
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  playerUsername: {
    fontSize: 13,
    color: '#666',
  },
  ratingBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: COLORS.accent,
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
    backgroundColor: '#D3D3D3',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendIcon: {
    marginRight: 8,
  },
  sendButtonText: {
    color: '#fff',
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
    color: '#666',
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
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default PeerRatingRequestOverlay;
