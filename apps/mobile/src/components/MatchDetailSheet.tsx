/**
 * Match Detail Bottom Sheet - Complete match profile view
 *
 * This bottom sheet opens when a match card is pressed.
 * It displays comprehensive match information including:
 * - Date/time details
 * - Location with address and distance
 * - All participants with avatars
 * - Host information
 * - Match preferences (format, skill level, gender)
 * - Cost information
 * - Notes
 * - Action buttons (join, share, etc.)
 */

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Share, Linking, Platform } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button } from '@rallia/shared-components';
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
import { lightHaptic, mediumHaptic, selectionHaptic } from '@rallia/shared-utils';
import { useMatchDetailSheet } from '../context/MatchDetailSheetContext';
import { useTranslation, type TranslationKey } from '../hooks';
import { useTheme, useAuth, usePlayer } from '@rallia/shared-hooks';
import type { MatchDetailData } from '../context/MatchDetailSheetContext';

const BASE_WHITE = '#ffffff';

// =============================================================================
// TYPES
// =============================================================================

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
  icon: string;
  iconMuted: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get relative time display for match date/time
 */
function getRelativeTimeDisplay(
  dateString: string,
  startTime: string,
  endTime: string,
  locale: string,
  t: (key: TranslationKey, options?: Record<string, string | number | boolean>) => string
): { label: string; isUrgent: boolean; fullDate: string } {
  const now = new Date();

  // Parse date string properly to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  const matchDate = new Date(year, month - 1, day);

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

  // Full date for display
  const fullDate = matchDate.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Determine relative label
  if (minutesDiff < 0) {
    return { label: timeRange, isUrgent: false, fullDate };
  }

  if (minutesDiff === 0) {
    return { label: `${t('common.time.now')} - ${formattedEndTime}`, isUrgent: true, fullDate };
  }

  if (minutesDiff < 60) {
    return {
      label: `${t('common.time.inMinutes', { minutes: minutesDiff })} - ${timeRange}`,
      isUrgent: true,
      fullDate,
    };
  }

  if (hoursDiff < 24) {
    return {
      label: `${t('common.time.inHours', { hours: hoursDiff })} - ${timeRange}`,
      isUrgent: true,
      fullDate,
    };
  }

  if (daysDiff === 1) {
    return { label: `${t('common.time.tomorrow')} - ${timeRange}`, isUrgent: false, fullDate };
  }

  if (daysDiff <= 6) {
    const weekday = matchDate.toLocaleDateString(locale, { weekday: 'long' });
    return { label: `${weekday} - ${timeRange}`, isUrgent: false, fullDate };
  }

  return { label: timeRange, isUrgent: false, fullDate };
}

/**
 * Format distance in human readable form
 */
function formatDistance(meters: number | null | undefined): string | null {
  if (meters === null || meters === undefined) return null;
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Get participant info
 */
function getParticipantInfo(match: MatchDetailData): {
  current: number;
  total: number;
  spotsLeft: number;
} {
  const total = match.format === 'doubles' ? 4 : 2;
  const current = (match.participants?.length ?? 0) + 1; // +1 for creator
  const spotsLeft = Math.max(0, total - current);
  return { current, total, spotsLeft };
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  children: React.ReactNode;
  colors: ThemeColors;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, iconColor, children, colors }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconContainer}>
      <Ionicons name={icon} size={20} color={iconColor || colors.iconMuted} />
    </View>
    <View style={styles.infoContent}>{children}</View>
  </View>
);

interface BadgeProps {
  label: string;
  bgColor: string;
  textColor: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const Badge: React.FC<BadgeProps> = ({ label, bgColor, textColor, icon }) => (
  <View style={[styles.badge, { backgroundColor: bgColor }]}>
    {icon && <Ionicons name={icon} size={12} color={textColor} style={styles.badgeIcon} />}
    <Text size="xs" weight="semibold" color={textColor}>
      {label}
    </Text>
  </View>
);

interface ParticipantAvatarProps {
  avatarUrl?: string | null;
  isHost?: boolean;
  isEmpty?: boolean;
  colors: ThemeColors;
  isDark: boolean;
}

const ParticipantAvatar: React.FC<ParticipantAvatarProps> = ({
  avatarUrl,
  isHost,
  isEmpty,
  colors,
  isDark,
}) => (
  <View style={styles.participantAvatarWrapper}>
    <View
      style={[
        styles.participantAvatar,
        isEmpty
          ? {
              backgroundColor: colors.slotEmpty,
              borderWidth: 2,
              borderColor: colors.slotEmptyBorder,
            }
          : { backgroundColor: colors.primary },
        isHost && { borderWidth: 2, borderColor: colors.secondary },
      ]}
    >
      {!isEmpty && avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.participantAvatarImage} />
      ) : !isEmpty ? (
        <Ionicons name="person" size={18} color={BASE_WHITE} />
      ) : (
        <Ionicons name="add" size={20} color={colors.slotEmptyBorder} />
      )}
    </View>
    {isHost && (
      <View style={[styles.hostBadge, { backgroundColor: colors.secondary }]}>
        <Ionicons name="star" size={8} color={BASE_WHITE} />
      </View>
    )}
  </View>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const MatchDetailSheet: React.FC = () => {
  const { sheetRef, closeSheet, selectedMatch } = useMatchDetailSheet();
  const { theme } = useTheme();
  const { t, locale } = useTranslation();
  const { session } = useAuth();
  const { player } = usePlayer();
  const isDark = theme === 'dark';
  const playerId = player?.id;

  // Theme colors
  const themeColors = isDark ? darkTheme : lightTheme;
  const colors = useMemo<ThemeColors>(
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
      icon: themeColors.foreground,
      iconMuted: themeColors.mutedForeground,
    }),
    [themeColors, isDark]
  );

  // Single snap point at 90% - sheet opens directly at this height
  const snapPoints = useMemo(() => ['90%'], []);

  // Backdrop
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  // Handle close sheet with haptic
  const handleCloseSheet = useCallback(() => {
    selectionHaptic();
    closeSheet();
  }, [closeSheet]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!selectedMatch) return;
    lightHaptic();
    try {
      await Share.share({
        message: t('matchDetail.shareMessage' as TranslationKey),
        // In production, this would be a deep link to the match
      });
    } catch {
      // Silently handle errors
    }
  }, [selectedMatch, t]);

  // Handle join match
  const handleJoinMatch = useCallback(() => {
    if (!selectedMatch) return;
    mediumHaptic();
    // TODO: Implement join match flow
    console.log('Join match:', selectedMatch.id);
  }, [selectedMatch]);

  // Handle leave match
  const handleLeaveMatch = useCallback(() => {
    if (!selectedMatch) return;
    mediumHaptic();
    // TODO: Implement leave match flow
    console.log('Leave match:', selectedMatch.id);
  }, [selectedMatch]);

  // Handle edit match
  const handleEditMatch = useCallback(() => {
    if (!selectedMatch) return;
    mediumHaptic();
    // TODO: Implement edit match flow
    console.log('Edit match:', selectedMatch.id);
  }, [selectedMatch]);

  // Handle open in maps
  const handleOpenMaps = useCallback(() => {
    if (!selectedMatch) return;
    selectionHaptic();

    const address = selectedMatch.facility?.address || selectedMatch.location_address;
    const lat = selectedMatch.facility?.latitude;
    const lng = selectedMatch.facility?.longitude;

    let url: string;
    if (lat && lng) {
      // Use coordinates if available
      url =
        Platform.select({
          ios: `maps:0,0?q=${lat},${lng}`,
          android: `geo:${lat},${lng}?q=${lat},${lng}`,
        }) || `https://maps.google.com/?q=${lat},${lng}`;
    } else if (address) {
      // Fall back to address search
      const encodedAddress = encodeURIComponent(address);
      url =
        Platform.select({
          ios: `maps:0,0?q=${encodedAddress}`,
          android: `geo:0,0?q=${encodedAddress}`,
        }) || `https://maps.google.com/?q=${encodedAddress}`;
    } else {
      return; // No location data available
    }

    Linking.openURL(url).catch(() => {
      // Silently handle errors
    });
  }, [selectedMatch]);

  // Render nothing if no match is selected
  if (!selectedMatch) {
    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colors.border }]}
        backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.cardBackground }]}
      >
        <View style={styles.emptyContent} />
      </BottomSheetModal>
    );
  }

  // Computed values
  const match = selectedMatch;
  const participantInfo = getParticipantInfo(match);
  const {
    label: timeLabel,
    isUrgent,
    fullDate,
  } = getRelativeTimeDisplay(match.match_date, match.start_time, match.end_time, locale, t);
  const distanceDisplay = formatDistance(match.distance_meters);
  const creatorProfile = match.created_by_player?.profile;
  const creatorName =
    creatorProfile?.display_name ||
    creatorProfile?.full_name ||
    t('matchDetail.host' as TranslationKey);
  const isFull = participantInfo.spotsLeft === 0;
  const isCreator = playerId === match.created_by;
  const isParticipant = match.participants?.some(p => p.player_id === playerId) || isCreator;

  // Build participant avatars list
  const participantAvatars: Array<{
    key: string;
    avatarUrl?: string | null;
    isHost: boolean;
    isEmpty: boolean;
  }> = [];

  // Host first
  participantAvatars.push({
    key: 'host',
    avatarUrl: creatorProfile?.profile_picture_url,
    isHost: true,
    isEmpty: false,
  });

  // Other participants
  match.participants?.forEach((p, i) => {
    participantAvatars.push({
      key: p.id || `participant-${i}`,
      avatarUrl: p.player?.profile?.profile_picture_url,
      isHost: false,
      isEmpty: false,
    });
  });

  // Empty slots
  for (let i = 0; i < participantInfo.spotsLeft; i++) {
    participantAvatars.push({
      key: `empty-${i}`,
      avatarUrl: null,
      isHost: false,
      isEmpty: true,
    });
  }

  // Cost display
  const costDisplay = match.is_court_free
    ? t('matchDetail.free' as TranslationKey)
    : match.estimated_cost
      ? `$${Math.ceil(match.estimated_cost / participantInfo.total)} ${t('matchDetail.perPerson' as TranslationKey)}`
      : null;

  // Location display
  const facilityName = match.facility?.name || match.location_name;
  const courtName = match.court?.name;
  const address = match.facility?.address || match.location_address;

  // Match status
  const getStatusBadge = () => {
    if (match.status === 'completed') {
      return { label: t('matches.completed' as TranslationKey), bg: colors.statusCompleted };
    }
    if (match.status === 'cancelled') {
      return { label: t('matches.cancelled' as TranslationKey), bg: neutral[400] };
    }
    if (isFull) {
      return { label: t('match.slots.full' as TranslationKey), bg: colors.statusFull };
    }
    return { label: t('matchDetail.open' as TranslationKey), bg: colors.statusOpen };
  };
  const statusBadge = getStatusBadge();

  // Determine action button
  const renderActionButton = () => {
    // Prepare theme colors for Button component
    const buttonThemeColors = {
      primary: colors.primary,
      primaryForeground: BASE_WHITE,
      buttonActive: colors.primary,
      buttonInactive: neutral[300],
      buttonTextActive: BASE_WHITE,
      buttonTextInactive: neutral[500],
      text: colors.text,
      textMuted: colors.textMuted,
      border: colors.border,
      background: colors.cardBackground,
    };

    if (isCreator) {
      return (
        <Button
          variant="outline"
          onPress={handleEditMatch}
          style={styles.actionButton}
          themeColors={buttonThemeColors}
          isDark={isDark}
        >
          {t('common.edit' as TranslationKey)}
        </Button>
      );
    }

    if (isParticipant) {
      return (
        <Button
          variant="outline"
          onPress={handleLeaveMatch}
          style={styles.actionButton}
          themeColors={buttonThemeColors}
          isDark={isDark}
        >
          {t('matches.leaveMatch' as TranslationKey)}
        </Button>
      );
    }

    if (isFull) {
      return (
        <Button variant="primary" disabled style={styles.actionButton}>
          {t('match.slots.full' as TranslationKey)}
        </Button>
      );
    }

    if (match.join_mode === 'request') {
      return (
        <Button variant="primary" onPress={handleJoinMatch} style={styles.actionButton}>
          {t('matchDetail.requestToJoin' as TranslationKey)}
        </Button>
      );
    }

    return (
      <Button variant="primary" onPress={handleJoinMatch} style={styles.actionButton}>
        {t('matchDetail.joinNow' as TranslationKey)}
      </Button>
    );
  };

  // Check if location is tappable (has coordinates or address)
  const hasLocationData = !!(
    match.facility?.latitude ||
    match.facility?.address ||
    match.location_address
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      index={0}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colors.border }]}
      backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.cardBackground }]}
    >
      {/* Header with close button */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleSection}>
            <Text size="xl" weight="bold" color={isUrgent ? colors.secondary : colors.text}>
              {timeLabel}
            </Text>
            <Text size="sm" color={colors.textMuted} style={styles.fullDate}>
              {fullDate}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
              <Text size="xs" weight="bold" color={BASE_WHITE}>
                {statusBadge.label.toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCloseSheet}
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? neutral[800] : neutral[100] },
              ]}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <BottomSheetScrollView
        style={styles.sheetContent}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Match Info Grid - Moved up for context */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <View style={styles.badgesGrid}>
            {/* Ready to Play badge (prominent - court already booked) */}
            {match.court_status === 'reserved' && (
              <Badge
                label={t('match.courtStatus.readyToPlay' as TranslationKey)}
                bgColor={status.success.DEFAULT}
                textColor={BASE_WHITE}
                icon="checkmark-circle"
              />
            )}

            {/* Format */}
            <Badge
              label={
                match.format === 'doubles'
                  ? t('match.format.doubles' as TranslationKey)
                  : t('match.format.singles' as TranslationKey)
              }
              bgColor={isDark ? neutral[700] : neutral[200]}
              textColor={colors.text}
              icon={match.format === 'doubles' ? 'people' : 'person'}
            />

            {/* Player expectation */}
            {match.player_expectation && (
              <Badge
                label={
                  match.player_expectation === 'competitive'
                    ? t('matchDetail.competitive' as TranslationKey)
                    : match.player_expectation === 'practice'
                      ? t('matchDetail.practice' as TranslationKey)
                      : t('matchDetail.casual' as TranslationKey)
                }
                bgColor={
                  match.player_expectation === 'competitive'
                    ? secondary[500]
                    : match.player_expectation === 'practice'
                      ? status.success.DEFAULT
                      : isDark
                        ? neutral[600]
                        : neutral[300]
                }
                textColor={BASE_WHITE}
                icon={
                  match.player_expectation === 'competitive'
                    ? 'trophy'
                    : match.player_expectation === 'practice'
                      ? 'barbell'
                      : 'happy'
                }
              />
            )}

            {/* Min rating */}
            {match.min_rating_score && match.min_rating_score.label && (
              <Badge
                label={match.min_rating_score.label}
                bgColor={colors.primary}
                textColor={BASE_WHITE}
                icon="analytics"
              />
            )}

            {/* Gender preference */}
            {match.preferred_opponent_gender && (
              <Badge
                label={
                  match.preferred_opponent_gender === 'male'
                    ? t('match.gender.menOnly' as TranslationKey)
                    : t('match.gender.womenOnly' as TranslationKey)
                }
                bgColor={isDark ? neutral[700] : neutral[200]}
                textColor={colors.text}
                icon={match.preferred_opponent_gender === 'male' ? 'male' : 'female'}
              />
            )}

            {/* Join mode */}
            {match.join_mode === 'request' && (
              <Badge
                label={t('match.joinMode.request' as TranslationKey)}
                bgColor={isDark ? neutral[700] : neutral[200]}
                textColor={colors.text}
                icon="hand-left"
              />
            )}
          </View>
        </View>

        {/* Participants Section - with host inline (marked with star) */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={20} color={colors.iconMuted} />
            <Text size="base" weight="semibold" color={colors.text} style={styles.sectionTitle}>
              {t('matchDetail.participants' as TranslationKey)} ({participantInfo.current}/
              {participantInfo.total})
            </Text>
          </View>
          <View style={styles.participantsRow}>
            {participantAvatars.map((p, index) => (
              <View key={p.key} style={styles.participantWithLabel}>
                <ParticipantAvatar
                  avatarUrl={p.avatarUrl}
                  isHost={p.isHost}
                  isEmpty={p.isEmpty}
                  colors={colors}
                  isDark={isDark}
                />
                {/* Show name for host */}
                {p.isHost && (
                  <Text
                    size="xs"
                    color={colors.textMuted}
                    style={styles.participantLabel}
                    numberOfLines={1}
                  >
                    {creatorName.split(' ')[0]}
                  </Text>
                )}
              </View>
            ))}
          </View>
          {participantInfo.spotsLeft > 0 && (
            <Text size="sm" weight="medium" color={colors.statusOpen} style={styles.spotsText}>
              {participantInfo.spotsLeft === 1
                ? t('match.slots.oneLeft' as TranslationKey)
                : t('match.slots.left' as TranslationKey, { count: participantInfo.spotsLeft })}
            </Text>
          )}
        </View>

        {/* Location Section - Tappable to open maps */}
        <TouchableOpacity
          style={[styles.section, { borderBottomColor: colors.border }]}
          onPress={hasLocationData ? handleOpenMaps : undefined}
          activeOpacity={hasLocationData ? 0.7 : 1}
          disabled={!hasLocationData}
        >
          <View style={styles.locationRow}>
            <View style={[styles.infoRow, { flex: 1, minWidth: 0 }]}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="location" size={20} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text size="base" weight="semibold" color={colors.text}>
                  {facilityName || t('matchDetail.locationTBD' as TranslationKey)}
                  {courtName && ` - ${courtName}`}
                </Text>
                {address && (
                  <Text size="sm" color={colors.textMuted} style={styles.addressText}>
                    {address}
                  </Text>
                )}
                {distanceDisplay && (
                  <Text
                    size="sm"
                    weight="medium"
                    color={colors.primary}
                    style={styles.distanceText}
                  >
                    {distanceDisplay} {t('matchDetail.away' as TranslationKey)}
                  </Text>
                )}
              </View>
            </View>
            {hasLocationData && (
              <View style={styles.locationChevron}>
                <Ionicons name="chevron-forward" size={20} color={colors.iconMuted} />
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Cost Section */}
        {costDisplay && (
          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <InfoRow
              icon={match.is_court_free ? 'checkmark-circle' : 'cash-outline'}
              iconColor={match.is_court_free ? status.success.DEFAULT : colors.primary}
              colors={colors}
            >
              <View>
                <Text size="sm" color={colors.textMuted}>
                  {t('matchDetail.estimatedCost' as TranslationKey)}
                </Text>
                <Text
                  size="base"
                  weight="semibold"
                  color={match.is_court_free ? status.success.DEFAULT : colors.text}
                >
                  {costDisplay}
                </Text>
              </View>
            </InfoRow>
          </View>
        )}

        {/* Notes Section */}
        {match.notes && (
          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color={colors.iconMuted} />
              <Text size="base" weight="semibold" color={colors.text} style={styles.sectionTitle}>
                {t('matchDetail.notes' as TranslationKey)}
              </Text>
            </View>
            <Text size="sm" color={colors.textMuted} style={styles.notesText}>
              "{match.notes}"
            </Text>
          </View>
        )}
      </BottomSheetScrollView>

      {/* Sticky Action Footer */}
      <View
        style={[
          styles.stickyFooter,
          {
            backgroundColor: colors.cardBackground,
            borderTopColor: colors.border,
          },
        ]}
      >
        {renderActionButton()}
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: isDark ? neutral[800] : neutral[100] }]}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: radiusPixels['2xl'],
    borderTopRightRadius: radiusPixels['2xl'],
  },
  handleIndicator: {
    width: spacingPixels[10],
  },
  sheetContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacingPixels[10],
  },
  emptyContent: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: spacingPixels[5],
    paddingTop: spacingPixels[2],
    paddingBottom: spacingPixels[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleSection: {
    flex: 1,
    marginRight: spacingPixels[3],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
  },
  fullDate: {
    marginTop: spacingPixels[1],
  },
  statusBadge: {
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[1.5],
    borderRadius: radiusPixels.full,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sections
  section: {
    paddingHorizontal: spacingPixels[5],
    paddingVertical: spacingPixels[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingPixels[3],
  },
  sectionTitle: {
    marginLeft: spacingPixels[2],
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconContainer: {
    width: spacingPixels[8],
    alignItems: 'center',
    paddingTop: spacingPixels[0.5],
  },
  infoContent: {
    flex: 1,
  },
  addressText: {
    marginTop: spacingPixels[1],
  },
  distanceText: {
    marginTop: spacingPixels[1],
  },

  // Participants
  participantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingPixels[3],
  },
  participantWithLabel: {
    alignItems: 'center',
  },
  participantLabel: {
    marginTop: spacingPixels[1],
    maxWidth: 50,
    textAlign: 'center',
  },
  participantAvatarWrapper: {
    position: 'relative',
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  participantAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  hostBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BASE_WHITE,
  },
  spotsText: {
    marginTop: spacingPixels[3],
  },

  // Location row (tappable)
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationChevron: {
    marginLeft: spacingPixels[2],
    marginRight: spacingPixels[1],
    flexShrink: 0,
  },

  // Badges
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingPixels[2],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[1.5],
    borderRadius: radiusPixels.full,
  },
  badgeIcon: {
    marginRight: spacingPixels[1.5],
  },

  // Notes
  notesText: {
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Sticky Footer
  stickyFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacingPixels[5],
    paddingVertical: spacingPixels[4],
    paddingBottom: spacingPixels[6],
    gap: spacingPixels[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
  },
  shareButton: {
    width: spacingPixels[12],
    height: spacingPixels[12],
    borderRadius: radiusPixels.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MatchDetailSheet;
