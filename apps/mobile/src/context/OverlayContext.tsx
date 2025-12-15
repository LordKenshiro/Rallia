/**
 * OverlayContext - Permission overlay management
 *
 * This context only manages permission overlays (Location, Calendar).
 * Auth and onboarding flows are handled by ActionsSheetContext via
 * the AuthWizard and OnboardingWizard components.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { Logger } from '@rallia/shared-services';
import { LocationPermissionOverlay, CalendarAccessOverlay } from '@rallia/shared-components';
import { ANIMATION_DELAYS } from '../constants';
import { usePermissions } from '../hooks';

// =============================================================================
// TYPES
// =============================================================================

interface OverlayContextType {
  /** Notify that we're on home screen (safe to show permission overlays) */
  setOnHomeScreen: (isOnHome: boolean) => void;
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
    markLocationAsked,
    markCalendarAsked,
    loading: permissionsLoading,
  } = usePermissions();

  // ==========================================================================
  // PERMISSION OVERLAYS STATE
  // ==========================================================================
  const [showLocationPermission, setShowLocationPermission] = useState(false);
  const [showCalendarAccess, setShowCalendarAccess] = useState(false);
  const [isOnHomeScreen, setIsOnHomeScreen] = useState(false);

  // ==========================================================================
  // AUTO-SHOW PERMISSIONS WHEN ON HOME SCREEN
  // ==========================================================================
  useEffect(() => {
    // Only show permission overlays when:
    // 1. We're on the Home screen (not Splash)
    // 2. Permissions are loaded
    // 3. User hasn't been asked yet AND permission not already granted
    if (isOnHomeScreen && !permissionsLoading) {
      if (shouldShowLocationOverlay && !showLocationPermission && !showCalendarAccess) {
        const timer = setTimeout(() => {
          Logger.logNavigation('show_overlay', {
            overlay: 'LocationPermissionOverlay',
            trigger: 'auto_home',
          });
          setShowLocationPermission(true);
        }, 500); // Small delay to let the UI settle

        return () => clearTimeout(timer);
      }
    }
  }, [
    isOnHomeScreen,
    permissionsLoading,
    shouldShowLocationOverlay,
    showLocationPermission,
    showCalendarAccess,
  ]);

  // ==========================================================================
  // PERMISSION HANDLERS (with native permission requests)
  // ==========================================================================

  const handleAcceptLocation = useCallback(async () => {
    // Request actual native location permission
    const granted = await requestLocationPermission();
    Logger.logUserAction('permission_result', { permission: 'location', granted });

    setShowLocationPermission(false);

    // Show calendar overlay if needed
    setTimeout(() => {
      if (shouldShowCalendarOverlay) {
        setShowCalendarAccess(true);
      }
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  }, [requestLocationPermission, shouldShowCalendarOverlay]);

  const handleRefuseLocation = useCallback(async () => {
    // Mark as asked but don't request native permission
    await markLocationAsked();
    Logger.logUserAction('permission_refused', { permission: 'location' });

    setShowLocationPermission(false);

    // Show calendar overlay if needed
    setTimeout(() => {
      if (shouldShowCalendarOverlay) {
        setShowCalendarAccess(true);
      }
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  }, [markLocationAsked, shouldShowCalendarOverlay]);

  const handleAcceptCalendar = useCallback(async () => {
    // Request actual native calendar permission
    const granted = await requestCalendarPermission();
    Logger.logUserAction('permission_result', { permission: 'calendar', granted });
    setShowCalendarAccess(false);
  }, [requestCalendarPermission]);

  const handleRefuseCalendar = useCallback(async () => {
    // Mark as asked but don't request native permission
    await markCalendarAsked();
    Logger.logUserAction('permission_refused', { permission: 'calendar' });
    setShowCalendarAccess(false);
  }, [markCalendarAsked]);

  // ==========================================================================
  // HOME SCREEN NOTIFICATION
  // ==========================================================================

  const handleSetOnHomeScreen = useCallback((isOnHome: boolean) => {
    Logger.logNavigation('home_screen_state', { isOnHome });
    setIsOnHomeScreen(isOnHome);
  }, []);

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const contextValue: OverlayContextType = {
    setOnHomeScreen: handleSetOnHomeScreen,
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <OverlayContext.Provider value={contextValue}>
      {children}

      {/* Location Permission Overlay */}
      <LocationPermissionOverlay
        visible={showLocationPermission}
        onAccept={handleAcceptLocation}
        onRefuse={handleRefuseLocation}
      />

      {/* Calendar Access Overlay */}
      <CalendarAccessOverlay
        visible={showCalendarAccess}
        onAccept={handleAcceptCalendar}
        onRefuse={handleRefuseCalendar}
      />
    </OverlayContext.Provider>
  );
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
