/**
 * useInviteToMatch Hook
 * Mutation hook for inviting players to a match.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invitePlayersToMatch } from '@rallia/shared-services';
import type { InvitePlayersResult } from '@rallia/shared-services';
import { matchKeys } from './useCreateMatch';

/**
 * Options for the useInviteToMatch hook
 */
interface UseInviteToMatchOptions {
  /** Match ID to invite players to */
  matchId: string;
  /** Host ID (current user) */
  hostId: string;
  /** Callback when invitation succeeds */
  onSuccess?: (result: InvitePlayersResult) => void;
  /** Callback when invitation fails */
  onError?: (error: Error) => void;
}

/**
 * Hook for inviting players to a match.
 *
 * @example
 * ```tsx
 * const { invitePlayers, isInviting, error } = useInviteToMatch({
 *   matchId: 'match-123',
 *   hostId: session.user.id,
 *   onSuccess: (result) => {
 *     showToast(`Invited ${result.invited.length} players`);
 *   },
 * });
 *
 * // Invite selected players
 * invitePlayers(['player-1', 'player-2']);
 * ```
 */
export function useInviteToMatch(options: UseInviteToMatchOptions) {
  const { matchId, hostId, onSuccess, onError } = options;
  const queryClient = useQueryClient();

  const mutation = useMutation<InvitePlayersResult, Error, string[]>({
    mutationFn: async (playerIds: string[]) => {
      return invitePlayersToMatch(matchId, playerIds, hostId);
    },
    onSuccess: result => {
      // Invalidate match detail query to refresh participant list
      queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
      // Also invalidate the player's matches list
      queryClient.invalidateQueries({ queryKey: matchKeys.list('player') });
      onSuccess?.(result);
    },
    onError: error => {
      onError?.(error);
    },
  });

  return {
    /** Function to invite players - pass array of player IDs */
    invitePlayers: mutation.mutate,
    /** Async version of invitePlayers */
    invitePlayersAsync: mutation.mutateAsync,
    /** Whether invitation is in progress */
    isInviting: mutation.isPending,
    /** Error if invitation failed */
    error: mutation.error,
    /** Reset mutation state */
    reset: mutation.reset,
  };
}

export default useInviteToMatch;
