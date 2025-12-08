import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import * as Calendar from 'expo-calendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@rallia/shared-services';

// Storage keys for tracking if user has been asked
const PERMISSION_ASKED_KEYS = {
  location: '@rallia/permission_asked_location',
  calendar: '@rallia/permission_asked_calendar',
};

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

interface PermissionsState {
  location: PermissionStatus;
  calendar: PermissionStatus;
  locationAsked: boolean;
  calendarAsked: boolean;
  loading: boolean;
}

interface UsePermissionsReturn extends PermissionsState {
  requestLocationPermission: () => Promise<boolean>;
  requestCalendarPermission: () => Promise<boolean>;
  markLocationAsked: () => Promise<void>;
  markCalendarAsked: () => Promise<void>;
  checkPermissions: () => Promise<void>;
  shouldShowLocationOverlay: boolean;
  shouldShowCalendarOverlay: boolean;
}

/**
 * Hook to manage native device permissions for location and calendar.
 * 
 * Features:
 * - Checks current permission status from the OS
 * - Tracks if user has been asked (to avoid re-showing overlays)
 * - Provides methods to request actual native permissions
 * - Determines if permission overlays should be shown
 */
export const usePermissions = (): UsePermissionsReturn => {
  const [state, setState] = useState<PermissionsState>({
    location: 'undetermined',
    calendar: 'undetermined',
    locationAsked: false,
    calendarAsked: false,
    loading: true,
  });

  /**
   * Check current permission status from OS and AsyncStorage
   */
  const checkPermissions = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      // Check location permission status from OS
      const locationStatus = await Location.getForegroundPermissionsAsync();
      let locationPermission: PermissionStatus = 'undetermined';
      if (locationStatus.granted) {
        locationPermission = 'granted';
      } else if (locationStatus.canAskAgain === false) {
        locationPermission = 'denied';
      }

      // Check calendar permission status from OS
      const calendarStatus = await Calendar.getCalendarPermissionsAsync();
      let calendarPermission: PermissionStatus = 'undetermined';
      if (calendarStatus.granted) {
        calendarPermission = 'granted';
      } else if (calendarStatus.canAskAgain === false) {
        calendarPermission = 'denied';
      }

      // Check if user has been asked before (stored in AsyncStorage)
      const [locationAskedStr, calendarAskedStr] = await Promise.all([
        AsyncStorage.getItem(PERMISSION_ASKED_KEYS.location),
        AsyncStorage.getItem(PERMISSION_ASKED_KEYS.calendar),
      ]);

      const locationAsked = locationAskedStr === 'true';
      const calendarAsked = calendarAskedStr === 'true';

      Logger.debug('permissions_checked', {
        location: locationPermission,
        calendar: calendarPermission,
        locationAsked,
        calendarAsked,
      });

      setState({
        location: locationPermission,
        calendar: calendarPermission,
        locationAsked,
        calendarAsked,
        loading: false,
      });
    } catch (error) {
      Logger.error('Failed to check permissions', error as Error);
      setState(prev => ({ ...prev, loading: false }));
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
   * Request calendar permission from the OS
   */
  const requestCalendarPermission = useCallback(async (): Promise<boolean> => {
    try {
      Logger.logUserAction('request_calendar_permission', {});
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      const granted = status === 'granted';
      
      setState(prev => ({
        ...prev,
        calendar: granted ? 'granted' : 'denied',
        calendarAsked: true,
      }));

      // Mark as asked in AsyncStorage
      await AsyncStorage.setItem(PERMISSION_ASKED_KEYS.calendar, 'true');

      Logger.logUserAction('calendar_permission_result', { granted });
      return granted;
    } catch (error) {
      Logger.error('Failed to request calendar permission', error as Error);
      return false;
    }
  }, []);

  /**
   * Mark location as asked without requesting (for "Refuse" action)
   */
  const markLocationAsked = useCallback(async () => {
    setState(prev => ({ ...prev, locationAsked: true }));
    await AsyncStorage.setItem(PERMISSION_ASKED_KEYS.location, 'true');
    Logger.logUserAction('location_permission_refused', {});
  }, []);

  /**
   * Mark calendar as asked without requesting (for "Refuse" action)
   */
  const markCalendarAsked = useCallback(async () => {
    setState(prev => ({ ...prev, calendarAsked: true }));
    await AsyncStorage.setItem(PERMISSION_ASKED_KEYS.calendar, 'true');
    Logger.logUserAction('calendar_permission_refused', {});
  }, []);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Determine if overlays should be shown
  // Only show if:
  // 1. Permission is not already granted
  // 2. User has not been asked before in this app installation
  const shouldShowLocationOverlay = 
    !state.loading && 
    state.location !== 'granted' && 
    !state.locationAsked;

  const shouldShowCalendarOverlay = 
    !state.loading && 
    state.calendar !== 'granted' && 
    !state.calendarAsked;

  return {
    ...state,
    requestLocationPermission,
    requestCalendarPermission,
    markLocationAsked,
    markCalendarAsked,
    checkPermissions,
    shouldShowLocationOverlay,
    shouldShowCalendarOverlay,
  };
};

export default usePermissions;
