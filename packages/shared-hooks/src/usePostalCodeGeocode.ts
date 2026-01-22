/**
 * usePostalCodeGeocode Hook
 *
 * Validates and geocodes Canadian and US postal codes using Google Geocoding API.
 * Returns the centroid coordinates for the postal code area.
 */

import { useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface PostalCodeLocation {
  /** Normalized postal code (uppercase, proper spacing) */
  postalCode: string;
  /** Country code */
  country: 'CA' | 'US';
  /** Human-readable formatted address from Google */
  formattedAddress: string;
  /** Latitude of postal code centroid */
  latitude: number;
  /** Longitude of postal code centroid */
  longitude: number;
}

interface UsePostalCodeGeocodeReturn {
  /** Geocode a postal code and return location details */
  geocode: (postalCode: string) => Promise<PostalCodeLocation | null>;
  /** Whether a geocoding request is in progress */
  isLoading: boolean;
  /** Error message if geocoding failed */
  error: string | null;
  /** Last successful geocoding result */
  result: PostalCodeLocation | null;
  /** Clear the current result and error */
  clearResult: () => void;
  /** Validate postal code format without geocoding */
  validateFormat: (postalCode: string) => { isValid: boolean; country: 'CA' | 'US' | null; normalized: string | null };
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Canadian postal code: A1A 1A1 or A1A1A1 (letter-digit-letter digit-letter-digit)
// First letter cannot be D, F, I, O, Q, U, W, Z (reserved/unused)
const CA_POSTAL_REGEX = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;

// US ZIP code: 12345 or 12345-6789
const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

const GOOGLE_GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

// Get API key from environment
const getApiKey = (): string | null => {
  // For React Native (Expo)
  if (typeof process !== 'undefined' && process.env) {
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
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize a Canadian postal code to uppercase with space in middle
 */
function normalizeCanadianPostalCode(postalCode: string): string {
  // Remove spaces and dashes, uppercase
  const cleaned = postalCode.replace(/[\s-]/g, '').toUpperCase();
  // Insert space in middle: A1A1A1 -> A1A 1A1
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
}

/**
 * Normalize a US ZIP code (just trim whitespace)
 */
function normalizeUSZipCode(postalCode: string): string {
  return postalCode.trim();
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function usePostalCodeGeocode(): UsePostalCodeGeocodeReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PostalCodeLocation | null>(null);

  /**
   * Validate postal code format without making an API call
   */
  const validateFormat = useCallback(
    (
      postalCode: string
    ): { isValid: boolean; country: 'CA' | 'US' | null; normalized: string | null } => {
      const trimmed = postalCode.trim();

      if (CA_POSTAL_REGEX.test(trimmed)) {
        return {
          isValid: true,
          country: 'CA',
          normalized: normalizeCanadianPostalCode(trimmed),
        };
      }

      if (US_ZIP_REGEX.test(trimmed)) {
        return {
          isValid: true,
          country: 'US',
          normalized: normalizeUSZipCode(trimmed),
        };
      }

      return { isValid: false, country: null, normalized: null };
    },
    []
  );

  /**
   * Clear the current result and error state
   */
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  /**
   * Geocode a postal code using Google Geocoding API
   */
  const geocode = useCallback(
    async (postalCode: string): Promise<PostalCodeLocation | null> => {
      const apiKey = getApiKey();

      if (!apiKey) {
        const errorMsg =
          'Google API key not configured. ' +
          'Ensure EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is set.';
        console.error(errorMsg);
        setError(errorMsg);
        return null;
      }

      // Validate format first
      const validation = validateFormat(postalCode);

      if (!validation.isValid || !validation.country || !validation.normalized) {
        setError('invalid');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Build the geocoding URL
        // Use components filter to restrict to CA or US
        const countryComponent = validation.country === 'CA' ? 'country:CA' : 'country:US';
        const url = `${GOOGLE_GEOCODING_API_URL}?address=${encodeURIComponent(validation.normalized)}&components=${countryComponent}&key=${apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'ZERO_RESULTS' || !data.results || data.results.length === 0) {
          setError('notFound');
          setIsLoading(false);
          return null;
        }

        if (data.status !== 'OK') {
          console.error('Geocoding API error:', data.status, data.error_message);
          setError('networkError');
          setIsLoading(false);
          return null;
        }

        const firstResult = data.results[0];
        const location = firstResult.geometry?.location;

        if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
          setError('notFound');
          setIsLoading(false);
          return null;
        }

        const postalCodeLocation: PostalCodeLocation = {
          postalCode: validation.normalized,
          country: validation.country,
          formattedAddress: firstResult.formatted_address || validation.normalized,
          latitude: location.lat,
          longitude: location.lng,
        };

        setResult(postalCodeLocation);
        setIsLoading(false);
        return postalCodeLocation;
      } catch (err) {
        console.error('Geocoding error:', err);
        setError('networkError');
        setIsLoading(false);
        return null;
      }
    },
    [validateFormat]
  );

  return {
    geocode,
    isLoading,
    error,
    result,
    clearResult,
    validateFormat,
  };
}

export default usePostalCodeGeocode;
