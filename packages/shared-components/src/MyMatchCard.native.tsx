/**
 * MyMatchCard Component - Compact Card for "My Matches" Section
 *
 * A minimal, reminder-focused card showing only essential info:
 * - Dynamic gradient backgrounds based on match type
 * - Premium styling for "Ready to Play" matches
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
  accent,
  neutral,
  status,
  base,
} from '@rallia/design-system';
import type { MatchWithDetails } from '@rallia/shared-types';
import {
  formatTimeInTimezone,
  getTimeDifferenceFromNow,
  formatDateInTimezone,
  getProfilePictureUrl,
} from '@rallia/shared-utils';

// =============================================================================
// DYNAMIC GRADIENT PALETTES (using design system tokens)
// =============================================================================

/**
 * Match type color palettes for dynamic backgrounds
 * Built from @rallia/design-system tokens for consistency
 * Shared with MatchCard for consistency across components
 */
const MATCH_PALETTES = {
  // Competitive matches - secondary palette (coral/red tones)
  competitive: {
    light: {
      gradientStart: secondary[50],
      gradientMid: secondary[100],
      gradientEnd: neutral[50],
      accentStart: secondary[500],
      accentEnd: secondary[400],
    },
    dark: {
      gradientStart: secondary[950],
      gradientMid: secondary[900],
      gradientEnd: neutral[950],
      accentStart: secondary[400],
      accentEnd: secondary[300],
    },
  },
  // Practice matches - info/blue palette (calm, focused)
  practice: {
    light: {
      gradientStart: '#f0f9ff', // sky-50 - complements status.info
      gradientMid: '#e0f2fe', // sky-100
      gradientEnd: neutral[50],
      accentStart: status.info.DEFAULT,
      accentEnd: status.info.light,
    },
    dark: {
      gradientStart: '#0c1929', // dark sky-tinted
      gradientMid: '#0a1420', // darker sky-tinted
      gradientEnd: neutral[950],
      accentStart: status.info.light,
      accentEnd: status.info.DEFAULT,
    },
  },
  // Casual matches - primary palette (teal/mint - fresh, relaxed)
  casual: {
    light: {
      gradientStart: primary[50],
      gradientMid: primary[100],
      gradientEnd: neutral[50],
      accentStart: primary[500],
      accentEnd: primary[400],
    },
    dark: {
      gradientStart: primary[950],
      gradientMid: primary[900],
      gradientEnd: neutral[950],
      accentStart: primary[400],
      accentEnd: primary[300],
    },
  },
  // Urgent matches (< 3 hours) - red-orange warning palette (distinct from gold)
  urgent: {
    light: {
      gradientStart: '#fff5f0', // warm red-tinted white
      gradientMid: '#ffe4d6', // light coral/orange
      gradientEnd: neutral[50],
      accentStart: status.warning.DEFAULT, // #f59e0b - amber
      accentEnd: status.error.DEFAULT, // #ef4444 - red
    },
    dark: {
      gradientStart: '#2d1a14', // dark red-tinted
      gradientMid: '#261712', // darker red-tinted
      gradientEnd: neutral[950],
      accentStart: status.warning.light, // #fbbf24 - lighter amber
      accentEnd: status.error.light, // #f87171 - lighter red
    },
  },
  // Default - balanced primary/secondary gradient
  default: {
    light: {
      gradientStart: primary[50],
      gradientMid: `${primary[100]}80`, // 50% opacity blend
      gradientEnd: neutral[50],
      accentStart: primary[500],
      accentEnd: secondary[500],
    },
    dark: {
      gradientStart: primary[950],
      gradientMid: primary[900],
      gradientEnd: neutral[950],
      accentStart: primary[400],
      accentEnd: secondary[400],
    },
  },
} as const;

/**
 * Premium/Gold card colors for "Ready to Play" matches
 * Rich, luxurious gold palette - distinct from urgent amber/red
 * Uses deeper, richer gold tones for premium feel
 */
const GOLD_COLORS = {
  light: '#FFE55C', // Bright gold - more vibrant than accent
  base: '#FFD700', // Classic gold - richer than accent[400]
  dark: '#FFC107', // Deep gold - warmer than accent[500]
  deepGold: '#D4AF37', // Rich gold - more luxurious
  bronze: '#CD7F32', // Bronze accent - adds depth
  shimmer: '#FFF8DC', // Cream shimmer - softer than accent[50]
} as const;

/**
 * Determine which color palette to use based on match characteristics
 */
type PaletteType = 'competitive' | 'practice' | 'casual' | 'urgent' | 'default';

function getMatchPalette(playerExpectation: string | null, isUrgent: boolean): PaletteType {
  // Urgent matches take priority - they need attention
  if (isUrgent) {
    return 'urgent';
  }

  // Then check player expectation
  switch (playerExpectation) {
    case 'competitive':
      return 'competitive';
    case 'casual':
      return 'casual';
    case 'practice':
      // Legacy 'practice' values map to 'casual' for consistency
      return 'casual';
    default:
      return 'casual';
  }
}

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
  isReadyToPlay?: boolean;
  palette: PaletteType;
}

/**
 * Gradient accent strip - uses palette colors or gold for premium cards
 */
const GradientStrip: React.FC<GradientStripProps> = ({ isDark, isReadyToPlay, palette }) => {
  const paletteColors = MATCH_PALETTES[palette][isDark ? 'dark' : 'light'];

  const colors: [string, string, ...string[]] = isReadyToPlay
    ? [
        GOLD_COLORS.bronze,
        GOLD_COLORS.base,
        GOLD_COLORS.light,
        GOLD_COLORS.base,
        GOLD_COLORS.bronze,
      ]
    : [paletteColors.accentStart, paletteColors.accentEnd];

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.gradientStrip, isReadyToPlay && styles.gradientStripPremium]}
    />
  );
};

interface CardBackgroundProps {
  isDark: boolean;
  isReadyToPlay?: boolean;
  palette: PaletteType;
}

/**
 * Dynamic gradient background that creates the "color bleed" effect
 * Premium cards get special gold-tinted glassmorphism effect
 */
const CardBackground: React.FC<CardBackgroundProps> = ({ isDark, isReadyToPlay, palette }) => {
  const paletteColors = MATCH_PALETTES[palette][isDark ? 'dark' : 'light'];

  if (isReadyToPlay) {
    // Premium glassmorphism-inspired background with rich gold tint
    // Uses richer gold colors distinct from urgent amber/red
    return (
      <LinearGradient
        colors={
          isDark
            ? ['#3D3422', '#2A2418', neutral[950]] // Rich dark gold-tinted gradient
            : [GOLD_COLORS.shimmer, '#FFFBF0', base.white] // Rich light gold-tinted gradient
        }
        locations={[0, 0.4, 1]}
        style={styles.cardBackgroundGradient}
      />
    );
  }

  // Dynamic gradient based on match type
  return (
    <LinearGradient
      colors={[paletteColors.gradientStart, paletteColors.gradientMid, paletteColors.gradientEnd]}
      locations={[0, 0.35, 1]}
      style={styles.cardBackgroundGradient}
    />
  );
};

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
                <Ionicons name="star" size={5} color={base.white} />
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
          <Text size="xs" weight="bold" color={base.white}>
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
  // Check if this is a "Ready to Play" match (court already reserved)
  const isReadyToPlay = match.court_status === 'reserved';

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

  // Determine color palette based on match characteristics
  const palette = getMatchPalette(match.player_expectation, isUrgent);
  const paletteColors = MATCH_PALETTES[palette][isDark ? 'dark' : 'light'];

  // Get location - check facility first, then custom location, fallback to TBD
  const locationName = match.facility?.name ?? match.location_name ?? t('matchDetail.locationTBD');

  // Dynamic border color based on palette and ready-to-play status
  const dynamicBorderColor = isReadyToPlay
    ? GOLD_COLORS.deepGold
    : isDark
      ? `${paletteColors.accentStart}40` // 25% opacity accent border in dark mode
      : `${paletteColors.accentStart}20`; // 12% opacity accent border in light mode

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: 'transparent', // Background handled by gradient
          borderColor: dynamicBorderColor,
        },
        isReadyToPlay && styles.premiumCard,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Match ${dayLabel} at ${timeLabel}${isReadyToPlay ? ' - Ready to Play' : ''}`}
    >
      {/* Dynamic gradient background */}
      <CardBackground isDark={isDark} isReadyToPlay={isReadyToPlay} palette={palette} />

      {/* Gradient accent strip */}
      <GradientStrip isDark={isDark} isReadyToPlay={isReadyToPlay} palette={palette} />

      <View style={styles.content}>
        {/* Day label */}
        <Text
          size="xs"
          weight="semibold"
          color={
            isUrgent
              ? MATCH_PALETTES.urgent[isDark ? 'dark' : 'light'].accentStart
              : colors.textMuted
          }
          style={styles.dayLabel}
        >
          {dayLabel.toUpperCase()}
        </Text>

        {/* Time - prominent, uses palette color for urgent */}
        <Text
          size="lg"
          weight="bold"
          color={
            isUrgent ? MATCH_PALETTES.urgent[isDark ? 'dark' : 'light'].accentStart : colors.text
          }
          numberOfLines={1}
        >
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
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },

  // Premium "Ready to Play" card styles
  premiumCard: {
    borderWidth: 2,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    shadowColor: GOLD_COLORS.base,
  },

  // Dynamic gradient background
  cardBackgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  gradientStrip: {
    height: 3,
    zIndex: 1,
  },
  gradientStripPremium: {
    height: 5, // Slightly taller for premium cards
  },

  content: {
    padding: spacingPixels[3],
    zIndex: 1,
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
    borderColor: base.white,
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
