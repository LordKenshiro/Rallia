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
import { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Share,
  Linking,
  Platform,
  Alert,
} from 'react-native';
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
  accent,
  neutral,
  status,
} from '@rallia/design-system';
import {
  lightHaptic,
  mediumHaptic,
  selectionHaptic,
  successHaptic,
  errorHaptic,
  formatTimeInTimezone,
  getTimeDifferenceFromNow,
  formatIntuitiveDateInTimezone,
  getProfilePictureUrl,
  deriveMatchStatus,
} from '@rallia/shared-utils';
import { useMatchDetailSheet } from '../context/MatchDetailSheetContext';
import { useActionsSheet } from '../context/ActionsSheetContext';
import { usePlayerInviteSheet } from '../context/PlayerInviteSheetContext';
import { useTranslation, type TranslationKey } from '../hooks';
import { useTheme, usePlayer, useMatchActions } from '@rallia/shared-hooks';
import type { MatchDetailData } from '../context/MatchDetailSheetContext';
import { ConfirmationModal } from './ConfirmationModal';
import { RequesterDetailsModal } from './RequesterDetailsModal';
import type { PlayerWithProfile, MatchParticipantWithPlayer } from '@rallia/shared-types';

const BASE_WHITE = '#ffffff';

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

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
  avatarPlaceholder: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get time display for match date/time
 * Uses the same format as the cards: "Today • 14:00 - 16:00"
 */
function getRelativeTimeDisplay(
  dateString: string,
  startTime: string,
  endTime: string,
  timezone: string,
  locale: string,
  t: (key: TranslationKey, options?: Record<string, string | number | boolean>) => string
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
    dateLabel = t(dateResult.translationKey as TranslationKey);
  } else {
    dateLabel = dateResult.label;
  }

  // Format time range (locale-aware: 12h for English, 24h for French)
  const startResult = formatTimeInTimezone(dateString, startTime, tz, locale);
  const endResult = formatTimeInTimezone(dateString, endTime, tz, locale);
  const timeRange = `${startResult.formattedTime} - ${endResult.formattedTime}`;
  const separator = t('common.time.timeSeparator' as TranslationKey);

  return { label: `${dateLabel}${separator}${timeRange}`, isUrgent };
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
 * Get participant info - only counts active participants
 */
function getParticipantInfo(match: MatchDetailData): {
  current: number;
  total: number;
  spotsLeft: number;
} {
  const total = match.format === 'doubles' ? 4 : 2;
  // Only count joined participants for display (not requested, pending, waitlisted, left, etc.)
  const joinedParticipants = match.participants?.filter(p => p.status === 'joined') ?? [];
  const current = joinedParticipants.length + 1; // +1 for creator
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
    {icon && <Ionicons name={icon} size={10} color={textColor} style={styles.badgeIcon} />}
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
          : {
              backgroundColor: avatarUrl ? colors.primary : colors.avatarPlaceholder,
              borderWidth: 2,
              borderColor: colors.cardBackground,
            },
        isHost && { borderWidth: 2, borderColor: colors.secondary },
      ]}
    >
      {!isEmpty && avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.participantAvatarImage} />
      ) : !isEmpty ? (
        <Ionicons name="person" size={18} color={isDark ? neutral[400] : neutral[500]} />
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
  const { sheetRef, closeSheet, selectedMatch, updateSelectedMatch } = useMatchDetailSheet();
  const { openSheet: openAuthSheet, openSheetForEdit } = useActionsSheet();
  const { openSheet: openInviteSheet } = usePlayerInviteSheet();
  const { theme } = useTheme();
  const { t, locale } = useTranslation();
  const { player } = usePlayer();
  const isDark = theme === 'dark';
  const playerId = player?.id;

  // Confirmation modal states
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingParticipantId, setRejectingParticipantId] = useState<string | null>(null);
  const [showCancelRequestModal, setShowCancelRequestModal] = useState(false);
  const [showKickModal, setShowKickModal] = useState(false);
  const [kickingParticipantId, setKickingParticipantId] = useState<string | null>(null);
  const [showCancelInviteModal, setShowCancelInviteModal] = useState(false);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);

  // Collapse/expand state for pending requests
  const [showAllRequests, setShowAllRequests] = useState(false);

  // Collapse/expand state for invitations
  const [showAllInvitations, setShowAllInvitations] = useState(false);

  // Requester details modal state
  const [selectedRequester, setSelectedRequester] = useState<MatchParticipantWithPlayer | null>(
    null
  );
  const [showRequesterModal, setShowRequesterModal] = useState(false);

  // Match actions hook
  const {
    joinMatch,
    leaveMatch,
    cancelMatch,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    kickParticipant,
    cancelInvite,
    resendInvite,
    isJoining,
    isLeaving,
    isCancelling,
    isAccepting,
    isRejecting,
    isCancellingRequest,
    isKicking,
    isCancellingInvite,
    isResendingInvite,
    joinResult,
  } = useMatchActions(selectedMatch?.id, {
    onJoinSuccess: result => {
      successHaptic();
      closeSheet();
      if (result.status === 'joined') {
        Alert.alert(
          t('alerts.success' as TranslationKey),
          t('matchActions.joinSuccess' as TranslationKey)
        );
      } else if (result.status === 'waitlisted') {
        Alert.alert(
          t('alerts.success' as TranslationKey),
          t('matchActions.waitlistSuccess' as TranslationKey)
        );
      } else {
        Alert.alert(
          t('alerts.success' as TranslationKey),
          t('matchActions.requestSent' as TranslationKey)
        );
      }
    },
    onJoinError: error => {
      errorHaptic();
      // Handle specific error types with user-friendly messages
      if (error.message === 'GENDER_MISMATCH') {
        Alert.alert(
          t('alerts.error' as TranslationKey),
          t('matchActions.genderMismatch' as TranslationKey)
        );
      } else {
        Alert.alert(t('alerts.error' as TranslationKey), error.message);
      }
    },
    onLeaveSuccess: () => {
      successHaptic();
      setShowLeaveModal(false);
      closeSheet();
      Alert.alert(
        t('alerts.success' as TranslationKey),
        t('matchActions.leaveSuccess' as TranslationKey)
      );
    },
    onLeaveError: error => {
      errorHaptic();
      setShowLeaveModal(false);
      Alert.alert(t('alerts.error' as TranslationKey), error.message);
    },
    onCancelSuccess: () => {
      successHaptic();
      setShowCancelModal(false);
      closeSheet();
      Alert.alert(
        t('alerts.success' as TranslationKey),
        t('matchActions.cancelSuccess' as TranslationKey)
      );
    },
    onCancelError: error => {
      errorHaptic();
      setShowCancelModal(false);
      Alert.alert(t('alerts.error' as TranslationKey), error.message);
    },
    onAcceptSuccess: participant => {
      successHaptic();
      if (selectedMatch) {
        updateSelectedMatch({
          ...selectedMatch,
          participants: selectedMatch.participants?.map(p =>
            p.id === participant.id ? { ...p, status: participant.status } : p
          ),
        });
      }
      Alert.alert(
        t('alerts.success' as TranslationKey),
        t('matchActions.acceptSuccess' as TranslationKey)
      );
    },
    onAcceptError: error => {
      errorHaptic();
      Alert.alert(t('alerts.error' as TranslationKey), error.message);
    },
    onRejectSuccess: participant => {
      successHaptic();
      setShowRejectModal(false);
      setRejectingParticipantId(null);
      if (selectedMatch) {
        updateSelectedMatch({
          ...selectedMatch,
          participants: selectedMatch?.participants?.map(p =>
            p.id === participant.id ? { ...p, status: participant.status } : p
          ),
        });
      }
      Alert.alert(
        t('alerts.success' as TranslationKey),
        t('matchActions.rejectSuccess' as TranslationKey)
      );
    },
    onRejectError: error => {
      errorHaptic();
      setShowRejectModal(false);
      setRejectingParticipantId(null);
      Alert.alert(t('alerts.error' as TranslationKey), error.message);
    },
    onCancelRequestSuccess: () => {
      successHaptic();
      setShowCancelRequestModal(false);
      closeSheet();
      Alert.alert(
        t('alerts.success' as TranslationKey),
        t('matchActions.cancelRequestSuccess' as TranslationKey)
      );
    },
    onCancelRequestError: error => {
      errorHaptic();
      setShowCancelRequestModal(false);
      Alert.alert(t('alerts.error' as TranslationKey), error.message);
    },
    onKickSuccess: participant => {
      successHaptic();
      setShowKickModal(false);
      setKickingParticipantId(null);
      if (selectedMatch) {
        updateSelectedMatch({
          ...selectedMatch,
          participants: selectedMatch.participants?.map(p =>
            p.id === participant.id ? { ...p, status: participant.status } : p
          ),
        });
      }
      Alert.alert(
        t('alerts.success' as TranslationKey),
        t('matchActions.kickSuccess' as TranslationKey)
      );
    },
    onKickError: error => {
      errorHaptic();
      setShowKickModal(false);
      setKickingParticipantId(null);
      Alert.alert(t('alerts.error' as TranslationKey), error.message);
    },
    onCancelInviteSuccess: participant => {
      successHaptic();
      setShowCancelInviteModal(false);
      setCancellingInvitationId(null);
      if (selectedMatch) {
        updateSelectedMatch({
          ...selectedMatch,
          participants: selectedMatch.participants?.map(p =>
            p.id === participant.id ? { ...p, status: participant.status } : p
          ),
        });
      }
      Alert.alert(
        t('alerts.success' as TranslationKey),
        t('matchActions.cancelInviteSuccess' as TranslationKey)
      );
    },
    onCancelInviteError: error => {
      errorHaptic();
      setShowCancelInviteModal(false);
      setCancellingInvitationId(null);
      Alert.alert(t('alerts.error' as TranslationKey), error.message);
    },
    onResendInviteSuccess: participant => {
      successHaptic();
      if (selectedMatch) {
        updateSelectedMatch({
          ...selectedMatch,
          participants: selectedMatch.participants?.map(p =>
            p.id === participant.id ? { ...p, status: participant.status } : p
          ),
        });
      }
      Alert.alert(
        t('alerts.success' as TranslationKey),
        t('matchActions.resendInviteSuccess' as TranslationKey)
      );
    },
    onResendInviteError: error => {
      errorHaptic();
      Alert.alert(t('alerts.error' as TranslationKey), error.message);
    },
  });

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
      avatarPlaceholder: isDark ? neutral[700] : neutral[200],
    }),
    [themeColors, isDark]
  );

  // Single snap point at 98% - sheet opens directly at this height to ensure footer actions are visible
  const snapPoints = useMemo(() => ['95%'], []);

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

  // Helper to redirect to auth sheet if user is not authenticated
  const requireAuth = useCallback((): boolean => {
    if (!playerId) {
      // Close detail sheet and open auth sheet
      closeSheet();
      openAuthSheet();
      return false;
    }
    return true;
  }, [playerId, closeSheet, openAuthSheet]);

  // Handle join match
  const handleJoinMatch = useCallback(() => {
    if (!selectedMatch) return;
    if (!requireAuth()) return;
    mediumHaptic();
    joinMatch(playerId!);
  }, [selectedMatch, requireAuth, playerId, joinMatch]);

  // Handle leave match - opens confirmation modal
  const handleLeaveMatch = useCallback(() => {
    if (!selectedMatch) return;
    mediumHaptic();
    setShowLeaveModal(true);
  }, [selectedMatch]);

  // Confirm leave match
  const handleConfirmLeave = useCallback(() => {
    if (!playerId) return;
    leaveMatch(playerId);
  }, [playerId, leaveMatch]);

  // Handle cancel match - opens confirmation modal (host only)
  const handleCancelMatch = useCallback(() => {
    if (!selectedMatch) return;
    mediumHaptic();
    setShowCancelModal(true);
  }, [selectedMatch]);

  // Confirm cancel match
  const handleConfirmCancel = useCallback(() => {
    if (!playerId) return;
    cancelMatch(playerId);
  }, [playerId, cancelMatch]);

  // Handle accept join request (host only)
  const handleAcceptRequest = useCallback(
    (participantId: string) => {
      if (!selectedMatch || !playerId) return;
      lightHaptic();
      acceptRequest({ participantId, hostId: playerId });
    },
    [selectedMatch, playerId, acceptRequest]
  );

  // Handle reject join request - opens confirmation modal (host only)
  const handleRejectRequest = useCallback(
    (participantId: string) => {
      if (!selectedMatch) return;
      mediumHaptic();
      setRejectingParticipantId(participantId);
      setShowRejectModal(true);
    },
    [selectedMatch]
  );

  // Confirm reject request
  const handleConfirmReject = useCallback(() => {
    if (!playerId || !rejectingParticipantId) return;
    rejectRequest({ participantId: rejectingParticipantId, hostId: playerId });
  }, [playerId, rejectingParticipantId, rejectRequest]);

  // Handle cancel request - opens confirmation modal (requester only)
  const handleCancelRequest = useCallback(() => {
    if (!selectedMatch) return;
    mediumHaptic();
    setShowCancelRequestModal(true);
  }, [selectedMatch]);

  // Confirm cancel request
  const handleConfirmCancelRequest = useCallback(() => {
    if (!playerId) return;
    cancelRequest(playerId);
  }, [playerId, cancelRequest]);

  // Handle edit match - opens the match creation wizard in edit mode
  const handleEditMatch = useCallback(() => {
    if (!selectedMatch) return;
    mediumHaptic();
    closeSheet(); // Close the detail sheet first
    openSheetForEdit(selectedMatch); // Open actions sheet in edit mode
  }, [selectedMatch, closeSheet, openSheetForEdit]);

  // Handle invite players - opens the player invite sheet
  const handleInvitePlayers = useCallback(() => {
    if (!selectedMatch || !playerId) return;
    lightHaptic();
    // Statuses that should be excluded from invite search:
    // - pending: Already has an active invitation
    // - requested: Already has an active join request
    // - joined: Already in the match
    // - waitlisted: Already on the waitlist
    // - kicked: Host removed them (shouldn't re-invite)
    // Statuses that CAN be re-invited: declined, left, refused, cancelled
    const excludeStatuses = ['pending', 'requested', 'joined', 'waitlisted', 'kicked'];
    const existingParticipantIds = [
      selectedMatch.created_by, // Host always excluded
      ...((selectedMatch.participants
        ?.filter(p => excludeStatuses.includes(p.status ?? ''))
        .map(p => p.player_id)
        .filter(Boolean) as string[]) ?? []),
    ];
    openInviteSheet(selectedMatch.id, selectedMatch.sport_id, playerId, existingParticipantIds);
  }, [selectedMatch, playerId, openInviteSheet]);

  // Handle view requester details - opens modal instead of navigating
  const handleViewRequesterDetails = useCallback((participant: MatchParticipantWithPlayer) => {
    lightHaptic();
    setSelectedRequester(participant);
    setShowRequesterModal(true);
  }, []);

  // Handle close requester modal
  const handleCloseRequesterModal = useCallback(() => {
    setShowRequesterModal(false);
    // Clear selected requester after animation
    setTimeout(() => {
      setSelectedRequester(null);
    }, 300);
  }, []);

  // Handle accept from requester modal
  const handleAcceptFromModal = useCallback(
    (participantId: string) => {
      handleAcceptRequest(participantId);
      handleCloseRequesterModal();
    },
    [handleAcceptRequest, handleCloseRequesterModal]
  );

  // Handle reject from requester modal
  const handleRejectFromModal = useCallback(
    (participantId: string) => {
      setRejectingParticipantId(participantId);
      handleCloseRequesterModal();
      setShowRejectModal(true);
    },
    [handleCloseRequesterModal]
  );

  // Handle kick participant - opens confirmation modal (host only)
  const handleKickParticipant = useCallback(
    (participantId: string) => {
      if (!selectedMatch) return;
      mediumHaptic();
      setKickingParticipantId(participantId);
      setShowKickModal(true);
    },
    [selectedMatch]
  );

  // Confirm kick participant
  const handleConfirmKick = useCallback(() => {
    if (!playerId || !kickingParticipantId) return;
    kickParticipant({ participantId: kickingParticipantId, hostId: playerId });
  }, [playerId, kickingParticipantId, kickParticipant]);

  // Handle cancel invite - opens confirmation modal (host only)
  const handleCancelInvite = useCallback(
    (participantId: string) => {
      if (!selectedMatch) return;
      mediumHaptic();
      setCancellingInvitationId(participantId);
      setShowCancelInviteModal(true);
    },
    [selectedMatch]
  );

  // Confirm cancel invite
  const handleConfirmCancelInvite = useCallback(() => {
    if (!playerId || !cancellingInvitationId) return;
    cancelInvite({ participantId: cancellingInvitationId, hostId: playerId });
  }, [playerId, cancellingInvitationId, cancelInvite]);

  // Handle resend invite - direct action (no confirmation needed)
  const handleResendInvite = useCallback(
    (participantId: string) => {
      if (!selectedMatch || !playerId) return;
      lightHaptic();
      resendInvite({ participantId, hostId: playerId });
    },
    [selectedMatch, playerId, resendInvite]
  );

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

  // Compute isCreator early for hasAnyBadges check (must be before early return for hooks rules)
  const isCreatorEarly = playerId === selectedMatch?.created_by;

  // Check if any badges should be displayed (must be before early return for hooks rules)
  const hasAnyBadges = useMemo(() => {
    if (!selectedMatch) return false;
    return (
      selectedMatch.court_status === 'reserved' ||
      (selectedMatch.player_expectation && selectedMatch.player_expectation !== 'both') ||
      (selectedMatch.min_rating_score && selectedMatch.min_rating_score.label) ||
      !!selectedMatch.preferred_opponent_gender ||
      selectedMatch.join_mode === 'request' ||
      (isCreatorEarly && !!selectedMatch.visibility) // Show visibility badge for creators
    );
  }, [selectedMatch, isCreatorEarly]);

  // Render nothing if no match is selected
  if (!selectedMatch) {
    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        index={0}
        enableDynamicSizing={false}
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

  // Determine match tier and get tier-specific accent colors
  const creatorReputationScore = match.created_by_player?.reputation_score;
  const tier = getMatchTier(match.court_status, creatorReputationScore);

  const { label: timeLabel, isUrgent } = getRelativeTimeDisplay(
    match.match_date,
    match.start_time,
    match.end_time,
    match.timezone,
    locale,
    t
  );
  const distanceDisplay = formatDistance(match.distance_meters);
  const creatorProfile = match.created_by_player?.profile;
  const creatorName =
    creatorProfile?.full_name ||
    creatorProfile?.display_name ||
    t('matchDetail.host' as TranslationKey);
  const isFull = participantInfo.spotsLeft === 0;
  const isCreator = playerId === match.created_by;
  // Check if user is an active participant (not left, declined, refused, or kicked)
  // Note: 'pending' (invited by host) is NOT included - invited players should see regular CTAs
  const activeStatuses = ['joined', 'requested', 'waitlisted'];
  const isParticipant =
    match.participants?.some(
      p => p.player_id === playerId && activeStatuses.includes(p.status ?? '')
    ) || isCreator;
  // Check if user has a pending join request (for showing "Cancel Request" button)
  const hasPendingRequest = match.participants?.some(
    p => p.player_id === playerId && p.status === 'requested'
  );
  // Check if user is invited by host (pending status = invitation awaiting response)
  const isInvited = match.participants?.some(
    p => p.player_id === playerId && p.status === 'pending'
  );
  // Check if user is waitlisted (for showing waitlisted banner)
  const isWaitlisted = match.participants?.some(
    p => p.player_id === playerId && p.status === 'waitlisted'
  );

  // Derive match status from attributes instead of using denormalized status field
  const derivedStatus = deriveMatchStatus({
    cancelled_at: match.cancelled_at,
    match_date: match.match_date,
    start_time: match.start_time,
    end_time: match.end_time,
    timezone: match.timezone,
    result: match.result,
  });
  const isCancelled = derivedStatus === 'cancelled';
  const isInProgress = derivedStatus === 'in_progress';
  const hasMatchEnded = derivedStatus === 'completed';
  const hasResult = !!match.result;

  // Build participant avatars list
  const participantAvatars: Array<{
    key: string;
    participantId?: string;
    avatarUrl?: string | null;
    isHost: boolean;
    isEmpty: boolean;
    name?: string;
  }> = [];

  // Host first - normalize URL to use current environment's Supabase URL
  participantAvatars.push({
    key: 'host',
    avatarUrl: getProfilePictureUrl(creatorProfile?.profile_picture_url),
    isHost: true,
    isEmpty: false,
    name: creatorName.split(' ')[0],
  });

  // Other participants (only joined ones - not requested, pending, etc.)
  // Normalize URLs to use current environment's Supabase URL
  match.participants
    ?.filter(p => p.status === 'joined')
    .forEach((p, i) => {
      const participantFullName =
        p.player?.profile?.full_name || p.player?.profile?.display_name || '';
      const participantFirstName = participantFullName.split(' ')[0];
      participantAvatars.push({
        key: p.id || `participant-${i}`,
        participantId: p.id,
        avatarUrl: getProfilePictureUrl(p.player?.profile?.profile_picture_url),
        isHost: false,
        isEmpty: false,
        name: participantFirstName,
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

  // Pending join requests (for host to accept/reject)
  // Normalize URLs to use current environment's Supabase URL
  const pendingRequests =
    match.participants
      ?.filter(p => p.status === 'requested')
      .map(p => {
        const fullName =
          p.player?.profile?.full_name ||
          p.player?.profile?.display_name ||
          t('matchDetail.host' as TranslationKey);
        // Get sport rating info if available (label and value)
        const playerWithRating = p.player as PlayerWithProfile | undefined;
        const ratingLabel = playerWithRating?.sportRatingLabel;
        const ratingValue = playerWithRating?.sportRatingValue;
        // Display value if available, otherwise fall back to label
        const ratingDisplay =
          ratingValue !== undefined && ratingValue !== null ? ratingValue.toFixed(1) : ratingLabel;
        return {
          id: p.id,
          playerId: p.player_id,
          name: fullName.split(' ')[0], // Show only first name
          avatarUrl: getProfilePictureUrl(p.player?.profile?.profile_picture_url),
          ratingLabel,
          ratingValue,
          ratingDisplay,
          participant: p as MatchParticipantWithPlayer, // Store full participant for modal
        };
      }) ?? [];

  // Pending invitations (host sent invite, awaiting response) - for host only
  const pendingInvitations =
    match.participants
      ?.filter(p => p.status === 'pending')
      .map(p => {
        const fullName =
          p.player?.profile?.full_name ||
          p.player?.profile?.display_name ||
          t('matchDetail.host' as TranslationKey);
        return {
          id: p.id,
          playerId: p.player_id,
          name: fullName.split(' ')[0], // Show only first name
          fullName,
          avatarUrl: getProfilePictureUrl(p.player?.profile?.profile_picture_url),
        };
      }) ?? [];

  // Declined invitations (invitee declined) - for host only
  const declinedInvitations =
    match.participants
      ?.filter(p => p.status === 'declined')
      .map(p => {
        const fullName =
          p.player?.profile?.full_name ||
          p.player?.profile?.display_name ||
          t('matchDetail.host' as TranslationKey);
        return {
          id: p.id,
          playerId: p.player_id,
          name: fullName.split(' ')[0], // Show only first name
          fullName,
          avatarUrl: getProfilePictureUrl(p.player?.profile?.profile_picture_url),
        };
      }) ?? [];

  // Combined invitations for display
  const allInvitations = [...pendingInvitations, ...declinedInvitations];

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

  // Determine action button(s)
  // Logic priority:
  // 1. Match has results → Show "View Results" info (no actions)
  // 2. Match has ended (no results) → Show "Match Ended" info (no actions)
  // 3. Creator (match not ended) → Edit + Cancel buttons
  // 4. Participant (match not ended) → Leave button
  // 5. Match is full → Disabled "Full" button
  // 6. Request mode → "Request to Join" button
  // 7. Default → "Join Now" button
  const renderActionButtons = () => {
    // Prepare theme colors for Button component - success green for join actions
    const successThemeColors = {
      primary: status.success.DEFAULT,
      primaryForeground: BASE_WHITE,
      buttonActive: status.success.DEFAULT,
      buttonInactive: neutral[300],
      buttonTextActive: BASE_WHITE,
      buttonTextInactive: neutral[500],
      text: colors.text,
      textMuted: colors.textMuted,
      border: colors.border,
      background: colors.cardBackground,
    };

    // Accent theme colors for edit actions
    const accentThemeColors = {
      primary: accent[500],
      primaryForeground: BASE_WHITE,
      buttonActive: accent[500],
      buttonInactive: neutral[300],
      buttonTextActive: BASE_WHITE,
      buttonTextInactive: neutral[500],
      text: colors.text,
      textMuted: colors.textMuted,
      border: colors.border,
      background: colors.cardBackground,
    };

    // Destructive button theme colors for cancel/leave
    const destructiveThemeColors = {
      primary: status.error.DEFAULT,
      primaryForeground: BASE_WHITE,
      buttonActive: status.error.DEFAULT,
      buttonInactive: neutral[300],
      buttonTextActive: BASE_WHITE,
      buttonTextInactive: neutral[500],
      text: colors.text,
      textMuted: colors.textMuted,
      border: colors.border,
      background: colors.cardBackground,
    };

    // Warning accent theme colors for pending states
    const warningThemeColors = {
      primary: accent[500],
      primaryForeground: BASE_WHITE,
      buttonActive: isDark ? accent[900] : accent[100],
      buttonInactive: neutral[300],
      buttonTextActive: isDark ? accent[300] : accent[700],
      buttonTextInactive: neutral[500],
      text: colors.text,
      textMuted: colors.textMuted,
      border: colors.border,
      background: colors.cardBackground,
    };

    // Match is cancelled → Show cancelled info, no actions available
    if (isCancelled) {
      return (
        <View style={styles.matchEndedContainer}>
          <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
          <Text size="sm" weight="medium" color={colors.textMuted} style={styles.matchEndedText}>
            {t('matchDetail.matchCancelled' as TranslationKey)}
          </Text>
        </View>
      );
    }

    // Match has results → No actions available
    if (hasResult) {
      return (
        <View style={styles.matchEndedContainer}>
          <Ionicons name="trophy-outline" size={20} color={colors.textMuted} />
          <Text size="sm" weight="medium" color={colors.textMuted} style={styles.matchEndedText}>
            {t('matchDetail.matchCompleted' as TranslationKey)}
          </Text>
        </View>
      );
    }

    // Match has ended but no results → No actions available
    if (hasMatchEnded) {
      return (
        <View style={styles.matchEndedContainer}>
          <Ionicons name="time-outline" size={20} color={colors.textMuted} />
          <Text size="sm" weight="medium" color={colors.textMuted} style={styles.matchEndedText}>
            {t('matchDetail.matchEnded' as TranslationKey)}
          </Text>
        </View>
      );
    }

    // Match is in progress → Show in-progress info, limited actions
    if (isInProgress) {
      return (
        <View style={styles.matchEndedContainer}>
          <Ionicons name="play-circle-outline" size={20} color={status.warning.DEFAULT} />
          <Text
            size="sm"
            weight="medium"
            color={status.warning.DEFAULT}
            style={styles.matchEndedText}
          >
            {t('matchDetail.matchInProgress' as TranslationKey)}
          </Text>
        </View>
      );
    }

    // Host: Edit + Cancel buttons (only if match hasn't ended)
    if (isCreator) {
      return (
        <>
          <Button
            variant="primary"
            onPress={handleEditMatch}
            style={styles.actionButton}
            themeColors={accentThemeColors}
            isDark={isDark}
          >
            {t('common.edit' as TranslationKey)}
          </Button>
          <Button
            variant="primary"
            onPress={handleCancelMatch}
            style={styles.cancelButton}
            themeColors={destructiveThemeColors}
            isDark={isDark}
            loading={isCancelling}
          >
            {t('matches.cancelMatch' as TranslationKey)}
          </Button>
        </>
      );
    }

    // User has pending request: Cancel Request button (warning accent, disabled look)
    if (hasPendingRequest) {
      return (
        <Button
          variant="primary"
          onPress={handleCancelRequest}
          style={styles.actionButton}
          themeColors={warningThemeColors}
          isDark={isDark}
          loading={isCancellingRequest}
        >
          {t('matchActions.cancelRequest' as TranslationKey)}
        </Button>
      );
    }

    // User is invited (pending status) to direct-join match with spots: Accept Invitation button (success green)
    // For request-mode or full matches, invited users see regular CTAs (Ask to Join / Join Waitlist)
    if (isInvited && !isFull && match.join_mode !== 'request') {
      return (
        <Button
          variant="primary"
          onPress={handleJoinMatch}
          style={styles.actionButton}
          themeColors={successThemeColors}
          isDark={isDark}
          loading={isJoining}
          disabled={isJoining}
        >
          {t('match.cta.acceptInvitation' as TranslationKey)}
        </Button>
      );
    }

    // Waitlisted user: Show Leave Waitlist only if match is still full (warning accent)
    if (isWaitlisted && isFull) {
      return (
        <Button
          variant="primary"
          onPress={handleLeaveMatch}
          style={styles.actionButton}
          themeColors={warningThemeColors}
          isDark={isDark}
          loading={isLeaving}
        >
          {t('matchActions.leaveWaitlist' as TranslationKey)}
        </Button>
      );
    }

    // Waitlisted user and spot opened up: Show Join/Request button (success green)
    if (isWaitlisted && !isFull) {
      if (match.join_mode === 'request') {
        return (
          <Button
            variant="primary"
            onPress={handleJoinMatch}
            style={styles.actionButton}
            themeColors={successThemeColors}
            isDark={isDark}
            loading={isJoining}
            disabled={isJoining}
          >
            {t('matchDetail.requestToJoin' as TranslationKey)}
          </Button>
        );
      }
      // Direct join
      return (
        <Button
          variant="primary"
          onPress={handleJoinMatch}
          style={styles.actionButton}
          themeColors={successThemeColors}
          isDark={isDark}
          loading={isJoining}
          disabled={isJoining}
        >
          {t('matchDetail.joinNow' as TranslationKey)}
        </Button>
      );
    }

    // Participant (not host, joined): Leave button (danger red)
    if (isParticipant) {
      return (
        <Button
          variant="primary"
          onPress={handleLeaveMatch}
          style={styles.actionButton}
          themeColors={destructiveThemeColors}
          isDark={isDark}
          loading={isLeaving}
        >
          {t('matches.leaveMatch' as TranslationKey)}
        </Button>
      );
    }

    // Match is full - offer to join waitlist (success green)
    if (isFull) {
      return (
        <Button
          variant="primary"
          onPress={handleJoinMatch}
          style={styles.actionButton}
          themeColors={successThemeColors}
          isDark={isDark}
          loading={isJoining}
          disabled={isJoining}
        >
          {t('matchActions.joinWaitlist' as TranslationKey)}
        </Button>
      );
    }

    // Request to join mode (success green)
    if (match.join_mode === 'request') {
      return (
        <Button
          variant="primary"
          onPress={handleJoinMatch}
          style={styles.actionButton}
          themeColors={successThemeColors}
          isDark={isDark}
          loading={isJoining}
          disabled={isJoining}
        >
          {t('matchDetail.requestToJoin' as TranslationKey)}
        </Button>
      );
    }

    // Direct join (success green)
    return (
      <Button
        variant="primary"
        onPress={handleJoinMatch}
        style={styles.actionButton}
        themeColors={successThemeColors}
        isDark={isDark}
        loading={isJoining}
        disabled={isJoining}
      >
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
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colors.border }]}
      backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.cardBackground }]}
    >
      {/* Header with close button */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleSection}>
            {/* Match Date/Time - same format as cards */}
            <View style={styles.dateRow}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.iconMuted}
                style={styles.calendarIcon}
              />
              <Text size="xl" weight="bold" color={isUrgent ? colors.secondary : colors.text}>
                {timeLabel}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleCloseSheet}
              style={[styles.closeButton, { backgroundColor: themeColors.muted }]}
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
        {/* Pending Request Banner - shown to requesters with pending status */}
        {hasPendingRequest && !isCreator && (
          <View
            style={[
              styles.pendingBanner,
              {
                backgroundColor: status.warning.DEFAULT + '15',
                borderColor: status.warning.DEFAULT,
              },
            ]}
          >
            <Ionicons name="time-outline" size={18} color={status.warning.DEFAULT} />
            <Text
              size="sm"
              weight="medium"
              color={status.warning.DEFAULT}
              style={styles.pendingBannerText}
            >
              {t('matchActions.requestPending' as TranslationKey)}
            </Text>
          </View>
        )}

        {/* Waitlisted Banner - shown to waitlisted users */}
        {isWaitlisted && !isCreator && (
          <View
            style={[
              styles.pendingBanner,
              {
                backgroundColor: isFull
                  ? status.info.DEFAULT + '15'
                  : status.success.DEFAULT + '15',
                borderColor: isFull ? status.info.DEFAULT : status.success.DEFAULT,
              },
            ]}
          >
            <Ionicons
              name={isFull ? 'list-outline' : 'checkmark-circle-outline'}
              size={18}
              color={isFull ? status.info.DEFAULT : status.success.DEFAULT}
            />
            <Text
              size="sm"
              weight="medium"
              color={isFull ? status.info.DEFAULT : status.success.DEFAULT}
              style={styles.pendingBannerText}
            >
              {isFull
                ? t('matchActions.waitlistedInfo' as TranslationKey)
                : t('matchActions.spotOpenedUp' as TranslationKey)}
            </Text>
          </View>
        )}

        {/* Match Info Grid - Moved up for context */}
        {hasAnyBadges && (
          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <View style={styles.badgesGrid}>
              {/* Court Booked badge - uses secondary (coral) for important callout */}
              {(tier === 'mostWanted' || tier === 'readyToPlay') && (
                <Badge
                  label={t('match.courtStatus.courtBooked' as TranslationKey)}
                  bgColor={isDark ? `${secondary[400]}25` : `${secondary[500]}15`}
                  textColor={isDark ? secondary[400] : secondary[600]}
                  icon="checkmark-circle"
                />
              )}

              {/* Player expectation - competitive uses accent (amber), casual uses primary (teal) */}
              {match.player_expectation && match.player_expectation !== 'both' && (
                <Badge
                  label={
                    match.player_expectation === 'competitive'
                      ? t('matchDetail.competitive' as TranslationKey)
                      : t('matchDetail.casual' as TranslationKey)
                  }
                  bgColor={
                    match.player_expectation === 'competitive'
                      ? isDark
                        ? `${accent[400]}25`
                        : `${accent[500]}15`
                      : isDark
                        ? `${primary[400]}25`
                        : `${primary[500]}15`
                  }
                  textColor={
                    match.player_expectation === 'competitive'
                      ? isDark
                        ? accent[400]
                        : accent[600]
                      : isDark
                        ? primary[400]
                        : primary[600]
                  }
                  icon={match.player_expectation === 'competitive' ? 'trophy' : 'happy'}
                />
              )}

              {/* Min rating - uses primary (teal) for level info */}
              {match.min_rating_score && match.min_rating_score.label && (
                <Badge
                  label={match.min_rating_score.label}
                  bgColor={isDark ? `${primary[400]}25` : `${primary[500]}15`}
                  textColor={isDark ? primary[400] : primary[600]}
                  icon="analytics"
                />
              )}

              {/* Gender preference - neutral style for filter info */}
              {match.preferred_opponent_gender && (
                <Badge
                  label={
                    match.preferred_opponent_gender === 'male'
                      ? t('match.gender.menOnly' as TranslationKey)
                      : match.preferred_opponent_gender === 'female'
                        ? t('match.gender.womenOnly' as TranslationKey)
                        : t('match.gender.other' as TranslationKey)
                  }
                  bgColor={isDark ? neutral[800] : neutral[100]}
                  textColor={isDark ? neutral[300] : neutral[600]}
                  icon={match.preferred_opponent_gender === 'male' ? 'male' : 'female'}
                />
              )}

              {/* Join mode - neutral style for filter info */}
              {match.join_mode === 'request' && (
                <Badge
                  label={t('match.joinMode.request' as TranslationKey)}
                  bgColor={isDark ? neutral[800] : neutral[100]}
                  textColor={isDark ? neutral[300] : neutral[600]}
                  icon="hand-left"
                />
              )}

              {/* Visibility badge - only visible to creator */}
              {isCreator && match.visibility && (
                <Badge
                  label={
                    match.visibility === 'public'
                      ? t('matchCreation.fields.visibilityPublic' as TranslationKey)
                      : t('matchCreation.fields.visibilityPrivate' as TranslationKey)
                  }
                  bgColor={
                    match.visibility === 'public'
                      ? isDark
                        ? `${primary[400]}25`
                        : `${primary[500]}15`
                      : isDark
                        ? `${neutral[600]}40`
                        : `${neutral[500]}20`
                  }
                  textColor={
                    match.visibility === 'public'
                      ? isDark
                        ? primary[400]
                        : primary[600]
                      : isDark
                        ? neutral[300]
                        : neutral[600]
                  }
                  icon={match.visibility === 'public' ? 'globe-outline' : 'lock-closed'}
                />
              )}
            </View>
          </View>
        )}

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
                <View style={styles.participantAvatarWithAction}>
                  <ParticipantAvatar
                    avatarUrl={p.avatarUrl}
                    isHost={p.isHost}
                    isEmpty={p.isEmpty}
                    colors={colors}
                    isDark={isDark}
                  />
                  {/* Kick button for host to remove joined participants (not for host avatar, not for empty slots, not if match ended) */}
                  {isCreator && !p.isHost && !p.isEmpty && p.participantId && !hasMatchEnded && (
                    <TouchableOpacity
                      style={[styles.kickButton, { backgroundColor: status.error.DEFAULT }]}
                      onPress={() => handleKickParticipant(p.participantId!)}
                      disabled={isKicking}
                      activeOpacity={0.7}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Ionicons name="close" size={10} color={BASE_WHITE} />
                    </TouchableOpacity>
                  )}
                </View>
                {/* Show name for all non-empty participants */}
                {!p.isEmpty && p.name && (
                  <Text
                    size="xs"
                    color={colors.textMuted}
                    style={styles.participantLabel}
                    numberOfLines={1}
                  >
                    {p.name}
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

          {/* Invite Players Button - only visible to host when spots available and match not ended */}
          {isCreator && participantInfo.spotsLeft > 0 && !hasMatchEnded && !isCancelled && (
            <TouchableOpacity
              style={[
                styles.invitePlayersButton,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                },
              ]}
              onPress={handleInvitePlayers}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add" size={18} color={colors.primary} />
              <Text
                size="sm"
                weight="medium"
                color={colors.primary}
                style={styles.inviteButtonText}
              >
                {t('matchCreation.invite.title' as TranslationKey)}
              </Text>
            </TouchableOpacity>
          )}

          {/* Pending Requests Section - only visible to host */}
          {isCreator && pendingRequests.length > 0 && (
            <View style={styles.pendingRequestsSection}>
              <View style={styles.pendingRequestsHeader}>
                <Text
                  size="sm"
                  weight="semibold"
                  color={colors.secondary}
                  style={styles.pendingRequestsTitle}
                >
                  {t('matchActions.pendingRequests' as TranslationKey)} ({pendingRequests.length})
                </Text>
                {isFull && (
                  <View
                    style={[styles.matchFullBadge, { backgroundColor: status.info.DEFAULT + '20' }]}
                  >
                    <Ionicons name="information-circle" size={12} color={status.info.DEFAULT} />
                    <Text
                      size="xs"
                      weight="medium"
                      color={status.info.DEFAULT}
                      style={styles.matchFullBadgeText}
                    >
                      {t('matchActions.matchFullCannotAccept' as TranslationKey)}
                    </Text>
                  </View>
                )}
              </View>
              {(showAllRequests ? pendingRequests : pendingRequests.slice(0, 3)).map(request => (
                <View
                  key={request.id}
                  style={[
                    styles.pendingRequestInfo,
                    {
                      backgroundColor: themeColors.muted,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radiusPixels.md,
                      paddingHorizontal: spacingPixels[3],
                      paddingVertical: spacingPixels[2.5],
                    },
                  ]}
                >
                  <View style={styles.pendingRequestContent}>
                    <View
                      style={[styles.pendingRequestAvatar, { backgroundColor: colors.primary }]}
                    >
                      {request.avatarUrl ? (
                        <Image
                          source={{ uri: request.avatarUrl }}
                          style={styles.pendingRequestAvatarImage}
                        />
                      ) : (
                        <Ionicons name="person" size={16} color={BASE_WHITE} />
                      )}
                    </View>
                    <View style={styles.pendingRequestNameContainer}>
                      <Text
                        size="sm"
                        weight="medium"
                        color={colors.text}
                        numberOfLines={1}
                        style={styles.pendingRequestName}
                      >
                        {request.name}
                      </Text>
                      {request.ratingDisplay && (
                        <View
                          style={[
                            styles.pendingRequestRatingBadge,
                            { backgroundColor: colors.primaryLight },
                          ]}
                        >
                          <Ionicons
                            name="analytics"
                            size={10}
                            color={colors.primary}
                            style={styles.pendingRequestRatingIcon}
                          />
                          <Text size="xs" weight="medium" color={colors.primary}>
                            {request.ratingDisplay}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.pendingRequestActions}>
                    <TouchableOpacity
                      style={[styles.viewDetailsButton, { backgroundColor: colors.primaryLight }]}
                      onPress={() =>
                        request.participant && handleViewRequesterDetails(request.participant)
                      }
                      activeOpacity={0.7}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Ionicons name="eye-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.requestActionButton,
                        styles.acceptButton,
                        {
                          backgroundColor: isFull ? neutral[400] : status.success.DEFAULT,
                        },
                      ]}
                      onPress={() => request.id && handleAcceptRequest(request.id)}
                      disabled={isAccepting || isRejecting || isFull}
                      activeOpacity={0.7}
                    >
                      {isAccepting ? (
                        <View style={styles.requestActionLoading} />
                      ) : (
                        <Ionicons name="checkmark" size={18} color={BASE_WHITE} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.requestActionButton,
                        styles.rejectButton,
                        { backgroundColor: status.error.DEFAULT },
                      ]}
                      onPress={() => request.id && handleRejectRequest(request.id)}
                      disabled={isAccepting || isRejecting}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={18} color={BASE_WHITE} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {/* Show more/less toggle when there are more than 3 requests */}
              {pendingRequests.length > 3 && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => {
                    lightHaptic();
                    setShowAllRequests(!showAllRequests);
                  }}
                  activeOpacity={0.7}
                >
                  <Text size="sm" weight="medium" color={colors.primary}>
                    {showAllRequests
                      ? t('common.showLess' as TranslationKey)
                      : t('matchActions.showMoreRequests' as TranslationKey, {
                          count: pendingRequests.length - 3,
                        })}
                  </Text>
                  <Ionicons
                    name={showAllRequests ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.primary}
                    style={styles.showMoreIcon}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Invitations Section - only visible to host */}
          {isCreator && allInvitations.length > 0 && (
            <View style={styles.pendingRequestsSection}>
              <View style={styles.pendingRequestsHeader}>
                <Text
                  size="sm"
                  weight="semibold"
                  color={colors.primary}
                  style={styles.pendingRequestsTitle}
                >
                  {t('matchActions.invitations' as TranslationKey)} ({allInvitations.length})
                </Text>
              </View>
              {(showAllInvitations ? allInvitations : allInvitations.slice(0, 3)).map(
                invitation => {
                  const isPending = pendingInvitations.some(p => p.id === invitation.id);
                  const statusColor = isPending ? status.warning.DEFAULT : neutral[400];
                  const statusLabel = isPending
                    ? t('matchActions.participantStatus.pending' as TranslationKey)
                    : t('matchActions.participantStatus.declined' as TranslationKey);

                  return (
                    <View
                      key={invitation.id}
                      style={[
                        styles.pendingRequestInfo,
                        {
                          backgroundColor: themeColors.muted,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: radiusPixels.md,
                          paddingHorizontal: spacingPixels[3],
                          paddingVertical: spacingPixels[2.5],
                        },
                      ]}
                    >
                      <View style={styles.pendingRequestContent}>
                        <View
                          style={[styles.pendingRequestAvatar, { backgroundColor: colors.primary }]}
                        >
                          {invitation.avatarUrl ? (
                            <Image
                              source={{ uri: invitation.avatarUrl }}
                              style={styles.pendingRequestAvatarImage}
                            />
                          ) : (
                            <Ionicons name="person" size={16} color={BASE_WHITE} />
                          )}
                        </View>
                        <View style={styles.pendingRequestNameContainer}>
                          <Text
                            size="sm"
                            weight="medium"
                            color={colors.text}
                            numberOfLines={1}
                            style={styles.pendingRequestName}
                          >
                            {invitation.name}
                          </Text>
                          <View
                            style={[
                              styles.pendingRequestRatingBadge,
                              { backgroundColor: statusColor + '20' },
                            ]}
                          >
                            <Ionicons
                              name={isPending ? 'time-outline' : 'close-circle-outline'}
                              size={10}
                              color={statusColor}
                              style={styles.pendingRequestRatingIcon}
                            />
                            <Text size="xs" weight="medium" color={statusColor}>
                              {statusLabel}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.pendingRequestActions}>
                        {isPending ? (
                          <>
                            {/* Resend button for pending invitations */}
                            <TouchableOpacity
                              style={[
                                styles.requestActionButton,
                                { backgroundColor: colors.primary },
                              ]}
                              onPress={() => invitation.id && handleResendInvite(invitation.id)}
                              disabled={isResendingInvite || isCancellingInvite}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="refresh" size={18} color={BASE_WHITE} />
                            </TouchableOpacity>
                            {/* Cancel button for pending invitations */}
                            <TouchableOpacity
                              style={[
                                styles.requestActionButton,
                                { backgroundColor: status.error.DEFAULT },
                              ]}
                              onPress={() => invitation.id && handleCancelInvite(invitation.id)}
                              disabled={isResendingInvite || isCancellingInvite}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="close" size={18} color={BASE_WHITE} />
                            </TouchableOpacity>
                          </>
                        ) : (
                          /* Resend button for declined invitations */
                          <TouchableOpacity
                            style={[
                              styles.requestActionButton,
                              { backgroundColor: colors.primary },
                            ]}
                            onPress={() => invitation.id && handleResendInvite(invitation.id)}
                            disabled={isResendingInvite || isCancellingInvite}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="refresh" size={18} color={BASE_WHITE} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                }
              )}
              {/* Show more/less toggle when there are more than 3 invitations */}
              {allInvitations.length > 3 && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => {
                    lightHaptic();
                    setShowAllInvitations(!showAllInvitations);
                  }}
                  activeOpacity={0.7}
                >
                  <Text size="sm" weight="medium" color={colors.primary}>
                    {showAllInvitations
                      ? t('common.showLess' as TranslationKey)
                      : t('matchActions.showMoreInvitations' as TranslationKey, {
                          count: allInvitations.length - 3,
                        })}
                  </Text>
                  <Ionicons
                    name={showAllInvitations ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.primary}
                    style={styles.showMoreIcon}
                  />
                </TouchableOpacity>
              )}
            </View>
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
                  {t('matchDetail.courtEstimatedCost' as TranslationKey)}
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
        {renderActionButtons()}
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: themeColors.muted }]}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Leave Match Confirmation Modal */}
      <ConfirmationModal
        visible={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={handleConfirmLeave}
        title={t('matchActions.leaveConfirmTitle' as TranslationKey)}
        message={t('matchActions.leaveConfirmMessage' as TranslationKey)}
        confirmLabel={t('matches.leaveMatch' as TranslationKey)}
        cancelLabel={t('common.cancel' as TranslationKey)}
        destructive
        isLoading={isLeaving}
      />

      {/* Cancel Match Confirmation Modal */}
      <ConfirmationModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        title={t('matchActions.cancelConfirmTitle' as TranslationKey)}
        message={t('matchActions.cancelConfirmMessage' as TranslationKey, {
          count: participantInfo.current,
        })}
        additionalInfo={
          participantInfo.current > 1
            ? t('matchActions.cancelWarning' as TranslationKey, {
                count: participantInfo.current - 1,
              })
            : undefined
        }
        confirmLabel={t('matches.cancelMatch' as TranslationKey)}
        cancelLabel={t('common.goBack' as TranslationKey)}
        destructive
        isLoading={isCancelling}
      />

      {/* Reject Request Confirmation Modal */}
      <ConfirmationModal
        visible={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectingParticipantId(null);
        }}
        onConfirm={handleConfirmReject}
        title={t('matchActions.rejectConfirmTitle' as TranslationKey)}
        message={t('matchActions.rejectConfirmMessage' as TranslationKey)}
        confirmLabel={t('matchActions.rejectRequest' as TranslationKey)}
        cancelLabel={t('common.cancel' as TranslationKey)}
        destructive
        isLoading={isRejecting}
      />

      {/* Cancel Request Confirmation Modal (for requesters) */}
      <ConfirmationModal
        visible={showCancelRequestModal}
        onClose={() => setShowCancelRequestModal(false)}
        onConfirm={handleConfirmCancelRequest}
        title={t('matchActions.cancelRequestConfirmTitle' as TranslationKey)}
        message={t('matchActions.cancelRequestConfirmMessage' as TranslationKey)}
        confirmLabel={t('matchActions.cancelRequest' as TranslationKey)}
        cancelLabel={t('common.goBack' as TranslationKey)}
        destructive
        isLoading={isCancellingRequest}
      />

      {/* Requester Details Modal */}
      <RequesterDetailsModal
        visible={showRequesterModal}
        onClose={handleCloseRequesterModal}
        participant={selectedRequester}
        onAccept={handleAcceptFromModal}
        onReject={handleRejectFromModal}
        isLoading={isAccepting || isRejecting}
        isMatchFull={isFull}
      />

      {/* Kick Participant Confirmation Modal */}
      <ConfirmationModal
        visible={showKickModal}
        onClose={() => {
          setShowKickModal(false);
          setKickingParticipantId(null);
        }}
        onConfirm={handleConfirmKick}
        title={t('matchActions.kickConfirmTitle' as TranslationKey)}
        message={t('matchActions.kickConfirmMessage' as TranslationKey)}
        confirmLabel={t('matchActions.kickParticipant' as TranslationKey)}
        cancelLabel={t('common.cancel' as TranslationKey)}
        destructive
        isLoading={isKicking}
      />

      {/* Cancel Invitation Confirmation Modal */}
      <ConfirmationModal
        visible={showCancelInviteModal}
        onClose={() => {
          setShowCancelInviteModal(false);
          setCancellingInvitationId(null);
        }}
        onConfirm={handleConfirmCancelInvite}
        title={t('matchActions.cancelInviteConfirmTitle' as TranslationKey)}
        message={t('matchActions.cancelInviteConfirmMessage' as TranslationKey)}
        confirmLabel={t('matchActions.cancelInvite' as TranslationKey)}
        cancelLabel={t('common.cancel' as TranslationKey)}
        destructive
        isLoading={isCancellingInvite}
      />
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
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacingPixels[5],
    marginTop: spacingPixels[3],
    marginBottom: spacingPixels[1],
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderRadius: radiusPixels.md,
    borderWidth: 1,
  },
  pendingBannerText: {
    marginLeft: spacingPixels[2],
    flex: 1,
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
    alignItems: 'center',
  },
  headerTitleSection: {
    flex: 1,
    marginRight: spacingPixels[3],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    marginRight: spacingPixels[2],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
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
  participantAvatarWithAction: {
    position: 'relative',
  },
  kickButton: {
    position: 'absolute',
    top: 0,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotsText: {
    marginTop: spacingPixels[3],
  },
  invitePlayersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacingPixels[3],
    paddingVertical: spacingPixels[2.5],
    paddingHorizontal: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    gap: spacingPixels[2],
  },
  inviteButtonText: {
    // No additional styles needed
  },

  // Pending requests (host only)
  pendingRequestsSection: {
    marginTop: spacingPixels[4],
    paddingTop: spacingPixels[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  pendingRequestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacingPixels[2],
    flexWrap: 'wrap',
    gap: spacingPixels[2],
  },
  pendingRequestsTitle: {
    // No margin bottom - now handled by header gap
  },
  matchFullBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[2],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.full,
  },
  matchFullBadgeText: {
    marginLeft: spacingPixels[1],
  },
  pendingRequestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacingPixels[2],
  },
  pendingRequestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  pendingRequestAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingPixels[2],
    overflow: 'hidden',
  },
  pendingRequestAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  pendingRequestNameContainer: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
  },
  pendingRequestName: {
    flexShrink: 1,
  },
  pendingRequestRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[1.5],
    paddingVertical: spacingPixels[0.5],
    borderRadius: radiusPixels.full,
    flexShrink: 0,
  },
  pendingRequestRatingIcon: {
    marginRight: spacingPixels[0.5],
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[2],
    marginTop: spacingPixels[1],
  },
  showMoreIcon: {
    marginLeft: spacingPixels[1],
  },
  pendingRequestActions: {
    flexDirection: 'row',
    gap: spacingPixels[2],
    marginLeft: spacingPixels[2],
  },
  requestActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    // Background color set dynamically
  },
  rejectButton: {
    // Background color set dynamically
  },
  requestActionLoading: {
    width: 18,
    height: 18,
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
    gap: spacingPixels[1.5],
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
  cancelButton: {
    flex: 0,
    paddingHorizontal: spacingPixels[4],
  },
  shareButton: {
    width: spacingPixels[12],
    height: spacingPixels[12],
    borderRadius: radiusPixels.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchEndedContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[3],
    gap: spacingPixels[2],
  },
  matchEndedText: {
    textAlign: 'center',
  },
});

export default MatchDetailSheet;
