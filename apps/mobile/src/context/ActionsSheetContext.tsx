/**
 * Actions Sheet Context - Controls the Actions bottom sheet
 *
 * This context provides global control over the Actions bottom sheet,
 * which opens when the center tab button is pressed. The sheet displays
 * different content based on auth state:
 * - Guest: Auth form
 * - Authenticated (not onboarded): Onboarding wizard
 * - Onboarded: Actions wizard (create match, group, etc.)
 *
 * The contentMode state is the single source of truth for what content
 * to display in the sheet, eliminating race conditions.
 */

import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useProfile } from '@rallia/shared-hooks';
import { useAuth } from './AuthContext';
import type { MatchDetailData } from './MatchDetailSheetContext';

// =============================================================================
// TYPES
// =============================================================================

export type ActionsSheetMode = 'auth' | 'onboarding' | 'actions';

interface ActionsSheetContextType {
  /** Open the Actions bottom sheet, computing initial mode based on auth state */
  openSheet: () => void;

  /** Open the Actions bottom sheet in edit mode with pre-filled match data */
  openSheetForEdit: (match: MatchDetailData) => void;

  /** Close the Actions bottom sheet */
  closeSheet: () => void;

  /** Current content mode - single source of truth */
  contentMode: ActionsSheetMode;

  /** Directly set the content mode (used for transitions like auth → onboarding) */
  setContentMode: (mode: ActionsSheetMode) => void;

  /** Snap to a specific index (0 = first snap point, 1 = second, etc.) */
  snapToIndex: (index: number) => void;

  /** Reference to the bottom sheet for direct control if needed */
  sheetRef: React.RefObject<BottomSheetModal | null>;

  /** Refresh the profile data (call after onboarding completes to update state) */
  refreshProfile: () => Promise<void>;

  /** The match being edited (null if creating new match) */
  editMatchData: MatchDetailData | null;

  /** Clear the edit match data (call when closing sheet or completing edit) */
  clearEditMatch: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ActionsSheetContext = createContext<ActionsSheetContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface ActionsSheetProviderProps {
  children: ReactNode;
}

export const ActionsSheetProvider: React.FC<ActionsSheetProviderProps> = ({ children }) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const { session } = useAuth();
  const { profile, loading: profileLoading, refetch } = useProfile();

  // Content mode state - single source of truth
  const [contentMode, setContentMode] = useState<ActionsSheetMode>('auth');

  // Edit match state - holds match data when editing
  const [editMatchData, setEditMatchData] = useState<MatchDetailData | null>(null);

  // Refetch profile when auth state changes
  useEffect(() => {
    if (session?.user) {
      refetch();
    }
  }, [session?.user?.id, refetch]);

  /**
   * Compute the appropriate mode based on current auth/profile state
   */
  const computeInitialMode = useCallback((): ActionsSheetMode => {
    // No session = guest user = show auth
    if (!session?.user) {
      return 'auth';
    }

    // Session exists but profile is still loading or not available = show onboarding
    // This prevents showing actions before we know the user's onboarding status
    if (profileLoading || !profile) {
      return 'onboarding';
    }

    // Session exists but onboarding not completed = show onboarding
    if (!profile.onboarding_completed) {
      return 'onboarding';
    }

    // Fully onboarded = show actions
    return 'actions';
  }, [session?.user, profile, profileLoading]);

  /**
   * Open the sheet, computing the appropriate initial mode
   */
  const openSheet = useCallback(() => {
    setEditMatchData(null); // Clear any previous edit data
    const mode = computeInitialMode();
    setContentMode(mode);
    sheetRef.current?.present();
  }, [computeInitialMode]);

  /**
   * Open the sheet in edit mode with pre-filled match data
   */
  const openSheetForEdit = useCallback((match: MatchDetailData) => {
    setEditMatchData(match);
    setContentMode('actions'); // Always show actions mode when editing
    sheetRef.current?.present();
  }, []);

  /**
   * Clear the edit match data
   */
  const clearEditMatch = useCallback(() => {
    setEditMatchData(null);
  }, []);

  /**
   * Close the sheet
   */
  const closeSheet = useCallback(() => {
    sheetRef.current?.dismiss();
    // Clear edit data after a delay to allow dismiss animation
    setTimeout(() => {
      setEditMatchData(null);
    }, 300);
  }, []);

  /**
   * Snap to a specific index
   */
  const snapToIndex = useCallback((index: number) => {
    sheetRef.current?.snapToIndex(index);
  }, []);

  /**
   * Refresh the profile data (call after onboarding completes)
   */
  const refreshProfile = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const contextValue: ActionsSheetContextType = {
    openSheet,
    openSheetForEdit,
    closeSheet,
    contentMode,
    setContentMode,
    snapToIndex,
    sheetRef,
    refreshProfile,
    editMatchData,
    clearEditMatch,
  };

  return (
    <ActionsSheetContext.Provider value={contextValue}>{children}</ActionsSheetContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access the Actions sheet controls.
 *
 * @example
 * const { openSheet, closeSheet, contentMode, setContentMode } = useActionsSheet();
 *
 * // Open the sheet when center tab is pressed
 * <TouchableOpacity onPress={openSheet}>
 *   <Icon name="add-circle" />
 * </TouchableOpacity>
 *
 * // Transition from auth to onboarding after successful auth
 * const handleAuthSuccess = (needsOnboarding: boolean) => {
 *   if (needsOnboarding) {
 *     setContentMode('onboarding');
 *   } else {
 *     closeSheet();
 *   }
 * };
 */
export const useActionsSheet = (): ActionsSheetContextType => {
  const context = useContext(ActionsSheetContext);

  if (context === undefined) {
    throw new Error('useActionsSheet must be used within an ActionsSheetProvider');
  }

  return context;
};
