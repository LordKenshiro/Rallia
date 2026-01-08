/**
 * useMatchActions Hook
 * Custom hook for match participant actions with TanStack Query mutations.
 * Provides join, leave, and cancel operations with cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  joinMatch,
  leaveMatch,
  cancelMatch,
  acceptJoinRequest,
  rejectJoinRequest,
  cancelJoinRequest,
  kickParticipant,
  cancelInvitation,
  resendInvitation,
  type JoinMatchResult,
} from '@rallia/shared-services';
import type { Match, MatchParticipant } from '@rallia/shared-types';
import { matchKeys } from './useCreateMatch';

/**
 * Options for the useMatchActions hook
 */
export interface UseMatchActionsOptions {
  /**
   * Callback when join succeeds
   */
  onJoinSuccess?: (result: JoinMatchResult) => void;

  /**
   * Callback when join fails
   */
  onJoinError?: (error: Error) => void;

  /**
   * Callback when leave succeeds
   */
  onLeaveSuccess?: () => void;

  /**
   * Callback when leave fails
   */
  onLeaveError?: (error: Error) => void;

  /**
   * Callback when cancel succeeds
   */
  onCancelSuccess?: (match: Match) => void;

  /**
   * Callback when cancel fails
   */
  onCancelError?: (error: Error) => void;

  /**
   * Callback when accept request succeeds
   */
  onAcceptSuccess?: (participant: MatchParticipant) => void;

  /**
   * Callback when accept request fails
   */
  onAcceptError?: (error: Error) => void;

  /**
   * Callback when reject request succeeds
   */
  onRejectSuccess?: (participant: MatchParticipant) => void;

  /**
   * Callback when reject request fails
   */
  onRejectError?: (error: Error) => void;

  /**
   * Callback when cancel request succeeds (requester cancelling their own request)
   */
  onCancelRequestSuccess?: (participant: MatchParticipant) => void;

  /**
   * Callback when cancel request fails
   */
  onCancelRequestError?: (error: Error) => void;

  /**
   * Callback when kick participant succeeds (host kicking a joined participant)
   */
  onKickSuccess?: (participant: MatchParticipant) => void;

  /**
   * Callback when kick participant fails
   */
  onKickError?: (error: Error) => void;

  /**
   * Callback when cancel invitation succeeds (host cancelling a pending invitation)
   */
  onCancelInviteSuccess?: (participant: MatchParticipant) => void;

  /**
   * Callback when cancel invitation fails
   */
  onCancelInviteError?: (error: Error) => void;

  /**
   * Callback when resend invitation succeeds (host resending an invitation)
   */
  onResendInviteSuccess?: (participant: MatchParticipant) => void;

  /**
   * Callback when resend invitation fails
   */
  onResendInviteError?: (error: Error) => void;
}

/**
 * Hook for match participant actions (join, leave, cancel)
 *
 * @example
 * ```tsx
 * const {
 *   joinMatch,
 *   leaveMatch,
 *   cancelMatch,
 *   isJoining,
 *   isLeaving,
 *   isCancelling,
 * } = useMatchActions(matchId, {
 *   onJoinSuccess: (result) => {
 *     if (result.status === 'joined') {
 *       showToast('You\'ve joined the match!');
 *     } else {
 *       showToast('Request sent to host');
 *     }
 *   },
 *   onLeaveSuccess: () => {
 *     showToast('You\'ve left the match');
 *     closeSheet();
 *   },
 *   onCancelSuccess: () => {
 *     showToast('Match cancelled');
 *     closeSheet();
 *   },
 * });
 *
 * // Usage
 * <Button onPress={() => joinMatch(playerId)} disabled={isJoining}>
 *   {isJoining ? 'Joining...' : 'Join Match'}
 * </Button>
 * ```
 */
export function useMatchActions(matchId: string | undefined, options: UseMatchActionsOptions = {}) {
  const {
    onJoinSuccess,
    onJoinError,
    onLeaveSuccess,
    onLeaveError,
    onCancelSuccess,
    onCancelError,
    onAcceptSuccess,
    onAcceptError,
    onRejectSuccess,
    onRejectError,
    onCancelRequestSuccess,
    onCancelRequestError,
    onKickSuccess,
    onKickError,
    onCancelInviteSuccess,
    onCancelInviteError,
    onResendInviteSuccess,
    onResendInviteError,
  } = options;

  const queryClient = useQueryClient();

  /**
   * Invalidate and refetch all relevant match queries after an action
   */
  const invalidateMatchQueries = async () => {
    // Invalidate the specific match detail
    if (matchId) {
      queryClient.invalidateQueries({
        queryKey: matchKeys.detail(matchId),
      });
    }

    // Reset all match list queries - this clears pagination state for infinite queries
    // and triggers a fresh fetch from the first page
    await queryClient.resetQueries({
      queryKey: matchKeys.lists(),
    });
  };

  // Join Match Mutation
  const joinMutation = useMutation<JoinMatchResult, Error, string>({
    mutationFn: async (playerId: string) => {
      if (!matchId) throw new Error('Match ID is required');
      return joinMatch(matchId, playerId);
    },
    onSuccess: async result => {
      // Wait for cache invalidation before calling success callback
      await invalidateMatchQueries();
      onJoinSuccess?.(result);
    },
    onError: error => {
      onJoinError?.(error);
    },
  });

  // Leave Match Mutation
  const leaveMutation = useMutation<void, Error, string>({
    mutationFn: async (playerId: string) => {
      if (!matchId) throw new Error('Match ID is required');
      return leaveMatch(matchId, playerId);
    },
    onSuccess: async () => {
      // Wait for cache invalidation before calling success callback
      await invalidateMatchQueries();
      onLeaveSuccess?.();
    },
    onError: error => {
      onLeaveError?.(error);
    },
  });

  // Cancel Match Mutation - requires userId for authorization check
  const cancelMutation = useMutation<Match, Error, string>({
    mutationFn: async (userId: string) => {
      if (!matchId) throw new Error('Match ID is required');
      return cancelMatch(matchId, userId);
    },
    onSuccess: async match => {
      // Wait for cache invalidation before calling success callback
      await invalidateMatchQueries();
      onCancelSuccess?.(match);
    },
    onError: error => {
      onCancelError?.(error);
    },
  });

  // Accept Join Request Mutation - requires participantId and hostId
  const acceptMutation = useMutation<
    MatchParticipant,
    Error,
    { participantId: string; hostId: string }
  >({
    mutationFn: async ({ participantId, hostId }) => {
      if (!matchId) throw new Error('Match ID is required');
      return acceptJoinRequest(matchId, participantId, hostId);
    },
    onSuccess: async participant => {
      // Wait for cache invalidation before calling success callback
      await invalidateMatchQueries();
      onAcceptSuccess?.(participant);
    },
    onError: error => {
      onAcceptError?.(error);
    },
  });

  // Reject Join Request Mutation - requires participantId and hostId
  const rejectMutation = useMutation<
    MatchParticipant,
    Error,
    { participantId: string; hostId: string }
  >({
    mutationFn: async ({ participantId, hostId }) => {
      if (!matchId) throw new Error('Match ID is required');
      return rejectJoinRequest(matchId, participantId, hostId);
    },
    onSuccess: async participant => {
      // Wait for cache invalidation before calling success callback
      await invalidateMatchQueries();
      onRejectSuccess?.(participant);
    },
    onError: error => {
      onRejectError?.(error);
    },
  });

  // Cancel Join Request Mutation - for requesters cancelling their own request
  const cancelRequestMutation = useMutation<MatchParticipant, Error, string>({
    mutationFn: async (playerId: string) => {
      if (!matchId) throw new Error('Match ID is required');
      return cancelJoinRequest(matchId, playerId);
    },
    onSuccess: async participant => {
      // Wait for cache invalidation before calling success callback
      await invalidateMatchQueries();
      onCancelRequestSuccess?.(participant);
    },
    onError: error => {
      onCancelRequestError?.(error);
    },
  });

  // Kick Participant Mutation - for host kicking a joined participant
  const kickMutation = useMutation<
    MatchParticipant,
    Error,
    { participantId: string; hostId: string }
  >({
    mutationFn: async ({ participantId, hostId }) => {
      if (!matchId) throw new Error('Match ID is required');
      return kickParticipant(matchId, participantId, hostId);
    },
    onSuccess: async participant => {
      // Wait for cache invalidation before calling success callback
      await invalidateMatchQueries();
      onKickSuccess?.(participant);
    },
    onError: error => {
      onKickError?.(error);
    },
  });

  // Cancel Invitation Mutation - for host cancelling a pending invitation
  const cancelInviteMutation = useMutation<
    MatchParticipant,
    Error,
    { participantId: string; hostId: string }
  >({
    mutationFn: async ({ participantId, hostId }) => {
      if (!matchId) throw new Error('Match ID is required');
      return cancelInvitation(matchId, participantId, hostId);
    },
    onSuccess: async participant => {
      // Wait for cache invalidation before calling success callback
      await invalidateMatchQueries();
      onCancelInviteSuccess?.(participant);
    },
    onError: error => {
      onCancelInviteError?.(error);
    },
  });

  // Resend Invitation Mutation - for host resending an invitation
  const resendInviteMutation = useMutation<
    MatchParticipant,
    Error,
    { participantId: string; hostId: string }
  >({
    mutationFn: async ({ participantId, hostId }) => {
      if (!matchId) throw new Error('Match ID is required');
      return resendInvitation(matchId, participantId, hostId);
    },
    onSuccess: async participant => {
      // Wait for cache invalidation before calling success callback
      await invalidateMatchQueries();
      onResendInviteSuccess?.(participant);
    },
    onError: error => {
      onResendInviteError?.(error);
    },
  });

  return {
    // Join actions
    /**
     * Join a match as a participant
     * @param playerId - The ID of the player joining
     */
    joinMatch: joinMutation.mutate,
    joinMatchAsync: joinMutation.mutateAsync,
    isJoining: joinMutation.isPending,
    joinError: joinMutation.error,
    joinResult: joinMutation.data,

    // Leave actions
    /**
     * Leave a match as a participant
     * @param playerId - The ID of the player leaving
     */
    leaveMatch: leaveMutation.mutate,
    leaveMatchAsync: leaveMutation.mutateAsync,
    isLeaving: leaveMutation.isPending,
    leaveError: leaveMutation.error,

    // Cancel actions
    /**
     * Cancel a match (host only)
     */
    cancelMatch: cancelMutation.mutate,
    cancelMatchAsync: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
    cancelError: cancelMutation.error,

    // Accept request actions (host only)
    /**
     * Accept a join request (host only)
     * @param params.participantId - The participant record ID
     * @param params.hostId - The host's player ID
     */
    acceptRequest: acceptMutation.mutate,
    acceptRequestAsync: acceptMutation.mutateAsync,
    isAccepting: acceptMutation.isPending,
    acceptError: acceptMutation.error,

    // Reject request actions (host only)
    /**
     * Reject a join request (host only)
     * @param params.participantId - The participant record ID
     * @param params.hostId - The host's player ID
     */
    rejectRequest: rejectMutation.mutate,
    rejectRequestAsync: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,
    rejectError: rejectMutation.error,

    // Cancel request actions (requester only)
    /**
     * Cancel a pending join request (requester only)
     * @param playerId - The player's ID
     */
    cancelRequest: cancelRequestMutation.mutate,
    cancelRequestAsync: cancelRequestMutation.mutateAsync,
    isCancellingRequest: cancelRequestMutation.isPending,
    cancelRequestError: cancelRequestMutation.error,

    // Kick participant actions (host only)
    /**
     * Kick a joined participant (host only)
     * @param params.participantId - The participant record ID
     * @param params.hostId - The host's player ID
     */
    kickParticipant: kickMutation.mutate,
    kickParticipantAsync: kickMutation.mutateAsync,
    isKicking: kickMutation.isPending,
    kickError: kickMutation.error,

    // Cancel invitation actions (host only)
    /**
     * Cancel a pending invitation (host only)
     * @param params.participantId - The participant record ID
     * @param params.hostId - The host's player ID
     */
    cancelInvite: cancelInviteMutation.mutate,
    cancelInviteAsync: cancelInviteMutation.mutateAsync,
    isCancellingInvite: cancelInviteMutation.isPending,
    cancelInviteError: cancelInviteMutation.error,

    // Resend invitation actions (host only)
    /**
     * Resend an invitation (host only)
     * @param params.participantId - The participant record ID
     * @param params.hostId - The host's player ID
     */
    resendInvite: resendInviteMutation.mutate,
    resendInviteAsync: resendInviteMutation.mutateAsync,
    isResendingInvite: resendInviteMutation.isPending,
    resendInviteError: resendInviteMutation.error,

    // Combined loading state
    /**
     * Whether any action is in progress
     */
    isLoading:
      joinMutation.isPending ||
      leaveMutation.isPending ||
      cancelMutation.isPending ||
      acceptMutation.isPending ||
      rejectMutation.isPending ||
      cancelRequestMutation.isPending ||
      kickMutation.isPending ||
      cancelInviteMutation.isPending ||
      resendInviteMutation.isPending,

    // Reset all mutations
    /**
     * Reset all mutation states
     */
    reset: () => {
      joinMutation.reset();
      leaveMutation.reset();
      cancelMutation.reset();
      acceptMutation.reset();
      rejectMutation.reset();
      cancelRequestMutation.reset();
      kickMutation.reset();
      cancelInviteMutation.reset();
      resendInviteMutation.reset();
    },
  };
}

export default useMatchActions;
