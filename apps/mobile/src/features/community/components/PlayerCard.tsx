/**
 * PlayerCard Component
 *
 * Displays a player's basic info in a card format for the Player Directory.
 * Shows profile picture, name, city, and sport-specific rating.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import type { PlayerSearchResult } from '@rallia/shared-services';

interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
}

interface PlayerCardProps {
  player: PlayerSearchResult;
  colors: ThemeColors;
  onPress: (player: PlayerSearchResult) => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, colors, onPress }) => {
  const displayName = player.display_name || `${player.first_name} ${player.last_name || ''}`.trim();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => onPress(player)}
      activeOpacity={0.7}
    >
      {/* Profile Picture */}
      <View style={styles.avatarContainer}>
        {player.profile_picture_url ? (
          <Image source={{ uri: player.profile_picture_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
            <Ionicons name="person" size={24} color={colors.textMuted} />
          </View>
        )}
      </View>

      {/* Player Info */}
      <View style={styles.infoContainer}>
        <Text size="base" weight="semibold" color={colors.text} numberOfLines={1}>
          {displayName}
        </Text>
        
        {player.city && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text size="sm" color={colors.textMuted} style={styles.locationText} numberOfLines={1}>
              {player.city}
            </Text>
          </View>
        )}

        {player.rating && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={colors.primary} />
            <Text size="sm" weight="medium" color={colors.textSecondary} style={styles.ratingText}>
              {player.rating.label}
            </Text>
          </View>
        )}
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
    marginHorizontal: spacingPixels[4],
    marginBottom: spacingPixels[2],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
  },
  avatarContainer: {
    marginRight: spacingPixels[3],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    marginRight: spacingPixels[2],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacingPixels[1],
  },
  locationText: {
    marginLeft: spacingPixels[1],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacingPixels[1],
  },
  ratingText: {
    marginLeft: spacingPixels[1],
  },
});

export default PlayerCard;
