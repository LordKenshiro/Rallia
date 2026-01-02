/**
 * MyMatchCard Component - Compact Card for "My Matches" Section
 *
 * A minimal, reminder-focused card showing only essential info:
 * - Dynamic gradient backgrounds based on match type (competitive/casual)
 * - Animated gold border for "Ready to Play" matches (preserves base palette)
 * - Date/time prominently displayed with urgent animation
 * - Location (brief)
 * - Participant avatars
 * - Sport-colored accent
 */

import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Animated, Easing } from 'react-native';
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
  duration,
} from '@rallia/design-system';
import type { MatchWithDetails } from '@rallia/shared-types';
import {
  formatTimeInTimezone,
  getTimeDifferenceFromNow,
  formatDateInTimezone,
  getProfilePictureUrl,
  deriveMatchStatus,
} from '@rallia/shared-utils';

// =============================================================================
// DYNAMIC GRADIENT PALETTES (using design system tokens)
// =============================================================================

/**
 * Match type color palettes for dynamic backgrounds
 * Built from @rallia/design-system tokens for consistency
 *
 * Palette Strategy:
 * - competitive: secondary (coral/red) - warm, energetic
 * - casual: primary (teal) - fresh, relaxed
 * - both: accent (amber/gold) - versatile, open to anything
 *
 * Note: Urgent matches and ready-to-play status are handled via animations,
 * not color changes, to preserve the competitive/casual/both visual identity.
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
  // Both (open to any) - accent palette (amber/gold - versatile, flexible)
  both: {
    light: {
      gradientStart: accent[50],
      gradientMid: accent[100],
      gradientEnd: neutral[50],
      accentStart: accent[500],
      accentEnd: accent[400],
    },
    dark: {
      gradientStart: '#1a1607',
      gradientMid: '#332d10',
      gradientEnd: neutral[950],
      accentStart: accent[400],
      accentEnd: accent[300],
    },
  },
} as const;

/**
 * Ready-to-Play colors using design system accent scale
 * These colors are used for the animated gold border on reserved court matches
 */
const READY_TO_PLAY_COLORS = {
  light: {
    border: accent[400], // #fbbf24 - main border color
    glow: accent[300], // #fcd34d - outer glow
    shimmer: accent[100], // #fef3c7 - inner highlight
    shadow: accent[500], // #f59e0b - shadow color
  },
  dark: {
    border: accent[500], // #f59e0b - main border color
    glow: accent[400], // #fbbf24 - outer glow
    shimmer: accent[200], // #fde68a - inner highlight
    shadow: accent[600], // #d97706 - shadow color
  },
} as const;

/**
 * Determine which color palette to use based on match type
 * - competitive: secondary (coral) palette
 * - casual: primary (teal) palette
 * - both: accent (amber) palette - distinct from casual
 */
type PaletteType = 'competitive' | 'casual' | 'both';

function getMatchPalette(playerExpectation: string | null): PaletteType {
  // Competitive matches use secondary (coral) palette
  if (playerExpectation === 'competitive') {
    return 'competitive';
  }
  // Casual matches use primary (teal) palette
  if (playerExpectation === 'casual') {
    return 'casual';
  }
  // Both or null/undefined uses accent (amber) palette - open to anything
  return 'both';
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
  // Palette-aware colors (set based on competitive/casual)
  paletteAccent: string;
  paletteAccentLight: string;
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
 * Smooth gradient accent strip at the top of the card
 * Always uses palette colors (competitive/casual) - ready-to-play adds gold border separately
 */
const GradientStrip: React.FC<GradientStripProps> = ({ isDark, isReadyToPlay, palette }) => {
  const paletteColors = MATCH_PALETTES[palette][isDark ? 'dark' : 'light'];
  const rtpColors = READY_TO_PLAY_COLORS[isDark ? 'dark' : 'light'];

  // Ready-to-play cards get a gold shimmer gradient overlay on top of palette colors
  const colors: [string, string, ...string[]] = isReadyToPlay
    ? [rtpColors.shimmer, rtpColors.border, rtpColors.glow, rtpColors.border, rtpColors.shimmer]
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
  palette: PaletteType;
}

/**
 * Dynamic gradient background that creates the "color bleed" effect
 * Always uses palette colors - ready-to-play status is indicated via border, not background
 */
const CardBackground: React.FC<CardBackgroundProps> = ({ isDark, palette }) => {
  const paletteColors = MATCH_PALETTES[palette][isDark ? 'dark' : 'light'];

  // Dynamic gradient based on match type (competitive or casual)
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
                  backgroundColor: avatar.url ? colors.paletteAccent : colors.avatarPlaceholder,
                  borderWidth: isHost ? 2.5 : 2,
                  borderColor: isHost ? colors.paletteAccent : colors.paletteAccentLight, // Use accent light for all - visible in both modes
                  shadowColor: isHost ? colors.paletteAccent : colors.paletteAccentLight,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isHost ? 0.3 : 0.15,
                  shadowRadius: isHost ? 4 : 2,
                  elevation: isHost ? 3 : 2,
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
              <View style={[styles.hostBadge, { backgroundColor: colors.paletteAccent }]}>
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
            {
              marginLeft: -8,
              backgroundColor: colors.paletteAccent,
              borderColor: colors.paletteAccentLight,
              shadowColor: colors.paletteAccent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              elevation: 2,
            },
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

  // Get ready-to-play colors from design system
  const rtpColors = READY_TO_PLAY_COLORS[isDark ? 'dark' : 'light'];

  // Animated pulse effect for urgent matches
  const urgentPulseAnimation = useRef(new Animated.Value(0)).current;

  // Determine color palette based on match type (competitive vs casual vs both)
  // Urgency is handled via animation, not color change
  const palette = getMatchPalette(match.player_expectation);
  const paletteColors = MATCH_PALETTES[palette][isDark ? 'dark' : 'light'];

  // Get palette-specific accent colors based on match type
  const getPaletteAccentColors = useCallback(
    (paletteType: PaletteType) => {
      switch (paletteType) {
        case 'competitive':
          return {
            accent: isDark ? secondary[400] : secondary[500],
            accentLight: isDark ? secondary[700] : secondary[200],
          };
        case 'casual':
          return {
            accent: isDark ? primary[400] : primary[500],
            accentLight: isDark ? primary[700] : primary[200],
          };
        case 'both':
        default:
          return {
            accent: isDark ? accent[400] : accent[500],
            accentLight: isDark ? accent[700] : accent[200],
          };
      }
    },
    [isDark]
  );

  const paletteAccents = getPaletteAccentColors(palette);

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
      // Palette-aware colors for consistent theming
      paletteAccent: paletteAccents.accent,
      // Subtle border color - visible but not overpowering
      paletteAccentLight: paletteAccents.accentLight,
    }),
    [themeColors, isDark, paletteAccents]
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

  // Derive match status to determine if ongoing
  const derivedStatus = deriveMatchStatus({
    cancelled_at: match.cancelled_at,
    match_date: match.match_date,
    start_time: match.start_time,
    end_time: match.end_time,
    timezone: match.timezone,
    result: match.result,
  });

  // Determine animation type:
  // - "in_progress" = ongoing match = live indicator animation
  // - "isUrgent" (< 3 hours) but not in_progress = starting soon = countdown animation
  const isOngoing = derivedStatus === 'in_progress';
  const isStartingSoon = isUrgent && !isOngoing;

  // Start animation when match is ongoing or starting soon
  useEffect(() => {
    if (isOngoing || isStartingSoon) {
      const animationDuration = isOngoing ? duration.extraSlow : duration.verySlow;
      const pulseAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(urgentPulseAnimation, {
            toValue: 1,
            duration: animationDuration,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(urgentPulseAnimation, {
            toValue: 0,
            duration: animationDuration,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnim.start();
      return () => {
        pulseAnim.stop();
      };
    }
  }, [isOngoing, isStartingSoon, urgentPulseAnimation]);

  // "Live indicator" interpolations for ongoing matches
  const liveRingScale = urgentPulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const liveRingOpacity = urgentPulseAnimation.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.7, 0.3, 0],
  });

  const liveDotOpacity = urgentPulseAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.7, 1],
  });

  // "Starting soon" interpolations - subtle bouncing chevron
  const countdownBounce = urgentPulseAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 2, 0],
  });

  const countdownOpacity = urgentPulseAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1, 0.6],
  });

  // Dynamic border color based on palette and ready-to-play status
  const dynamicBorderColor = isReadyToPlay
    ? rtpColors.border
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
        isReadyToPlay && [styles.premiumCard, { shadowColor: rtpColors.shadow }],
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Match ${dayLabel} at ${timeLabel}${isReadyToPlay ? ' - Ready to Play' : ''}`}
    >
      {/* Dynamic gradient background - always uses palette colors */}
      <CardBackground isDark={isDark} palette={palette} />

      {/* Gradient accent strip */}
      <GradientStrip isDark={isDark} isReadyToPlay={isReadyToPlay} palette={palette} />

      <View style={styles.content}>
        {/* Day label with indicator */}
        <View style={styles.dayLabelRow}>
          {/* "Live" indicator for ongoing matches */}
          {isOngoing && (
            <View style={styles.liveIndicatorContainer}>
              <Animated.View
                style={[
                  styles.liveRing,
                  {
                    backgroundColor: status.error.DEFAULT,
                    transform: [{ scale: liveRingScale }],
                    opacity: liveRingOpacity,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.liveDot,
                  {
                    backgroundColor: status.error.DEFAULT,
                    opacity: liveDotOpacity,
                  },
                ]}
              />
            </View>
          )}
          {/* Bouncing chevron for starting soon */}
          {isStartingSoon && (
            <Animated.View
              style={[
                styles.countdownIndicator,
                {
                  transform: [{ translateX: countdownBounce }],
                  opacity: countdownOpacity,
                },
              ]}
            >
              <Ionicons name="chevron-forward" size={10} color={status.warning.DEFAULT} />
            </Animated.View>
          )}
          <Text
            size="xs"
            weight="semibold"
            color={
              isOngoing
                ? status.error.DEFAULT
                : isStartingSoon
                  ? status.warning.DEFAULT
                  : colors.textMuted
            }
            style={styles.dayLabel}
          >
            {dayLabel.toUpperCase()}
          </Text>
        </View>

        {/* Time - prominent */}
        <Text
          size="lg"
          weight="bold"
          color={
            isOngoing ? status.error.DEFAULT : isStartingSoon ? status.warning.DEFAULT : colors.text
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
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
    // shadowColor is set dynamically using rtpColors.shadow
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

  dayLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dayLabel: {
    letterSpacing: 0.5,
    marginBottom: spacingPixels[0.5],
  },

  // "Live" indicator styles for ongoing matches
  liveIndicatorContainer: {
    width: 8,
    height: 8,
    marginRight: spacingPixels[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveRing: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    // Subtle shadow for depth
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },
  // "Starting soon" countdown indicator
  countdownIndicator: {
    marginRight: spacingPixels[0.5],
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR_SIZE / 2,
  },

  extraCount: {
    borderWidth: 2, // Allow border to be set inline
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
