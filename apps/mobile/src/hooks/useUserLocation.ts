/**
 * useUserLocation Hook
 * Gets the user's current device location using expo-location.
 */

import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Logger } from '@rallia/shared-services';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

interface UseUserLocationReturn {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get the user's current device location.
 * Requires location permission to be granted.
 */
export function useUserLocation(): UseUserLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission not granted');
        setLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      Logger.debug('user_location_fetched', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (err) {
      Logger.error('Failed to get user location', err as Error);
      setError('Failed to get location');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return { location, loading, error, refetch: fetchLocation };
}

export default useUserLocation;
