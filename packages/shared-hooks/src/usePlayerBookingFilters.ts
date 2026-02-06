/**
 * usePlayerBookingFilters Hook
 * Manages filter state for the player bookings screen (My Bookings).
 * Provides separate filter options for upcoming vs past bookings.
 * Uses single-select behavior (WhatsApp-style chips).
 */

import { useState, useCallback, useMemo } from 'react';

/**
 * Available filter values for upcoming bookings
 */
export type UpcomingBookingFilter = 'all' | 'confirmed' | 'pending' | 'awaiting_approval';

/**
 * Available filter values for past bookings
 */
export type PastBookingFilter = 'all' | 'completed' | 'cancelled' | 'no_show';

/**
 * Union type for all player booking filters
 */
export type PlayerBookingFilter = UpcomingBookingFilter | PastBookingFilter;

/**
 * All available upcoming filter options (for UI iteration)
 */
export const UPCOMING_BOOKING_FILTER_OPTIONS: UpcomingBookingFilter[] = [
  'all',
  'confirmed',
  'pending',
  'awaiting_approval',
];

/**
 * All available past filter options (for UI iteration)
 */
export const PAST_BOOKING_FILTER_OPTIONS: PastBookingFilter[] = [
  'all',
  'completed',
  'cancelled',
  'no_show',
];

/**
 * Options for the usePlayerBookingFilters hook
 */
export interface UsePlayerBookingFiltersOptions {
  /** Initial upcoming filter value */
  initialUpcomingFilter?: UpcomingBookingFilter;
  /** Initial past filter value */
  initialPastFilter?: PastBookingFilter;
}

/**
 * Return type for usePlayerBookingFilters hook
 */
export interface UsePlayerBookingFiltersReturn {
  /** Current upcoming filter */
  upcomingFilter: UpcomingBookingFilter;
  /** Current past filter */
  pastFilter: PastBookingFilter;
  /** Whether upcoming filter is active (not 'all') */
  hasActiveUpcomingFilter: boolean;
  /** Whether past filter is active (not 'all') */
  hasActivePastFilter: boolean;
  /** Set the upcoming filter */
  setUpcomingFilter: (filter: UpcomingBookingFilter) => void;
  /** Set the past filter */
  setPastFilter: (filter: PastBookingFilter) => void;
  /** Reset upcoming filter to 'all' */
  resetUpcomingFilter: () => void;
  /** Reset past filter to 'all' */
  resetPastFilter: () => void;
  /** Reset both filters to 'all' */
  resetAllFilters: () => void;
  /** Toggle a filter - if already selected, reset to 'all' */
  toggleUpcomingFilter: (filter: UpcomingBookingFilter) => void;
  /** Toggle a filter - if already selected, reset to 'all' */
  togglePastFilter: (filter: PastBookingFilter) => void;
}

/**
 * Hook for managing player booking filter state.
 * Provides separate filters for upcoming and past bookings.
 * Supports single-select toggle behavior (tapping active filter deselects it).
 *
 * @example
 * ```tsx
 * const { upcomingFilter, toggleUpcomingFilter, pastFilter, togglePastFilter } =
 *   usePlayerBookingFilters();
 *
 * // In upcoming tab:
 * <FilterChip
 *   active={upcomingFilter === 'confirmed'}
 *   onPress={() => toggleUpcomingFilter('confirmed')}
 * />
 * ```
 */
export function usePlayerBookingFilters(
  options: UsePlayerBookingFiltersOptions = {}
): UsePlayerBookingFiltersReturn {
  const { initialUpcomingFilter = 'all', initialPastFilter = 'all' } = options;

  const [upcomingFilter, setUpcomingFilterState] =
    useState<UpcomingBookingFilter>(initialUpcomingFilter);
  const [pastFilter, setPastFilterState] = useState<PastBookingFilter>(initialPastFilter);

  // Check if filters are active
  const hasActiveUpcomingFilter = useMemo(() => upcomingFilter !== 'all', [upcomingFilter]);
  const hasActivePastFilter = useMemo(() => pastFilter !== 'all', [pastFilter]);

  // Setters
  const setUpcomingFilter = useCallback((filter: UpcomingBookingFilter) => {
    setUpcomingFilterState(filter);
  }, []);

  const setPastFilter = useCallback((filter: PastBookingFilter) => {
    setPastFilterState(filter);
  }, []);

  // Reset functions
  const resetUpcomingFilter = useCallback(() => {
    setUpcomingFilterState('all');
  }, []);

  const resetPastFilter = useCallback(() => {
    setPastFilterState('all');
  }, []);

  const resetAllFilters = useCallback(() => {
    setUpcomingFilterState('all');
    setPastFilterState('all');
  }, []);

  // Toggle functions (single-select behavior)
  const toggleUpcomingFilter = useCallback((filter: UpcomingBookingFilter) => {
    setUpcomingFilterState(prev => (prev === filter ? 'all' : filter));
  }, []);

  const togglePastFilter = useCallback((filter: PastBookingFilter) => {
    setPastFilterState(prev => (prev === filter ? 'all' : filter));
  }, []);

  return {
    upcomingFilter,
    pastFilter,
    hasActiveUpcomingFilter,
    hasActivePastFilter,
    setUpcomingFilter,
    setPastFilter,
    resetUpcomingFilter,
    resetPastFilter,
    resetAllFilters,
    toggleUpcomingFilter,
    togglePastFilter,
  };
}

export default usePlayerBookingFilters;
