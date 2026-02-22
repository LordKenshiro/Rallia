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

export type ActionsSheetMode = 'auth' | 'onboarding' | 'actions' | 'loading';

interface ActionsSheetContextType {
  /** Open the Actions bottom sheet, computing initial mode based on auth state */
  openSheet: () => void;

  /** Open the Actions bottom sheet in edit mode with pre-filled match data */
  openSheetForEdit: (match: MatchDetailData) => void;

  /** Open the Actions bottom sheet directly to match creation (skips actions menu) */
  openSheetForMatchCreation: () => void;

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

  /** Flag to indicate we should open directly to match creation wizard */
  shouldOpenMatchCreation: boolean;

  /** Clear the shouldOpenMatchCreation flag after it's been consumed */
  clearMatchCreationFlag: () => void;
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

  // Flag to open directly to match creation wizard
  const [shouldOpenMatchCreation, setShouldOpenMatchCreation] = useState(false);

  // Refetch profile when auth state changes
  // Refetch profile when auth state changes
  useEffect(() => {
    if (session?.user) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, refetch]);

  /**
   * Compute the appropriate mode based on current auth/profile state
   */
  const computeInitialMode = useCallback((): ActionsSheetMode => {
    // No session = guest user = show auth
    if (!session?.user) {
      return 'auth';
    }

    // Session exists but profile is still loading = show loading (skeleton)
    // Do not show onboarding until we know the user's onboarding status
    if (profileLoading) {
      return 'loading';
    }

    // Profile loaded but no profile row = new user, show onboarding
    if (!profile) {
      return 'onboarding';
    }

    // Session exists but onboarding not completed = show onboarding
    if (!profile.onboarding_completed) {
      return 'onboarding';
    }

    // Fully onboarded = show actions
    return 'actions';
  }, [session?.user, profile, profileLoading]);

  // When sheet is in loading mode and profile finishes loading, transition to the correct mode
  useEffect(() => {
    if (contentMode === 'loading' && !profileLoading) {
      setContentMode(profile?.onboarding_completed ? 'actions' : 'onboarding');
    }
  }, [contentMode, profileLoading, profile?.onboarding_completed]);

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
    setShouldOpenMatchCreation(false);
    setContentMode('actions'); // Always show actions mode when editing
    sheetRef.current?.present();
  }, []);

  /**
   * Open the sheet directly to match creation wizard (skips actions menu)
   */
  const openSheetForMatchCreation = useCallback(() => {
    const mode = computeInitialMode();

    // If user is not authenticated or not onboarded, show the appropriate screen first
    if (mode !== 'actions') {
      setContentMode(mode);
      setShouldOpenMatchCreation(false);
      sheetRef.current?.present();
      return;
    }

    // User is authenticated and onboarded - open directly to match creation
    setEditMatchData(null);
    setShouldOpenMatchCreation(true);
    setContentMode('actions');
    sheetRef.current?.present();
  }, [computeInitialMode]);

  /**
   * Clear the edit match data
   */
  const clearEditMatch = useCallback(() => {
    setEditMatchData(null);
  }, []);

  /**
   * Clear the shouldOpenMatchCreation flag (called by ActionsBottomSheet after consuming it)
   */
  const clearMatchCreationFlag = useCallback(() => {
    setShouldOpenMatchCreation(false);
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
    openSheetForMatchCreation,
    closeSheet,
    contentMode,
    setContentMode,
    snapToIndex,
    sheetRef,
    refreshProfile,
    editMatchData,
    clearEditMatch,
    shouldOpenMatchCreation,
    clearMatchCreationFlag,
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
