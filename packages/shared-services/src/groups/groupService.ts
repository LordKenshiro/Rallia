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
  cover_image_url: string | null;
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
  added_by: string | null;
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
      last_active_at: string | null;
    };
  };
  // Resolved name of who added this member (populated in some queries)
  added_by_name?: string | null;
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
}

export interface GroupActivity {
  id: string;
  network_id: string;
  activity_type: 'member_joined' | 'member_left' | 'member_promoted' | 'member_demoted' | 'game_created' | 'message_sent' | 'group_updated';
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
  // Resolved name of who added the member (for member_joined activities)
  added_by_name?: string | null;
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
  cover_image_url?: string;
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  cover_image_url?: string;
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
      cover_image_url: input.cover_image_url || null,
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
    console.error('Error fetching group:', groupError);
    throw new Error(groupError.message);
  }

  const { data: members, error: membersError } = await supabase
    .from('network_member')
    .select(`
      *,
      player:player_id (
        id,
        profile (
          first_name,
          last_name,
          display_name,
          profile_picture_url,
          last_active_at
        )
      )
    `)
    .eq('network_id', groupId)
    .eq('status', 'active')
    .order('role', { ascending: false }) // Moderators first
    .order('joined_at', { ascending: true });

  if (membersError) {
    console.error('Error fetching members:', membersError);
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

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (input.name !== undefined) {
    updateData.name = input.name;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  if (input.cover_image_url !== undefined) {
    updateData.cover_image_url = input.cover_image_url;
  }

  const { data, error } = await supabase
    .from('network')
    .update(updateData)
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
      added_by: inviterId,
      status: 'active',
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

  // Log the promotion activity
  await logGroupActivity(
    groupId,
    'member_promoted',
    moderatorId,
    playerIdToPromote,
    { promoted_by: moderatorId }
  );

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

  // Log the demotion activity
  await logGroupActivity(
    groupId,
    'member_demoted',
    moderatorId,
    playerIdToDemote,
    { demoted_by: moderatorId }
  );

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
      id,
      network_id,
      player_id,
      activity_type,
      related_entity_id,
      metadata,
      created_at,
      player:player_id (
        id,
        profile (
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

  // Transform data to match GroupActivity interface
  const activities = (data || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    network_id: item.network_id as string,
    actor_id: item.player_id as string,
    activity_type: item.activity_type as GroupActivity['activity_type'],
    target_id: item.related_entity_id as string | null,
    metadata: item.metadata as Record<string, unknown> | null,
    created_at: item.created_at as string,
    actor: item.player as GroupActivity['actor'],
    added_by_name: null as string | null,
  }));

  // Extract unique added_by IDs from member_joined activities
  const addedByIds = new Set<string>();
  for (const activity of activities) {
    if (activity.activity_type === 'member_joined' && activity.metadata?.added_by) {
      const addedById = activity.metadata.added_by as string;
      // Only fetch if the adder is different from the actor (self-join doesn't need "added by")
      if (addedById !== activity.actor_id) {
        addedByIds.add(addedById);
      }
    }
  }

  // Fetch profiles for all added_by IDs
  if (addedByIds.size > 0) {
    const { data: profiles } = await supabase
      .from('player')
      .select('id, profile(first_name)')
      .in('id', Array.from(addedByIds));

    // Create a map for quick lookup
    const profileMap = new Map<string, string>();
    for (const p of profiles || []) {
      // profile can be an array or single object depending on the relationship
      const profileData = Array.isArray(p.profile) ? p.profile[0] : p.profile;
      const firstName = (profileData as { first_name?: string } | null)?.first_name;
      if (firstName) {
        profileMap.set(p.id, firstName);
      }
    }

    // Enrich activities with added_by_name
    for (const activity of activities) {
      if (activity.activity_type === 'member_joined' && activity.metadata?.added_by) {
        const addedById = activity.metadata.added_by as string;
        // Don't show "added by" for self-joins
        if (addedById !== activity.actor_id) {
          activity.added_by_name = profileMap.get(addedById) || null;
        }
      }
    }
  }

  return activities;
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
  // Only insert if we have an actorId (player_id is required in the table)
  if (!actorId) {
    console.warn('Cannot log activity without actorId');
    return;
  }

  const { error } = await supabase
    .from('group_activity')
    .insert({
      network_id: groupId,
      activity_type: activityType,
      player_id: actorId,
      related_entity_id: targetId || null,
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

// =============================================================================
// GROUP INVITE CODE FUNCTIONS
// =============================================================================

/**
 * Get or create an invite code for a group
 */
export async function getOrCreateGroupInviteCode(groupId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_group_invite_code', {
    group_id: groupId,
  });

  if (error) {
    console.error('Error getting/creating invite code:', error);
    throw new Error(error.message);
  }

  return data as string;
}

/**
 * Join a group using an invite code
 */
export async function joinGroupByInviteCode(
  inviteCode: string,
  playerId: string
): Promise<{ success: boolean; groupId?: string; groupName?: string; error?: string }> {
  const { data, error } = await supabase.rpc('join_group_by_invite_code', {
    p_invite_code: inviteCode.toUpperCase(),
    p_player_id: playerId,
  });

  if (error) {
    console.error('Error joining group by invite code:', error);
    throw new Error(error.message);
  }

  const result = data as { success: boolean; group_id?: string; group_name?: string; error?: string };
  
  return {
    success: result.success,
    groupId: result.group_id,
    groupName: result.group_name,
    error: result.error,
  };
}

/**
 * Reset (regenerate) the invite code for a group
 * Only moderators can do this
 */
export async function resetGroupInviteCode(
  groupId: string,
  moderatorId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('reset_group_invite_code', {
    p_group_id: groupId,
    p_moderator_id: moderatorId,
  });

  if (error) {
    console.error('Error resetting invite code:', error);
    throw new Error(error.message);
  }

  return data as string;
}

/**
 * Get the invite link URL for a group
 */
export function getGroupInviteLink(inviteCode: string): string {
  // Using a custom scheme that can be handled by the app
  // This can be a universal link or deep link depending on your setup
  return `https://rallia.app/join/${inviteCode}`;
}

// =============================================================================
// GROUP MATCHES/GAMES
// =============================================================================

export interface GroupMatch {
  id: string;
  match_id: string;
  network_id: string;
  posted_by: string;
  posted_at: string;
  match: {
    id: string;
    sport_id: string;
    match_date: string;
    start_time: string;
    player_expectation: 'practice' | 'competitive' | 'both';
    status: string;
    format: 'singles' | 'doubles';
    created_by: string;
    sport?: {
      id: string;
      name: string;
      icon_url: string | null;
    };
    participants: Array<{
      id: string;
      player_id: string;
      team_number: number | null;
      is_host: boolean;
      player?: {
        id: string;
        profile?: {
          first_name: string;
          last_name: string | null;
          display_name: string | null;
          profile_picture_url: string | null;
        };
      };
    }>;
    result?: {
      id: string;
      winning_team: number | null;
      team1_score: number | null;
      team2_score: number | null;
      is_verified: boolean;
    } | null;
  };
  posted_by_player?: {
    id: string;
    profile?: {
      first_name: string;
      last_name: string | null;
      display_name: string | null;
      profile_picture_url: string | null;
    };
  };
}

export interface LeaderboardEntry {
  player_id: string;
  games_played: number;
  games_won: number;
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

/**
 * Get matches posted to a group
 */
export async function getGroupMatches(
  groupId: string,
  daysBack: number = 180,
  limit: number = 50
): Promise<GroupMatch[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const { data, error } = await supabase
    .from('match_network')
    .select(`
      id,
      match_id,
      network_id,
      posted_by,
      posted_at,
      match:match_id (
        id,
        sport_id,
        match_date,
        start_time,
        player_expectation,
        status,
        format,
        created_by,
        sport:sport_id (
          id,
          name,
          icon_url
        ),
        participants:match_participant (
          id,
          player_id,
          team_number,
          is_host,
          player:player_id (
            id,
            profile:profile!inner (
              first_name,
              last_name,
              display_name,
              profile_picture_url
            )
          )
        ),
        result:match_result (
          id,
          winning_team,
          team1_score,
          team2_score,
          is_verified
        )
      ),
      posted_by_player:posted_by (
        id,
        profile:profile!inner (
          first_name,
          last_name,
          display_name,
          profile_picture_url
        )
      )
    `)
    .eq('network_id', groupId)
    .gte('posted_at', cutoffDate.toISOString())
    .order('posted_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching group matches:', error);
    throw new Error(error.message);
  }

  // Transform the data to handle Supabase's nested response format
  return (data || []).map((item: Record<string, unknown>) => {
    const match = item.match as Record<string, unknown> | null;
    const postedByPlayer = item.posted_by_player as Record<string, unknown> | null;
    
    return {
      id: item.id as string,
      match_id: item.match_id as string,
      network_id: item.network_id as string,
      posted_by: item.posted_by as string,
      posted_at: item.posted_at as string,
      match: match ? {
        id: match.id as string,
        sport_id: match.sport_id as string,
        match_date: match.match_date as string,
        start_time: match.start_time as string,
        player_expectation: match.player_expectation as 'practice' | 'competitive' | 'both',
        status: match.status as string,
        format: match.format as 'singles' | 'doubles',
        created_by: match.created_by as string,
        sport: match.sport as GroupMatch['match']['sport'],
        participants: (match.participants as Array<Record<string, unknown>> || []).map(p => ({
          id: p.id as string,
          player_id: p.player_id as string,
          team_number: p.team_number as number | null,
          is_host: p.is_host as boolean,
          player: p.player as GroupMatch['match']['participants'][0]['player'],
        })),
        result: Array.isArray(match.result) && match.result.length > 0 
          ? match.result[0] as GroupMatch['match']['result']
          : match.result as GroupMatch['match']['result'],
      } : undefined,
      posted_by_player: postedByPlayer as GroupMatch['posted_by_player'],
    } as GroupMatch;
  }).filter((item: GroupMatch) => item.match !== undefined);
}

/**
 * Get the most recent match posted to a group
 */
export async function getMostRecentGroupMatch(
  groupId: string
): Promise<GroupMatch | null> {
  const matches = await getGroupMatches(groupId, 180, 1);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Get leaderboard for a group based on games played
 */
export async function getGroupLeaderboard(
  groupId: string,
  daysBack: number = 30
): Promise<LeaderboardEntry[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  // First get all matches posted to this group within the time period
  const { data: matchNetworks, error: mnError } = await supabase
    .from('match_network')
    .select('match_id')
    .eq('network_id', groupId)
    .gte('posted_at', cutoffDate.toISOString());

  if (mnError) {
    console.error('Error fetching match networks:', mnError);
    throw new Error(mnError.message);
  }

  if (!matchNetworks || matchNetworks.length === 0) {
    return [];
  }

  const matchIds = matchNetworks.map(mn => mn.match_id);

  // Get all participants and results for these matches (only verified scores)
  const { data: participants, error: pError } = await supabase
    .from('match_participant')
    .select(`
      player_id,
      team_number,
      match:match_id (
        id,
        result:match_result (
          winning_team,
          is_verified,
          confirmation_deadline
        )
      ),
      player:player_id (
        id,
        profile:profile!inner (
          first_name,
          last_name,
          display_name,
          profile_picture_url
        )
      )
    `)
    .in('match_id', matchIds);

  if (pError) {
    console.error('Error fetching participants:', pError);
    throw new Error(pError.message);
  }

  // Aggregate by player (only count verified scores or auto-confirmed after deadline)
  const leaderboardMap = new Map<string, LeaderboardEntry>();
  const now = new Date();

  for (const p of participants || []) {
    const playerId = p.player_id;
    // Handle Supabase nested response - match can be array or object
    const matchData = Array.isArray(p.match) ? p.match[0] : p.match;
    const resultData = matchData?.result;
    const result = Array.isArray(resultData) ? resultData[0] : resultData;
    
    // Skip if no result or if not verified and deadline hasn't passed
    if (!result) continue;
    
    const isVerified = result.is_verified as boolean;
    const confirmationDeadline = result.confirmation_deadline 
      ? new Date(result.confirmation_deadline as string) 
      : null;
    const deadlinePassed = confirmationDeadline ? now > confirmationDeadline : true;
    
    // Only count if verified OR deadline has passed (auto-confirmed)
    if (!isVerified && !deadlinePassed) continue;
    
    const winningTeam = result.winning_team as number | null;
    const isWinner = winningTeam !== null && p.team_number === winningTeam;

    // Handle player data similarly
    const playerData = Array.isArray(p.player) ? p.player[0] : p.player;
    const profileData = playerData?.profile;
    const profile = Array.isArray(profileData) ? profileData[0] : profileData;

    if (!leaderboardMap.has(playerId)) {
      leaderboardMap.set(playerId, {
        player_id: playerId,
        games_played: 0,
        games_won: 0,
        player: playerData ? {
          id: playerData.id as string,
          profile: profile ? {
            first_name: profile.first_name as string,
            last_name: profile.last_name as string | null,
            display_name: profile.display_name as string | null,
            profile_picture_url: profile.profile_picture_url as string | null,
          } : undefined,
        } : undefined,
      });
    }

    const entry = leaderboardMap.get(playerId)!;
    entry.games_played += 1;
    if (isWinner) {
      entry.games_won += 1;
    }
  }

  // Convert to array and sort by games played (descending)
  return Array.from(leaderboardMap.values())
    .sort((a, b) => b.games_played - a.games_played);
}

/**
 * Post a match to a group
 */
export async function postMatchToGroup(
  matchId: string,
  groupId: string,
  playerId: string
): Promise<void> {
  const { error } = await supabase
    .from('match_network')
    .insert({
      match_id: matchId,
      network_id: groupId,
      posted_by: playerId,
    });

  if (error) {
    // Check if it's a duplicate
    if (error.code === '23505') {
      throw new Error('This match has already been posted to this group');
    }
    console.error('Error posting match to group:', error);
    throw new Error(error.message);
  }

  // Log activity
  await logGroupActivity(groupId, 'game_created', playerId, matchId, {
    match_id: matchId,
  });
}

/**
 * Remove a match from a group
 */
export async function removeMatchFromGroup(
  matchId: string,
  groupId: string
): Promise<void> {
  const { error } = await supabase
    .from('match_network')
    .delete()
    .eq('match_id', matchId)
    .eq('network_id', groupId);

  if (error) {
    console.error('Error removing match from group:', error);
    throw new Error(error.message);
  }
}

// ===========================
// CREATE PLAYED MATCH
// ===========================

export interface SetScore {
  team1Score: number | null;
  team2Score: number | null;
}

export interface CreatePlayedMatchInput {
  // Required
  sportId: string;
  createdBy: string;
  matchDate: string; // YYYY-MM-DD format
  
  // Match format
  format: 'singles' | 'doubles';
  expectation: 'friendly' | 'competitive';
  
  // Location (optional)
  locationName?: string;
  
  // Participants
  team1PlayerIds: string[]; // Current user + partner for doubles
  team2PlayerIds: string[]; // Opponent(s)
  
  // Results (only for competitive)
  winnerId: 'team1' | 'team2';
  sets: SetScore[];
  
  // Optional: Post to a group
  networkId?: string;
}

/**
 * Create a played match with results
 * This is for recording past games that have already been played
 */
export async function createPlayedMatch(
  input: CreatePlayedMatchInput
): Promise<{ matchId: string; success: boolean }> {
  const {
    sportId,
    createdBy,
    matchDate,
    format,
    expectation,
    locationName,
    team1PlayerIds,
    team2PlayerIds,
    winnerId,
    sets,
    networkId,
  } = input;

  try {
    // 1. Create the match record
    const { data: match, error: matchError } = await supabase
      .from('match')
      .insert({
        sport_id: sportId,
        created_by: createdBy,
        match_date: matchDate,
        start_time: '00:00', // Unknown time for past matches
        end_time: '01:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        format: format === 'singles' ? 'singles' : 'doubles',
        player_expectation: expectation === 'competitive' ? 'competitive' : 'casual',
        location_type: locationName ? 'custom' : 'tbd',
        location_name: locationName || null,
        visibility: 'private', // Past matches are private by default
        join_mode: 'direct',
        is_court_free: true,
        cost_split_type: 'split_equal',
      })
      .select('id')
      .single();

    if (matchError) {
      console.error('Error creating match:', matchError);
      throw new Error(matchError.message);
    }

    const matchId = match.id;

    // 2. Create match participants for Team 1
    const team1Participants = team1PlayerIds.map((playerId, index) => ({
      match_id: matchId,
      player_id: playerId,
      team_number: 1,
      is_host: index === 0, // First player in team 1 is the host
      status: 'joined' as const,
    }));

    // 3. Create match participants for Team 2
    const team2Participants = team2PlayerIds.map((playerId) => ({
      match_id: matchId,
      player_id: playerId,
      team_number: 2,
      is_host: false,
      status: 'joined' as const,
    }));

    const { error: participantsError } = await supabase
      .from('match_participant')
      .insert([...team1Participants, ...team2Participants]);

    if (participantsError) {
      console.error('Error creating participants:', participantsError);
      // Cleanup: delete the match
      await supabase.from('match').delete().eq('id', matchId);
      throw new Error(participantsError.message);
    }

    // 4. Create match result (only for competitive matches)
    if (expectation === 'competitive' && sets.length > 0) {
      // Calculate total scores
      let team1Total = 0;
      let team2Total = 0;
      
      sets.forEach((set) => {
        if (set.team1Score !== null && set.team2Score !== null) {
          if (set.team1Score > set.team2Score) {
            team1Total++;
          } else if (set.team2Score > set.team1Score) {
            team2Total++;
          }
        }
      });

      // Calculate confirmation deadline (24 hours from now)
      const confirmationDeadline = new Date();
      confirmationDeadline.setHours(confirmationDeadline.getHours() + 24);

      const { error: resultError } = await supabase
        .from('match_result')
        .insert({
          match_id: matchId,
          winning_team: winnerId === 'team1' ? 1 : 2,
          team1_score: team1Total,
          team2_score: team2Total,
          is_verified: false, // Opponent needs to confirm
          submitted_by: createdBy,
          confirmation_deadline: confirmationDeadline.toISOString(),
        });

      if (resultError) {
        console.error('Error creating match result:', resultError);
        // Don't fail the whole operation, result can be added later
      } else {
        // Send notifications to opponents about pending score confirmation
        try {
          await notifyOpponentsOfPendingScore(matchId, createdBy, team2PlayerIds);
        } catch (notifyError) {
          console.error('Error sending notifications:', notifyError);
          // Don't fail - notification failure shouldn't break the flow
        }
      }
    }

    // 5. Post to group if networkId provided
    if (networkId) {
      try {
        await postMatchToGroup(matchId, networkId, createdBy);
      } catch (postError) {
        console.error('Error posting to group:', postError);
        // Don't fail, match is still created
      }
    }

    return { matchId, success: true };
  } catch (error) {
    console.error('Error in createPlayedMatch:', error);
    throw error;
  }
}

/**
 * Get sport ID by name
 */
export async function getSportIdByName(
  sportName: 'tennis' | 'pickleball'
): Promise<string | null> {
  const { data, error } = await supabase
    .from('sport')
    .select('id')
    .ilike('name', sportName)
    .single();

  if (error) {
    console.error('Error fetching sport:', error);
    return null;
  }

  return data?.id || null;
}

// ============================================
// SCORE CONFIRMATION FUNCTIONS
// ============================================

/**
 * Pending score confirmation entry
 */
export interface PendingScoreConfirmation {
  match_result_id: string;
  match_id: string;
  match_date: string;
  sport_name: string;
  sport_icon_url: string | null;
  winning_team: number;
  team1_score: number;
  team2_score: number;
  submitted_by_id: string;
  submitted_by_name: string;
  submitted_by_avatar: string | null;
  confirmation_deadline: string;
  opponent_name: string;
  opponent_avatar: string | null;
  player_team: number;
  network_id: string | null;
  network_name: string | null;
}

/**
 * Get pending score confirmations for a player
 */
export async function getPendingScoreConfirmations(
  playerId: string
): Promise<PendingScoreConfirmation[]> {
  const { data, error } = await supabase
    .rpc('get_pending_score_confirmations', { p_player_id: playerId });

  if (error) {
    console.error('Error fetching pending confirmations:', error);
    throw new Error(error.message);
  }

  return (data || []) as PendingScoreConfirmation[];
}

/**
 * Confirm a match score
 */
export async function confirmMatchScore(
  matchResultId: string,
  playerId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('confirm_match_score', {
      p_match_result_id: matchResultId,
      p_player_id: playerId,
    });

  if (error) {
    console.error('Error confirming score:', error);
    throw new Error(error.message);
  }

  return data as boolean;
}

/**
 * Dispute a match score
 */
export async function disputeMatchScore(
  matchResultId: string,
  playerId: string,
  reason?: string
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('dispute_match_score', {
      p_match_result_id: matchResultId,
      p_player_id: playerId,
      p_reason: reason || null,
    });

  if (error) {
    console.error('Error disputing score:', error);
    throw new Error(error.message);
  }

  return data as boolean;
}

/**
 * Send notification to opponent(s) about pending score confirmation
 */
export async function notifyOpponentsOfPendingScore(
  matchId: string,
  submittedBy: string,
  opponentIds: string[]
): Promise<void> {
  // Get submitter's profile for notification message
  const { data: submitterProfile } = await supabase
    .from('profile')
    .select('first_name, last_name, display_name')
    .eq('id', submittedBy)
    .single();

  const submitterName = submitterProfile?.display_name ||
    `${submitterProfile?.first_name || ''} ${submitterProfile?.last_name || ''}`.trim() ||
    'A player';

  // Create notifications for each opponent
  const notifications = opponentIds.map((opponentId) => ({
    recipient_id: opponentId,
    type: 'match_confirmation' as const,
    title: 'Score Confirmation Required',
    message: `${submitterName} submitted a match score. Please confirm or dispute within 24 hours.`,
    data: JSON.stringify({ match_id: matchId }),
    is_read: false,
  }));

  const { error } = await supabase
    .from('notification')
    .insert(notifications);

  if (error) {
    console.error('Error sending score confirmation notifications:', error);
    // Don't throw - notification failure shouldn't break the flow
  }
}
