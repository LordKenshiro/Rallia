/**
 * useBooking Hooks
 *
 * TanStack Query hooks for the unified booking service.
 * Provides mutations (create, cancel, status update) and queries
 * (single booking, player bookings, org bookings).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBooking,
  cancelBooking,
  getBooking,
  getPlayerBookings,
  getOrgBookings,
  updateBookingStatus,
  supabase,
  type CreateBookingClientParams,
  type CreateBookingClientResult,
  type CancelBookingClientParams,
  type CancelBookingClientResult,
  type BookingWithDetails,
  type BookingListFilters,
  type UpdateBookingStatusParams,
  type BookingStatus,
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
