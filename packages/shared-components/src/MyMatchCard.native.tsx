/**
 * MyMatchCard Component - Compact Card for "My Matches" Section
 *
 * A minimal, reminder-focused card showing only essential info:
 * - Date/time prominently displayed
 * - Location (brief)
 * - Participant avatars
 * - Sport-colored accent
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './foundation/Text.native';
import {
  lightTheme,
  darkTheme,
  spacingPixels,
  radiusPixels,
  primary,
  secondary,
  neutral,
} from '@rallia/design-system';
import type { MatchWithDetails } from '@rallia/shared-types';
import {
  formatTimeInTimezone,
  getTimeDifferenceFromNow,
  formatDateInTimezone,
  getProfilePictureUrl,
} from '@rallia/shared-utils';

// =============================================================================
// CONSTANTS
// =============================================================================

const CARD_WIDTH = 160;
const AVATAR_SIZE = 24;
const MAX_VISIBLE_AVATARS = 4;

// =============================================================================
// TYPES
// =============================================================================

interface TranslationOptions {
  [key: string]: string | number | boolean;
}

export interface MyMatchCardProps {
  /** Match data with all related details */
  match: MatchWithDetails;
  /** Callback when the card is pressed */
  onPress?: () => void;
  /** Whether dark mode is enabled */
  isDark: boolean;
  /** Translation function */
  t: (key: string, options?: TranslationOptions) => string;
  /** Current locale for date/time formatting */
  locale: string;
}

interface ThemeColors {
  cardBackground: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  secondary: string;
  avatarPlaceholder: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const BASE_WHITE = '#ffffff';

/**
 * Get compact time display for the card
 * Shows date and time with city name
 */
function getCompactTimeDisplay(
  dateString: string,
  startTime: string,
  timezone: string,
  locale: string,
  t: (key: string, options?: TranslationOptions) => string
): { dayLabel: string; timeLabel: string; isUrgent: boolean } {
  const tz = timezone || 'UTC';

  // Calculate time difference to determine if urgent (within 3 hours)
  const msDiff = getTimeDifferenceFromNow(dateString, startTime, tz);
  const hoursDiff = Math.floor(msDiff / (1000 * 60 * 60));
  const isUrgent = hoursDiff >= 0 && hoursDiff < 3;

  // Format date
  const dayLabel = formatDateInTimezone(dateString, tz, locale, { month: 'short', day: 'numeric' });

  // Format time in the match's timezone (without city name)
  const timeResult = formatTimeInTimezone(dateString, startTime, tz, locale);
  const timeLabel = timeResult.formattedTime; // e.g., "2:00 PM"

  return { dayLabel, timeLabel, isUrgent };
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface GradientStripProps {
  isDark: boolean;
}

const GradientStrip: React.FC<GradientStripProps> = ({ isDark }) => (
  <LinearGradient
    colors={isDark ? [primary[500], secondary[500]] : [primary[600], secondary[500]]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.gradientStrip}
  />
);

interface ParticipantAvatarsProps {
  match: MatchWithDetails;
  colors: ThemeColors;
  isDark: boolean;
  t: (key: string, options?: TranslationOptions) => string;
}

const ParticipantAvatars: React.FC<ParticipantAvatarsProps> = ({ match, colors, isDark, t }) => {
  const participants = match.participants?.filter(p => p.status === 'joined') ?? [];

  // Filter out creator from participants list
  const otherParticipants = participants.filter(p => p.player_id !== match.created_by);

  // Calculate total spots and spots left
  const total = match.format === 'doubles' ? 4 : 2;
  const current = otherParticipants.length + 1; // +1 for creator
  const spotsLeft = Math.max(0, total - current);

  // If no other participants, show spots available indicator
  if (otherParticipants.length === 0) {
    return (
      <View style={styles.spotsIndicator}>
        <Ionicons name="people-outline" size={12} color={colors.textMuted} />
        <Text size="xs" color={colors.textMuted} style={styles.spotsText}>
          {spotsLeft === 0
            ? t('match.slots.full')
            : spotsLeft === 1
              ? t('match.slots.oneLeft')
              : t('match.slots.left', { count: spotsLeft })}
        </Text>
      </View>
    );
  }

  // Build avatars list (creator first, then other participants)
  // Normalize URLs to use current environment's Supabase URL
  const avatars: Array<{ url?: string }> = [];
  const creatorProfile = match.created_by_player?.profile;

  // Add creator
  avatars.push({
    url: getProfilePictureUrl(creatorProfile?.profile_picture_url) ?? undefined,
  });

  // Add other participants
  for (const participant of otherParticipants) {
    avatars.push({
      url: getProfilePictureUrl(participant.player?.profile?.profile_picture_url) ?? undefined,
    });
  }

  const visibleAvatars = avatars.slice(0, MAX_VISIBLE_AVATARS);
  const extraCount = avatars.length - MAX_VISIBLE_AVATARS;

  return (
    <View style={styles.avatarsRow}>
      {visibleAvatars.map((avatar, index) => {
        const isHost = index === 0;
        return (
          <View key={index} style={styles.avatarWrapper}>
            <View
              style={[
                styles.avatar,
                index > 0 && { marginLeft: -8 },
                {
                  backgroundColor: avatar.url ? colors.primary : colors.avatarPlaceholder,
                  borderColor: isHost ? colors.secondary : colors.cardBackground,
                },
              ]}
            >
              {avatar.url ? (
                <Image source={{ uri: avatar.url }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={12} color={isDark ? neutral[400] : neutral[500]} />
              )}
            </View>
            {isHost && (
              <View style={[styles.hostBadge, { backgroundColor: colors.secondary }]}>
                <Ionicons name="star" size={5} color={BASE_WHITE} />
              </View>
            )}
          </View>
        );
      })}
      {extraCount > 0 && (
        <View
          style={[
            styles.avatar,
            styles.extraCount,
            { marginLeft: -8, backgroundColor: colors.primary },
          ]}
        >
          <Text size="xs" weight="bold" color={BASE_WHITE}>
            +{extraCount}
          </Text>
        </View>
      )}
    </View>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const MyMatchCard: React.FC<MyMatchCardProps> = ({ match, onPress, isDark, t, locale }) => {
  const themeColors = isDark ? darkTheme : lightTheme;
  const colors: ThemeColors = useMemo(
    () => ({
      cardBackground: themeColors.card,
      text: themeColors.foreground,
      textMuted: themeColors.mutedForeground,
      border: themeColors.border,
      primary: isDark ? primary[400] : primary[600],
      secondary: isDark ? secondary[400] : secondary[500],
      avatarPlaceholder: isDark ? neutral[700] : neutral[200],
    }),
    [themeColors, isDark]
  );

  const { dayLabel, timeLabel, isUrgent } = getCompactTimeDisplay(
    match.match_date,
    match.start_time,
    match.timezone,
    locale,
    t
  );

  // Get location - check facility first, then custom location, fallback to TBD
  const locationName = match.facility?.name ?? match.location_name ?? t('matchDetail.locationTBD');

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Match ${dayLabel} at ${timeLabel}`}
    >
      <GradientStrip isDark={isDark} />

      <View style={styles.content}>
        {/* Day label */}
        <Text
          size="xs"
          weight="semibold"
          color={isUrgent ? colors.secondary : colors.textMuted}
          style={styles.dayLabel}
        >
          {dayLabel.toUpperCase()}
        </Text>

        {/* Time - prominent */}
        <Text size="lg" weight="bold" color={colors.text} numberOfLines={1}>
          {timeLabel}
        </Text>

        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text size="xs" color={colors.textMuted} numberOfLines={1} style={styles.locationText}>
            {locationName}
          </Text>
        </View>

        {/* Participants */}
        <ParticipantAvatars match={match} colors={colors} isDark={isDark} t={t} />
      </View>
    </TouchableOpacity>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  gradientStrip: {
    height: 3,
  },

  content: {
    padding: spacingPixels[3],
  },

  dayLabel: {
    letterSpacing: 0.5,
    marginBottom: spacingPixels[0.5],
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacingPixels[1],
    marginBottom: spacingPixels[2],
  },

  locationText: {
    marginLeft: spacingPixels[1],
    flex: 1,
  },

  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrapper: {
    position: 'relative',
  },

  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  hostBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BASE_WHITE,
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR_SIZE / 2,
  },

  extraCount: {
    borderWidth: 0,
  },

  spotsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  spotsText: {
    marginLeft: spacingPixels[1],
  },
});

export { MyMatchCard };
export default MyMatchCard;
