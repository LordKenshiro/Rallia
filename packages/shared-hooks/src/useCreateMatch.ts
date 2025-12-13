/**
 * useCreateMatch Hook
 * Custom hook for creating matches with TanStack Query.
 * Provides optimistic updates, error handling, and cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMatch, type CreateMatchInput } from '@rallia/shared-services';
import type { Match } from '@rallia/shared-types';

/**
 * Query keys for match-related cache management
 */
export const matchKeys = {
  all: ['matches'] as const,
  lists: () => [...matchKeys.all, 'list'] as const,
  list: (userId: string, filters?: Record<string, unknown>) =>
    [...matchKeys.lists(), userId, filters] as const,
  details: () => [...matchKeys.all, 'detail'] as const,
  detail: (matchId: string) => [...matchKeys.details(), matchId] as const,
  byCreator: (userId: string) => [...matchKeys.all, 'byCreator', userId] as const,
};

/**
 * Options for the useCreateMatch hook
 */
interface UseCreateMatchOptions {
  /**
   * Callback when match is created successfully
   */
  onSuccess?: (match: Match) => void;

  /**
   * Callback when match creation fails
   */
  onError?: (error: Error) => void;

  /**
   * Whether to invalidate match lists after creation
   * @default true
   */
  invalidateOnSuccess?: boolean;
}

/**
 * Hook for creating a new match
 *
 * @example
 * ```tsx
 * const { createMatch, isCreating, error } = useCreateMatch({
 *   onSuccess: (match) => {
 *     navigation.navigate('MatchDetail', { matchId: match.id });
 *   },
 *   onError: (error) => {
 *     Alert.alert('Error', error.message);
 *   },
 * });
 *
 * // Later in a form submit handler
 * createMatch({
 *   sportId: selectedSport.id,
 *   createdBy: userId,
 *   matchDate: '2025-01-15',
 *   startTime: '14:00',
 *   endTime: '15:00',
 *   format: 'singles',
 *   // ... other fields
 * });
 * ```
 */
export function useCreateMatch(options: UseCreateMatchOptions = {}) {
  const { onSuccess, onError, invalidateOnSuccess = true } = options;
  const queryClient = useQueryClient();

  const mutation = useMutation<Match, Error, CreateMatchInput>({
    mutationFn: createMatch,

    onSuccess: match => {
      // Invalidate match lists to refetch with new match
      if (invalidateOnSuccess) {
        queryClient.invalidateQueries({
          queryKey: matchKeys.lists(),
        });

        // Also invalidate the creator's matches
        queryClient.invalidateQueries({
          queryKey: matchKeys.byCreator(match.created_by),
        });
      }

      // Call custom onSuccess callback
      onSuccess?.(match);
    },

    onError: error => {
      // Call custom onError callback
      onError?.(error);
    },
  });

  return {
    /**
     * Create a new match
     */
    createMatch: mutation.mutate,

    /**
     * Create a new match (async version)
     */
    createMatchAsync: mutation.mutateAsync,

    /**
     * Whether the mutation is in progress
     */
    isCreating: mutation.isPending,

    /**
     * Whether the mutation was successful
     */
    isSuccess: mutation.isSuccess,

    /**
     * Whether the mutation failed
     */
    isError: mutation.isError,

    /**
     * The error if mutation failed
     */
    error: mutation.error,

    /**
     * The created match data (available after success)
     */
    createdMatch: mutation.data,

    /**
     * Reset the mutation state
     */
    reset: mutation.reset,
  };
}

export default useCreateMatch;
