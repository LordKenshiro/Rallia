/**
 * usePushNotifications Hook
 * Handles Expo push notification registration and permissions.
 * Should be used at the app root level to register the device on login.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushToken, unregisterPushToken } from '@rallia/shared-services';
import { Logger } from '@rallia/shared-services';

/**
 * Check if we're running on a physical device (vs simulator/emulator)
 * Uses expo-constants instead of expo-device to avoid additional dependency
 */
function isPhysicalDevice(): boolean {
  // In development, Constants.executionEnvironment can indicate if it's a store build
  // Constants.isDevice is available in newer Expo versions
  // For simulators, deviceName often contains "Simulator" or "Emulator"
  const deviceName = Constants.deviceName ?? '';
  const isSimulator =
    deviceName.toLowerCase().includes('simulator') || deviceName.toLowerCase().includes('emulator');

  // Also check if it's an Expo Go or development build scenario
  const isDevBuild = Constants.appOwnership === 'expo' || __DEV__;

  // For production builds, we should always try to register
  // For dev builds on simulator, we skip
  if (isDevBuild && isSimulator) {
    return false;
  }

  return true;
}

// Configure how notifications are handled when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  isRegistered: boolean;
  isRegistering: boolean;
  error: string | null;
}

/**
 * Get the Expo push token for this device
 */
async function getExpoPushToken(): Promise<string | null> {
  // Must be a physical device
  if (!isPhysicalDevice()) {
    Logger.warn('Push notifications require a physical device');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Logger.warn('Push notification permission not granted');
    return null;
  }

  // Get the token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      Logger.warn('EAS project ID not found in app config');
      // Fallback for development
      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return token.data;
  } catch (error) {
    Logger.error('Failed to get Expo push token', error as Error);
    return null;
  }
}

/**
 * Set up Android notification channel
 */
async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4DB8A8', // Primary teal color
    });

    // Match-specific channel for high-priority notifications
    await Notifications.setNotificationChannelAsync('match', {
      name: 'Match Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4DB8A8',
    });
  }
}

/**
 * Hook for managing push notification registration
 *
 * @param userId - The authenticated user's ID (null if not logged in)
 * @param enabled - Whether to attempt registration (default: true)
 */
export function usePushNotifications(
  userId: string | null | undefined,
  enabled: boolean = true
): PushNotificationState & {
  requestPermissions: () => Promise<boolean>;
  unregister: () => Promise<void>;
} {
  const [state, setState] = useState<PushNotificationState>({
    expoPushToken: null,
    isRegistered: false,
    isRegistering: false,
    error: null,
  });

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const previousUserId = useRef<string | null>(null);

  // Register push token when user logs in
  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    // Skip if already registered for this user
    if (previousUserId.current === userId && state.isRegistered) {
      return;
    }

    const register = async () => {
      setState(prev => ({ ...prev, isRegistering: true, error: null }));

      try {
        // Set up Android channels first
        await setupAndroidChannel();

        // Get push token
        const token = await getExpoPushToken();

        if (!token) {
          setState(prev => ({
            ...prev,
            isRegistering: false,
            error: 'Could not get push token',
          }));
          return;
        }

        // Register token with backend
        await registerPushToken(userId, token);

        previousUserId.current = userId;
        setState({
          expoPushToken: token,
          isRegistered: true,
          isRegistering: false,
          error: null,
        });

        Logger.logUserAction('push_notifications_registered', {
          token: token.substring(0, 20) + '...',
        });
      } catch (error) {
        Logger.error('Failed to register push notifications', error as Error);
        setState(prev => ({
          ...prev,
          isRegistering: false,
          error: (error as Error).message,
        }));
      }
    };

    register();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enabled]);

  // Set up notification listeners
  useEffect(() => {
    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      Logger.logUserAction('push_notification_received', {
        title: notification.request.content.title,
        data: notification.request.content.data,
      });
    });

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      Logger.logUserAction('push_notification_tapped', { data });

      // TODO: Handle navigation based on notification data
      // e.g., navigate to specific match, conversation, etc.
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Unregister on logout
  useEffect(() => {
    return () => {
      // Clean up when user logs out (userId becomes null)
      if (previousUserId.current && !userId) {
        unregisterPushToken(previousUserId.current).catch(error => {
          Logger.error('Failed to unregister push token on logout', error);
        });
        previousUserId.current = null;
        setState({
          expoPushToken: null,
          isRegistered: false,
          isRegistering: false,
          error: null,
        });
      }
    };
  }, [userId]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }, []);

  const unregister = useCallback(async (): Promise<void> => {
    if (userId) {
      await unregisterPushToken(userId);
      previousUserId.current = null;
      setState({
        expoPushToken: null,
        isRegistered: false,
        isRegistering: false,
        error: null,
      });
    }
  }, [userId]);

  return {
    ...state,
    requestPermissions,
    unregister,
  };
}

export default usePushNotifications;
