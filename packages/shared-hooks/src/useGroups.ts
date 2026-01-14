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
  type Group,
  type GroupWithMembers,
  type GroupMember,
  type GroupActivity,
  type GroupStats,
  type CreateGroupInput,
  type UpdateGroupInput,
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
  isModerator: (groupId: string, playerId: string) =>
    [...groupKeys.detail(groupId), 'moderator', playerId] as const,
  isMember: (groupId: string, playerId: string) =>
    [...groupKeys.detail(groupId), 'member', playerId] as const,
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
    mutationFn: ({
      groupId,
      playerId,
      input,
    }: {
      groupId: string;
      playerId: string;
      input: UpdateGroupInput;
    }) => updateGroup(groupId, playerId, input),
    onSuccess: data => {
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
    mutationFn: ({
      groupId,
      inviterId,
      playerIdToAdd,
    }: {
      groupId: string;
      inviterId: string;
      playerIdToAdd: string;
    }) => addGroupMember(groupId, inviterId, playerIdToAdd),
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
    mutationFn: ({
      groupId,
      moderatorId,
      playerIdToRemove,
    }: {
      groupId: string;
      moderatorId: string;
      playerIdToRemove: string;
    }) => removeGroupMember(groupId, moderatorId, playerIdToRemove),
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
    mutationFn: ({
      groupId,
      moderatorId,
      playerIdToPromote,
    }: {
      groupId: string;
      moderatorId: string;
      playerIdToPromote: string;
    }) => promoteMember(groupId, moderatorId, playerIdToPromote),
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
    mutationFn: ({
      groupId,
      moderatorId,
      playerIdToDemote,
    }: {
      groupId: string;
      moderatorId: string;
      playerIdToDemote: string;
    }) => demoteMember(groupId, moderatorId, playerIdToDemote),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.withMembers(variables.groupId) });
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
};
