/**
 * MatchCard Component - Vibrant & Sporty Design
 *
 * A high-energy, athletic card design with:
 * - Gradient accent header strip
 * - Relative time display ("Today at 6 PM", "Tomorrow", etc.)
 * - Visual player slot indicators
 * - Match details as primary focus
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
  status,
} from '@rallia/design-system';
import type { MatchWithDetails } from '@rallia/shared-types';

// =============================================================================
// CONSTANTS
// =============================================================================

const CARD_HORIZONTAL_MARGIN = spacingPixels[4]; // 16px each side
const CARD_PADDING = spacingPixels[4]; // 16px
const GRADIENT_STRIP_HEIGHT = 4;

// Slot sizes
const SLOT_SIZE = 32;

// Host avatar in footer
const HOST_AVATAR_SIZE = 28;

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
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const BASE_WHITE = '#ffffff';

/**
 * Get relative time display for match date/time
 * Returns comprehensive contextual strings like "In 2 hours", "Tomorrow at 6 PM", etc.
 */
function getRelativeTimeDisplay(
  dateString: string,
  startTime: string,
  endTime: string,
  locale: string,
  t: (key: string, options?: TranslationOptions) => string
): { label: string; isUrgent: boolean } {
  const now = new Date();

  // Parse date string properly to avoid timezone issues
  // dateString format: "YYYY-MM-DD"
  // We need to create a date in local timezone, not UTC
  const [year, month, day] = dateString.split('-').map(Number);
  const matchDate = new Date(year, month - 1, day); // month is 0-indexed

  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  // Create full match datetime in local timezone
  const matchStartDateTime = new Date(year, month - 1, day, startHours, startMinutes || 0, 0, 0);
  const matchEndDateTime = new Date(year, month - 1, day, endHours, endMinutes || 0, 0, 0);

  // Calculate time differences
  const msDiff = matchStartDateTime.getTime() - now.getTime();
  const minutesDiff = Math.floor(msDiff / (1000 * 60));
  const hoursDiff = Math.floor(msDiff / (1000 * 60 * 60));
  const daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));

  // Format time range
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const formattedStartTime = timeFormatter.format(matchStartDateTime);
  const formattedEndTime = timeFormatter.format(matchEndDateTime);
  const timeRange = `${formattedStartTime} - ${formattedEndTime}`;
  const separator = t('common.time.timeSeparator');

  // Determine relative label with comprehensive formatting
  if (minutesDiff < 0) {
    // Past match
    const dateLabel = matchDate.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });
    return { label: `${dateLabel}${separator}${timeRange}`, isUrgent: false };
  }

  if (minutesDiff === 0) {
    return { label: `${t('common.time.now')}${separator}${timeRange}`, isUrgent: true };
  }

  if (minutesDiff < 60) {
    // Less than an hour
    return {
      label: `${t('common.time.inMinutes', { minutes: minutesDiff })}${separator}${timeRange}`,
      isUrgent: true,
    };
  }

  if (hoursDiff < 24) {
    // Today, show hours and minutes if less than 2 hours
    if (hoursDiff < 2) {
      const remainingMinutes = minutesDiff % 60;
      if (remainingMinutes > 0) {
        return {
          label: `${t('common.time.inHoursMinutes', { hours: hoursDiff, minutes: remainingMinutes })}${separator}${timeRange}`,
          isUrgent: true,
        };
      }
    }
    return {
      label: `${t('common.time.inHours', { hours: hoursDiff })}${separator}${timeRange}`,
      isUrgent: true,
    };
  }

  if (daysDiff === 1) {
    return { label: `${t('common.time.tomorrow')}${separator}${timeRange}`, isUrgent: false };
  }

  if (daysDiff <= 6) {
    const weekday = matchDate.toLocaleDateString(locale, { weekday: 'long' });
    return { label: `${weekday}${separator}${timeRange}`, isUrgent: false };
  }

  // More than a week away
  const dateLabel = matchDate.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return { label: `${dateLabel}${separator}${timeRange}`, isUrgent: false };
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
 */
function getStatusInfo(
  matchStatus: string | null,
  participantInfo: { current: number; total: number },
  colors: ThemeColors,
  t: (key: string) => string
): { label: string; bgColor: string; textColor: string; glowColor: string } {
  if (matchStatus === 'completed') {
    return {
      label: t('match.status.completed'),
      bgColor: colors.statusCompleted,
      textColor: BASE_WHITE,
      glowColor: colors.statusCompleted,
    };
  }
  if (matchStatus === 'cancelled') {
    return {
      label: t('match.status.cancelled'),
      bgColor: neutral[400],
      textColor: BASE_WHITE,
      glowColor: neutral[400],
    };
  }
  if (participantInfo.current >= participantInfo.total) {
    return {
      label: t('match.status.full'),
      bgColor: colors.statusFull,
      textColor: BASE_WHITE,
      glowColor: colors.statusFull,
    };
  }
  return {
    label: t('match.status.open'),
    bgColor: colors.statusOpen,
    textColor: BASE_WHITE,
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
        textColor: BASE_WHITE,
        icon: 'trophy',
      };
    case 'practice':
      return {
        label: t('match.type.practice'),
        bgColor: status.success.DEFAULT,
        textColor: BASE_WHITE,
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
}

/**
 * Smooth gradient accent strip at the top of the card
 * Uses expo-linear-gradient for a true gradient effect
 */
const GradientStrip: React.FC<GradientStripProps> = ({ isDark }) => {
  const colors: [string, string, ...string[]] = isDark
    ? [primary[400], primary[300], secondary[300], secondary[400]]
    : [primary[500], primary[400], secondary[400], secondary[500]];

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradientStrip}
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
  slots.push({
    filled: true,
    avatarUrl: creatorProfile?.profile_picture_url,
    isHost: true,
  });

  // Add participant slots (only joined participants)
  for (let i = 0; i < participantInfo.total - 1; i++) {
    const participant = joinedParticipants[i];
    slots.push({
      filled: !!participant,
      avatarUrl: participant?.player?.profile?.profile_picture_url,
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
                      backgroundColor: colors.primary,
                    }
                  : {
                      backgroundColor: colors.slotEmpty,
                      borderWidth: 2,
                      borderColor: colors.slotEmptyBorder,
                    },
                slot.isHost && { borderWidth: 2, borderColor: colors.primary },
              ]}
            >
              {slot.filled ? (
                slot.avatarUrl ? (
                  <Image source={{ uri: slot.avatarUrl }} style={styles.slotAvatar} />
                ) : (
                  <Ionicons name="person" size={14} color={BASE_WHITE} />
                )
              ) : (
                <Ionicons name="add" size={16} color={colors.slotEmptyBorder} />
              )}
            </View>
            {slot.isHost && (
              <View style={[styles.hostIndicator, { backgroundColor: colors.secondary }]}>
                <Ionicons name="star" size={6} color={BASE_WHITE} />
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

interface HostFooterProps {
  match: MatchWithDetails;
  colors: ThemeColors;
  isDark: boolean;
  costDisplay: string | null;
  t: (key: string, options?: TranslationOptions) => string;
}

/**
 * Footer with host info and cost
 */
const HostFooter: React.FC<HostFooterProps> = ({ match, colors, isDark, costDisplay, t }) => {
  const creatorProfile = match.created_by_player?.profile;
  const creatorName = creatorProfile?.display_name || creatorProfile?.full_name || t('match.host');

  return (
    <View style={[styles.footer, { borderTopColor: colors.border }]}>
      {/* Host info */}
      <View style={styles.hostInfo}>
        <View style={[styles.hostAvatarWrapper, { borderColor: colors.primary }]}>
          {creatorProfile?.profile_picture_url ? (
            <Image source={{ uri: creatorProfile.profile_picture_url }} style={styles.hostAvatar} />
          ) : (
            <View
              style={[
                styles.hostAvatar,
                styles.avatarPlaceholder,
                { backgroundColor: isDark ? neutral[700] : neutral[200] },
              ]}
            >
              <Ionicons name="person" size={12} color={isDark ? neutral[400] : neutral[500]} />
            </View>
          )}
        </View>
        <Text size="xs" weight="medium" color={colors.textMuted} style={styles.hostName}>
          {creatorName}
        </Text>
      </View>

      {/* Cost */}
      {costDisplay && (
        <View
          style={[
            styles.costBadge,
            {
              backgroundColor: match.is_court_free
                ? `${status.success.DEFAULT}20`
                : `${colors.primary}20`,
            },
          ]}
        >
          <Ionicons
            name={match.is_court_free ? 'checkmark-circle' : 'cash-outline'}
            size={12}
            color={match.is_court_free ? status.success.DEFAULT : colors.primary}
          />
          <Text
            size="xs"
            weight="semibold"
            color={match.is_court_free ? status.success.DEFAULT : colors.primary}
          >
            {costDisplay}
          </Text>
        </View>
      )}
    </View>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const MatchCard: React.FC<MatchCardProps> = ({ match, onPress, isDark, t, locale }) => {
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
    }),
    [themeColors, isDark]
  );

  // Computed values
  const participantInfo = getParticipantInfo(match);
  const statusInfo = getStatusInfo(match.status, participantInfo, colors, t);
  const { label: timeLabel, isUrgent } = getRelativeTimeDisplay(
    match.match_date,
    match.start_time,
    match.end_time,
    locale,
    t
  );
  const locationDisplay = getLocationDisplay(match, t);
  const courtDisplay = getCourtDisplay(match);
  const expectationInfo = getPlayerExpectationInfo(match.player_expectation, isDark, t);

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

  // Ready to Play badge (prominent - court already booked)
  if (match.court_status === 'reserved') {
    badges.push({
      key: 'readyToPlay',
      label: t('match.courtStatus.readyToPlay'),
      bgColor: status.success.DEFAULT,
      textColor: BASE_WHITE,
      icon: 'checkmark-circle',
    });
  }

  // Player expectation badge
  if (match.player_expectation) {
    badges.push({
      key: 'expectation',
      ...expectationInfo,
    });
  }

  // Format badge
  if (match.format) {
    badges.push({
      key: 'format',
      label: match.format === 'doubles' ? t('match.format.doubles') : t('match.format.singles'),
      bgColor: isDark ? neutral[700] : neutral[200],
      textColor: colors.text,
      icon: match.format === 'doubles' ? 'people' : 'person',
    });
  }

  // Min rating badge
  if (match.min_rating_score) {
    badges.push({
      key: 'rating',
      label: match.min_rating_score.label,
      bgColor: colors.primary,
      textColor: BASE_WHITE,
      icon: 'analytics',
    });
  }

  // Join mode badge (request only)
  if (match.join_mode === 'request') {
    badges.push({
      key: 'joinMode',
      label: t('match.joinMode.request'),
      bgColor: isDark ? neutral[700] : neutral[200],
      textColor: colors.text,
      icon: 'hand-left',
    });
  }

  // Gender preference badge
  if (match.preferred_opponent_gender) {
    const genderLabel =
      match.preferred_opponent_gender === 'male'
        ? t('match.gender.menOnly')
        : t('match.gender.womenOnly');
    const genderIcon: keyof typeof Ionicons.glyphMap =
      match.preferred_opponent_gender === 'male' ? 'male' : 'female';
    badges.push({
      key: 'gender',
      label: genderLabel,
      bgColor: isDark ? neutral[700] : neutral[200],
      textColor: colors.text,
      icon: genderIcon,
    });
  }

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
      accessibilityLabel={`Match ${timeLabel} at ${locationDisplay}`}
    >
      {/* Gradient accent strip */}
      <GradientStrip isDark={isDark} />

      {/* Main content */}
      <View style={styles.content}>
        {/* Time & Status row */}
        <View style={styles.topRow}>
          <View style={styles.timeContainer}>
            <Ionicons
              name={isUrgent ? 'time' : 'calendar-outline'}
              size={16}
              color={isUrgent ? colors.secondary : colors.primary}
            />
            <Text
              size="base"
              weight="bold"
              color={isUrgent ? colors.secondary : colors.text}
              style={styles.timeText}
              numberOfLines={1}
            >
              {timeLabel}
            </Text>
          </View>
          <StatusBadge {...statusInfo} />
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

        {/* Footer with host and cost */}
        <HostFooter match={match} colors={colors} isDark={isDark} costDisplay={costDisplay} t={t} />
      </View>
    </TouchableOpacity>
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
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  // Gradient strip
  gradientStrip: {
    height: GRADIENT_STRIP_HEIGHT,
  },

  // Content
  content: {
    padding: CARD_PADDING,
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
    borderColor: BASE_WHITE,
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
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatarWrapper: {
    borderWidth: 1.5,
    borderRadius: HOST_AVATAR_SIZE / 2 + 2,
    padding: 1,
  },
  hostAvatar: {
    width: HOST_AVATAR_SIZE,
    height: HOST_AVATAR_SIZE,
    borderRadius: HOST_AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostName: {
    marginLeft: spacingPixels[2],
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[2],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.full,
    gap: spacingPixels[1],
  },
});

export default MatchCard;
