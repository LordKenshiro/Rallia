/**
 * MatchCard Component - Vibrant & Sporty Design
 *
 * A high-energy, athletic card design with:
 * - Dynamic gradient backgrounds based on match type
 * - Color bleed effect from accent strip
 * - Glassmorphism for premium "Ready to Play" matches
 * - Visual player slot indicators
 * - Match details as primary focus
 */

import React, { useMemo, useEffect, useRef } from 'react';
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
} from '@rallia/design-system';
import type { MatchWithDetails } from '@rallia/shared-types';
import {
  formatTimeRangeInTimezone,
  getTimeDifferenceFromNow,
  getMatchEndTimeDifferenceFromNow,
  formatDateInTimezone,
  getProfilePictureUrl,
  deriveMatchStatus,
  type DerivedMatchStatus,
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
 * - practice: status.info (blue) - calm, focused
 * - casual: primary (teal) - fresh, relaxed
 * - urgent: accent (amber/gold) - attention-grabbing
 * - default: primary + secondary blend
 */
const MATCH_PALETTES = {
  // Competitive matches - secondary palette (coral/red tones)
  competitive: {
    light: {
      gradientStart: secondary[50], // #fdf0f0
      gradientMid: secondary[100], // #fbe1e2
      gradientEnd: neutral[50], // #fafafa
      accentStart: secondary[500], // #ed6a6d
      accentEnd: secondary[400], // #f1888a
    },
    dark: {
      gradientStart: secondary[950], // #180b0b
      gradientMid: secondary[900], // #2f1516
      gradientEnd: neutral[950], // #0a0a0a
      accentStart: secondary[400], // #f1888a
      accentEnd: secondary[300], // #f4a6a7
    },
  },
  // Practice matches - info/blue palette (calm, focused)
  // Note: Blue gradients extend beyond core design system palette
  // using standard Tailwind blue scale to complement status.info
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
      gradientStart: primary[50], // #f0fdfa
      gradientMid: primary[100], // #ccfbf1
      gradientEnd: neutral[50],
      accentStart: primary[500], // #14b8a6
      accentEnd: primary[400], // #2dd4bf
    },
    dark: {
      gradientStart: primary[950], // #042f2e
      gradientMid: primary[900], // #134e4a
      gradientEnd: neutral[950],
      accentStart: primary[400], // #2dd4bf
      accentEnd: primary[300], // #5eead4
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

// =============================================================================
// CONSTANTS
// =============================================================================

const CARD_HORIZONTAL_MARGIN = spacingPixels[4]; // 16px each side
const CARD_PADDING = spacingPixels[4]; // 16px
const GRADIENT_STRIP_HEIGHT = 4;

// Slot sizes
const SLOT_SIZE = 32;

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
    case 'practice':
      return 'practice';
    default:
      return 'casual';
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface TranslationOptions {
  [key: string]: string | number | boolean;
}

export interface MatchCardProps {
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
  /** Current user's player ID (to determine owner/participant status) */
  currentPlayerId?: string;
}

interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryLight: string;
  secondary: string;
  secondaryLight: string;
  statusOpen: string;
  statusFull: string;
  statusCompleted: string;
  slotEmpty: string;
  slotEmptyBorder: string;
  avatarPlaceholder: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Use base.white from design system for consistency

/**
 * Get time display for match date/time
 * Shows date and time with city name in parentheses
 */
function getRelativeTimeDisplay(
  dateString: string,
  startTime: string,
  endTime: string,
  timezone: string,
  locale: string,
  t: (key: string, options?: TranslationOptions) => string
): { label: string; isUrgent: boolean } {
  const tz = timezone || 'UTC';

  // Calculate time difference to determine if urgent (within 3 hours)
  const msDiff = getTimeDifferenceFromNow(dateString, startTime, tz);
  const hoursDiff = Math.floor(msDiff / (1000 * 60 * 60));
  const isUrgent = hoursDiff >= 0 && hoursDiff < 3;

  // Format date
  const dateLabel = formatDateInTimezone(dateString, tz, locale, {
    month: 'short',
    day: 'numeric',
  });

  // Format time range in the match's timezone with city name
  const timeRange = formatTimeRangeInTimezone(dateString, startTime, endTime, tz, locale);
  const separator = t('common.time.timeSeparator');

  return { label: `${dateLabel}${separator}${timeRange}`, isUrgent };
}

/**
 * Get location display string
 */
function getLocationDisplay(match: MatchWithDetails, t: (key: string) => string): string {
  if (match.facility?.name) {
    return match.facility.name;
  }
  if (match.location_name) {
    return match.location_name;
  }
  return t('matchDetail.locationTBD');
}

/**
 * Get court display string
 */
function getCourtDisplay(match: MatchWithDetails): string | null {
  if (match.court?.name) {
    return match.court.name;
  }
  return null;
}

/**
 * Calculate player slots info - only counts joined participants
 */
function getParticipantInfo(match: MatchWithDetails): {
  current: number;
  total: number;
  spotsLeft: number;
} {
  const total = match.format === 'doubles' ? 4 : 2;
  // Only count joined participants (not requested, pending, waitlisted, left, etc.)
  const joinedParticipants = match.participants?.filter(p => p.status === 'joined') ?? [];
  const current = joinedParticipants.length + 1; // +1 for creator
  const spotsLeft = Math.max(0, total - current);
  return { current, total, spotsLeft };
}

/**
 * Get status info for badges
 * Uses derived status instead of denormalized status field
 */
function getStatusInfo(
  derivedStatus: DerivedMatchStatus,
  participantInfo: { current: number; total: number },
  colors: ThemeColors,
  t: (key: string) => string
): { label: string; bgColor: string; textColor: string; glowColor: string } {
  if (derivedStatus === 'completed') {
    return {
      label: t('match.status.completed'),
      bgColor: colors.statusCompleted,
      textColor: base.white,
      glowColor: colors.statusCompleted,
    };
  }
  if (derivedStatus === 'cancelled') {
    return {
      label: t('match.status.cancelled'),
      bgColor: neutral[400],
      textColor: base.white,
      glowColor: neutral[400],
    };
  }
  if (derivedStatus === 'in_progress') {
    return {
      label: t('match.status.inProgress'),
      bgColor: colors.statusFull, // Orange for in-progress
      textColor: base.white,
      glowColor: colors.statusFull,
    };
  }
  if (participantInfo.current >= participantInfo.total) {
    return {
      label: t('match.status.full'),
      bgColor: colors.statusFull,
      textColor: base.white,
      glowColor: colors.statusFull,
    };
  }
  return {
    label: t('match.status.open'),
    bgColor: colors.statusOpen,
    textColor: base.white,
    glowColor: colors.statusOpen,
  };
}

/**
 * Get player expectation display
 */
function getPlayerExpectationInfo(
  expectation: string | null,
  isDark: boolean,
  t: (key: string) => string
): { label: string; bgColor: string; textColor: string; icon: keyof typeof Ionicons.glyphMap } {
  switch (expectation) {
    case 'competitive':
      return {
        label: t('match.type.competitive'),
        bgColor: secondary[500],
        textColor: base.white,
        icon: 'trophy',
      };
    case 'practice':
      return {
        label: t('match.type.practice'),
        bgColor: status.success.DEFAULT,
        textColor: base.white,
        icon: 'barbell',
      };
    default:
      return {
        label: t('matchDetail.casual'),
        bgColor: isDark ? neutral[600] : neutral[300],
        icon: 'happy',
        textColor: isDark ? neutral[200] : neutral[700],
      };
  }
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
 * Uses expo-linear-gradient for a true gradient effect
 * Gold gradient for "Ready to Play" matches
 * Dynamic colors based on match type palette
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
 * The accent colors fade into the card background for visual continuity
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

interface PlayerSlotsProps {
  match: MatchWithDetails;
  participantInfo: { current: number; total: number; spotsLeft: number };
  colors: ThemeColors;
  isDark: boolean;
  t: (key: string, options?: TranslationOptions) => string;
}

/**
 * Visual player slot indicators showing filled/empty positions
 */
const PlayerSlots: React.FC<PlayerSlotsProps> = ({ match, participantInfo, colors, isDark, t }) => {
  const creatorProfile = match.created_by_player?.profile;
  // Only include joined participants
  const joinedParticipants = match.participants?.filter(p => p.status === 'joined') ?? [];

  // Build slots array
  const slots: Array<{
    filled: boolean;
    avatarUrl?: string | null;
    isHost: boolean;
  }> = [];

  // First slot is always the host/creator
  // Normalize URL to use current environment's Supabase URL
  slots.push({
    filled: true,
    avatarUrl: getProfilePictureUrl(creatorProfile?.profile_picture_url),
    isHost: true,
  });

  // Add participant slots (only joined participants)
  // Normalize URLs to use current environment's Supabase URL
  for (let i = 0; i < participantInfo.total - 1; i++) {
    const participant = joinedParticipants[i];
    slots.push({
      filled: !!participant,
      avatarUrl: getProfilePictureUrl(participant?.player?.profile?.profile_picture_url),
      isHost: false,
    });
  }

  const spotsText =
    participantInfo.spotsLeft === 0
      ? t('match.slots.full')
      : participantInfo.spotsLeft === 1
        ? t('match.slots.oneLeft')
        : t('match.slots.left', { count: participantInfo.spotsLeft });

  return (
    <View style={styles.slotsContainer}>
      <View style={styles.slotsRow}>
        {slots.map((slot, index) => (
          <View key={index} style={styles.slotWrapper}>
            <View
              style={[
                styles.slot,
                index > 0 && { marginLeft: -8 }, // Overlap avatars
                slot.filled
                  ? {
                      backgroundColor: slot.avatarUrl ? colors.primary : colors.avatarPlaceholder,
                      borderWidth: 2,
                      borderColor: colors.cardBackground,
                    }
                  : {
                      backgroundColor: colors.slotEmpty,
                      borderWidth: 2,
                      borderColor: colors.slotEmptyBorder,
                    },
                slot.isHost && { borderWidth: 2, borderColor: colors.secondary },
              ]}
            >
              {slot.filled ? (
                slot.avatarUrl ? (
                  <Image source={{ uri: slot.avatarUrl }} style={styles.slotAvatar} />
                ) : (
                  <Ionicons name="person" size={14} color={isDark ? neutral[400] : neutral[500]} />
                )
              ) : (
                <Ionicons name="add" size={16} color={colors.slotEmptyBorder} />
              )}
            </View>
            {slot.isHost && (
              <View style={[styles.hostIndicator, { backgroundColor: colors.secondary }]}>
                <Ionicons name="star" size={6} color={base.white} />
              </View>
            )}
          </View>
        ))}
      </View>
      <Text
        size="xs"
        weight="medium"
        color={participantInfo.spotsLeft > 0 ? colors.statusOpen : colors.textMuted}
        style={styles.spotsText}
      >
        {spotsText}
      </Text>
    </View>
  );
};

interface BadgeProps {
  label: string;
  bgColor: string;
  textColor: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Simple badge component with solid background
 */
const Badge: React.FC<BadgeProps> = ({ label, bgColor, textColor, icon }) => (
  <View style={[styles.badge, { backgroundColor: bgColor }]}>
    {icon && <Ionicons name={icon} size={10} color={textColor} style={styles.badgeIcon} />}
    <Text size="xs" weight="semibold" color={textColor}>
      {label}
    </Text>
  </View>
);

interface StatusBadgeProps {
  label: string;
  bgColor: string;
  textColor: string;
  glowColor: string;
}

/**
 * Status badge with subtle glow effect
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ label, bgColor, textColor }) => (
  <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
    <Text size="xs" weight="bold" color={textColor}>
      {label.toUpperCase()}
    </Text>
  </View>
);

interface CardFooterProps {
  match: MatchWithDetails;
  participantInfo: { current: number; total: number; spotsLeft: number };
  colors: ThemeColors;
  isDark: boolean;
  t: (key: string, options?: TranslationOptions) => string;
  onPress?: () => void;
  currentPlayerId?: string;
}

/**
 * Footer with CTA button
 *
 * CTA Logic (priority order):
 * 1. Match has ended → "View" (for everyone - no edit/leave allowed)
 * 2. Match has result → "View Results"
 * 3. Owner (match not ended) → "Edit"
 * 4. User has joined (match not ended) → "Leave"
 * 5. User has pending request → "Pending" (disabled)
 * 6. Match is full → "Full" (disabled)
 * 7. Join mode is 'request' → "Ask to Join"
 * 8. Default → "Join"
 */
const CardFooter: React.FC<CardFooterProps> = ({
  match,
  participantInfo,
  colors,
  isDark,
  t,
  onPress,
  currentPlayerId,
}) => {
  // Check if match is cancelled (use cancelled_at instead of status)
  const isCancelled = !!match.cancelled_at;

  // Check if match has ended (end_time has passed in match's timezone)
  // Account for matches that span midnight (e.g., 11 PM - 1 AM)
  const matchEndDiff = getMatchEndTimeDifferenceFromNow(
    match.match_date,
    match.start_time,
    match.end_time,
    match.timezone
  );
  const hasMatchEnded = matchEndDiff < 0;

  // Derive match state from data (not from status field)
  const isFull = participantInfo.spotsLeft === 0;
  const hasResult = !!match.result;

  // User role checks
  const isOwner = currentPlayerId
    ? match.created_by_player?.id === currentPlayerId || match.created_by === currentPlayerId
    : false;

  const userParticipant = currentPlayerId
    ? match.participants?.find(
        p => p.player_id === currentPlayerId || p.player?.id === currentPlayerId
      )
    : undefined;

  const hasJoined = userParticipant?.status === 'joined';
  const hasPendingRequest =
    userParticipant?.status === 'requested' || userParticipant?.status === 'pending';
  const isWaitlisted = userParticipant?.status === 'waitlisted';

  // Join mode
  const isRequestMode = match.join_mode === 'request';

  // Determine button label, style, and icon based on state
  let ctaLabel: string;
  let ctaBgColor: string;
  let ctaTextColor: string;
  let ctaDisabled = false;
  let ctaIcon: keyof typeof Ionicons.glyphMap | null = 'arrow-forward';

  if (isCancelled) {
    // Match is cancelled → Cancelled (disabled, highest priority)
    ctaLabel = t('match.cta.cancelled');
    ctaBgColor = isDark ? neutral[700] : neutral[200];
    ctaTextColor = colors.textMuted;
    ctaDisabled = true;
    ctaIcon = null;
  } else if (hasResult) {
    // Match with results → View Results (highest priority for completed matches)
    ctaLabel = t('match.cta.viewResults');
    ctaBgColor = isDark ? neutral[700] : neutral[200];
    ctaTextColor = colors.text;
    ctaIcon = 'eye-outline';
  } else if (hasMatchEnded) {
    // Match has ended but no results yet → View (no edit/leave allowed)
    ctaLabel = t('match.cta.view');
    ctaBgColor = isDark ? neutral[700] : neutral[200];
    ctaTextColor = colors.text;
    ctaIcon = 'eye-outline';
  } else if (isOwner) {
    // Owner (match not ended) → Edit
    ctaLabel = t('match.cta.edit');
    ctaBgColor = colors.primary;
    ctaTextColor = base.white;
    ctaIcon = 'create-outline';
  } else if (isWaitlisted) {
    // User is waitlisted → On Waitlist (view to see options)
    ctaLabel = t('match.cta.waitlisted');
    ctaBgColor = isDark ? neutral[700] : neutral[200];
    ctaTextColor = colors.text;
    ctaIcon = 'list-outline';
  } else if (hasJoined) {
    // User has joined (match not ended) → Leave
    ctaLabel = t('match.cta.leave');
    ctaBgColor = isDark ? neutral[700] : neutral[200];
    ctaTextColor = status.warning.DEFAULT;
    ctaIcon = 'exit-outline';
  } else if (hasPendingRequest) {
    // User has pending request → Pending (disabled)
    ctaLabel = t('match.cta.pending');
    ctaBgColor = isDark ? neutral[700] : neutral[200];
    ctaTextColor = colors.textMuted;
    ctaDisabled = true;
    ctaIcon = 'hourglass-outline';
  } else if (isFull) {
    // Match is full → Join Waitlist
    ctaLabel = t('match.cta.joinWaitlist');
    ctaBgColor = colors.primary;
    ctaTextColor = base.white;
    ctaIcon = 'list-outline';
  } else if (isRequestMode) {
    // Request mode → Ask to Join
    ctaLabel = t('match.cta.askToJoin');
    ctaBgColor = colors.primary;
    ctaTextColor = base.white;
    ctaIcon = 'hand-left-outline';
  } else {
    // Default → Join
    ctaLabel = t('match.cta.join');
    ctaBgColor = colors.primary;
    ctaTextColor = base.white;
    ctaIcon = 'arrow-forward';
  }

  return (
    <View style={[styles.footer, { borderTopColor: colors.border }]}>
      {/* CTA Button */}
      <TouchableOpacity
        style={[
          styles.ctaButton,
          { backgroundColor: ctaBgColor },
          ctaDisabled && styles.ctaButtonDisabled,
        ]}
        onPress={onPress}
        activeOpacity={ctaDisabled ? 1 : 0.8}
        disabled={ctaDisabled}
      >
        {ctaIcon && (
          <Ionicons name={ctaIcon} size={14} color={ctaTextColor} style={styles.ctaIconLeft} />
        )}
        <Text size="sm" weight="bold" color={ctaTextColor}>
          {ctaLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onPress,
  isDark,
  t,
  locale,
  currentPlayerId,
}) => {
  // Check if this is a "Ready to Play" match (court already reserved)
  const isReadyToPlay = match.court_status === 'reserved';

  // Animated glow effect for premium cards - smooth, polished breathing effect
  const glowAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isReadyToPlay) {
      // Main glow pulse - slower, smoother breathing effect with bezier easing
      const mainGlow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnimation, {
            toValue: 1,
            duration: 3000,
            easing: Easing.bezier(0.4, 0, 0.2, 1), // Smooth ease-in-out
            useNativeDriver: false,
          }),
          Animated.timing(glowAnimation, {
            toValue: 0,
            duration: 3000,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: false,
          }),
        ])
      );

      mainGlow.start();
      return () => {
        mainGlow.stop();
      };
    }
  }, [isReadyToPlay, glowAnimation]);

  // Interpolate shadow for outer glow effect
  const animatedShadowOpacity = glowAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.5, 0.2],
  });

  const animatedShadowRadius = glowAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [16, 28, 16],
  });

  // Main border color - smooth transition through gold spectrum
  const animatedBorderColor = glowAnimation.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [
      GOLD_COLORS.deepGold,
      GOLD_COLORS.bronze,
      GOLD_COLORS.base,
      GOLD_COLORS.light,
      GOLD_COLORS.base,
    ],
  });

  // Outer glow border - more subtle, wider
  const animatedOuterGlowOpacity = glowAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  // Inner glow border - subtle highlight
  const animatedInnerGlowOpacity = glowAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 0.8, 0.4],
  });

  // Theme colors
  const themeColors = isDark ? darkTheme : lightTheme;
  const colors: ThemeColors = useMemo(
    () => ({
      background: themeColors.background,
      cardBackground: themeColors.card,
      text: themeColors.foreground,
      textSecondary: isDark ? primary[300] : neutral[600],
      textMuted: themeColors.mutedForeground,
      border: themeColors.border,
      primary: isDark ? primary[400] : primary[600],
      primaryLight: isDark ? primary[900] : primary[50],
      secondary: isDark ? secondary[400] : secondary[500],
      secondaryLight: isDark ? secondary[900] : secondary[50],
      statusOpen: status.success.DEFAULT,
      statusFull: status.warning.DEFAULT,
      statusCompleted: status.info.DEFAULT,
      slotEmpty: isDark ? neutral[800] : neutral[100],
      slotEmptyBorder: isDark ? neutral[600] : neutral[300],
      avatarPlaceholder: isDark ? neutral[700] : neutral[200],
    }),
    [themeColors, isDark]
  );

  // Computed values
  const participantInfo = getParticipantInfo(match);
  // Derive status from match attributes instead of using denormalized status field
  const derivedStatus = deriveMatchStatus({
    cancelled_at: match.cancelled_at,
    match_date: match.match_date,
    start_time: match.start_time,
    end_time: match.end_time,
    timezone: match.timezone,
    result: match.result,
  });
  const statusInfo = getStatusInfo(derivedStatus, participantInfo, colors, t);
  const { label: timeLabel, isUrgent } = getRelativeTimeDisplay(
    match.match_date,
    match.start_time,
    match.end_time,
    match.timezone,
    locale,
    t
  );
  const locationDisplay = getLocationDisplay(match, t);
  const courtDisplay = getCourtDisplay(match);
  const expectationInfo = getPlayerExpectationInfo(match.player_expectation, isDark, t);

  // Determine color palette based on match characteristics
  const palette = getMatchPalette(match.player_expectation, isUrgent);

  // Cost display
  const costDisplay = match.is_court_free
    ? t('match.cost.free')
    : match.estimated_cost
      ? `~$${Math.ceil(match.estimated_cost / participantInfo.total)}`
      : null;

  // Build badges array
  const badges: Array<{
    key: string;
    label: string;
    bgColor: string;
    textColor: string;
    icon?: keyof typeof Ionicons.glyphMap;
  }> = [];

  // Player expectation badge
  if (match.player_expectation) {
    badges.push({
      key: 'expectation',
      ...expectationInfo,
    });
  }

  // Min rating badge
  if (match.min_rating_score) {
    badges.push({
      key: 'rating',
      label: match.min_rating_score.label,
      bgColor: colors.primary,
      textColor: base.white,
      icon: 'analytics',
    });
  }

  // Join mode badge (request only)
  // if (match.join_mode === 'request') {
  //   badges.push({
  //     key: 'joinMode',
  //     label: t('match.joinMode.request'),
  //     bgColor: isDark ? neutral[700] : neutral[200],
  //     textColor: colors.text,
  //     icon: 'hand-left',
  //   });
  // }

  // Gender preference badge
  // if (match.preferred_opponent_gender) {
  //   const genderLabel =
  //     match.preferred_opponent_gender === 'male'
  //       ? t('match.gender.menOnly')
  //       : t('match.gender.womenOnly');
  //   const genderIcon: keyof typeof Ionicons.glyphMap =
  //     match.preferred_opponent_gender === 'male' ? 'male' : 'female';
  //   badges.push({
  //     key: 'gender',
  //     label: genderLabel,
  //     bgColor: isDark ? neutral[700] : neutral[200],
  //     textColor: colors.text,
  //     icon: genderIcon,
  //   });
  // }

  // Cost badge
  if (costDisplay) {
    badges.push({
      key: 'cost',
      label: costDisplay,
      bgColor: match.is_court_free ? `${status.success.DEFAULT}20` : `${colors.primary}20`,
      textColor: match.is_court_free ? status.success.DEFAULT : colors.primary,
      icon: match.is_court_free ? 'checkmark-circle' : 'cash-outline',
    });
  }

  // Wrap in Animated.View for premium glow effect
  const CardWrapper = isReadyToPlay ? Animated.View : View;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardWrapperStyle: any = isReadyToPlay
    ? [
        styles.premiumCardWrapper,
        {
          shadowOpacity: animatedShadowOpacity,
          shadowRadius: animatedShadowRadius,
          shadowColor: GOLD_COLORS.base,
        },
      ]
    : undefined;

  // Get dynamic border color based on palette
  const paletteColors = MATCH_PALETTES[palette][isDark ? 'dark' : 'light'];
  const dynamicBorderColor = isReadyToPlay
    ? GOLD_COLORS.deepGold
    : isDark
      ? `${paletteColors.accentStart}40` // 25% opacity accent border in dark mode
      : `${paletteColors.accentStart}20`; // 12% opacity accent border in light mode

  return (
    <CardWrapper style={cardWrapperStyle}>
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
        accessibilityLabel={`Match ${timeLabel} at ${locationDisplay}${isReadyToPlay ? ' - Ready to Play' : ''}`}
      >
        {/* Dynamic gradient background - creates color bleed effect */}
        <CardBackground isDark={isDark} isReadyToPlay={isReadyToPlay} palette={palette} />

        {/* Multi-layer animated gold border for premium cards - creates polished glow effect */}
        {isReadyToPlay && (
          <>
            {/* Outer glow layer - widest, most subtle */}
            <Animated.View
              style={[
                styles.premiumBorderOverlay,
                styles.premiumBorderOuter,
                {
                  borderColor: GOLD_COLORS.base,
                  opacity: animatedOuterGlowOpacity,
                },
              ]}
              pointerEvents="none"
            />
            {/* Main border layer - animated color transition */}
            <Animated.View
              style={[
                styles.premiumBorderOverlay,
                styles.premiumBorderMain,
                {
                  borderColor: animatedBorderColor,
                },
              ]}
              pointerEvents="none"
            />
            {/* Inner glow layer - subtle highlight */}
            <Animated.View
              style={[
                styles.premiumBorderOverlay,
                styles.premiumBorderInner,
                {
                  borderColor: GOLD_COLORS.light,
                  opacity: animatedInnerGlowOpacity,
                },
              ]}
              pointerEvents="none"
            />
          </>
        )}

        {/* Gradient accent strip - uses palette colors */}
        <GradientStrip isDark={isDark} isReadyToPlay={isReadyToPlay} palette={palette} />

        {/* Main content */}
        <View style={styles.content}>
          {/* Time & Status row */}
          <View style={styles.topRow}>
            <View style={styles.timeContainer}>
              {/* Urgent pulse indicator */}
              {isUrgent && (
                <View style={styles.urgentPulseContainer}>
                  <View
                    style={[
                      styles.urgentPulseDot,
                      {
                        backgroundColor:
                          MATCH_PALETTES.urgent[isDark ? 'dark' : 'light'].accentStart,
                      },
                    ]}
                  />
                </View>
              )}
              <Ionicons
                name={isUrgent ? 'time' : 'calendar-outline'}
                size={16}
                color={
                  isUrgent
                    ? MATCH_PALETTES.urgent[isDark ? 'dark' : 'light'].accentStart
                    : colors.primary
                }
              />
              <Text
                size="base"
                weight="bold"
                color={
                  isUrgent
                    ? MATCH_PALETTES.urgent[isDark ? 'dark' : 'light'].accentStart
                    : colors.text
                }
                style={styles.timeText}
                numberOfLines={1}
              >
                {timeLabel}
              </Text>
            </View>
            {/* <StatusBadge {...statusInfo} /> */}
          </View>

          {/* Location row */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={colors.textMuted} />
            <Text size="sm" color={colors.textMuted} numberOfLines={1} style={styles.locationText}>
              {locationDisplay}
              {courtDisplay && ` • ${courtDisplay}`}
            </Text>
          </View>

          {/* Player slots */}
          <PlayerSlots
            match={match}
            participantInfo={participantInfo}
            colors={colors}
            isDark={isDark}
            t={t}
          />

          {/* Badges row */}
          {badges.length > 0 && (
            <View style={styles.badgesContainer}>
              {badges.map(badge => (
                <Badge
                  key={badge.key}
                  label={badge.label}
                  bgColor={badge.bgColor}
                  textColor={badge.textColor}
                  icon={badge.icon}
                />
              ))}
            </View>
          )}

          {/* Footer with CTA */}
          <CardFooter
            match={match}
            participantInfo={participantInfo}
            colors={colors}
            isDark={isDark}
            t={t}
            onPress={onPress}
            currentPlayerId={currentPlayerId}
          />
        </View>
      </TouchableOpacity>
    </CardWrapper>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Card container
  card: {
    borderRadius: radiusPixels.xl,
    marginHorizontal: CARD_HORIZONTAL_MARGIN,
    marginBottom: spacingPixels[3],
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
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

  // Premium "Ready to Play" card styles
  premiumCardWrapper: {
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  premiumCard: {
    borderWidth: 2,
    // Add subtle inner glow effect with background
  },
  premiumBorderOverlay: {
    position: 'absolute',
    borderRadius: radiusPixels.xl,
    zIndex: 10,
  },
  premiumBorderOuter: {
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderWidth: 3,
    zIndex: 8,
  },
  premiumBorderMain: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2.5,
    zIndex: 11,
  },
  premiumBorderInner: {
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderWidth: 1.5,
    zIndex: 12,
  },

  // Gradient strip
  gradientStrip: {
    height: GRADIENT_STRIP_HEIGHT,
    zIndex: 1,
  },
  gradientStripPremium: {
    height: 6, // Slightly taller for premium cards
  },

  // Content
  content: {
    padding: CARD_PADDING,
    zIndex: 1,
  },

  // Top row (time + status)
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacingPixels[2],
    gap: spacingPixels[2],
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // Enable text truncation in flex children
  },
  timeText: {
    marginLeft: spacingPixels[1.5],
    flexShrink: 1,
  },
  urgentPulseContainer: {
    marginRight: spacingPixels[1.5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    // Note: For a true pulsing effect, you'd need to add an Animated wrapper
    // This static dot still provides a visual cue
  },

  // Status badge
  statusBadge: {
    paddingHorizontal: spacingPixels[2.5],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.full,
    flexShrink: 0, // Prevent badge from shrinking
  },

  // Location row
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingPixels[3],
  },
  locationText: {
    marginLeft: spacingPixels[1],
    flex: 1,
  },

  // Player slots
  slotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingPixels[3],
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  slot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: SLOT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slotAvatar: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: SLOT_SIZE / 2,
  },
  hostIndicator: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: base.white,
    zIndex: 10,
  },
  spotsText: {
    marginLeft: spacingPixels[2],
  },

  // Badges
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingPixels[1.5],
    marginBottom: spacingPixels[3],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[2.5],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.full,
    // Subtle shadow for badge depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  badgeIcon: {
    marginRight: spacingPixels[1],
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacingPixels[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacingPixels[2],
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[2],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.full,
    gap: spacingPixels[1],
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[2],
    borderRadius: radiusPixels.lg,
    flex: 1,
    minWidth: 0, // Allow button to shrink if needed
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaIcon: {
    marginLeft: spacingPixels[1],
  },
  ctaIconLeft: {
    marginRight: spacingPixels[1],
  },
});

export default MatchCard;
