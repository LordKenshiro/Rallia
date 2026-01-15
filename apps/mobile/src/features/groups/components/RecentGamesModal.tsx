/**
 * RecentGamesModal
 * Bottom sheet modal showing all recent games in a group
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@rallia/shared-components';
import { useThemeStyles } from '../../../hooks';
import type { GroupMatch } from '@rallia/shared-hooks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RecentGamesModalProps {
  visible: boolean;
  onClose: () => void;
  matches: GroupMatch[];
  onMatchPress: (match: GroupMatch) => void;
}

export function RecentGamesModal({
  visible,
  onClose,
  matches,
  onMatchPress,
}: RecentGamesModalProps) {
  const { colors, isDark } = useThemeStyles();

  const formatMatchDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const renderMatchCard = useCallback((groupMatch: GroupMatch) => {
    const { match } = groupMatch;
    if (!match) return null;

    const team1Players = match.participants.filter(p => p.team_number === 1);
    const team2Players = match.participants.filter(p => p.team_number === 2);
    const isCompetitive = match.player_expectation === 'competitive';
    const sportName = match.sport?.name || 'Sport';
    const winningTeam = match.result?.winning_team;

    return (
      <TouchableOpacity
        key={groupMatch.id}
        style={[styles.matchCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={() => onMatchPress(groupMatch)}
        activeOpacity={0.7}
      >
        {/* Header: Sport & Date + Badge */}
        <View style={styles.matchHeader}>
          <View style={styles.matchInfo}>
            <Ionicons 
              name={sportName.toLowerCase() === 'tennis' ? 'tennisball' : 'american-football'} 
              size={16} 
              color={colors.primary} 
            />
            <Text size="sm" style={{ color: colors.textSecondary, marginLeft: 6 }}>
              {sportName} · {formatMatchDate(match.match_date)}
            </Text>
          </View>
          <View style={[
            styles.badge, 
            { backgroundColor: isCompetitive ? '#E8F5E9' : '#FFF3E0' }
          ]}>
            <Ionicons 
              name={isCompetitive ? 'trophy' : 'fitness'} 
              size={12} 
              color={isCompetitive ? '#2E7D32' : '#EF6C00'} 
            />
            <Text size="xs" weight="semibold" style={{ 
              color: isCompetitive ? '#2E7D32' : '#EF6C00',
              marginLeft: 4,
            }}>
              {isCompetitive ? 'Competitive' : 'Practice'}
            </Text>
          </View>
        </View>

        {/* Players */}
        <View style={styles.playersContainer}>
          {/* Team 1 */}
          <View style={styles.teamSection}>
            {team1Players.map((participant, idx) => (
              <View key={participant.id} style={[
                styles.playerRow,
                winningTeam === 1 && styles.winnerHighlight,
                winningTeam === 1 && { borderColor: colors.primary },
              ]}>
                <View style={[styles.playerAvatar, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                  {participant.player?.profile?.profile_picture_url ? (
                    <Image
                      source={{ uri: participant.player.profile.profile_picture_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Ionicons name="person" size={20} color={colors.textMuted} />
                  )}
                </View>
                {winningTeam === 1 && idx === 0 && (
                  <View style={styles.trophyBadge}>
                    <Ionicons name="trophy" size={12} color="#FFD700" />
                  </View>
                )}
                <Text size="sm" weight={winningTeam === 1 ? 'semibold' : 'regular'} style={{ color: colors.text, marginTop: 4 }}>
                  {participant.player?.profile?.first_name || 'Player'}
                </Text>
              </View>
            ))}
          </View>

          {/* VS */}
          <Text weight="semibold" style={{ color: colors.textMuted, marginHorizontal: 16 }}>vs</Text>

          {/* Team 2 */}
          <View style={styles.teamSection}>
            {team2Players.map((participant, idx) => (
              <View key={participant.id} style={[
                styles.playerRow,
                winningTeam === 2 && styles.winnerHighlight,
                winningTeam === 2 && { borderColor: colors.primary },
              ]}>
                <View style={[styles.playerAvatar, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                  {participant.player?.profile?.profile_picture_url ? (
                    <Image
                      source={{ uri: participant.player.profile.profile_picture_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Ionicons name="person" size={20} color={colors.textMuted} />
                  )}
                </View>
                {winningTeam === 2 && idx === 0 && (
                  <View style={styles.trophyBadge}>
                    <Ionicons name="trophy" size={12} color="#FFD700" />
                  </View>
                )}
                <Text size="sm" weight={winningTeam === 2 ? 'semibold' : 'regular'} style={{ color: colors.text, marginTop: 4 }}>
                  {participant.player?.profile?.first_name || 'Player'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Scores */}
        {match.result && (
          <View style={styles.scoresContainer}>
            <Text 
              weight={winningTeam === 1 ? 'bold' : 'regular'} 
              style={{ color: winningTeam === 1 ? colors.primary : colors.textMuted, fontSize: 18 }}
            >
              {match.result.team1_score ?? '-'}
            </Text>
            <Text style={{ color: colors.textMuted, marginHorizontal: 12 }}>-</Text>
            <Text 
              weight={winningTeam === 2 ? 'bold' : 'regular'} 
              style={{ color: winningTeam === 2 ? colors.primary : colors.textMuted, fontSize: 18 }}
            >
              {match.result.team2_score ?? '-'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [colors, isDark, formatMatchDate, onMatchPress]);

  const content = useMemo(() => {
    if (matches.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="tennisball-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
            No games played in the last 180 days
          </Text>
        </View>
      );
    }

    return matches.map(renderMatchCard);
  }, [matches, renderMatchCard, colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayBackground} onPress={onClose} activeOpacity={1} />
        
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          
          {/* Header */}
          <View style={styles.header}>
            <Text weight="semibold" size="lg" style={{ color: colors.text }}>
              Recent Games
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  matchCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  matchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamSection: {
    flexDirection: 'row',
    gap: 8,
  },
  playerRow: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  winnerHighlight: {
    borderWidth: 2,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  trophyBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 2,
  },
  scoresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
});
