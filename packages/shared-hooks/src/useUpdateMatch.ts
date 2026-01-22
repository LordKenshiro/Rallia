/**
 * useUpdateMatch Hook
 * Custom hook for updating matches with TanStack Query.
 * Provides error handling and cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMatch, type CreateMatchInput } from '@rallia/shared-services';
import type { Match } from '@rallia/shared-types';
import { matchKeys } from './useCreateMatch';

/**
 * Input for update mutation - includes matchId and partial updates
 */
interface UpdateMatchInput {
  matchId: string;
  updates: Partial<CreateMatchInput>;
  /** Skip server-side validation (use when client has already validated) */
  skipValidation?: boolean;
}

/**
 * Options for the useUpdateMatch hook
 */
interface UseUpdateMatchOptions {
  /**
   * Callback when match is updated successfully
   */
  onSuccess?: (match: Match) => void;

  /**
   * Callback when match update fails
   */
  onError?: (error: Error) => void;

  /**
   * Whether to invalidate match lists after update
   * @default true
   */
  invalidateOnSuccess?: boolean;
}

/**
 * Hook for updating an existing match
 *
 * @example
 * ```tsx
 * const { updateMatch, isUpdating, error } = useUpdateMatch({
 *   onSuccess: (match) => {
 *     Alert.alert('Success', 'Match updated!');
 *   },
 *   onError: (error) => {
 *     Alert.alert('Error', error.message);
 *   },
 * });
 *
 * // Later in a form submit handler
 * updateMatch({
 *   matchId: existingMatch.id,
 *   updates: {
 *     matchDate: '2025-01-15',
 *     startTime: '14:00',
 *     // ... other fields to update
 *   },
 * });
 * ```
 */
export function useUpdateMatch(options: UseUpdateMatchOptions = {}) {
  const { onSuccess, onError, invalidateOnSuccess = true } = options;
  const queryClient = useQueryClient();

  const mutation = useMutation<Match, Error, UpdateMatchInput>({
    mutationFn: ({ matchId, updates, skipValidation }) =>
      updateMatch(matchId, updates, { skipValidation }),

    onSuccess: match => {
      // Invalidate match queries to refetch with updated data
      if (invalidateOnSuccess) {
        // Invalidate ALL match-related queries to ensure lists are refreshed
        // This covers: lists, player matches, nearby matches, public matches, etc.
        queryClient.invalidateQueries({
          queryKey: matchKeys.all,
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
     * Update an existing match
     */
    updateMatch: mutation.mutate,

    /**
     * Update an existing match (async version)
     */
    updateMatchAsync: mutation.mutateAsync,

    /**
     * Whether the mutation is in progress
     */
    isUpdating: mutation.isPending,

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
     * The updated match data (available after success)
     */
    updatedMatch: mutation.data,

    /**
     * Reset the mutation state
     */
    reset: mutation.reset,
  };
}

export default useUpdateMatch;
