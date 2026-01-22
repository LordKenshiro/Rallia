/**
 * Add Score Modal
 *
 * Multi-step modal for adding a played game score.
 * Singles: Find Opponent → Match Details → Match Expectation → Winner & Scores
 * Doubles: Find Opponents → Match Details → Match Expectation → Create Teams → Winner & Scores
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useToast } from '@rallia/shared-components';
import { useThemeStyles } from '../../../../hooks';
import { AddScoreProvider, useAddScore } from './AddScoreContext';
import { FindOpponentStep } from './FindOpponentStep';
import { MatchDetailsStep } from './MatchDetailsStep';
import { MatchExpectationStep } from './MatchExpectationStep';
import { CreateTeamsStep } from './CreateTeamsStep';
import { WinnerScoresStep } from './WinnerScoresStep';
import type { MatchType, AddScoreStep } from './types';
import { useCreatePlayedMatch, type CreatePlayedMatchInput } from '@rallia/shared-hooks';
import { getSportIdByName } from '@rallia/shared-services';
import { useAuth } from '../../../../context/AuthContext';

interface AddScoreModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (matchId: string) => void;
  matchType: MatchType;
  networkId?: string;
}

function AddScoreContent({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess?: (matchId: string) => void;
}) {
  const { colors } = useThemeStyles();
  const { user } = useAuth();
  const toast = useToast();
  const {
    currentStep,
    currentStepIndex,
    totalSteps,
    goToNextStep,
    goToPreviousStep,
    canGoBack,
    formData,
  } = useAddScore();

  const createPlayedMatchMutation = useCreatePlayedMatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = useCallback(() => {
    if (canGoBack) {
      goToPreviousStep();
    } else {
      onClose();
    }
  }, [canGoBack, goToPreviousStep, onClose]);

  // winnerId and sets are passed directly to avoid React state async issues
  const handleSubmit = useCallback(async (
    winnerId: 'team1' | 'team2',
    sets: Array<{ team1Score: number | null; team2Score: number | null }>
  ) => {
    if (!user?.id) {
      toast.error('You must be logged in to submit a score.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get sport ID from name
      const sportName = formData.sport || 'tennis';
      const sportId = await getSportIdByName(sportName);
      
      if (!sportId) {
        toast.error(`Could not find sport: ${sportName}`);
        setIsSubmitting(false);
        return;
      }

      // Get opponent IDs
      const opponentIds = (formData.opponents || []).map((p) => p.id);
      
      // Build team player IDs based on singles vs doubles
      let team1PlayerIds: string[];
      let team2PlayerIds: string[];
      
      if (formData.matchType === 'double' && formData.partner) {
        // Doubles: Team 1 = current user + partner, Team 2 = remaining 2 opponents
        team1PlayerIds = [user.id, formData.partner.id];
        team2PlayerIds = (formData.opponents || [])
          .filter((p) => p.id !== formData.partner?.id)
          .map((p) => p.id);
      } else {
        // Singles: Team 1 = current user, Team 2 = opponent
        team1PlayerIds = [user.id];
        team2PlayerIds = opponentIds;
      }

      // Transform formData to CreatePlayedMatchInput
      // winnerId and sets are used directly from parameters (not formData) to avoid async state issues
      const matchInput: CreatePlayedMatchInput = {
        sportId,
        createdBy: user.id,
        matchDate: formData.matchDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        format: formData.matchType === 'double' ? 'doubles' : 'singles',
        expectation: formData.expectation || 'competitive',
        team1PlayerIds,
        team2PlayerIds,
        winnerId,
        sets: sets
          .filter((s) => s.team1Score !== null && s.team2Score !== null)
          .map((s) => ({
            team1Score: s.team1Score || 0,
            team2Score: s.team2Score || 0,
          })),
        locationName: formData.location,
        networkId: formData.networkId,
      };

      const result = await createPlayedMatchMutation.mutateAsync(matchInput);

      toast.success('Your score has been submitted. Your opponent has 24 hours to confirm.');
      onSuccess?.(result.matchId);
      onClose();
    } catch (error) {
      console.error('Error submitting score:', error);
      toast.error('Failed to submit score. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, user, onSuccess, onClose, createPlayedMatchMutation, toast]);

  const renderStep = () => {
    switch (currentStep) {
      case 'find-opponent':
        return <FindOpponentStep onContinue={goToNextStep} />;
      case 'match-details':
        return <MatchDetailsStep onContinue={goToNextStep} />;
      case 'match-expectation':
        return <MatchExpectationStep onContinue={goToNextStep} />;
      case 'create-teams':
        return <CreateTeamsStep onContinue={goToNextStep} />;
      case 'winner-scores':
        return <WinnerScoresStep onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
      default:
        return null;
    }
  };

  const stepTitles: Record<AddScoreStep, string> = {
    'find-opponent': 'Add Score',
    'match-details': 'Add Score',
    'match-expectation': 'Add Score',
    'create-teams': 'Add Score',
    'winner-scores': 'Add Score',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={canGoBack ? 'arrow-back' : 'close'}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text weight="semibold" size="base" style={{ color: colors.text }}>
          {stepTitles[currentStep]}
        </Text>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Progress indicator - dynamic based on match type */}
      <View style={styles.progressContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              {
                backgroundColor:
                  index <= currentStepIndex ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>

      {/* Step content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        {renderStep()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AddScoreModal({
  visible,
  onClose,
  onSuccess,
  matchType,
  networkId,
}: AddScoreModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <AddScoreProvider initialMatchType={matchType} networkId={networkId}>
        <AddScoreContent onClose={onClose} onSuccess={onSuccess} />
      </AddScoreProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
});
