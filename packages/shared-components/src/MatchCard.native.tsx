/**
 * MatchCard Component - Vibrant & Sporty Design
 *
 * A high-energy, athletic card design with:
 * - Three-tier visual hierarchy based on match desirability:
 *   - Most Wanted: Court booked + high reputation creator (90%+) → gold/amber with animated glow
 *   - Ready to Play: Court booked only → secondary/coral tones
 *   - Regular: Default → primary/teal tones
 * - Color bleed effect from accent strip
 * - Pulsing animation for urgent matches (< 3 hours)
 * - Visual player slot indicators
 * - Consistent CTA button colors based on action type
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
  getMatchEndTimeDifferenceFromNow,
  formatIntuitiveDateInTimezone,
  getProfilePictureUrl,
  deriveMatchStatus,
  type DerivedMatchStatus,
} from '@rallia/shared-utils';

// =============================================================================
// TIER-BASED GRADIENT PALETTES (using design system tokens)
// =============================================================================

/**
 * Match tier determines visual styling based on desirability:
 * - mostWanted: Court booked + high reputation creator (90%+) → accent/gold
 * - readyToPlay: Court booked only → secondary/coral
 * - regular: Default → primary/teal
 */
type MatchTier = 'mostWanted' | 'readyToPlay' | 'regular';

/**
 * Threshold for "high reputation" creator (percentage 0-100)
 */
const HIGH_REPUTATION_THRESHOLD = 90;

/**
 * Determine match tier based on court status and creator reputation
 */
function getMatchTier(courtStatus: string | null, creatorReputationScore?: number): MatchTier {
  const isCourtBooked = courtStatus === 'reserved';
  const isHighReputation = (creatorReputationScore ?? 0) >= HIGH_REPUTATION_THRESHOLD;

  if (isCourtBooked && isHighReputation) return 'mostWanted';
  if (isCourtBooked) return 'readyToPlay';
  return 'regular';
}

/**
 * Tier-based color palettes for accent strips and backgrounds
 * Built from @rallia/design-system tokens for consistency
 *
 * Tier Strategy:
 * - mostWanted: accent (amber/gold) - premium, highly desirable
 * - readyToPlay: secondary (coral/red) - court ready, energetic
 * - regular: primary (teal) - standard matches
 */
const TIER_PALETTES = {
  // Most Wanted - accent palette (amber/gold - premium, highly desirable)
  mostWanted: {
    light: {
      background: accent[50], // Light amber background
      accentStart: accent[500], // #f59e0b - amber
      accentEnd: accent[400], // #fbbf24 - lighter amber
    },
    dark: {
      background: '#3d2b10', // Lighter dark gold background for better visibility
      accentStart: accent[400], // #fbbf24
      accentEnd: accent[300], // #fcd34d
    },
  },
  // Ready to Play - secondary palette (coral/red tones)
  readyToPlay: {
    light: {
      background: secondary[50], // Light coral background
      accentStart: secondary[500], // #ed6a6d
      accentEnd: secondary[400], // #f1888a
    },
    dark: {
      background: secondary[900], // Lighter dark coral background for better visibility
      accentStart: secondary[400], // #f1888a
      accentEnd: secondary[300], // #f4a6a7
    },
  },
  // Regular - primary palette (teal/mint - fresh, standard)
  regular: {
    light: {
      background: primary[50], // Light teal background
      accentStart: primary[500], // #14b8a6
      accentEnd: primary[400], // #2dd4bf
    },
    dark: {
      background: primary[950], // Very dark teal background
      accentStart: primary[400], // #2dd4bf
      accentEnd: primary[300], // #5eead4
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
 * Most Wanted colors using design system accent scale
 * These colors are used for the animated gold border on premium matches
 * (court booked + high reputation creator)
 */
const MOST_WANTED_COLORS = {
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
  // Tier-aware accent colors (set based on match tier)
  tierAccent: string;
  tierAccentLight: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Use base.white from design system for consistency

/**
 * Get time display for match date/time
 *
 * Shows intuitive date labels:
 * - "Today" for today's date
 * - "Tomorrow" for tomorrow's date
 * - Weekday name for dates within the next 6 days (e.g., "Wednesday")
 * - "Month Day" for dates further out (e.g., "Jan 15")
 *
 * Time format is locale-aware:
 * - English: 12-hour format (e.g., "2:00 PM - 4:00 PM")
 * - French: 24-hour format (e.g., "14:00 - 16:00")
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

  // Get intuitive date label (Today, Tomorrow, Wednesday, or Jan 15)
  const dateResult = formatIntuitiveDateInTimezone(dateString, tz, locale);

  // Use translation for Today/Tomorrow, otherwise use the formatted date
  let dateLabel: string;
  if (dateResult.translationKey) {
    dateLabel = t(dateResult.translationKey);
  } else {
    dateLabel = dateResult.label;
  }

  // Format time range (locale-aware: 12h for English, 24h for French)
  const startResult = formatTimeInTimezone(dateString, startTime, tz, locale);
  const endResult = formatTimeInTimezone(dateString, endTime, tz, locale);
  const timeRange = `${startResult.formattedTime} - ${endResult.formattedTime}`;
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
 * Note: Creator is now included in joined participants with is_host=true
 */
function getParticipantInfo(match: MatchWithDetails): {
  current: number;
  total: number;
  spotsLeft: number;
} {
  const total = match.format === 'doubles' ? 4 : 2;
  // Only count joined participants (not requested, pending, waitlisted, left, etc.)
  // Creator is now included as a joined participant with is_host=true
  const joinedParticipants = match.participants?.filter(p => p.status === 'joined') ?? [];
  const current = joinedParticipants.length;
  const spotsLeft = Math.max(0, total - current);
  return { current, total, spotsLeft };
}

function getFeedbackWindowStatus(
  matchDate: string,
  startTime: string,
  endTime: string,
  timezone: string
): { isWithinFeedbackWindow: boolean; isPastFeedbackWindow: boolean } {
  // Use the existing timezone-aware utility to get time difference from end time
  // This properly handles timezone conversion and midnight-spanning matches
  const endTimeDiffMs = getMatchEndTimeDifferenceFromNow(matchDate, startTime, endTime, timezone);

  // If endTimeDiffMs > 0, match hasn't ended yet
  if (endTimeDiffMs > 0) {
    return { isWithinFeedbackWindow: false, isPastFeedbackWindow: false };
  }

  // Match has ended - endTimeDiffMs is negative (time since end)
  const timeSinceEndMs = Math.abs(endTimeDiffMs);
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;

  const isWithinFeedbackWindow = timeSinceEndMs < fortyEightHoursMs;
  const isPastFeedbackWindow = timeSinceEndMs >= fortyEightHoursMs;

  return { isWithinFeedbackWindow, isPastFeedbackWindow };
}

/**
 * Check if we're within the check-in window (10 minutes before start until end)
 * Uses timezone-aware date utilities to properly handle timezones.
 */
function getCheckInWindowStatus(
  matchDate: string,
  startTime: string,
  endTime: string,
  timezone: string
): boolean {
  // Get time difference from start time
  const startTimeDiffMs = getTimeDifferenceFromNow(matchDate, startTime, timezone);
  // Get time difference from end time
  const endTimeDiffMs = getMatchEndTimeDifferenceFromNow(matchDate, startTime, endTime, timezone);

  // Check-in window: 10 minutes before start until end
  const tenMinutesMs = 10 * 60 * 1000;

  // startTimeDiffMs > 0 means start is in the future
  // We want: now >= (start - 10min) AND now < end
  // Which means: startTimeDiffMs <= 10min AND endTimeDiffMs > 0
  const isWithinCheckInWindow = startTimeDiffMs <= tenMinutesMs && endTimeDiffMs > 0;

  return isWithinCheckInWindow;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface GradientStripProps {
  isDark: boolean;
  tier: MatchTier;
}

/**
 * Smooth gradient accent strip at the top of the card
 * Uses expo-linear-gradient for a true gradient effect
 * Most Wanted tier gets a gold shimmer gradient
 */
const GradientStrip: React.FC<GradientStripProps> = ({ isDark, tier }) => {
  const tierColors = TIER_PALETTES[tier][isDark ? 'dark' : 'light'];
  const mwColors = MOST_WANTED_COLORS[isDark ? 'dark' : 'light'];

  // Most Wanted cards get a gold shimmer gradient
  const colors: [string, string, ...string[]] =
    tier === 'mostWanted'
      ? [mwColors.shimmer, mwColors.border, mwColors.glow, mwColors.border, mwColors.shimmer]
      : [tierColors.accentStart, tierColors.accentEnd];

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.gradientStrip, tier === 'mostWanted' && styles.gradientStripPremium]}
    />
  );
};

interface PlayerSlotsProps {
  match: MatchWithDetails;
  participantInfo: { current: number; total: number; spotsLeft: number };
  colors: ThemeColors;
  isDark: boolean;
  t: (key: string, options?: TranslationOptions) => string;
  /** Current user's player ID to check if they're invited */
  currentPlayerId?: string;
}

/**
 * Visual player slot indicators showing filled/empty positions
 */
const PlayerSlots: React.FC<PlayerSlotsProps> = ({
  match,
  participantInfo,
  colors,
  isDark,
  t,
  currentPlayerId,
}) => {
  // Only include joined participants
  const joinedParticipants = match.participants?.filter(p => p.status === 'joined') ?? [];

  // Identify host and other participants using is_host flag
  const hostParticipant = joinedParticipants.find(p => p.is_host);
  const otherParticipants = joinedParticipants.filter(p => !p.is_host);

  // Check if current user has been invited (pending status)
  const isInvited = currentPlayerId
    ? match.participants?.some(
        p =>
          (p.player_id === currentPlayerId || p.player?.id === currentPlayerId) &&
          p.status === 'pending'
      )
    : false;

  // Check if current user is the creator/host (to show pending requests count)
  const isCreator = currentPlayerId
    ? hostParticipant?.player_id === currentPlayerId ||
      match.created_by_player?.id === currentPlayerId ||
      match.created_by === currentPlayerId
    : false;

  // Count pending join requests (for creators only)
  const pendingRequestsCount = isCreator
    ? (match.participants?.filter(p => p.status === 'requested').length ?? 0)
    : 0;

  // Build slots array
  const slots: Array<{
    filled: boolean;
    avatarUrl?: string | null;
    isHost: boolean;
  }> = [];

  // First slot is always the host
  // Use host participant's profile, fallback to created_by_player for backwards compatibility
  const hostProfile = hostParticipant?.player?.profile ?? match.created_by_player?.profile;
  slots.push({
    filled: true,
    avatarUrl: getProfilePictureUrl(hostProfile?.profile_picture_url),
    isHost: true,
  });

  // Add participant slots (only non-host joined participants)
  // Normalize URLs to use current environment's Supabase URL
  for (let i = 0; i < participantInfo.total - 1; i++) {
    const participant = otherParticipants[i];
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
                      backgroundColor: slot.avatarUrl
                        ? colors.tierAccent
                        : colors.avatarPlaceholder,
                      borderWidth: slot.isHost ? 2.5 : 2,
                      borderColor: slot.isHost ? colors.tierAccent : colors.tierAccentLight, // Subtle tier accent for filled avatars
                      shadowColor: slot.isHost ? colors.tierAccent : colors.tierAccentLight,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: slot.isHost ? 0.3 : 0.15,
                      shadowRadius: 4,
                      elevation: slot.isHost ? 3 : 2,
                    }
                  : {
                      backgroundColor: colors.slotEmpty,
                      borderWidth: 2,
                      borderColor: colors.slotEmptyBorder,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 1,
                    },
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
              <View style={[styles.hostIndicator, { backgroundColor: colors.tierAccent }]}>
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
      {/* Invited indicator for players with pending status */}
      {isInvited && (
        <View
          style={[
            styles.invitedBadge,
            {
              backgroundColor: isDark ? `${primary[400]}25` : `${primary[500]}15`,
              borderColor: isDark ? primary[400] : primary[500],
            },
          ]}
        >
          <Ionicons
            name="mail-outline"
            size={12}
            color={isDark ? primary[400] : primary[500]}
            style={styles.invitedIcon}
          />
          <Text size="xs" weight="semibold" color={isDark ? primary[400] : primary[500]}>
            {t('match.invited')}
          </Text>
        </View>
      )}
      {/* Pending requests indicator for match creators */}
      {pendingRequestsCount > 0 && (
        <View
          style={[
            styles.invitedBadge,
            {
              backgroundColor: isDark
                ? `${status.warning.DEFAULT}25`
                : `${status.warning.DEFAULT}15`,
              borderColor: status.warning.DEFAULT,
            },
          ]}
        >
          <Ionicons
            name="person-add-outline"
            size={12}
            color={status.warning.DEFAULT}
            style={styles.invitedIcon}
          />
          <Text size="xs" weight="semibold" color={status.warning.DEFAULT}>
            {t('match.pendingRequests', { count: pendingRequestsCount })}
          </Text>
        </View>
      )}
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
 * 1. Check-in CTA (when within check-in window, full game, joined participant, hasn't checked in)
 * 2. Feedback CTA (when match ended, within 48h window, joined participant, hasn't completed feedback)
 * 3. Match has ended → "View" (for everyone - no edit/leave allowed)
 * 4. Match has result → "View Results"
 * 5. Owner (match not ended) → "Edit"
 * 6. User has joined (match not ended) → "Leave"
 * 7. User has pending join request ('requested' status) → "Pending" (disabled)
 * 8. Match is full → "Join Waitlist"
 * 9. Join mode is 'request' → "Ask to Join"
 * 10. Default → "Join"
 *
 * Note: Users with 'pending' status (invited by host) see regular CTAs (Join/Ask to Join/Join Waitlist)
 * so they can accept the invitation through the normal join flow.
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

  // Derive match status from data (not from status field)
  const derivedStatus = deriveMatchStatus({
    cancelled_at: match.cancelled_at,
    match_date: match.match_date,
    start_time: match.start_time,
    end_time: match.end_time,
    timezone: match.timezone,
    result: match.result,
  });
  const isInProgress = derivedStatus === 'in_progress';
  const hasMatchEnded = derivedStatus === 'completed';

  // Check if match has started (start_time has passed in match's timezone)
  // Once started, players can no longer join, leave, or edit the match
  const matchStartDiff = getTimeDifferenceFromNow(
    match.match_date,
    match.start_time,
    match.timezone
  );
  const hasMatchStarted = matchStartDiff < 0;

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
  // 'pending' (invited by host) shows "Accept Invitation" CTA
  const isInvited = userParticipant?.status === 'pending';
  // 'requested' (user requested to join) shows "Pending" CTA
  const hasPendingRequest = userParticipant?.status === 'requested';
  const isWaitlisted = userParticipant?.status === 'waitlisted';

  // Join mode
  const isRequestMode = match.join_mode === 'request';

  // Feedback window status (48h after end time)
  const { isWithinFeedbackWindow } = getFeedbackWindowStatus(
    match.match_date,
    match.start_time,
    match.end_time,
    match.timezone
  );

  // Check if current player is a joined participant who hasn't completed feedback yet
  const currentPlayerParticipant = currentPlayerId
    ? match.participants?.find(
        p =>
          (p.player_id === currentPlayerId || p.player?.id === currentPlayerId) &&
          p.status === 'joined'
      )
    : undefined;
  const playerHasCompletedFeedback = currentPlayerParticipant?.feedback_completed ?? false;
  const playerNeedsFeedback =
    hasMatchEnded &&
    isWithinFeedbackWindow &&
    currentPlayerParticipant &&
    !playerHasCompletedFeedback;

  // Check-in window status (10 min before start until end, only for full games)
  const isWithinCheckInWindow = getCheckInWindowStatus(
    match.match_date,
    match.start_time,
    match.end_time,
    match.timezone
  );
  const playerHasCheckedIn = !!currentPlayerParticipant?.checked_in_at;
  // Check-in is only available for matches with a confirmed location (facility or custom)
  // TBD matches don't have a location to check in at
  const locationAllowsCheckIn =
    match.location_type === 'facility' || match.location_type === 'custom';
  const playerNeedsCheckIn =
    isFull &&
    isWithinCheckInWindow &&
    currentPlayerParticipant &&
    !playerHasCheckedIn &&
    locationAllowsCheckIn;

  // Determine button label, style, and icon based on state
  // CTA Color Matrix:
  // - Check-in/Feedback/Join/Ask to Join/Join Waitlist → success green
  // - Edit → accent
  // - Cancel/Leave/Cancelled → error red
  // - View/View Results → neutral
  // - Pending → warning
  // - On Waitlist → warning
  let ctaLabel: string;
  let ctaBgColor: string;
  let ctaTextColor: string;
  let ctaDisabled = false;
  let ctaIcon: keyof typeof Ionicons.glyphMap | null = 'arrow-forward';

  // Check-in CTA (highest priority when conditions are met)
  if (playerNeedsCheckIn) {
    ctaLabel = t('matchDetail.checkIn');
    ctaBgColor = status.success.DEFAULT;
    ctaTextColor = base.white;
    ctaIcon = 'checkmark-circle-outline';
  } else if (hasJoined && playerHasCheckedIn && !isInProgress && !hasMatchEnded) {
    // Participant has checked in but game hasn't started yet → Show "Checked-in" (success green, disabled look)
    ctaLabel = t('matchDetail.checkedIn');
    ctaBgColor = isDark ? `${status.success.DEFAULT}30` : `${status.success.DEFAULT}20`;
    ctaTextColor = status.success.DEFAULT;
    ctaDisabled = true;
    ctaIcon = 'checkmark-circle';
  } else if (playerNeedsFeedback) {
    // Feedback CTA (when match ended and player needs feedback)
    ctaLabel = t('matchDetail.provideFeedback');
    ctaBgColor = status.success.DEFAULT;
    ctaTextColor = base.white;
    ctaIcon = 'star-outline';
  } else if (isCancelled) {
    // Match is cancelled → Cancelled (danger red, disabled)
    ctaLabel = t('match.cta.cancelled');
    ctaBgColor = isDark ? `${status.error.DEFAULT}30` : `${status.error.DEFAULT}20`;
    ctaTextColor = status.error.DEFAULT;
    ctaDisabled = true;
    ctaIcon = 'close-circle-outline';
  } else if (hasResult) {
    // Match with results → View Results (neutral)
    ctaLabel = t('match.cta.viewResults');
    ctaBgColor = isDark ? neutral[700] : neutral[200];
    ctaTextColor = colors.text;
    ctaIcon = 'eye-outline';
  } else if (hasMatchStarted) {
    // Match has started but no results yet → View (neutral, no actions allowed)
    ctaLabel = t('match.cta.view');
    ctaBgColor = isDark ? neutral[700] : neutral[200];
    ctaTextColor = colors.text;
    ctaIcon = 'eye-outline';
  } else if (isOwner) {
    // Owner (match not ended) → Edit
    ctaLabel = t('match.cta.edit');
    ctaBgColor = isDark ? accent[500] : accent[500];
    ctaTextColor = base.white;
    ctaIcon = 'create-outline';
  } else if (isWaitlisted) {
    // On Waitlist → warning
    ctaLabel = t('match.cta.waitlisted');
    ctaBgColor = isDark ? `${status.warning.DEFAULT}30` : `${status.warning.DEFAULT}20`;
    ctaTextColor = status.warning.DEFAULT;
    ctaIcon = 'list-outline';
  } else if (hasJoined) {
    // Leave → danger red
    ctaLabel = t('match.cta.leave');
    ctaBgColor = status.error.DEFAULT;
    ctaTextColor = base.white;
    ctaIcon = 'exit-outline';
  } else if (hasPendingRequest) {
    // Pending → warning (disabled)
    ctaLabel = t('match.cta.pending');
    ctaBgColor = isDark ? `${status.warning.DEFAULT}30` : `${status.warning.DEFAULT}20`;
    ctaTextColor = status.warning.DEFAULT;
    ctaDisabled = true;
    ctaIcon = 'hourglass-outline';
  } else if (isInvited && !isFull && !isRequestMode) {
    // Invited (pending status) to direct-join match with spots → Accept Invitation (success green)
    ctaLabel = t('match.cta.acceptInvitation');
    ctaBgColor = status.success.DEFAULT;
    ctaTextColor = base.white;
    ctaIcon = 'checkmark-circle-outline';
  } else if (isFull) {
    // Join Waitlist → success green
    ctaLabel = t('match.cta.joinWaitlist');
    ctaBgColor = status.success.DEFAULT;
    ctaTextColor = base.white;
    ctaIcon = 'list-outline';
  } else if (isRequestMode) {
    // Ask to Join → success green
    ctaLabel = t('match.cta.askToJoin');
    ctaBgColor = status.success.DEFAULT;
    ctaTextColor = base.white;
    ctaIcon = 'hand-left-outline';
  } else {
    // Join → success green
    ctaLabel = t('match.cta.join');
    ctaBgColor = status.success.DEFAULT;
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
  // Determine match tier based on court status and creator reputation
  const creatorReputationScore = match.created_by_player?.reputation_score;
  const tier = getMatchTier(match.court_status, creatorReputationScore);
  const isMostWanted = tier === 'mostWanted';

  // Get most wanted colors from design system (for animated glow)
  const mwColors = MOST_WANTED_COLORS[isDark ? 'dark' : 'light'];

  // Animated glow effect for most wanted cards - smooth, polished breathing effect
  const glowAnimation = useMemo(() => new Animated.Value(0), []);

  // Animated pulse effect for urgent matches
  const urgentPulseAnimation = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (isMostWanted) {
      // Main glow pulse - slower, smoother breathing effect using design system duration
      const mainGlow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnimation, {
            toValue: 1,
            duration: duration.verySlow * 3, // 2400ms for smooth breathing
            easing: Easing.bezier(0.4, 0, 0.2, 1), // Smooth ease-in-out
            useNativeDriver: false,
          }),
          Animated.timing(glowAnimation, {
            toValue: 0,
            duration: duration.verySlow * 3,
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
  }, [isMostWanted, glowAnimation]);

  // Interpolate shadow for outer glow effect using design system accent colors
  const animatedShadowOpacity = glowAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.5, 0.2],
  });

  const animatedShadowRadius = glowAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [16, 28, 16],
  });

  // Main border color - smooth transition through gold spectrum using design system accent
  const animatedBorderColor = glowAnimation.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [
      accent[600], // Deep gold
      accent[500], // Mid gold
      accent[400], // Bright gold
      accent[300], // Light gold
      accent[400], // Back to bright
    ],
  });

  // Outer glow border - more subtle, wider
  const animatedOuterGlowOpacity = glowAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  // Inner glow border - subtle highlight
  const animatedInnerGlowOpacity = glowAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 0.8, 0.4],
  });

  // Theme colors with tier-aware accent colors
  const themeColors = isDark ? darkTheme : lightTheme;

  // Get tier-specific accent colors
  const getTierAccentColors = useCallback(
    (matchTier: MatchTier) => {
      switch (matchTier) {
        case 'mostWanted':
          return {
            accent: isDark ? accent[400] : accent[500],
            accentLight: isDark ? accent[700] : accent[200],
          };
        case 'readyToPlay':
          return {
            accent: isDark ? secondary[400] : secondary[500],
            accentLight: isDark ? secondary[700] : secondary[200],
          };
        case 'regular':
        default:
          return {
            accent: isDark ? primary[400] : primary[500],
            accentLight: isDark ? primary[700] : primary[200],
          };
      }
    },
    [isDark]
  );

  const tierAccentColors = getTierAccentColors(tier);

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
      slotEmptyBorder: isDark ? neutral[500] : neutral[400], // Better contrast for empty slots
      avatarPlaceholder: isDark ? neutral[700] : neutral[200],
      // Tier-aware accent colors for consistent theming
      tierAccent: tierAccentColors.accent,
      tierAccentLight: tierAccentColors.accentLight,
    }),
    [themeColors, isDark, tierAccentColors]
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

  // Determine animation type:
  // - "in_progress" = ongoing match = live indicator animation
  // - "isUrgent" (< 3 hours) but not in_progress = starting soon = countdown animation
  const isOngoing = derivedStatus === 'in_progress';
  const isStartingSoon = isUrgent && !isOngoing;

  // Start animation when match is urgent or ongoing
  useEffect(() => {
    if (isOngoing || isStartingSoon) {
      const animationDuration = isOngoing ? duration.extraSlow : duration.verySlow; // Faster for live, slower for countdown
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
  // Ring expands outward and fades
  const liveRingScale = urgentPulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });

  const liveRingOpacity = urgentPulseAnimation.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.8, 0.4, 0],
  });

  // Core dot has subtle glow pulse
  const liveDotOpacity = urgentPulseAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.7, 1],
  });

  // "Starting soon" interpolations - subtle bouncing chevron
  const countdownBounce = urgentPulseAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 3, 0], // Subtle horizontal bounce
  });

  const countdownOpacity = urgentPulseAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1, 0.6],
  });

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

  // Court booked badge (when court is already reserved) - shown first
  if (tier === 'mostWanted' || tier === 'readyToPlay') {
    badges.push({
      key: 'courtBooked',
      label: t('match.courtStatus.courtBooked'),
      bgColor: isDark ? `${mwColors.border}30` : `${mwColors.border}20`,
      textColor: mwColors.border,
      icon: 'checkmark-circle',
    });
  }

  // Player expectation badge (only show for competitive or casual, not "both")
  if (match.player_expectation && match.player_expectation !== 'both') {
    const isCompetitive = match.player_expectation === 'competitive';
    badges.push({
      key: 'playerExpectation',
      label: isCompetitive ? t('matchDetail.competitive') : t('matchDetail.casual'),
      bgColor: isCompetitive
        ? isDark
          ? `${accent[400]}30`
          : `${accent[500]}20`
        : isDark
          ? `${primary[400]}30`
          : `${primary[500]}20`,
      textColor: isCompetitive
        ? isDark
          ? accent[400]
          : accent[500]
        : isDark
          ? primary[400]
          : primary[500],
      icon: isCompetitive ? 'trophy' : 'happy',
    });
  }

  // Cost badge (uses tier accent for consistency)
  if (costDisplay) {
    badges.push({
      key: 'cost',
      label: costDisplay,
      bgColor: match.is_court_free ? `${status.success.DEFAULT}20` : colors.tierAccentLight,
      textColor: match.is_court_free ? status.success.DEFAULT : colors.tierAccent,
      icon: match.is_court_free ? 'checkmark-circle' : 'cash-outline',
    });
  }

  // Min rating badge (uses tier accent for consistency)
  if (match.min_rating_score) {
    badges.push({
      key: 'rating',
      label: match.min_rating_score.label,
      bgColor: colors.tierAccentLight,
      textColor: colors.tierAccent,
      icon: 'analytics',
    });
  }

  // Wrap in Animated.View for premium glow effect (Most Wanted only)
  const CardWrapper = isMostWanted ? Animated.View : View;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardWrapperStyle: any = isMostWanted
    ? [
        styles.premiumCardWrapper,
        {
          shadowOpacity: animatedShadowOpacity,
          shadowRadius: animatedShadowRadius,
          shadowColor: mwColors.shadow,
        },
      ]
    : undefined;

  // Get dynamic border color based on tier
  const tierPaletteColors = TIER_PALETTES[tier][isDark ? 'dark' : 'light'];
  // Most Wanted uses animated border, others use tier accent colors
  const dynamicBorderColor = isMostWanted
    ? mwColors.border
    : isDark
      ? `${tierPaletteColors.accentStart}40` // 25% opacity accent border in dark mode
      : `${tierPaletteColors.accentStart}20`; // 12% opacity accent border in light mode

  return (
    <CardWrapper style={cardWrapperStyle}>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: tierPaletteColors.background,
            borderColor: dynamicBorderColor,
          },
          isMostWanted && styles.premiumCard,
        ]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Match ${timeLabel} at ${locationDisplay}${isMostWanted ? ' - Most Wanted' : ''}`}
      >
        {/* Multi-layer animated gold border for Most Wanted cards using design system accent */}
        {isMostWanted && (
          <>
            {/* Outer glow layer - widest, most subtle */}
            <Animated.View
              style={[
                styles.premiumBorderOverlay,
                styles.premiumBorderOuter,
                {
                  borderColor: mwColors.glow,
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
                  borderColor: mwColors.shimmer,
                  opacity: animatedInnerGlowOpacity,
                },
              ]}
              pointerEvents="none"
            />
          </>
        )}

        {/* Gradient accent strip - uses tier colors */}
        <GradientStrip isDark={isDark} tier={tier} />

        {/* Main content */}
        <View style={styles.content}>
          {/* Time & Status row */}
          <View style={styles.topRow}>
            <View style={styles.timeContainer}>
              {/* "Live" indicator for ongoing matches */}
              {isOngoing && (
                <View style={styles.liveIndicatorContainer}>
                  {/* Expanding ring that fades out */}
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
                  {/* Solid core dot */}
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
                  <Ionicons name="chevron-forward" size={14} color={status.warning.DEFAULT} />
                </Animated.View>
              )}
              <Ionicons
                name={isOngoing ? 'radio' : isStartingSoon ? 'time' : 'calendar-outline'}
                size={16}
                color={
                  isOngoing
                    ? status.error.DEFAULT
                    : isStartingSoon
                      ? status.warning.DEFAULT
                      : colors.tierAccent
                }
              />
              <Text
                size="base"
                weight="bold"
                color={
                  isOngoing
                    ? status.error.DEFAULT
                    : isStartingSoon
                      ? status.warning.DEFAULT
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
            currentPlayerId={currentPlayerId}
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

  // Premium "Most Wanted" card styles
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
  // "Live" indicator styles for ongoing matches
  liveIndicatorContainer: {
    width: 10,
    height: 10,
    marginRight: spacingPixels[1.5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    // Subtle shadow for depth
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  // "Starting soon" countdown indicator
  countdownIndicator: {
    marginRight: spacingPixels[0.5],
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  spotsText: {
    marginLeft: spacingPixels[2],
  },
  invitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacingPixels[2],
    paddingHorizontal: spacingPixels[2],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.full,
    borderWidth: 1,
  },
  invitedIcon: {
    marginRight: spacingPixels[1],
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
