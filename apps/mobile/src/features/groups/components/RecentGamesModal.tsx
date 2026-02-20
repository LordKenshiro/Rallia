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
import { getProfilePictureUrl } from '@rallia/shared-utils';
import { useThemeStyles, useTranslation } from '../../../hooks';
import type { GroupMatch } from '@rallia/shared-hooks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RecentGamesModalProps {
  visible: boolean;
  onClose: () => void;
  matches: GroupMatch[];
  onMatchPress: (match: GroupMatch) => void;
  onPlayerPress?: (playerId: string) => void;
}

export function RecentGamesModal({
  visible,
  onClose,
  matches,
  onMatchPress,
  onPlayerPress,
}: RecentGamesModalProps) {
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();

  const formatMatchDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('common.today' as any);
    if (diffDays === 1) return t('common.yesterday' as any);
    if (diffDays < 7) return t('groups.recentGames.daysAgo' as any, { count: diffDays });
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [t]);

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
              {isCompetitive ? t('groups.recentGames.competitive' as any) : t('groups.recentGames.practice' as any)}
            </Text>
          </View>
        </View>

        {/* Players - Team Cards with Overlapping Avatars */}
        <View style={styles.matchPlayersContainer}>
          {/* Team 1 Card */}
          <View style={[
            styles.teamCard,
            winningTeam === 1 && styles.winnerCard,
            winningTeam === 1 && { borderColor: '#F59E0B' },
            { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }
          ]}>
            {winningTeam === 1 && (
              <View style={styles.winnerBadge}>
                <Ionicons name="trophy" size={12} color="#F59E0B" />
              </View>
            )}
            <View style={styles.teamAvatarsContainer}>
              {team1Players.map((participant, index) => (
                <TouchableOpacity 
                  key={participant.id}
                  style={[
                    styles.overlappingAvatar,
                    { 
                      backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
                      marginLeft: index > 0 ? -12 : 0,
                      zIndex: team1Players.length - index
                    }
                  ]}
                  onPress={() => participant.player_id && onPlayerPress?.(participant.player_id)}
                  activeOpacity={0.7}
                >
                  {getProfilePictureUrl(participant.player?.profile?.profile_picture_url) ? (
                    <Image
                      source={{ uri: getProfilePictureUrl(participant.player?.profile?.profile_picture_url)! }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Ionicons name="person" size={20} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text 
              size="sm" 
              weight={winningTeam === 1 ? 'semibold' : 'regular'} 
              style={styles.teamNames}
              numberOfLines={1}
            >
              {team1Players.map(p => p.player?.profile?.first_name || t('groups.recentGames.player' as any)).join(' & ')}
            </Text>
            {/* Set scores under team - show individual set game scores */}
            {match.result && (
              <Text 
                size="sm" 
                weight="bold" 
                style={{ 
                  color: winningTeam === 1 ? '#F59E0B' : colors.textMuted,
                  marginTop: 4,
                }}
              >
                {match.result.sets && match.result.sets.length > 0
                  ? match.result.sets
                      .sort((a, b) => a.set_number - b.set_number)
                      .map(set => set.team1_score)
                      .join('  ')
                  : match.result.team1_score ?? '-'}
              </Text>
            )}
          </View>

          {/* VS */}
          <Text weight="semibold" style={{ color: colors.textMuted, marginHorizontal: 12 }}>vs</Text>

          {/* Team 2 Card */}
          <View style={[
            styles.teamCard,
            winningTeam === 2 && styles.winnerCard,
            winningTeam === 2 && { borderColor: '#F59E0B' },
            { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }
          ]}>
            {winningTeam === 2 && (
              <View style={styles.winnerBadge}>
                <Ionicons name="trophy" size={12} color="#F59E0B" />
              </View>
            )}
            <View style={styles.teamAvatarsContainer}>
              {team2Players.map((participant, index) => (
                <TouchableOpacity 
                  key={participant.id}
                  style={[
                    styles.overlappingAvatar,
                    { 
                      backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
                      marginLeft: index > 0 ? -12 : 0,
                      zIndex: team2Players.length - index
                    }
                  ]}
                  onPress={() => participant.player_id && onPlayerPress?.(participant.player_id)}
                  activeOpacity={0.7}
                >
                  {getProfilePictureUrl(participant.player?.profile?.profile_picture_url) ? (
                    <Image
                      source={{ uri: getProfilePictureUrl(participant.player?.profile?.profile_picture_url)! }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Ionicons name="person" size={20} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text 
              size="sm" 
              weight={winningTeam === 2 ? 'semibold' : 'regular'} 
              style={styles.teamNames}
              numberOfLines={1}
            >
              {team2Players.map(p => p.player?.profile?.first_name || t('groups.recentGames.player' as any)).join(' & ')}
            </Text>
            {/* Set scores under team - show individual set game scores */}
            {match.result && (
              <Text 
                size="sm" 
                weight="bold" 
                style={{ 
                  color: winningTeam === 2 ? '#F59E0B' : colors.textMuted,
                  marginTop: 4,
                }}
              >
                {match.result.sets && match.result.sets.length > 0
                  ? match.result.sets
                      .sort((a, b) => a.set_number - b.set_number)
                      .map(set => set.team2_score)
                      .join('  ')
                  : match.result.team2_score ?? '-'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, isDark, formatMatchDate, onMatchPress, onPlayerPress, t]);

  const content = useMemo(() => {
    if (matches.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="tennisball-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
            {t('groups.recentGames.noGames' as any)}
          </Text>
        </View>
      );
    }

    return matches.map(renderMatchCard);
  }, [matches, renderMatchCard, colors, t]);

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
              {t('groups.recentGames.title' as any)}
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
    minHeight: SCREEN_HEIGHT * 0.5,
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
  matchPlayersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  teamCard: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 100,
    flex: 1,
    maxWidth: 140,
  },
  teamAvatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlappingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  teamNames: {
    marginTop: 8,
    textAlign: 'center',
  },
  teamContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerCard: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  winnerCard: {
    borderWidth: 2,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  winnerBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
});
