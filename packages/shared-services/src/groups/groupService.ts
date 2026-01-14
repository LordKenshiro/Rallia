/**
 * Group Service
 * Handles all operations for Player Groups (private circles)
 */

import { supabase } from '../supabase';

// Types
export interface Group {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  max_members: number;
  member_count: number;
  conversation_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  network_id: string;
  player_id: string;
  role: 'member' | 'moderator';
  status: 'active' | 'pending' | 'blocked' | 'removed';
  invited_by: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
  player?: {
    id: string;
    profile?: {
      first_name: string;
      last_name: string | null;
      display_name: string | null;
      profile_picture_url: string | null;
    };
  };
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
}

export interface GroupActivity {
  id: string;
  network_id: string;
  activity_type: 'member_joined' | 'member_left' | 'game_created' | 'message_sent' | 'group_updated';
  actor_id: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor?: {
    id: string;
    profile?: {
      first_name: string;
      last_name: string | null;
      profile_picture_url: string | null;
    };
  };
}

export interface GroupStats {
  memberCount: number;
  newMembersLast7Days: number;
  gamesCreatedLast7Days: number;
  messagesLast7Days: number;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
}

// =============================================================================
// GROUP CRUD OPERATIONS
// =============================================================================

/**
 * Get the player_group network type ID
 */
async function getPlayerGroupTypeId(): Promise<string> {
  const { data, error } = await supabase
    .from('network_type')
    .select('id')
    .eq('name', 'player_group')
    .single();

  if (error || !data) {
    throw new Error('Player group type not found');
  }

  return data.id;
}

/**
 * Create a new player group
 */
export async function createGroup(
  playerId: string,
  input: CreateGroupInput
): Promise<Group> {
  const typeId = await getPlayerGroupTypeId();

  const { data, error } = await supabase
    .from('network')
    .insert({
      network_type_id: typeId,
      name: input.name,
      description: input.description || null,
      is_private: true, // Groups are always private
      created_by: playerId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating group:', error);
    throw new Error(error.message);
  }

  return data as Group;
}

/**
 * Get a group by ID
 */
export async function getGroup(groupId: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('network')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching group:', error);
    throw new Error(error.message);
  }

  return data as Group;
}

/**
 * Get a group with its members
 */
export async function getGroupWithMembers(groupId: string): Promise<GroupWithMembers | null> {
  const { data: group, error: groupError } = await supabase
    .from('network')
    .select('*')
    .eq('id', groupId)
    .single();

  if (groupError) {
    if (groupError.code === 'PGRST116') return null;
    throw new Error(groupError.message);
  }

  const { data: members, error: membersError } = await supabase
    .from('network_member')
    .select(`
      *,
      player:player_id (
        id,
        profile:id (
          first_name,
          last_name,
          display_name,
          profile_picture_url
        )
      )
    `)
    .eq('network_id', groupId)
    .eq('status', 'active')
    .order('role', { ascending: false }) // Moderators first
    .order('joined_at', { ascending: true });

  if (membersError) {
    throw new Error(membersError.message);
  }

  return {
    ...(group as Group),
    members: members as GroupMember[],
  };
}

/**
 * Get all groups for a player (groups they are a member of)
 */
export async function getPlayerGroups(playerId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('network_member')
    .select(`
      network:network_id (
        *
      )
    `)
    .eq('player_id', playerId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching player groups:', error);
    throw new Error(error.message);
  }

  // Extract networks from the join - use explicit type cast due to Supabase relation inference
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups = (data || []).map((d: any) => d.network).filter(Boolean) as Group[];
  return groups;
}

/**
 * Update a group (moderators only)
 */
export async function updateGroup(
  groupId: string,
  playerId: string,
  input: UpdateGroupInput
): Promise<Group> {
  // Verify the player is a moderator
  const isMod = await isGroupModerator(groupId, playerId);
  if (!isMod) {
    throw new Error('Only moderators can update the group');
  }

  const { data, error } = await supabase
    .from('network')
    .update({
      name: input.name,
      description: input.description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId)
    .select()
    .single();

  if (error) {
    console.error('Error updating group:', error);
    throw new Error(error.message);
  }

  return data as Group;
}

/**
 * Delete a group (creator only)
 */
export async function deleteGroup(groupId: string, playerId: string): Promise<void> {
  // Verify the player is the creator
  const group = await getGroup(groupId);
  if (!group || group.created_by !== playerId) {
    throw new Error('Only the group creator can delete the group');
  }

  const { error } = await supabase
    .from('network')
    .delete()
    .eq('id', groupId);

  if (error) {
    console.error('Error deleting group:', error);
    throw new Error(error.message);
  }
}

// =============================================================================
// MEMBER MANAGEMENT
// =============================================================================

/**
 * Check if a player is a group moderator
 */
export async function isGroupModerator(groupId: string, playerId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('network_member')
    .select('role')
    .eq('network_id', groupId)
    .eq('player_id', playerId)
    .eq('status', 'active')
    .single();

  if (error || !data) return false;
  return data.role === 'moderator';
}

/**
 * Check if a player is a group member
 */
export async function isGroupMember(groupId: string, playerId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('network_member')
    .select('id')
    .eq('network_id', groupId)
    .eq('player_id', playerId)
    .eq('status', 'active')
    .single();

  return !error && !!data;
}

/**
 * Get member info for a player in a group
 */
export async function getGroupMemberInfo(
  groupId: string,
  playerId: string
): Promise<GroupMember | null> {
  const { data, error } = await supabase
    .from('network_member')
    .select(`
      *,
      player:player_id (
        id,
        profile:id (
          first_name,
          last_name,
          display_name,
          profile_picture_url
        )
      )
    `)
    .eq('network_id', groupId)
    .eq('player_id', playerId)
    .single();

  if (error) return null;
  return data as GroupMember;
}

/**
 * Add a member to a group
 * - Members can add other members (as regular members)
 * - Moderators can add other members (as regular members)
 */
export async function addGroupMember(
  groupId: string,
  inviterId: string,
  playerIdToAdd: string
): Promise<GroupMember> {
  // Verify inviter is a member
  const inviterIsMember = await isGroupMember(groupId, inviterId);
  if (!inviterIsMember) {
    throw new Error('You must be a member to add others');
  }

  // Check if the player is already a member
  const existingMember = await getGroupMemberInfo(groupId, playerIdToAdd);
  if (existingMember && existingMember.status === 'active') {
    throw new Error('Player is already a member of this group');
  }

  // Check group capacity
  const group = await getGroup(groupId);
  if (group && group.member_count >= group.max_members) {
    throw new Error(`Group has reached maximum capacity of ${group.max_members} members`);
  }

  const { data, error } = await supabase
    .from('network_member')
    .upsert({
      network_id: groupId,
      player_id: playerIdToAdd,
      role: 'member',
      status: 'active',
      invited_by: inviterId,
      joined_at: new Date().toISOString(),
    }, {
      onConflict: 'network_id,player_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding member:', error);
    throw new Error(error.message);
  }

  return data as GroupMember;
}

/**
 * Remove a member from a group (moderators only)
 */
export async function removeGroupMember(
  groupId: string,
  moderatorId: string,
  playerIdToRemove: string
): Promise<void> {
  // Verify the actor is a moderator
  const isMod = await isGroupModerator(groupId, moderatorId);
  if (!isMod) {
    throw new Error('Only moderators can remove members');
  }

  // Cannot remove yourself as moderator if you're the only one
  if (moderatorId === playerIdToRemove) {
    const group = await getGroupWithMembers(groupId);
    const moderators = group?.members.filter(m => m.role === 'moderator') || [];
    if (moderators.length <= 1) {
      throw new Error('Cannot remove the last moderator. Transfer moderator role first or delete the group.');
    }
  }

  const { error } = await supabase
    .from('network_member')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('network_id', groupId)
    .eq('player_id', playerIdToRemove);

  if (error) {
    console.error('Error removing member:', error);
    throw new Error(error.message);
  }
}

/**
 * Leave a group (self-removal)
 */
export async function leaveGroup(groupId: string, playerId: string): Promise<void> {
  const memberInfo = await getGroupMemberInfo(groupId, playerId);
  
  if (!memberInfo || memberInfo.status !== 'active') {
    throw new Error('You are not a member of this group');
  }

  // Check if last moderator
  if (memberInfo.role === 'moderator') {
    const group = await getGroupWithMembers(groupId);
    const moderators = group?.members.filter(m => m.role === 'moderator') || [];
    if (moderators.length <= 1) {
      throw new Error('Cannot leave as the last moderator. Transfer moderator role first or delete the group.');
    }
  }

  const { error } = await supabase
    .from('network_member')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('network_id', groupId)
    .eq('player_id', playerId);

  if (error) {
    console.error('Error leaving group:', error);
    throw new Error(error.message);
  }
}

/**
 * Promote a member to moderator (moderators only)
 */
export async function promoteMember(
  groupId: string,
  moderatorId: string,
  playerIdToPromote: string
): Promise<GroupMember> {
  const isMod = await isGroupModerator(groupId, moderatorId);
  if (!isMod) {
    throw new Error('Only moderators can promote members');
  }

  const { data, error } = await supabase
    .from('network_member')
    .update({ role: 'moderator', updated_at: new Date().toISOString() })
    .eq('network_id', groupId)
    .eq('player_id', playerIdToPromote)
    .eq('status', 'active')
    .select()
    .single();

  if (error) {
    console.error('Error promoting member:', error);
    throw new Error(error.message);
  }

  return data as GroupMember;
}

/**
 * Demote a moderator to member (moderators only, cannot demote self if last mod)
 */
export async function demoteMember(
  groupId: string,
  moderatorId: string,
  playerIdToDemote: string
): Promise<GroupMember> {
  const isMod = await isGroupModerator(groupId, moderatorId);
  if (!isMod) {
    throw new Error('Only moderators can demote members');
  }

  // Cannot demote if last moderator
  const group = await getGroupWithMembers(groupId);
  const moderators = group?.members.filter(m => m.role === 'moderator') || [];
  if (moderators.length <= 1 && playerIdToDemote === moderatorId) {
    throw new Error('Cannot demote the last moderator');
  }

  const { data, error } = await supabase
    .from('network_member')
    .update({ role: 'member', updated_at: new Date().toISOString() })
    .eq('network_id', groupId)
    .eq('player_id', playerIdToDemote)
    .eq('status', 'active')
    .select()
    .single();

  if (error) {
    console.error('Error demoting member:', error);
    throw new Error(error.message);
  }

  return data as GroupMember;
}

// =============================================================================
// GROUP ACTIVITY & STATS
// =============================================================================

/**
 * Get recent activity for a group
 */
export async function getGroupActivity(
  groupId: string,
  limit: number = 20
): Promise<GroupActivity[]> {
  const { data, error } = await supabase
    .from('group_activity')
    .select(`
      *,
      actor:actor_id (
        id,
        profile:id (
          first_name,
          last_name,
          profile_picture_url
        )
      )
    `)
    .eq('network_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching group activity:', error);
    throw new Error(error.message);
  }

  return data as GroupActivity[];
}

/**
 * Log a group activity (for game creation, etc.)
 */
export async function logGroupActivity(
  groupId: string,
  activityType: GroupActivity['activity_type'],
  actorId: string | null,
  targetId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('group_activity')
    .insert({
      network_id: groupId,
      activity_type: activityType,
      actor_id: actorId,
      target_id: targetId || null,
      metadata: metadata || null,
    });

  if (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity logging should not break main operations
  }
}

/**
 * Get group statistics for the home view
 */
export async function getGroupStats(groupId: string): Promise<GroupStats> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  // Get member count
  const { count: memberCount } = await supabase
    .from('network_member')
    .select('*', { count: 'exact', head: true })
    .eq('network_id', groupId)
    .eq('status', 'active');

  // Get new members in last 7 days
  const { count: newMembers } = await supabase
    .from('network_member')
    .select('*', { count: 'exact', head: true })
    .eq('network_id', groupId)
    .eq('status', 'active')
    .gte('joined_at', sevenDaysAgoISO);

  // Get games created in last 7 days (from activity log)
  const { count: gamesCreated } = await supabase
    .from('group_activity')
    .select('*', { count: 'exact', head: true })
    .eq('network_id', groupId)
    .eq('activity_type', 'game_created')
    .gte('created_at', sevenDaysAgoISO);

  // Get message count in last 7 days (from activity log)
  const { count: messages } = await supabase
    .from('group_activity')
    .select('*', { count: 'exact', head: true })
    .eq('network_id', groupId)
    .eq('activity_type', 'message_sent')
    .gte('created_at', sevenDaysAgoISO);

  return {
    memberCount: memberCount || 0,
    newMembersLast7Days: newMembers || 0,
    gamesCreatedLast7Days: gamesCreated || 0,
    messagesLast7Days: messages || 0,
  };
}

/**
 * Get leaderboard for a group (members with most wins)
 * This is a placeholder - actual implementation depends on how match results are tracked per group
 */
export async function getGroupLeaderboard(
  groupId: string,
  _period: '7days' | '30days' | 'all' = '30days'
): Promise<Array<{
  playerId: string;
  playerName: string;
  profilePicture: string | null;
  gamesPlayed: number;
  wins: number;
}>> {
  // TODO: Implement when match tracking per group is available
  // For now, return empty array
  void groupId; // Suppress unused variable warning
  return [];
}
