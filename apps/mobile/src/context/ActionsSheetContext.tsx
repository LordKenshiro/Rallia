/**
 * Actions Sheet Context - Controls the Actions bottom sheet
 *
 * This context provides global control over the Actions bottom sheet,
 * which opens when the center tab button is pressed. The sheet displays
 * different content based on auth state:
 * - Guest: Auth form
 * - Authenticated (not onboarded): Onboarding wizard
 * - Onboarded: Actions wizard (create match, group, etc.)
 */

import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

// =============================================================================
// TYPES
// =============================================================================

export type ActionsSheetMode = 'auth' | 'onboarding' | 'actions';

interface ActionsSheetContextType {
  /** Open the Actions bottom sheet */
  openSheet: () => void;

  /** Close the Actions bottom sheet */
  closeSheet: () => void;

  /** Snap to a specific index (0 = first snap point, 1 = second, etc.) */
  snapToIndex: (index: number) => void;

  /** Reference to the bottom sheet for direct control if needed */
  sheetRef: React.RefObject<BottomSheetModal | null>;
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

  const openSheet = useCallback(() => {
    sheetRef.current?.present();
  }, []);

  const closeSheet = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const snapToIndex = useCallback((index: number) => {
    sheetRef.current?.snapToIndex(index);
  }, []);

  const contextValue: ActionsSheetContextType = {
    openSheet,
    closeSheet,
    snapToIndex,
    sheetRef,
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
 * const { openSheet, closeSheet } = useActionsSheet();
 *
 * // Open the sheet when center tab is pressed
 * <TouchableOpacity onPress={openSheet}>
 *   <Icon name="add-circle" />
 * </TouchableOpacity>
 */
export const useActionsSheet = (): ActionsSheetContextType => {
  const context = useContext(ActionsSheetContext);

  if (context === undefined) {
    throw new Error('useActionsSheet must be used within an ActionsSheetProvider');
  }

  return context;
};
