/**
 * useBooking Hooks
 *
 * TanStack Query hooks for the unified booking service.
 * Provides mutations (create, cancel, status update) and queries
 * (single booking, player bookings, org bookings).
 */

import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import {
  createBooking,
  cancelBooking,
  getBooking,
  getPlayerBookings,
  getPlayerBookingsPaginated,
  getOrgBookings,
  updateBookingStatus,
  getCancellationPolicy,
  supabase,
  type CreateBookingClientParams,
  type CreateBookingClientResult,
  type CancelBookingClientParams,
  type CancelBookingClientResult,
  type BookingWithDetails,
  type BookingListFilters,
  type UpdateBookingStatusParams,
  type BookingStatus,
  type BookingTab,
  type PlayerBookingsPage,
  type CancellationPolicy,
} from '@rallia/shared-services';
import { courtAvailabilityKeys } from './useCourtAvailability';

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  listForPlayer: (playerId: string, filters?: BookingListFilters) =>
    [...bookingKeys.lists(), 'player', playerId, filters] as const,
  listForOrg: (orgId: string, filters?: BookingListFilters) =>
    [...bookingKeys.lists(), 'org', orgId, filters] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (bookingId: string) => [...bookingKeys.details(), bookingId] as const,
};

// ---------------------------------------------------------------------------
// useCreateBooking
// ---------------------------------------------------------------------------

interface UseCreateBookingOptions {
  onSuccess?: (result: CreateBookingClientResult) => void;
  onError?: (error: Error) => void;
}

export function useCreateBooking(options: UseCreateBookingOptions = {}) {
  const { onSuccess, onError } = options;
  const queryClient = useQueryClient();

  const mutation = useMutation<CreateBookingClientResult, Error, CreateBookingClientParams>({
    mutationFn: createBooking,

    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: courtAvailabilityKeys.all });
      onSuccess?.(result);
    },

    onError: error => {
      onError?.(error);
    },
  });

  return {
    createBooking: mutation.mutate,
    createBookingAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

// ---------------------------------------------------------------------------
// useCancelBooking
// ---------------------------------------------------------------------------

interface UseCancelBookingOptions {
  onSuccess?: (result: CancelBookingClientResult) => void;
  onError?: (error: Error) => void;
}

export function useCancelBooking(options: UseCancelBookingOptions = {}) {
  const { onSuccess, onError } = options;
  const queryClient = useQueryClient();

  const mutation = useMutation<CancelBookingClientResult, Error, CancelBookingClientParams>({
    mutationFn: cancelBooking,

    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: bookingKeys.detail(variables.bookingId),
      });
      queryClient.invalidateQueries({ queryKey: courtAvailabilityKeys.all });
      onSuccess?.(result);
    },

    onError: error => {
      onError?.(error);
    },
  });

  return {
    cancelBooking: mutation.mutate,
    cancelBookingAsync: mutation.mutateAsync,
    isCancelling: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

// ---------------------------------------------------------------------------
// useUpdateBookingStatus
// ---------------------------------------------------------------------------

interface UseUpdateBookingStatusOptions {
  onSuccess?: (result: {
    success: boolean;
    booking: { id: string; status: BookingStatus };
  }) => void;
  onError?: (error: Error) => void;
}

export function useUpdateBookingStatus(options: UseUpdateBookingStatusOptions = {}) {
  const { onSuccess, onError } = options;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: UpdateBookingStatusParams) => updateBookingStatus(supabase, params),

    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: bookingKeys.detail(variables.bookingId),
      });
      onSuccess?.(result);
    },

    onError: (error: Error) => {
      onError?.(error);
    },
  });

  return {
    updateStatus: mutation.mutate,
    updateStatusAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

// ---------------------------------------------------------------------------
// useBooking (single)
// ---------------------------------------------------------------------------

interface UseBookingOptions {
  enabled?: boolean;
}

export function useBooking(bookingId: string, options: UseBookingOptions = {}) {
  const { enabled = true } = options;

  const query = useQuery<BookingWithDetails | null, Error>({
    queryKey: bookingKeys.detail(bookingId),
    queryFn: () => getBooking(bookingId),
    enabled: enabled && !!bookingId,
  });

  return {
    booking: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}

// ---------------------------------------------------------------------------
// usePlayerBookings
// ---------------------------------------------------------------------------

interface UsePlayerBookingsOptions {
  filters?: BookingListFilters;
  enabled?: boolean;
}

export function usePlayerBookings(playerId: string, options: UsePlayerBookingsOptions = {}) {
  const { filters, enabled = true } = options;

  const query = useQuery<BookingWithDetails[], Error>({
    queryKey: bookingKeys.listForPlayer(playerId, filters),
    queryFn: () => getPlayerBookings(playerId, filters),
    enabled: enabled && !!playerId,
  });

  return {
    bookings: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}

// ---------------------------------------------------------------------------
// useOrgBookings
// ---------------------------------------------------------------------------

interface UseOrgBookingsOptions {
  filters?: BookingListFilters;
  enabled?: boolean;
}

export function useOrgBookings(orgId: string, options: UseOrgBookingsOptions = {}) {
  const { filters, enabled = true } = options;

  const query = useQuery<BookingWithDetails[], Error>({
    queryKey: bookingKeys.listForOrg(orgId, filters),
    queryFn: () => getOrgBookings(orgId, filters),
    enabled: enabled && !!orgId,
  });

  return {
    bookings: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}

// ---------------------------------------------------------------------------
// useUpcomingBookings (for FacilitiesDirectory preview)
// ---------------------------------------------------------------------------

interface UseUpcomingBookingsOptions {
  enabled?: boolean;
}

/**
 * Fetches the next N upcoming bookings for a player (simple useQuery, no pagination).
 * Used for the "My Bookings" horizontal preview section on FacilitiesDirectory.
 */
export function useUpcomingBookings(
  playerId: string | undefined,
  limit: number = 5,
  options: UseUpcomingBookingsOptions = {}
) {
  const { enabled = true } = options;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const filters: BookingListFilters = {
    dateFrom: todayStr,
    status: ['confirmed', 'pending', 'awaiting_approval'],
    bookingType: 'player',
    limit,
  };

  const query = useQuery<BookingWithDetails[], Error>({
    queryKey: bookingKeys.listForPlayer(playerId ?? '', {
      ...filters,
      _tag: 'upcoming-preview',
    } as BookingListFilters),
    queryFn: async () => {
      const list = await getPlayerBookings(playerId!, filters);
      // Soonest first: ascending by date then start_time
      return [...list].sort((a, b) => {
        const d = a.booking_date.localeCompare(b.booking_date);
        if (d !== 0) return d;
        return a.start_time.localeCompare(b.start_time);
      });
    },
    enabled: enabled && !!playerId,
    staleTime: 60_000, // 1 minute stale-while-revalidate
  });

  return {
    bookings: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}

// ---------------------------------------------------------------------------
// usePlayerBookingsByTab (infinite scroll for MyBookingsScreen)
// ---------------------------------------------------------------------------

/** Default page size for infinite booking queries */
const DEFAULT_BOOKINGS_PAGE_SIZE = 20;

interface UsePlayerBookingsByTabOptions {
  /** Player ID */
  playerId: string | undefined;
  /** Time filter tab */
  timeFilter: BookingTab;
  /** Status filter */
  statusFilter?: string;
  /** Page size */
  limit?: number;
  /** Enable/disable */
  enabled?: boolean;
}

/**
 * Fetches paginated bookings for a player, grouped by time filter (upcoming/past).
 * Uses useInfiniteQuery for infinite scroll support.
 * Mirrors the usePlayerMatches pattern.
 */
export function usePlayerBookingsByTab(options: UsePlayerBookingsByTabOptions) {
  const {
    playerId,
    timeFilter,
    statusFilter = 'all',
    limit = DEFAULT_BOOKINGS_PAGE_SIZE,
    enabled = true,
  } = options;

  const hasRequiredParams = playerId !== undefined;

  const query = useInfiniteQuery<PlayerBookingsPage, Error>({
    queryKey: [...bookingKeys.lists(), 'player-tab', playerId, { timeFilter, statusFilter, limit }],
    queryFn: async ({ pageParam = 0 }) => {
      if (!hasRequiredParams) {
        return { bookings: [], nextOffset: null, hasMore: false };
      }

      return getPlayerBookingsPaginated({
        playerId: playerId!,
        timeFilter,
        statusFilter,
        limit,
        offset: pageParam as number,
      });
    },
    getNextPageParam: lastPage => lastPage.nextOffset,
    initialPageParam: 0,
    enabled: enabled && hasRequiredParams,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Flatten all pages into a single array
  const bookings = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap(page => page.bookings);
  }, [query.data]);

  // Stable refetch callback for pull-to-refresh
  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    bookings,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    isSuccess: query.isSuccess,
    isError: query.isError,
    error: query.error,
    refetch: refresh,
  };
}

// ---------------------------------------------------------------------------
// useCancellationPolicy
// ---------------------------------------------------------------------------

interface UseCancellationPolicyOptions {
  enabled?: boolean;
}

/**
 * Fetches the cancellation policy for an organization.
 * Cached via TanStack Query for efficiency.
 */
export function useCancellationPolicy(
  organizationId: string | undefined,
  options: UseCancellationPolicyOptions = {}
) {
  const { enabled = true } = options;

  const query = useQuery<CancellationPolicy | null, Error>({
    queryKey: ['cancellationPolicy', organizationId],
    queryFn: () => getCancellationPolicy(supabase, organizationId!),
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60_000, // 5 minutes -- policies rarely change
  });

  return {
    policy: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}
