/**
 * OverlayContext - Permission and first-time overlay management
 *
 * This context manages:
 * 1. First-time sport selection overlay (shown after splash for new users)
 * 2. Requesting native permissions (Location, Calendar) after overlays complete
 *
 * Flow: Splash -> Sport Selection (first-time only) -> Permission requests
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@rallia/shared-services';
import { ANIMATION_DELAYS } from '../constants';
import { usePermissions } from '../hooks';

// =============================================================================
// CONSTANTS
// =============================================================================

const SPORT_SELECTION_SHOWN_KEY = '@rallia/sport-selection-shown';

// =============================================================================
// TYPES
// =============================================================================

/** Sport type for the overlay (simplified from database type) */
export interface OverlaySport {
  id: string;
  name: string;
  display_name: string;
  icon_url?: string | null;
}

interface OverlayContextType {
  /** Notify that we're on home screen (safe to show permission overlays) */
  setOnHomeScreen: (isOnHome: boolean) => void;
  /** Notify that splash animation has completed */
  setSplashComplete: (complete: boolean) => void;
  /** Whether the sport selection overlay should be visible */
  showSportSelectionOverlay: boolean;
  /** Whether splash animation has completed (triggers overlay entrance animation) */
  isSplashComplete: boolean;
  /** Whether sport selection has been completed (or was already done for returning users) */
  isSportSelectionComplete: boolean;
  /** Handle sport selection completion */
  onSportSelectionComplete: (orderedSports: OverlaySport[]) => void;
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
    shouldShowNotificationOverlay,
    shouldShowLocationOverlay,
    shouldShowCalendarOverlay,
    requestNotificationPermission,
    requestLocationPermission,
    requestCalendarPermission,
    loading: permissionsLoading,
  } = usePermissions();

  // ==========================================================================
  // STATE
  // ==========================================================================
  const [, setIsOnHomeScreen] = useState(false);
  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const [showSportSelectionOverlay, setShowSportSelectionOverlay] = useState(false);
  const [isSportSelectionComplete, setIsSportSelectionComplete] = useState(false);
  const [hasCheckedSportSelection, setHasCheckedSportSelection] = useState(false);

  // Track if we've already requested permissions this session
  const hasRequestedPermissions = useRef(false);

  // ==========================================================================
  // CHECK IF SPORT SELECTION OVERLAY SHOULD BE SHOWN
  // Show it immediately for first-time users so it's rendered beneath the splash
  // and visible as soon as splash fades out (no delay between splash and overlay)
  // ==========================================================================
  useEffect(() => {
    const checkSportSelectionStatus = async () => {
      try {
        const hasSeenOverlay = await AsyncStorage.getItem(SPORT_SELECTION_SHOWN_KEY);
        if (hasSeenOverlay === 'true') {
          // User has already completed sport selection
          setIsSportSelectionComplete(true);
          setShowSportSelectionOverlay(false);
        } else {
          // First-time user: show overlay immediately (beneath splash)
          // The splash has zIndex 9999, sport selection has 9998
          // So sport selection renders beneath and is visible when splash fades
          Logger.logNavigation('show_sport_selection_overlay', { trigger: 'first_time_user' });
          setShowSportSelectionOverlay(true);
        }
      } catch (error) {
        Logger.error('Failed to check sport selection status', error as Error);
        // On error, show the overlay to be safe
        setShowSportSelectionOverlay(true);
      }
      setHasCheckedSportSelection(true);
    };

    checkSportSelectionStatus();
  }, []);

  // ==========================================================================
  // REQUEST NATIVE PERMISSIONS AFTER SPORT SELECTION COMPLETES
  // ==========================================================================
  useEffect(() => {
    // Only request permissions when:
    // 1. Splash animation has completed
    // 2. Sport selection is complete (or was already done)
    // 3. Permissions are loaded
    // 4. We haven't already requested this session
    const shouldRequestPermissions =
      isSplashComplete &&
      hasCheckedSportSelection &&
      isSportSelectionComplete &&
      !permissionsLoading &&
      !hasRequestedPermissions.current;

    if (shouldRequestPermissions) {
      hasRequestedPermissions.current = true;

      const requestPermissions = async () => {
        // Small delay to let the UI settle
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DELAYS.SHORT_DELAY));

        // Request notification permission FIRST (most important for engagement)
        if (shouldShowNotificationOverlay) {
          Logger.logNavigation('request_native_permission', {
            permission: 'notifications',
            trigger: 'post_sport_selection',
          });
          const notificationGranted = await requestNotificationPermission();
          Logger.logUserAction('permission_result', {
            permission: 'notifications',
            granted: notificationGranted,
          });

          // Small delay between permission dialogs
          await new Promise(resolve => setTimeout(resolve, ANIMATION_DELAYS.OVERLAY_STAGGER));
        }

        // Request location permission if needed
        if (shouldShowLocationOverlay) {
          Logger.logNavigation('request_native_permission', {
            permission: 'location',
            trigger: 'post_sport_selection',
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
            trigger: 'post_sport_selection',
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
    hasCheckedSportSelection,
    isSportSelectionComplete,
    permissionsLoading,
    shouldShowNotificationOverlay,
    shouldShowLocationOverlay,
    shouldShowCalendarOverlay,
    requestNotificationPermission,
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

  const handleSportSelectionComplete = useCallback(async (orderedSports: OverlaySport[]) => {
    Logger.logUserAction('sport_selection_complete', {
      sportsCount: orderedSports.length,
      sports: orderedSports.map(s => s.name),
      primarySport: orderedSports[0]?.name,
    });

    // Hide the overlay
    setShowSportSelectionOverlay(false);

    // Mark as shown in AsyncStorage
    try {
      await AsyncStorage.setItem(SPORT_SELECTION_SHOWN_KEY, 'true');
    } catch (error) {
      Logger.error('Failed to save sport selection status', error as Error);
    }

    // Mark sport selection as complete (will trigger permission requests)
    setIsSportSelectionComplete(true);
  }, []);

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const contextValue: OverlayContextType = {
    setOnHomeScreen: handleSetOnHomeScreen,
    setSplashComplete: handleSetSplashComplete,
    showSportSelectionOverlay,
    isSplashComplete,
    isSportSelectionComplete,
    onSportSelectionComplete: handleSportSelectionComplete,
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
