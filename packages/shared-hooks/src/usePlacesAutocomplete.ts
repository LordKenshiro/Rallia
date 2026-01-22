/**
 * usePlacesAutocomplete Hook
 *
 * Custom hook for searching places using Google Places Autocomplete API.
 * Provides debounced search with location bias support.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { PlacePrediction } from '@rallia/shared-types';
import { useDebounce } from './useDebounce';

// =============================================================================
// TYPES
// =============================================================================

interface UsePlacesAutocompleteOptions {
  /** Search query string */
  searchQuery: string;
  /** User's latitude for location bias (optional) */
  latitude?: number;
  /** User's longitude for location bias (optional) */
  longitude?: number;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Whether the hook is enabled */
  enabled?: boolean;
  /** Minimum query length to trigger search (default: 2) */
  minQueryLength?: number;
}

/** Place details with coordinates */
export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface UsePlacesAutocompleteReturn {
  /** Array of place predictions */
  predictions: PlacePrediction[];
  /** Whether a search is in progress */
  isLoading: boolean;
  /** Error message if search failed */
  error: string | null;
  /** Clear all predictions */
  clearPredictions: () => void;
  /** Fetch full place details including coordinates for a given placeId */
  getPlaceDetails: (placeId: string) => Promise<PlaceDetails | null>;
  /** Get the current session token (for chaining autocomplete + details billing) */
  getSessionToken: () => string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const GOOGLE_PLACES_API_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const GOOGLE_PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';

// Get API key from environment
// In Expo, environment variables prefixed with EXPO_PUBLIC_ are embedded at build time
// However, in shared packages, we need to access them carefully to ensure they work in production
const getApiKey = (): string | null => {
  // For React Native (Expo) - try process.env access
  // In Expo SDK 49+, EXPO_PUBLIC_ prefixed vars are embedded at build time
  if (typeof process !== 'undefined' && process.env) {
    // Standard process.env access (works in dev and production when properly configured)
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (apiKey) {
      return apiKey;
    }
  }

  // For Next.js
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY) {
    return process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  }

  return null;
};

// =============================================================================
// SESSION TOKEN MANAGEMENT
// =============================================================================

/**
 * Generate a UUID v4 session token for Google Places API billing optimization.
 * Session tokens group autocomplete requests together for billing purposes.
 */
function generateSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function usePlacesAutocomplete(
  options: UsePlacesAutocompleteOptions
): UsePlacesAutocompleteReturn {
  const {
    searchQuery,
    latitude,
    longitude,
    debounceMs = 300,
    enabled = true,
    minQueryLength = 2,
  } = options;

  // State
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Session token for billing optimization (reused across autocomplete requests)
  const sessionTokenRef = useRef<string>(generateSessionToken());

  // Abort controller for canceling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce the search query
  const debouncedQuery = useDebounce(searchQuery, debounceMs);

  // Clear predictions
  const clearPredictions = useCallback(() => {
    setPredictions([]);
    setError(null);
    // Generate a new session token when clearing (user starting fresh)
    sessionTokenRef.current = generateSessionToken();
  }, []);

  // Get the current session token
  const getSessionToken = useCallback(() => {
    return sessionTokenRef.current;
  }, []);

  // Fetch place details (including coordinates) for a given placeId
  const getPlaceDetails = useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    const apiKey = getApiKey();

    if (!apiKey) {
      console.error(
        'Google Places API key not configured. ' +
          'Ensure EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is set in EAS secrets for production builds.'
      );
      return null;
    }

    try {
      // Use the session token to bundle with autocomplete for billing
      const url = `${GOOGLE_PLACE_DETAILS_URL}/${placeId}?sessionToken=${sessionTokenRef.current}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'displayName,formattedAddress,location',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Place Details API error:', errorText);
        return null;
      }

      const data = await response.json();

      // Generate a new session token after fetching details
      // (completes the autocomplete + details session)
      sessionTokenRef.current = generateSessionToken();

      if (!data.location) {
        console.error('Place details missing location data');
        return null;
      }

      return {
        placeId,
        name: data.displayName?.text || '',
        address: data.formattedAddress || '',
        latitude: data.location.latitude,
        longitude: data.location.longitude,
      };
    } catch (err) {
      console.error('Place details fetch error:', err);
      return null;
    }
  }, []);

  // Perform the search
  const performSearch = useCallback(
    async (query: string) => {
      const apiKey = getApiKey();

      if (!apiKey) {
        const errorMsg =
          'Google Places API key not configured. ' +
          'Ensure EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is set in EAS secrets for production builds.';
        console.error(errorMsg);
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      if (query.length < minQueryLength) {
        setPredictions([]);
        setIsLoading(false);
        return;
      }

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        // Build request body
        const requestBody: Record<string, unknown> = {
          input: query,
          sessionToken: sessionTokenRef.current,
        };

        // Add location bias if coordinates are available
        if (latitude !== undefined && longitude !== undefined) {
          requestBody.locationBias = {
            circle: {
              center: {
                latitude,
                longitude,
              },
              radius: 50000, // 50km radius bias
            },
          };
        }

        const response = await fetch(GOOGLE_PLACES_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
          },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Google Places API error:', errorText);
          throw new Error('Failed to fetch place suggestions');
        }

        const data = await response.json();

        // Parse predictions from response
        const parsedPredictions: PlacePrediction[] = (data.suggestions || [])
          .filter((suggestion: { placePrediction?: unknown }) => suggestion.placePrediction)
          .map(
            (suggestion: {
              placePrediction: {
                placeId: string;
                structuredFormat?: {
                  mainText?: { text?: string };
                  secondaryText?: { text?: string };
                };
                text?: { text?: string };
              };
            }) => {
              const prediction = suggestion.placePrediction;
              return {
                placeId: prediction.placeId,
                name: prediction.structuredFormat?.mainText?.text || prediction.text?.text || '',
                address: prediction.structuredFormat?.secondaryText?.text || '',
                // Coordinates are not included in autocomplete response
                // They would need to be fetched via Place Details API if needed
              };
            }
          );

        setPredictions(parsedPredictions);
        setError(null);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Places autocomplete error:', err);
        setError('Failed to search places');
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [latitude, longitude, minQueryLength]
  );

  // Effect to trigger search when debounced query changes
  useEffect(() => {
    if (!enabled) {
      setPredictions([]);
      return;
    }

    if (debouncedQuery.trim().length === 0) {
      setPredictions([]);
      setIsLoading(false);
      return;
    }

    performSearch(debouncedQuery.trim());
  }, [debouncedQuery, enabled, performSearch]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Memoize return value
  return useMemo(
    () => ({
      predictions,
      isLoading,
      error,
      clearPredictions,
      getPlaceDetails,
      getSessionToken,
    }),
    [predictions, isLoading, error, clearPredictions, getPlaceDetails, getSessionToken]
  );
}

export default usePlacesAutocomplete;
