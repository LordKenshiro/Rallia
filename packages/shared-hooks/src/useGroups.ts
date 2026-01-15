/**
 * useGroups Hook
 * React Query hooks for managing player groups
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPlayerGroups,
  getGroup,
  getGroupWithMembers,
  createGroup,
  updateGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  leaveGroup,
  promoteMember,
  demoteMember,
  getGroupActivity,
  getGroupStats,
  isGroupModerator,
  isGroupMember,
  getOrCreateGroupInviteCode,
  joinGroupByInviteCode,
  resetGroupInviteCode,
  getGroupInviteLink,
  getGroupMatches,
  getMostRecentGroupMatch,
  getGroupLeaderboard,
  postMatchToGroup,
  removeMatchFromGroup,
  createPlayedMatch,
  getPendingScoreConfirmations,
  confirmMatchScore,
  disputeMatchScore,
  type Group,
  type GroupWithMembers,
  type GroupMember,
  type GroupActivity,
  type GroupStats,
  type CreateGroupInput,
  type UpdateGroupInput,
  type GroupMatch,
  type LeaderboardEntry,
  type CreatePlayedMatchInput,
  type PendingScoreConfirmation,
} from '@rallia/shared-services';

// Query Keys
export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  playerGroups: (playerId: string) => [...groupKeys.lists(), playerId] as const,
  details: () => [...groupKeys.all, 'detail'] as const,
  detail: (groupId: string) => [...groupKeys.details(), groupId] as const,
  withMembers: (groupId: string) => [...groupKeys.detail(groupId), 'members'] as const,
  activity: (groupId: string) => [...groupKeys.detail(groupId), 'activity'] as const,
  stats: (groupId: string) => [...groupKeys.detail(groupId), 'stats'] as const,
  isModerator: (groupId: string, playerId: string) => [...groupKeys.detail(groupId), 'moderator', playerId] as const,
  isMember: (groupId: string, playerId: string) => [...groupKeys.detail(groupId), 'member', playerId] as const,
  inviteCode: (groupId: string) => [...groupKeys.detail(groupId), 'inviteCode'] as const,
  matches: (groupId: string, daysBack?: number) => [...groupKeys.detail(groupId), 'matches', daysBack] as const,
  recentMatch: (groupId: string) => [...groupKeys.detail(groupId), 'recentMatch'] as const,
  leaderboard: (groupId: string, daysBack?: number) => [...groupKeys.detail(groupId), 'leaderboard', daysBack] as const,
  pendingConfirmations: (playerId: string) => [...groupKeys.all, 'pendingConfirmations', playerId] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Get all groups for the current player
 */
export function usePlayerGroups(playerId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.playerGroups(playerId || ''),
    queryFn: () => getPlayerGroups(playerId!),
    enabled: !!playerId,
  });
}

/**
 * Get a single group by ID
 */
export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.detail(groupId || ''),
    queryFn: () => getGroup(groupId!),
    enabled: !!groupId,
  });
}

/**
 * Get a group with its members
 */
export function useGroupWithMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.withMembers(groupId || ''),
    queryFn: () => getGroupWithMembers(groupId!),
    enabled: !!groupId,
  });
}

/**
 * Get group activity feed
 */
export function useGroupActivity(groupId: string | undefined, limit: number = 20) {
  return useQuery({
    queryKey: groupKeys.activity(groupId || ''),
    queryFn: () => getGroupActivity(groupId!, limit),
    enabled: !!groupId,
  });
}

/**
 * Get group statistics
 */
export function useGroupStats(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.stats(groupId || ''),
    queryFn: () => getGroupStats(groupId!),
    enabled: !!groupId,
  });
}

/**
 * Check if a player is a moderator of a group
 */
export function useIsGroupModerator(groupId: string | undefined, playerId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.isModerator(groupId || '', playerId || ''),
    queryFn: () => isGroupModerator(groupId!, playerId!),
    enabled: !!groupId && !!playerId,
  });
}

/**
 * Check if a player is a member of a group
 */
export function useIsGroupMember(groupId: string | undefined, playerId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.isMember(groupId || '', playerId || ''),
    queryFn: () => isGroupMember(groupId!, playerId!),
    enabled: !!groupId && !!playerId,
  });
}

/**
 * Get or create an invite code for a group
 */
export function useGroupInviteCode(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.inviteCode(groupId || ''),
    queryFn: () => getOrCreateGroupInviteCode(groupId!),
    enabled: !!groupId,
    staleTime: Infinity, // Invite codes don't change unless explicitly reset
  });
}

/**
 * Helper to get the full invite link URL
 */
export { getGroupInviteLink };

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Create a new group
 */
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playerId, input }: { playerId: string; input: CreateGroupInput }) =>
      createGroup(playerId, input),
    onSuccess: (_, variables) => {
      // Invalidate player groups list
      queryClient.invalidateQueries({ queryKey: groupKeys.playerGroups(variables.playerId) });
    },
  });
}

/**
 * Update a group
 */
export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, playerId, input }: { groupId: string; playerId: string; input: UpdateGroupInput }) =>
      updateGroup(groupId, playerId, input),
    onSuccess: (data) => {
      // Update the cached group
      queryClient.setQueryData(groupKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: groupKeys.withMembers(data.id) });
    },
  });
}

/**
 * Delete a group
 */
export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, playerId }: { groupId: string; playerId: string }) =>
      deleteGroup(groupId, playerId),
    onSuccess: (_, variables) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: groupKeys.detail(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
}

/**
 * Add a member to a group
 */
export function useAddGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, inviterId, playerIdToAdd }: { groupId: string; inviterId: string; playerIdToAdd: string }) =>
      addGroupMember(groupId, inviterId, playerIdToAdd),
    onSuccess: (_, variables) => {
      // Invalidate group members and stats
      queryClient.invalidateQueries({ queryKey: groupKeys.withMembers(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.stats(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.activity(variables.groupId) });
    },
  });
}

/**
 * Remove a member from a group
 */
export function useRemoveGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, moderatorId, playerIdToRemove }: { groupId: string; moderatorId: string; playerIdToRemove: string }) =>
      removeGroupMember(groupId, moderatorId, playerIdToRemove),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.withMembers(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.stats(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.activity(variables.groupId) });
    },
  });
}

/**
 * Leave a group
 */
export function useLeaveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, playerId }: { groupId: string; playerId: string }) =>
      leaveGroup(groupId, playerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.playerGroups(variables.playerId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.withMembers(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.stats(variables.groupId) });
    },
  });
}

/**
 * Promote a member to moderator
 */
export function usePromoteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, moderatorId, playerIdToPromote }: { groupId: string; moderatorId: string; playerIdToPromote: string }) =>
      promoteMember(groupId, moderatorId, playerIdToPromote),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.withMembers(variables.groupId) });
    },
  });
}

/**
 * Demote a moderator to member
 */
export function useDemoteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, moderatorId, playerIdToDemote }: { groupId: string; moderatorId: string; playerIdToDemote: string }) =>
      demoteMember(groupId, moderatorId, playerIdToDemote),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.withMembers(variables.groupId) });
    },
  });
}

/**
 * Join a group using an invite code
 */
export function useJoinGroupByInviteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ inviteCode, playerId }: { inviteCode: string; playerId: string }) =>
      joinGroupByInviteCode(inviteCode, playerId),
    onSuccess: (result) => {
      if (result.success && result.groupId) {
        // Invalidate player's groups list and the joined group
        queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
        queryClient.invalidateQueries({ queryKey: groupKeys.withMembers(result.groupId) });
        queryClient.invalidateQueries({ queryKey: groupKeys.activity(result.groupId) });
      }
    },
  });
}

/**
 * Reset (regenerate) the invite code for a group
 */
export function useResetGroupInviteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, moderatorId }: { groupId: string; moderatorId: string }) =>
      resetGroupInviteCode(groupId, moderatorId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.inviteCode(variables.groupId) });
    },
  });
}

// =============================================================================
// GROUP MATCHES/GAMES HOOKS
// =============================================================================

/**
 * Get matches posted to a group
 */
export function useGroupMatches(groupId: string | undefined, daysBack: number = 180, limit: number = 50) {
  return useQuery({
    queryKey: groupKeys.matches(groupId!, daysBack),
    queryFn: () => getGroupMatches(groupId!, daysBack, limit),
    enabled: !!groupId,
  });
}

/**
 * Get the most recent match posted to a group
 */
export function useMostRecentGroupMatch(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.recentMatch(groupId!),
    queryFn: () => getMostRecentGroupMatch(groupId!),
    enabled: !!groupId,
  });
}

/**
 * Get leaderboard for a group
 */
export function useGroupLeaderboard(groupId: string | undefined, daysBack: number = 30) {
  return useQuery({
    queryKey: groupKeys.leaderboard(groupId!, daysBack),
    queryFn: () => getGroupLeaderboard(groupId!, daysBack),
    enabled: !!groupId,
  });
}

/**
 * Post a match to a group
 */
export function usePostMatchToGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ matchId, groupId, playerId }: { matchId: string; groupId: string; playerId: string }) =>
      postMatchToGroup(matchId, groupId, playerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.matches(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.recentMatch(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.leaderboard(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.activity(variables.groupId) });
    },
  });
}

/**
 * Remove a match from a group
 */
export function useRemoveMatchFromGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ matchId, groupId }: { matchId: string; groupId: string }) =>
      removeMatchFromGroup(matchId, groupId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.matches(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.recentMatch(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.leaderboard(variables.groupId) });
    },
  });
}

/**
 * Create a played match and post it to a group
 */
export function useCreatePlayedMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePlayedMatchInput) => createPlayedMatch(input),
    onSuccess: (_, variables) => {
      if (variables.networkId) {
        queryClient.invalidateQueries({ queryKey: groupKeys.matches(variables.networkId) });
        queryClient.invalidateQueries({ queryKey: groupKeys.recentMatch(variables.networkId) });
        queryClient.invalidateQueries({ queryKey: groupKeys.leaderboard(variables.networkId) });
        queryClient.invalidateQueries({ queryKey: groupKeys.activity(variables.networkId) });
        queryClient.invalidateQueries({ queryKey: groupKeys.stats(variables.networkId) });
      }
    },
  });
}

// =============================================================================
// SCORE CONFIRMATION HOOKS
// =============================================================================

/**
 * Get pending score confirmations for the current player
 */
export function usePendingScoreConfirmations(playerId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.pendingConfirmations(playerId!),
    queryFn: () => getPendingScoreConfirmations(playerId!),
    enabled: !!playerId,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}

/**
 * Confirm a match score
 */
export function useConfirmMatchScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ matchResultId, playerId }: { matchResultId: string; playerId: string }) =>
      confirmMatchScore(matchResultId, playerId),
    onSuccess: (_, variables) => {
      // Invalidate pending confirmations
      queryClient.invalidateQueries({ queryKey: groupKeys.pendingConfirmations(variables.playerId) });
      // Invalidate all leaderboards (we don't know which group this affects)
      queryClient.invalidateQueries({ queryKey: [...groupKeys.all, 'detail'] });
    },
  });
}

/**
 * Dispute a match score
 */
export function useDisputeMatchScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchResultId,
      playerId,
      reason,
    }: {
      matchResultId: string;
      playerId: string;
      reason?: string;
    }) => disputeMatchScore(matchResultId, playerId, reason),
    onSuccess: (_, variables) => {
      // Invalidate pending confirmations
      queryClient.invalidateQueries({ queryKey: groupKeys.pendingConfirmations(variables.playerId) });
    },
  });
}

// Re-export types
export type {
  Group,
  GroupWithMembers,
  GroupMember,
  GroupActivity,
  GroupStats,
  CreateGroupInput,
  UpdateGroupInput,
  GroupMatch,
  LeaderboardEntry,
  CreatePlayedMatchInput,
  PendingScoreConfirmation,
};
