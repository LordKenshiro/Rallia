/**
 * Match Detail Sheet Context - Controls the Match Detail bottom sheet
 *
 * This context provides global control over the Match Detail bottom sheet,
 * which opens when a match card is pressed. The sheet displays comprehensive
 * match information and action buttons.
 */

import React, { createContext, useContext, useRef, useCallback, useState, ReactNode } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { MatchWithDetails } from '@rallia/shared-types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Extended match type that includes distance information from nearby searches
 * and all the additional fields that exist at runtime but aren't in TypeScript types yet.
 *
 * Note: The Supabase types are out of sync with the actual database schema.
 * These fields exist in the database but haven't been regenerated in types.
 */
export interface MatchDetailData extends MatchWithDetails {
  /** Distance in meters from the user's location, returned by the search_matches_nearby RPC */
  distance_meters?: number | null;
}

interface MatchDetailSheetContextType {
  /** Open the Match Detail bottom sheet with the specified match */
  openSheet: (match: MatchDetailData) => void;

  /** Close the Match Detail bottom sheet */
  closeSheet: () => void;

  /** The currently selected match to display */
  selectedMatch: MatchDetailData | null;

  /** Reference to the bottom sheet for direct control if needed */
  sheetRef: React.RefObject<BottomSheetModal | null>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const MatchDetailSheetContext = createContext<MatchDetailSheetContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface MatchDetailSheetProviderProps {
  children: ReactNode;
}

export const MatchDetailSheetProvider: React.FC<MatchDetailSheetProviderProps> = ({ children }) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchDetailData | null>(null);

  /**
   * Open the sheet with the specified match
   */
  const openSheet = useCallback((match: MatchDetailData) => {
    setSelectedMatch(match);
    sheetRef.current?.present();
  }, []);

  /**
   * Close the sheet and clear the selected match
   */
  const closeSheet = useCallback(() => {
    sheetRef.current?.dismiss();
    // Clear selected match after a delay to allow dismiss animation
    setTimeout(() => {
      setSelectedMatch(null);
    }, 300);
  }, []);

  const contextValue: MatchDetailSheetContextType = {
    openSheet,
    closeSheet,
    selectedMatch,
    sheetRef,
  };

  return (
    <MatchDetailSheetContext.Provider value={contextValue}>
      {children}
    </MatchDetailSheetContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access the Match Detail sheet controls.
 *
 * @example
 * const { openSheet, closeSheet, selectedMatch } = useMatchDetailSheet();
 *
 * // Open the sheet when a match card is pressed
 * <MatchCard
 *   match={match}
 *   onPress={() => openSheet(match)}
 * />
 */
export const useMatchDetailSheet = (): MatchDetailSheetContextType => {
  const context = useContext(MatchDetailSheetContext);

  if (context === undefined) {
    throw new Error('useMatchDetailSheet must be used within a MatchDetailSheetProvider');
  }

  return context;
};
