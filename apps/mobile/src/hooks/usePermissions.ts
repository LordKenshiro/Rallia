import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@rallia/shared-services';

// Storage keys for tracking if user has been asked
const PERMISSION_ASKED_KEYS = {
  notifications: '@rallia/permission_asked_notifications',
  location: '@rallia/permission_asked_location',
};

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

interface PermissionsState {
  notifications: PermissionStatus;
  location: PermissionStatus;
  notificationsAsked: boolean;
  locationAsked: boolean;
  loading: boolean;
}

interface UsePermissionsReturn extends PermissionsState {
  requestNotificationPermission: () => Promise<boolean>;
  requestLocationPermission: () => Promise<boolean>;
  markNotificationsAsked: () => Promise<void>;
  markLocationAsked: () => Promise<void>;
  checkPermissions: () => Promise<void>;
  shouldShowNotificationOverlay: boolean;
  shouldShowLocationOverlay: boolean;
}

/**
 * Hook to manage native device permissions for location.
 *
 * Features:
 * - Checks current permission status from the OS
 * - Tracks if user has been asked (to avoid re-showing overlays)
 * - Provides methods to request actual native permissions
 * - Determines if permission overlays should be shown
 */
export const usePermissions = (): UsePermissionsReturn => {
  const [state, setState] = useState<PermissionsState>({
    notifications: 'undetermined',
    location: 'undetermined',
    notificationsAsked: false,
    locationAsked: false,
    loading: true,
  });

  /**
   * Check current permission status from OS and AsyncStorage
   */
  const checkPermissions = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      // Check notification permission status from OS
      const notificationStatus = await Notifications.getPermissionsAsync();
      let notificationPermission: PermissionStatus = 'undetermined';
      if (notificationStatus.granted) {
        notificationPermission = 'granted';
      } else if (notificationStatus.canAskAgain === false) {
        notificationPermission = 'denied';
      }

      // Check location permission status from OS
      const locationStatus = await Location.getForegroundPermissionsAsync();
      let locationPermission: PermissionStatus = 'undetermined';
      if (locationStatus.granted) {
        locationPermission = 'granted';
      } else if (locationStatus.canAskAgain === false) {
        locationPermission = 'denied';
      }

      // Check if user has been asked before (stored in AsyncStorage)
      const [notificationsAskedStr, locationAskedStr] = await Promise.all([
        AsyncStorage.getItem(PERMISSION_ASKED_KEYS.notifications),
        AsyncStorage.getItem(PERMISSION_ASKED_KEYS.location),
      ]);

      const notificationsAsked = notificationsAskedStr === 'true';
      const locationAsked = locationAskedStr === 'true';

      Logger.debug('permissions_checked', {
        notifications: notificationPermission,
        location: locationPermission,
        notificationsAsked,
        locationAsked,
      });

      setState({
        notifications: notificationPermission,
        location: locationPermission,
        notificationsAsked,
        locationAsked,
        loading: false,
      });
    } catch (error) {
      Logger.error('Failed to check permissions', error as Error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * Request notification permission from the OS
   */
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    try {
      Logger.logUserAction('request_notification_permission', {});
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';

      setState(prev => ({
        ...prev,
        notifications: granted ? 'granted' : 'denied',
        notificationsAsked: true,
      }));

      // Mark as asked in AsyncStorage
      await AsyncStorage.setItem(PERMISSION_ASKED_KEYS.notifications, 'true');

      Logger.logUserAction('notification_permission_result', { granted });
      return granted;
    } catch (error) {
      Logger.error('Failed to request notification permission', error as Error);
      return false;
    }
  }, []);

  /**
   * Request location permission from the OS
   */
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      Logger.logUserAction('request_location_permission', {});
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';

      setState(prev => ({
        ...prev,
        location: granted ? 'granted' : 'denied',
        locationAsked: true,
      }));

      // Mark as asked in AsyncStorage
      await AsyncStorage.setItem(PERMISSION_ASKED_KEYS.location, 'true');

      Logger.logUserAction('location_permission_result', { granted });
      return granted;
    } catch (error) {
      Logger.error('Failed to request location permission', error as Error);
      return false;
    }
  }, []);

  /**
   * Mark notifications as asked without requesting (for "Refuse" action)
   */
  const markNotificationsAsked = useCallback(async () => {
    setState(prev => ({ ...prev, notificationsAsked: true }));
    await AsyncStorage.setItem(PERMISSION_ASKED_KEYS.notifications, 'true');
    Logger.logUserAction('notification_permission_refused', {});
  }, []);

  /**
   * Mark location as asked without requesting (for "Refuse" action)
   */
  const markLocationAsked = useCallback(async () => {
    setState(prev => ({ ...prev, locationAsked: true }));
    await AsyncStorage.setItem(PERMISSION_ASKED_KEYS.location, 'true');
    Logger.logUserAction('location_permission_refused', {});
  }, []);

  // Check permissions on mount (deferred to avoid setState-in-effect lint)
  useEffect(() => {
    const id = setTimeout(() => {
      checkPermissions();
    }, 0);
    return () => clearTimeout(id);
  }, [checkPermissions]);

  // Determine if overlays should be shown
  // Only show if:
  // 1. Permission is not already granted
  // 2. User has not been asked before in this app installation
  const shouldShowNotificationOverlay =
    !state.loading && state.notifications !== 'granted' && !state.notificationsAsked;

  const shouldShowLocationOverlay =
    !state.loading && state.location !== 'granted' && !state.locationAsked;

  return {
    ...state,
    requestNotificationPermission,
    requestLocationPermission,
    markNotificationsAsked,
    markLocationAsked,
    checkPermissions,
    shouldShowNotificationOverlay,
    shouldShowLocationOverlay,
  };
};

export default usePermissions;
