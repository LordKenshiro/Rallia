/**
 * Availability Provider Types
 *
 * Shared types for the court availability provider system.
 * These types are used across providers, services, and hooks.
 */

// =============================================================================
// AVAILABILITY SLOT
// =============================================================================

/**
 * Normalized availability slot returned by all providers.
 * Each provider transforms their API response into this format.
 */
export interface AvailabilitySlot {
  /** Start time of the slot */
  datetime: Date;
  /** End time of the slot */
  endDateTime: Date;
  /** Number of available courts at this time */
  courtCount: number;
  /** External facility ID used by the provider */
  facilityId: string;
  /** Schedule/slot ID required for booking URL (provider-specific) */
  facilityScheduleId: string;
  /** Optional full court name with location (e.g., "Parc Jeanne-Mance - Tennis Court 1") */
  courtName?: string;
  /** Optional short court name for display in selection UI (e.g., "Tennis Court 1") */
  shortCourtName?: string;
  /** Court number extracted from the name (e.g., 1, 2, 3) for translated display */
  courtNumber?: number;
  /** Pre-built booking URL for this slot (populated after fetch) */
  bookingUrl?: string;
  /** Optional price information */
  price?: number;
  /** Optional currency code */
  currency?: string;
}

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================

/**
 * Configuration for a data provider, loaded from the database.
 */
export interface ProviderConfig {
  /** Provider ID (UUID from database) */
  id: string;
  /** Provider type identifier (e.g., 'loisir_montreal') */
  providerType: string;
  /** Base URL for API requests */
  apiBaseUrl: string;
  /** Provider-specific configuration (API paths, auth, defaults) */
  apiConfig: Record<string, unknown>;
  /** URL template for booking with placeholders */
  bookingUrlTemplate: string | null;
}

// =============================================================================
// FETCH PARAMETERS
// =============================================================================

/**
 * Parameters for fetching availability from a provider.
 * Different providers may use different subsets of these params.
 */
export interface FetchAvailabilityParams {
  /** External ID used by the provider (from facility.external_provider_id) */
  facilityExternalId?: string;
  /** Site ID for Loisir Montreal */
  siteId?: number;
  /** Array of ISO date strings to fetch availability for */
  dates: string[];
  /** Start time filter (e.g., "09:00") */
  startTime?: string;
  /** End time filter (e.g., "21:00") */
  endTime?: string;
  /** Optional search string */
  searchString?: string;
  /** Maximum number of results */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

// =============================================================================
// PROVIDER RESULT
// =============================================================================

/**
 * Result from fetching availability, including metadata.
 */
export interface AvailabilityResult {
  /** Array of normalized availability slots */
  slots: AvailabilitySlot[];
  /** Whether the fetch was successful */
  success: boolean;
  /** Error message if fetch failed */
  error?: string;
  /** Total count of available slots (for pagination) */
  totalCount?: number;
}

// =============================================================================
// LOISIR MONTREAL SPECIFIC TYPES
// =============================================================================

/**
 * Loisir Montreal API search request body.
 *
 * Note: dates must be in ISO format with timezone, e.g., "2025-06-04T00:00:00.000-04:00"
 */
export interface LoisirMontrealSearchRequest {
  /** Array of ISO date strings with timezone (e.g., "2025-06-04T00:00:00.000-04:00") */
  dates: string[];
  boroughIds: string | null;
  /** Site ID to filter by (e.g., 1726 for a specific park) */
  siteId: number | null;
  facilityTypeIds: string | string[] | null;
  /** Start time filter in HH:mm format (e.g., "09:00") */
  startTime: string | null;
  /** End time filter in HH:mm format (e.g., "21:00") */
  endTime: string | null;
  /** Search string to filter results (e.g., "tennis") */
  searchString: string | null;
  limit: number;
  offset: number;
  sortColumn: string;
  isSortOrderAsc: boolean;
}

/**
 * Loisir Montreal API borough.
 */
export interface LoisirMontrealBorough {
  $id: string;
  id: number;
  name: string;
  externalId: string | null;
}

/**
 * Loisir Montreal API site (location/park).
 */
export interface LoisirMontrealSite {
  $id: string;
  id: number;
  name: string;
  address: string;
  publicPhone: string | null;
  fax: string | null;
  boroughs: LoisirMontrealBorough[];
}

/**
 * Loisir Montreal API facility type.
 */
export interface LoisirMontrealFacilityType {
  $id: string;
  id: number;
  name: string;
  description: string;
}

/**
 * Loisir Montreal API facility (court).
 */
export interface LoisirMontrealFacility {
  $id: string;
  id: number;
  name: string;
  isMembershipRequired: boolean;
  site: LoisirMontrealSite;
  facilityType: LoisirMontrealFacilityType;
}

/**
 * Loisir Montreal API reservation status.
 */
export interface LoisirMontrealCanReserve {
  $id: string;
  value: boolean;
  validationResult: {
    entityType: string | null;
    extraParameter: string | null;
    parameters: unknown[];
    dateTimeParameters: unknown[];
    resultType: string;
    rule: string;
    warning: boolean;
  };
}

/**
 * Loisir Montreal API slot response item.
 */
export interface LoisirMontrealSlot {
  $id: string;
  facility: LoisirMontrealFacility;
  startDateTime: string;
  endDateTime: string;
  priorNoticeDelayInMinutes: number;
  facilityScheduleId: number;
  totalPrice: number;
  canReserve: LoisirMontrealCanReserve;
  facilityPricingId: number;
}

/**
 * Loisir Montreal API search response.
 */
export interface LoisirMontrealSearchResponse {
  results: LoisirMontrealSlot[];
  recordCount: number;
}

// =============================================================================
// HTTP REQUEST OPTIONS
// =============================================================================

/**
 * Options for making HTTP requests via the base provider.
 */
export interface HttpRequestOptions {
  /** HTTP method */
  method: 'GET' | 'POST';
  /** Request body for POST requests */
  body?: Record<string, unknown>;
  /** Query parameters for GET requests */
  queryParams?: Record<string, string>;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
}
