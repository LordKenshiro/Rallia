/**
 * Base Availability Provider
 *
 * Abstract base class for all court availability providers.
 * Each provider implements its own fetch logic with appropriate HTTP method and parsing.
 */

import type {
  AvailabilitySlot,
  ProviderConfig,
  FetchAvailabilityParams,
  HttpRequestOptions,
} from '../types';

/**
 * Abstract base class for availability providers.
 *
 * Features:
 * - HTTP method agnostic (supports GET, POST, or custom)
 * - Shared request helper with error handling
 * - Booking URL template substitution
 *
 * To add a new provider:
 * 1. Extend this class
 * 2. Set the `providerType` property
 * 3. Implement `fetchAvailability()` with provider-specific logic
 * 4. Optionally override `buildBookingUrl()` for custom URL formats
 */
export abstract class BaseAvailabilityProvider {
  /** Unique provider type identifier (must match database provider_type) */
  abstract readonly providerType: string;

  constructor(protected readonly config: ProviderConfig) {}

  /**
   * Fetch availability slots from the external API.
   * Each provider implements this with appropriate HTTP method and parsing.
   *
   * @param params - Fetch parameters (dates, times, facility IDs, etc.)
   * @returns Array of normalized availability slots
   */
  abstract fetchAvailability(params: FetchAvailabilityParams): Promise<AvailabilitySlot[]>;

  /**
   * Build a booking URL for a specific slot.
   * Uses the template from config with placeholder substitution.
   *
   * Supported placeholders:
   * - {facilityId} - External facility ID
   * - {startDateTime} - ISO datetime string
   * - {endDateTime} - ISO datetime string
   * - {facilityScheduleId} - Schedule/slot ID
   *
   * @param slot - The availability slot to build URL for
   * @returns Booking URL or null if no template configured
   */
  buildBookingUrl(slot: AvailabilitySlot): string | null {
    if (!this.config.bookingUrlTemplate) {
      return null;
    }

    return this.config.bookingUrlTemplate
      .replace('{facilityId}', encodeURIComponent(slot.facilityId))
      .replace('{startDateTime}', encodeURIComponent(slot.datetime.toISOString()))
      .replace('{endDateTime}', encodeURIComponent(slot.endDateTime.toISOString()))
      .replace('{facilityScheduleId}', encodeURIComponent(slot.facilityScheduleId));
  }

  /**
   * Helper method for making HTTP requests.
   * Providers can use this for consistent request handling.
   *
   * @param endpoint - Full URL to request
   * @param options - Request options (method, body, query params, headers)
   * @returns Parsed JSON response
   * @throws Error if request fails
   */
  protected async makeRequest<T>(endpoint: string, options: HttpRequestOptions): Promise<T> {
    let url = endpoint;

    // Add query parameters for GET requests
    if (options.queryParams && Object.keys(options.queryParams).length > 0) {
      const params = new URLSearchParams(options.queryParams);
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}${params.toString()}`;
    }

    const controller = new AbortController();
    const timeout = options.timeout ?? 10000; // Default 10s timeout

    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options.headers,
        },
        body: options.method === 'POST' && options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Provider API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Provider API timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Get a config value with type safety.
   * @param key - Config key to retrieve
   * @param defaultValue - Default value if key not found
   */
  protected getConfigValue<T>(key: string, defaultValue: T): T {
    const value = this.config.apiConfig[key];
    return value !== undefined ? (value as T) : defaultValue;
  }
}
