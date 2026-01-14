/**
 * RequesterDetailsModal - Modal showing details about a player requesting to join a match
 *
 * Displays important information for match creators to make informed decisions
 * about accepting or rejecting join requests.
 */

import * as React from 'react';
import { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  ScrollView,
} from 'react-native';
import { Text } from '@rallia/shared-components';
import {
  lightTheme,
  darkTheme,
  spacingPixels,
  radiusPixels,
  neutral,
  status,
  primary,
} from '@rallia/design-system';
import { Ionicons } from '@expo/vector-icons';
import { lightHaptic, getProfilePictureUrl, formatRelativeTime } from '@rallia/shared-utils';
import { useTheme } from '@rallia/shared-hooks';
import { useTranslation, type TranslationKey } from '../hooks';
import type { MatchParticipantWithPlayer } from '@rallia/shared-types';
import type { PlayerWithProfile } from '@rallia/shared-types';

const BASE_WHITE = '#ffffff';

// =============================================================================
// TYPES
// =============================================================================

export interface RequesterDetailsModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;

  /**
   * Callback when the modal is dismissed
   */
  onClose: () => void;

  /**
   * The participant with request status
   */
  participant: MatchParticipantWithPlayer | null;

  /**
   * Callback when accept button is pressed
   */
  onAccept: (participantId: string) => void;

  /**
   * Callback when reject button is pressed
   */
  onReject: (participantId: string) => void;

  /**
   * Whether accept/reject actions are loading
   */
  isLoading?: boolean;

  /**
   * Whether the match is full (disable accept)
   */
  isMatchFull?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const RequesterDetailsModal: React.FC<RequesterDetailsModalProps> = ({
  visible,
  onClose,
  participant,
  onAccept,
  onReject,
  isLoading = false,
  isMatchFull = false,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  // Theme-aware colors
  const colors = {
    backdrop: 'rgba(0, 0, 0, 0.5)',
    background: themeColors.card,
    text: themeColors.foreground,
    textMuted: themeColors.mutedForeground,
    border: themeColors.border,
    primary: isDark ? primary[400] : primary[600],
    primaryLight: isDark ? primary[900] : primary[50],
  };

  // Handle accept
  const handleAccept = useCallback(() => {
    if (isLoading || isMatchFull || !participant?.id) return;
    lightHaptic();
    onAccept(participant.id);
  }, [isLoading, isMatchFull, participant, onAccept]);

  // Handle reject
  const handleReject = useCallback(() => {
    if (isLoading || !participant?.id) return;
    lightHaptic();
    onReject(participant.id);
  }, [isLoading, participant, onReject]);

  // Handle close
  const handleClose = useCallback(() => {
    if (isLoading) return;
    lightHaptic();
    onClose();
  }, [isLoading, onClose]);

  // Handle both single object and array formats from Supabase
  // Note: sportRatingLabel and sportRatingValue are attached to the player object at runtime
  const playerData = participant
    ? Array.isArray(participant.player)
      ? participant.player[0]
      : participant.player
    : null;

  const player = playerData as PlayerWithProfile | null | undefined;
  const profile = player?.profile;
  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.display_name || 'Player';

  // Get rating from the player object - check both label and value
  // The rating is attached by matchService at runtime when fetching match data
  const ratingLabel = player?.sportRatingLabel;
  const ratingValue = player?.sportRatingValue;

  // Display the rating value if available, falling back to label
  // Format: show the value (numeric) or label (string like "3.5")
  const ratingDisplay =
    ratingValue !== undefined && ratingValue !== null ? ratingValue.toFixed(1) : ratingLabel;

  const gender = player?.gender;
  const playingHand = player?.playing_hand;
  const avatarUrl = profile?.profile_picture_url
    ? getProfilePictureUrl(profile.profile_picture_url)
    : null;

  // Get verified status (check if field exists - may not be in current schema)
  const isVerified = (player as unknown as Record<string, unknown>)?.verified === true;

  // Get last active time
  const lastActiveAt = profile?.last_active_at;
  const activityDisplay = lastActiveAt ? formatRelativeTime(lastActiveAt) : null;

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  // Format gender display
  const genderDisplay =
    gender === 'male'
      ? t('common.gender.male' as TranslationKey)
      : gender === 'female'
        ? t('common.gender.female' as TranslationKey)
        : null;

  // Format playing hand display
  const playingHandDisplay =
    playingHand === 'left'
      ? t('common.playingHand.left' as TranslationKey)
      : playingHand === 'right'
        ? t('common.playingHand.right' as TranslationKey)
        : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.modal, { backgroundColor: colors.background }]}>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text size="lg" weight="semibold" style={{ color: colors.text }}>
                  {t('matchActions.requesterDetails' as TranslationKey)}
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={[styles.closeButton, { backgroundColor: themeColors.muted }]}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* Profile Picture and Name */}
                <View style={styles.profileSection}>
                  <View
                    style={[
                      styles.avatarContainer,
                      {
                        backgroundColor: avatarUrl
                          ? isDark
                            ? primary[400]
                            : primary[600]
                          : isDark
                            ? neutral[700]
                            : neutral[200],
                        borderWidth: 2,
                        borderColor: themeColors.card,
                      },
                    ]}
                  >
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                      <Ionicons
                        name="person"
                        size={40}
                        color={isDark ? neutral[400] : neutral[500]}
                      />
                    )}
                  </View>
                  <View style={styles.nameContainer}>
                    <Text size="xl" weight="bold" style={[styles.name, { color: colors.text }]}>
                      {fullName}
                    </Text>
                    {isVerified && (
                      <View
                        style={[styles.verifiedBadge, { backgroundColor: status.success.DEFAULT }]}
                      >
                        <Ionicons name="checkmark-circle" size={16} color={BASE_WHITE} />
                        <Text
                          size="xs"
                          weight="semibold"
                          style={{ color: BASE_WHITE, marginLeft: spacingPixels[1] }}
                        >
                          {t('common.verified' as TranslationKey)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Rating Badge */}
                {ratingDisplay && (
                  <View
                    style={[
                      styles.ratingBadge,
                      {
                        backgroundColor: themeColors.muted,
                        borderWidth: 1,
                        borderColor: themeColors.border,
                      },
                    ]}
                  >
                    <Ionicons name="analytics" size={16} color={themeColors.mutedForeground} />
                    <Text
                      size="base"
                      weight="semibold"
                      style={{
                        color: themeColors.foreground,
                        marginLeft: spacingPixels[2],
                      }}
                    >
                      {ratingDisplay}
                    </Text>
                  </View>
                )}

                {/* Details Grid */}
                <View style={styles.detailsGrid}>
                  {/* Gender */}
                  {genderDisplay && (
                    <View style={[styles.detailItem, { borderColor: colors.border }]}>
                      <Ionicons
                        name={gender === 'male' ? 'male' : 'female'}
                        size={18}
                        color={colors.textMuted}
                      />
                      <View style={styles.detailContent}>
                        <Text size="xs" style={{ color: colors.textMuted }}>
                          {t('common.gender.label' as TranslationKey)}
                        </Text>
                        <Text size="sm" weight="medium" style={{ color: colors.text }}>
                          {genderDisplay}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Playing Hand */}
                  {playingHandDisplay && (
                    <View style={[styles.detailItem, { borderColor: colors.border }]}>
                      <Ionicons name="hand-left-outline" size={18} color={colors.textMuted} />
                      <View style={styles.detailContent}>
                        <Text size="xs" style={{ color: colors.textMuted }}>
                          {t('common.playingHand.label' as TranslationKey)}
                        </Text>
                        <Text size="sm" weight="medium" style={{ color: colors.text }}>
                          {playingHandDisplay}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Activity Indicator */}
                  {activityDisplay && (
                    <View style={[styles.detailItem, { borderColor: colors.border }]}>
                      <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                      <View style={styles.detailContent}>
                        <Text size="xs" style={{ color: colors.textMuted }}>
                          {t('common.lastActive' as TranslationKey)}
                        </Text>
                        <Text size="sm" weight="medium" style={{ color: colors.text }}>
                          {activityDisplay}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Match Full Warning */}
                {isMatchFull && (
                  <View
                    style={[styles.warningBox, { backgroundColor: status.info.DEFAULT + '20' }]}
                  >
                    <Ionicons name="information-circle" size={16} color={status.info.DEFAULT} />
                    <Text
                      size="sm"
                      style={{ color: status.info.DEFAULT, marginLeft: spacingPixels[2] }}
                    >
                      {t('matchActions.matchFullCannotAccept' as TranslationKey)}
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Action Buttons */}
              <View style={[styles.buttonContainer, { borderTopColor: colors.border }]}>
                {/* Reject Button */}
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.rejectButton,
                    { backgroundColor: status.error.DEFAULT },
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleReject}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color={BASE_WHITE} />
                  <Text
                    size="base"
                    weight="medium"
                    style={{ color: BASE_WHITE, marginLeft: spacingPixels[1] }}
                  >
                    {t('matchActions.rejectRequest' as TranslationKey)}
                  </Text>
                </TouchableOpacity>

                {/* Accept Button */}
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.acceptButton,
                    {
                      backgroundColor: isMatchFull ? neutral[400] : status.success.DEFAULT,
                    },
                    (isLoading || isMatchFull) && styles.buttonDisabled,
                  ]}
                  onPress={handleAccept}
                  disabled={isLoading || isMatchFull}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark" size={18} color={BASE_WHITE} />
                  <Text
                    size="base"
                    weight="medium"
                    style={{ color: BASE_WHITE, marginLeft: spacingPixels[1] }}
                  >
                    {t('matchActions.acceptRequest' as TranslationKey)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[5],
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radiusPixels.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacingPixels[5],
    paddingHorizontal: spacingPixels[5],
    paddingBottom: spacingPixels[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent', // Set dynamically
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {},
  contentContainer: {
    paddingHorizontal: spacingPixels[5],
    paddingTop: spacingPixels[4],
    paddingBottom: spacingPixels[3],
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacingPixels[4],
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacingPixels[3],
    overflow: 'hidden',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  nameContainer: {
    alignItems: 'center',
    gap: spacingPixels[2],
  },
  name: {
    textAlign: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[2],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.full,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[2],
    borderRadius: radiusPixels.full,
    marginBottom: spacingPixels[4],
  },
  detailsGrid: {
    gap: spacingPixels[3],
    marginBottom: spacingPixels[3],
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
    borderRadius: radiusPixels.md,
    borderWidth: 1,
    gap: spacingPixels[3],
  },
  detailContent: {
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
    borderRadius: radiusPixels.md,
    marginBottom: spacingPixels[2],
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacingPixels[3],
    paddingHorizontal: spacingPixels[5],
    paddingTop: spacingPixels[3],
    paddingBottom: spacingPixels[5],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent', // Will be set dynamically
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[3],
    borderRadius: radiusPixels.md,
    minHeight: 48,
  },
  rejectButton: {
    // Background color set dynamically
  },
  acceptButton: {
    // Background color set dynamically
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default RequesterDetailsModal;
