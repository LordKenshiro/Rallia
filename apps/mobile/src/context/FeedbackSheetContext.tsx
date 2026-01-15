/**
 * Feedback Sheet Context - Controls the Match Feedback bottom sheet
 *
 * This context provides global control over the Match Feedback bottom sheet,
 * which opens when a participant wants to provide post-match feedback.
 * It wraps the MatchFeedbackWizard component in a modal presentation.
 */

import React, { createContext, useContext, useRef, useCallback, useState, ReactNode } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { FeedbackSheetData, OpponentForFeedback } from '@rallia/shared-types';

// =============================================================================
// TYPES
// =============================================================================

interface FeedbackSheetContextType {
  /** Open the Feedback bottom sheet with the specified data */
  openSheet: (
    matchId: string,
    reviewerId: string,
    participantId: string,
    opponents: OpponentForFeedback[]
  ) => void;

  /** Close the Feedback bottom sheet */
  closeSheet: () => void;

  /** The current feedback data (null when sheet is closed) */
  feedbackData: FeedbackSheetData | null;

  /** Reference to the bottom sheet for direct control if needed */
  sheetRef: React.RefObject<BottomSheetModal | null>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const FeedbackSheetContext = createContext<FeedbackSheetContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface FeedbackSheetProviderProps {
  children: ReactNode;
}

export const FeedbackSheetProvider: React.FC<FeedbackSheetProviderProps> = ({ children }) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackSheetData | null>(null);

  /**
   * Open the sheet with the specified feedback data
   */
  const openSheet = useCallback(
    (
      matchId: string,
      reviewerId: string,
      participantId: string,
      opponents: OpponentForFeedback[]
    ) => {
      // Filter out opponents who already have feedback
      const alreadyRatedOpponentIds = opponents
        .filter(o => o.hasExistingFeedback)
        .map(o => o.playerId);

      setFeedbackData({
        matchId,
        reviewerId,
        participantId,
        opponents,
        alreadyRatedOpponentIds,
      });
      sheetRef.current?.present();
    },
    []
  );

  /**
   * Close the sheet and clear the feedback data
   */
  const closeSheet = useCallback(() => {
    sheetRef.current?.dismiss();
    // Clear feedback data after a delay to allow dismiss animation
    setTimeout(() => {
      setFeedbackData(null);
    }, 300);
  }, []);

  const contextValue: FeedbackSheetContextType = {
    openSheet,
    closeSheet,
    feedbackData,
    sheetRef,
  };

  return (
    <FeedbackSheetContext.Provider value={contextValue}>{children}</FeedbackSheetContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access the Feedback sheet controls.
 *
 * @example
 * const { openSheet, closeSheet, feedbackData } = useFeedbackSheet();
 *
 * // Open the sheet from MatchDetailSheet
 * const handleFeedback = () => {
 *   openSheet(match.id, playerId, participantId, opponents);
 * };
 */
export const useFeedbackSheet = (): FeedbackSheetContextType => {
  const context = useContext(FeedbackSheetContext);

  if (context === undefined) {
    throw new Error('useFeedbackSheet must be used within a FeedbackSheetProvider');
  }

  return context;
};
