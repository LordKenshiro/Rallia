/**
 * Match Feedback Types
 *
 * Types for the post-match feedback wizard UI and mutations.
 * These are UI view models and input types, not database row types.
 */

import type { CancellationReasonEnum, MatchOutcomeEnum } from './database';

// ============================================
// MATCH OUTCOME (INTRO STEP)
// ============================================

/**
 * Input for updating match outcome on a participant record.
 * Used when a reviewer declares whether the match happened or was cancelled.
 */
export interface MatchOutcomeInput {
  /** The match ID */
  matchId: string;
  /** The match_participant.id for the reviewer */
  participantId: string;
  /** Whether the match was played or mutually cancelled */
  outcome: MatchOutcomeEnum;
  /** Reason for cancellation (only if outcome is 'mutual_cancel') */
  cancellationReason?: CancellationReasonEnum;
  /** Free text notes (only if cancellationReason is 'other') */
  cancellationNotes?: string;
}

/**
 * Result from submitting match outcome.
 */
export interface MatchOutcomeResult {
  /** Whether the update was successful */
  success: boolean;
  /** The outcome that was set */
  outcome: MatchOutcomeEnum;
  /** Whether feedback is now complete (true if cancelled) */
  feedbackCompleted: boolean;
}

// ============================================
// OPPONENT FEEDBACK
// ============================================

/**
 * Input for submitting feedback about a single opponent.
 */
export interface MatchFeedbackInput {
  /** The match ID */
  matchId: string;
  /** The player ID of the reviewer (who is giving feedback) */
  reviewerId: string;
  /** The player ID of the opponent (who is receiving feedback) */
  opponentId: string;
  /** Whether the opponent showed up */
  showedUp: boolean;
  /** Whether the opponent was late (10+ min) - only if showedUp is true */
  wasLate?: boolean;
  /** Star rating 1-5 - only if showedUp is true */
  starRating?: number;
  /** Optional comments */
  comments?: string;
}

/**
 * Result from submitting opponent feedback.
 */
export interface MatchFeedbackResult {
  /** Whether the insert was successful */
  success: boolean;
  /** The created feedback record ID */
  feedbackId: string;
  /** Whether all opponents have now been rated */
  allOpponentsRated: boolean;
}

// ============================================
// WIZARD UI TYPES
// ============================================

/**
 * Opponent data for displaying in the feedback wizard.
 * Contains the info needed to render the opponent header and track feedback state.
 */
export interface OpponentForFeedback {
  /** The match_participant.id */
  participantId: string;
  /** The player.id */
  playerId: string;
  /** Display name (first name or display_name) */
  name: string;
  /** Full name for accessibility */
  fullName: string;
  /** Profile picture URL */
  avatarUrl?: string | null;
  /** Whether this opponent already has feedback from this reviewer */
  hasExistingFeedback: boolean;
}

/**
 * Data passed to the feedback sheet when opening.
 */
export interface FeedbackSheetData {
  /** The match ID */
  matchId: string;
  /** The reviewer's player ID */
  reviewerId: string;
  /** The reviewer's match_participant.id */
  participantId: string;
  /** List of opponents to provide feedback for */
  opponents: OpponentForFeedback[];
  /** IDs of opponents already rated (for resuming partial feedback) */
  alreadyRatedOpponentIds: string[];
}

/**
 * Form state for a single opponent's feedback.
 */
export interface OpponentFeedbackFormState {
  /** Whether the opponent showed up (default: true) */
  showedUp: boolean;
  /** Whether the opponent was late */
  wasLate: boolean;
  /** Star rating (1-5, undefined if not set) */
  starRating?: number;
  /** Optional comments */
  comments: string;
}

/**
 * Options for the useMatchFeedback hook.
 */
export interface UseMatchFeedbackOptions {
  /** Callback when outcome submission succeeds */
  onOutcomeSuccess?: (result: MatchOutcomeResult) => void;
  /** Callback when outcome submission fails */
  onOutcomeError?: (error: Error) => void;
  /** Callback when feedback submission succeeds */
  onFeedbackSuccess?: (result: MatchFeedbackResult) => void;
  /** Callback when feedback submission fails */
  onFeedbackError?: (error: Error) => void;
}

// ============================================
// CANCELLATION REASON LABELS
// ============================================

/**
 * Display labels for cancellation reasons.
 * Keys match CancellationReasonEnum values.
 */
export const CANCELLATION_REASON_LABELS: Record<CancellationReasonEnum, string> = {
  weather: 'Weather conditions',
  court_unavailable: 'Court unavailable',
  emergency: 'Personal emergency',
  other: 'Other reason',
};

/**
 * Icons for cancellation reasons (Ionicons names).
 */
export const CANCELLATION_REASON_ICONS: Record<CancellationReasonEnum, string> = {
  weather: 'rainy-outline',
  court_unavailable: 'close-circle-outline',
  emergency: 'warning-outline',
  other: 'chatbox-ellipses-outline',
};
