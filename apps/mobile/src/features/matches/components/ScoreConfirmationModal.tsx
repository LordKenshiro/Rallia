/**
 * ScoreConfirmationModal Component
 * 
 * Modal for confirming or disputing a pending match score.
 * Shows the match details and score, with options to confirm or dispute.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button } from '@rallia/shared-components';
import { useThemeStyles } from '../../../hooks';
import { 
  useConfirmMatchScore, 
  useDisputeMatchScore,
  type PendingScoreConfirmation 
} from '@rallia/shared-hooks';

interface ScoreConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  confirmation: PendingScoreConfirmation | null;
  playerId: string;
}

export function ScoreConfirmationModal({
  visible,
  onClose,
  confirmation,
  playerId,
}: ScoreConfirmationModalProps) {
  const { colors, isDark } = useThemeStyles();
  const [showDisputeReason, setShowDisputeReason] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  
  const confirmMutation = useConfirmMatchScore();
  const disputeMutation = useDisputeMatchScore();

  const isLoading = confirmMutation.isPending || disputeMutation.isPending;

  const handleConfirm = useCallback(async () => {
    if (!confirmation) return;
    
    try {
      await confirmMutation.mutateAsync({
        matchResultId: confirmation.match_result_id,
        playerId,
      });
      Alert.alert('Score Confirmed', 'The match score has been confirmed.');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm score. Please try again.');
    }
  }, [confirmation, playerId, confirmMutation, onClose]);

  const handleDispute = useCallback(async () => {
    if (!confirmation) return;
    
    if (!showDisputeReason) {
      setShowDisputeReason(true);
      return;
    }
    
    try {
      await disputeMutation.mutateAsync({
        matchResultId: confirmation.match_result_id,
        playerId,
        reason: disputeReason.trim() || undefined,
      });
      Alert.alert(
        'Score Disputed',
        'The match score has been disputed. Please contact your opponent to resolve the issue.'
      );
      setShowDisputeReason(false);
      setDisputeReason('');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to dispute score. Please try again.');
    }
  }, [confirmation, playerId, disputeMutation, showDisputeReason, disputeReason, onClose]);

  const handleClose = useCallback(() => {
    setShowDisputeReason(false);
    setDisputeReason('');
    onClose();
  }, [onClose]);

  if (!confirmation) return null;
  
  const matchDate = new Date(confirmation.match_date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const deadline = new Date(confirmation.confirmation_deadline);
  const now = new Date();
  const hoursRemaining = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)));
  const minutesRemaining = Math.max(0, Math.floor(((deadline.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60)));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <Text weight="semibold" size="lg" style={{ color: colors.text }}>
                Confirm Score
              </Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {/* Submitter info */}
              <View style={[styles.submitterCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={[styles.submitterAvatar, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                  {confirmation.submitted_by_avatar ? (
                    <Image
                      source={{ uri: confirmation.submitted_by_avatar }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Ionicons name="person" size={24} color={colors.textMuted} />
                  )}
                </View>
                <View style={styles.submitterInfo}>
                  <Text weight="medium" style={{ color: colors.text }}>
                    {confirmation.submitted_by_name}
                  </Text>
                  <Text size="sm" style={{ color: colors.textSecondary }}>
                    submitted a match score
                  </Text>
                </View>
              </View>

              {/* Match details */}
              <View style={[styles.matchCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                {/* Sport & Date */}
                <View style={styles.matchHeader}>
                  <View style={styles.sportBadge}>
                    {confirmation.sport_icon_url ? (
                      <Image source={{ uri: confirmation.sport_icon_url }} style={styles.sportIcon} />
                    ) : (
                      <Ionicons name="tennisball" size={16} color={colors.primary} />
                    )}
                    <Text size="sm" weight="medium" style={{ color: colors.text, marginLeft: 4 }}>
                      {confirmation.sport_name}
                    </Text>
                  </View>
                  <Text size="sm" style={{ color: colors.textSecondary }}>
                    {matchDate}
                  </Text>
                </View>

                {/* Score display */}
                <View style={styles.scoreContainer}>
                  <View style={styles.teamColumn}>
                    <Text size="sm" style={{ color: colors.textSecondary }}>
                      {confirmation.player_team === 1 ? 'You' : confirmation.opponent_name}
                    </Text>
                    <Text 
                      size="3xl" 
                      weight="bold" 
                      style={{ 
                        color: confirmation.winning_team === 1 ? colors.primary : colors.text 
                      }}
                    >
                      {confirmation.team1_score}
                    </Text>
                    {confirmation.winning_team === 1 && (
                      <View style={[styles.winnerBadge, { backgroundColor: colors.primary }]}>
                        <Ionicons name="trophy" size={12} color="#fff" />
                        <Text size="xs" weight="medium" style={{ color: '#fff', marginLeft: 2 }}>
                          Winner
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.vsContainer}>
                    <Text size="lg" weight="medium" style={{ color: colors.textMuted }}>
                      vs
                    </Text>
                  </View>

                  <View style={styles.teamColumn}>
                    <Text size="sm" style={{ color: colors.textSecondary }}>
                      {confirmation.player_team === 2 ? 'You' : confirmation.opponent_name}
                    </Text>
                    <Text 
                      size="3xl" 
                      weight="bold" 
                      style={{ 
                        color: confirmation.winning_team === 2 ? colors.primary : colors.text 
                      }}
                    >
                      {confirmation.team2_score}
                    </Text>
                    {confirmation.winning_team === 2 && (
                      <View style={[styles.winnerBadge, { backgroundColor: colors.primary }]}>
                        <Ionicons name="trophy" size={12} color="#fff" />
                        <Text size="xs" weight="medium" style={{ color: '#fff', marginLeft: 2 }}>
                          Winner
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Group info if any */}
                {confirmation.network_name && (
                  <View style={[styles.groupInfo, { borderTopColor: colors.border }]}>
                    <Ionicons name="people" size={14} color={colors.textSecondary} />
                    <Text size="sm" style={{ color: colors.textSecondary, marginLeft: 4 }}>
                      Posted to {confirmation.network_name}
                    </Text>
                  </View>
                )}
              </View>

              {/* Deadline warning */}
              <View style={[styles.deadlineCard, { backgroundColor: isDark ? '#3A2A00' : '#FFF9E6', borderColor: '#FFB800' }]}>
                <Ionicons name="time-outline" size={20} color="#FFB800" />
                <View style={styles.deadlineInfo}>
                  <Text size="sm" weight="medium" style={{ color: isDark ? '#FFD54F' : '#8B6914' }}>
                    {hoursRemaining}h {minutesRemaining}m remaining to respond
                  </Text>
                  <Text size="xs" style={{ color: isDark ? '#C4A84D' : '#A67F00' }}>
                    Score will be auto-confirmed after deadline
                  </Text>
                </View>
              </View>

              {/* Dispute reason input */}
              {showDisputeReason && (
                <View style={styles.disputeReasonContainer}>
                  <Text size="sm" weight="medium" style={{ color: colors.text, marginBottom: 8 }}>
                    Why are you disputing this score? (optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.disputeInput,
                      {
                        backgroundColor: colors.cardBackground,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Enter reason..."
                    placeholderTextColor={colors.textMuted}
                    value={disputeReason}
                    onChangeText={setDisputeReason}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              {!showDisputeReason ? (
                <>
                  <Button
                    variant="outline"
                    onPress={handleDispute}
                    disabled={isLoading}
                    style={styles.disputeButton}
                  >
                    Dispute
                  </Button>
                  <Button
                    variant="primary"
                    onPress={handleConfirm}
                    disabled={isLoading}
                    style={styles.confirmButton}
                  >
                    {isLoading ? 'Processing...' : 'Confirm Score'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onPress={() => setShowDisputeReason(false)}
                    disabled={isLoading}
                    style={styles.disputeButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onPress={handleDispute}
                    disabled={isLoading}
                    style={[styles.confirmButton, { backgroundColor: '#DC3545' }]}
                  >
                    {isLoading ? 'Processing...' : 'Submit Dispute'}
                  </Button>
                </>
              )}
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  submitterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  submitterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  submitterInfo: {
    marginLeft: 12,
    flex: 1,
  },
  matchCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sportIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  teamColumn: {
    alignItems: 'center',
    flex: 1,
  },
  vsContainer: {
    paddingHorizontal: 16,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  deadlineInfo: {
    marginLeft: 12,
    flex: 1,
  },
  disputeReasonContainer: {
    marginBottom: 8,
  },
  disputeInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  disputeButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 2,
  },
});
