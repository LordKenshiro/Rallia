/**
 * OverlayContext - Permission management
 *
 * This context manages requesting native permissions (Location, Calendar)
 * after the splash animation completes. It uses native OS permission dialogs
 * directly instead of custom overlays.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { Logger } from '@rallia/shared-services';
import { ANIMATION_DELAYS } from '../constants';
import { usePermissions } from '../hooks';

// =============================================================================
// TYPES
// =============================================================================

interface OverlayContextType {
  /** Notify that we're on home screen (safe to show permission overlays) */
  setOnHomeScreen: (isOnHome: boolean) => void;
  /** Notify that splash animation has completed */
  setSplashComplete: (complete: boolean) => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface OverlayProviderProps {
  children: ReactNode;
}

export const OverlayProvider: React.FC<OverlayProviderProps> = ({ children }) => {
  // Permission handling
  const {
    shouldShowLocationOverlay,
    shouldShowCalendarOverlay,
    requestLocationPermission,
    requestCalendarPermission,
    loading: permissionsLoading,
  } = usePermissions();

  // ==========================================================================
  // STATE
  // ==========================================================================
  const [isOnHomeScreen, setIsOnHomeScreen] = useState(false);
  const [isSplashComplete, setIsSplashComplete] = useState(false);

  // Track if we've already requested permissions this session
  const hasRequestedPermissions = useRef(false);

  // ==========================================================================
  // REQUEST NATIVE PERMISSIONS AFTER SPLASH COMPLETES
  // ==========================================================================
  useEffect(() => {
    // Only request permissions when:
    // 1. Splash animation has completed
    // 2. Permissions are loaded
    // 3. We haven't already requested this session
    if (isSplashComplete && !permissionsLoading && !hasRequestedPermissions.current) {
      hasRequestedPermissions.current = true;

      const requestPermissions = async () => {
        // Small delay after splash to let the UI settle
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DELAYS.SHORT_DELAY));

        // Request location permission if needed
        if (shouldShowLocationOverlay) {
          Logger.logNavigation('request_native_permission', {
            permission: 'location',
            trigger: 'post_splash',
          });
          const locationGranted = await requestLocationPermission();
          Logger.logUserAction('permission_result', {
            permission: 'location',
            granted: locationGranted,
          });

          // Small delay between permission dialogs
          await new Promise(resolve => setTimeout(resolve, ANIMATION_DELAYS.OVERLAY_STAGGER));
        }

        // Request calendar permission if needed
        if (shouldShowCalendarOverlay) {
          Logger.logNavigation('request_native_permission', {
            permission: 'calendar',
            trigger: 'post_splash',
          });
          const calendarGranted = await requestCalendarPermission();
          Logger.logUserAction('permission_result', {
            permission: 'calendar',
            granted: calendarGranted,
          });
        }
      };

      requestPermissions();
    }
  }, [
    isSplashComplete,
    permissionsLoading,
    shouldShowLocationOverlay,
    shouldShowCalendarOverlay,
    requestLocationPermission,
    requestCalendarPermission,
  ]);

  // ==========================================================================
  // STATE HANDLERS
  // ==========================================================================

  const handleSetOnHomeScreen = useCallback((isOnHome: boolean) => {
    Logger.logNavigation('home_screen_state', { isOnHome });
    setIsOnHomeScreen(isOnHome);
  }, []);

  const handleSetSplashComplete = useCallback((complete: boolean) => {
    Logger.logNavigation('splash_complete', { complete });
    setIsSplashComplete(complete);
  }, []);

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const contextValue: OverlayContextType = {
    setOnHomeScreen: handleSetOnHomeScreen,
    setSplashComplete: handleSetSplashComplete,
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return <OverlayContext.Provider value={contextValue}>{children}</OverlayContext.Provider>;
};

// =============================================================================
// HOOK
// =============================================================================

export const useOverlay = (): OverlayContextType => {
  const context = useContext(OverlayContext);
  if (context === undefined) {
    throw new Error('useOverlay must be used within an OverlayProvider');
  }
  return context;
};

export default OverlayContext;
