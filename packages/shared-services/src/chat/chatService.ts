/**
 * Chat Service
 * Handles all operations for conversations and messages
 * Designed to be reusable across Groups, Communities, and Clubs
 */

import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type ConversationType = 'direct' | 'group' | 'match' | 'announcement';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface Conversation {
  id: string;
  conversation_type: ConversationType;
  title: string | null;
  match_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  player_id: string;
  last_read_at: string | null;
  is_muted: boolean;
  joined_at: string;
  // Enhanced features
  is_pinned?: boolean;
  pinned_at?: string | null;
  is_archived?: boolean;
  archived_at?: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  status: MessageStatus;
  read_by: string[] | null;
  created_at: string;
  updated_at: string;
  // Enhanced features
  reply_to_message_id?: string | null;
  is_edited?: boolean;
  edited_at?: string | null;
  deleted_at?: string | null;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  player_id: string;
  emoji: string;
  created_at: string;
  player?: {
    id: string;
    profile: {
      first_name: string;
      last_name: string | null;
    } | null;
  };
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  players: Array<{
    id: string;
    first_name: string;
  }>;
  hasReacted: boolean; // Whether current user has reacted with this emoji
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    profile: {
      first_name: string;
      last_name: string | null;
      display_name: string | null;
      profile_picture_url: string | null;
    } | null;
  } | null;
  reactions?: ReactionSummary[];
  // For replies - the message being replied to
  reply_to?: {
    id: string;
    content: string;
    sender_name: string;
  } | null;
}

export interface ConversationWithDetails extends Conversation {
  participants: Array<{
    id: string;
    player_id: string;
    last_read_at: string | null;
    is_muted: boolean;
    player: {
      id: string;
      profile: {
        first_name: string;
        last_name: string | null;
        display_name: string | null;
        profile_picture_url: string | null;
      } | null;
    } | null;
  }>;
  last_message: MessageWithSender | null;
  unread_count: number;
}

export interface ConversationPreview {
  id: string;
  conversation_type: ConversationType;
  title: string | null;
  last_message_content: string | null;
  last_message_at: string | null;
  last_message_sender_name: string | null;
  unread_count: number;
  participant_count: number;
  // For direct messages, show the other participant
  other_participant?: {
    id: string;
    first_name: string;
    last_name: string | null;
    profile_picture_url: string | null;
    is_online?: boolean;
    last_seen_at?: string | null;
  };
  // For group chats, show the cover image from the network
  cover_image_url?: string | null;
  // Enhanced features
  is_pinned?: boolean;
  is_muted?: boolean;
  is_archived?: boolean;
}

export interface SendMessageInput {
  conversation_id: string;
  content: string;
  sender_id: string;
  reply_to_message_id?: string; // For reply functionality
}

export interface CreateConversationInput {
  conversation_type: ConversationType;
  title?: string;
  participant_ids: string[];
  created_by: string;
  match_id?: string;
}

// ============================================================================
// ENHANCED TYPES - Online Status, Typing, Search
// ============================================================================

export interface PlayerOnlineStatus {
  player_id: string;
  is_online: boolean;
  last_seen_at: string | null;
}

export interface TypingIndicator {
  player_id: string;
  player_name: string;
  conversation_id: string;
  timestamp: number;
}

export interface SearchMessageResult {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name: string;
  rank: number;
}

// ============================================================================
// CONVERSATION OPERATIONS
// ============================================================================

/**
 * Get all conversations for a player
 */
export async function getPlayerConversations(
  playerId: string
): Promise<ConversationPreview[]> {
  // Get conversations where player is a participant
  const { data: participations, error: partError } = await supabase
    .from('conversation_participant')
    .select('conversation_id')
    .eq('player_id', playerId);

  if (partError) {
    console.error('Error fetching participations:', partError);
    throw partError;
  }

  if (!participations || participations.length === 0) {
    return [];
  }

  const conversationIds = participations.map((p) => p.conversation_id);

  // Get conversations with last message
  const { data: conversations, error: convError } = await supabase
    .from('conversation')
    .select(`
      id,
      conversation_type,
      title,
      created_at,
      updated_at
    `)
    .in('id', conversationIds)
    .order('updated_at', { ascending: false });

  if (convError) {
    console.error('Error fetching conversations:', convError);
    throw convError;
  }

  if (!conversations) {
    return [];
  }

  // Build preview for each conversation
  const previews: ConversationPreview[] = [];

  for (const conv of conversations) {
    // Get last message
    const { data: lastMessage } = await supabase
      .from('message')
      .select(`
        id,
        content,
        created_at,
        sender_id,
        sender:player!message_sender_id_fkey (
          id,
          profile (
            first_name,
            last_name
          )
        )
      `)
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get participant count
    const { count: participantCount } = await supabase
      .from('conversation_participant')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id);

    // Get unread count for this player (and their participation settings)
    const { data: participation } = await supabase
      .from('conversation_participant')
      .select('last_read_at, is_muted, is_pinned, is_archived')
      .eq('conversation_id', conv.id)
      .eq('player_id', playerId)
      .single();

    const lastReadAt = participation?.last_read_at;
    const isPinned = participation?.is_pinned ?? false;
    const isMuted = participation?.is_muted ?? false;
    const isArchived = participation?.is_archived ?? false;
    
    let unreadCount = 0;
    if (lastReadAt) {
      const { count } = await supabase
        .from('message')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_id', playerId)
        .gt('created_at', lastReadAt);
      unreadCount = count || 0;
    } else {
      // Never read - count all messages not from this player
      const { count } = await supabase
        .from('message')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_id', playerId);
      unreadCount = count || 0;
    }

    // For direct messages, get the other participant
    let otherParticipant: ConversationPreview['other_participant'] | undefined;
    let coverImageUrl: string | null = null;

    if (conv.conversation_type === 'direct') {
      const { data: otherPart } = await supabase
        .from('conversation_participant')
        .select(`
          player:player!conversation_participant_player_id_fkey (
            id,
            last_seen_at,
            profile (
              first_name,
              last_name,
              profile_picture_url
            )
          )
        `)
        .eq('conversation_id', conv.id)
        .neq('player_id', playerId)
        .single();

      const player = otherPart?.player as unknown as {
        id: string;
        last_seen_at: string | null;
        profile: {
          first_name: string;
          last_name: string | null;
          profile_picture_url: string | null;
        } | null;
      } | undefined;

      if (player?.profile) {
        // Check if player was seen in last 5 minutes
        const isOnline = player.last_seen_at 
          ? new Date(player.last_seen_at) > new Date(Date.now() - 5 * 60 * 1000)
          : false;

        otherParticipant = {
          id: player.id,
          first_name: player.profile.first_name,
          last_name: player.profile.last_name,
          profile_picture_url: player.profile.profile_picture_url,
          is_online: isOnline,
          last_seen_at: player.last_seen_at,
        };
      }
    } else if (conv.conversation_type === 'group') {
      // For group chats, try to get the cover image from the network
      const { data: network } = await supabase
        .from('network')
        .select('cover_image_url')
        .eq('conversation_id', conv.id)
        .single();

      if (network?.cover_image_url) {
        coverImageUrl = network.cover_image_url;
      }
    }

    // Get sender name
    let lastMessageSenderName: string | null = null;
    if (lastMessage?.sender) {
      const sender = lastMessage.sender as unknown as {
        id: string;
        profile: { first_name: string; last_name: string | null } | null;
      };
      if (sender.profile) {
        lastMessageSenderName = sender.profile.first_name;
      }
    }

    previews.push({
      id: conv.id,
      conversation_type: conv.conversation_type,
      title: conv.title,
      last_message_content: lastMessage?.content || null,
      last_message_at: lastMessage?.created_at || null,
      last_message_sender_name: lastMessageSenderName,
      unread_count: unreadCount,
      participant_count: participantCount || 0,
      other_participant: otherParticipant,
      cover_image_url: coverImageUrl,
      is_pinned: isPinned,
      is_muted: isMuted,
      is_archived: isArchived,
    });
  }

  // Sort: pinned first, then by last_message_at
  previews.sort((a, b) => {
    // Pinned conversations first
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    
    // Then by last message time
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
  });

  return previews;
}

/**
 * Get a single conversation with details
 */
export async function getConversation(
  conversationId: string
): Promise<ConversationWithDetails | null> {
  const { data: conversation, error } = await supabase
    .from('conversation')
    .select(`
      id,
      conversation_type,
      title,
      match_id,
      created_by,
      created_at,
      updated_at
    `)
    .eq('id', conversationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching conversation:', error);
    throw error;
  }

  // Get participants
  const { data: participants } = await supabase
    .from('conversation_participant')
    .select(`
      id,
      player_id,
      last_read_at,
      is_muted,
      player:player!conversation_participant_player_id_fkey (
        id,
        profile (
          first_name,
          last_name,
          display_name,
          profile_picture_url
        )
      )
    `)
    .eq('conversation_id', conversationId);

  // Get last message
  const { data: lastMessage } = await supabase
    .from('message')
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      status,
      read_by,
      created_at,
      updated_at,
      sender:player!message_sender_id_fkey (
        id,
        profile (
          first_name,
          last_name,
          display_name,
          profile_picture_url
        )
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    ...conversation,
    participants: (participants || []).map((p) => ({
      id: p.id,
      player_id: p.player_id,
      last_read_at: p.last_read_at,
      is_muted: p.is_muted || false,
      player: p.player as unknown as {
        id: string;
        profile: {
          first_name: string;
          last_name: string | null;
          display_name: string | null;
          profile_picture_url: string | null;
        } | null;
      } | null,
    })),
    last_message: lastMessage
      ? {
          ...lastMessage,
          status: (lastMessage.status || 'sent') as MessageStatus,
          read_by: lastMessage.read_by as string[] | null,
          sender: lastMessage.sender as unknown as MessageWithSender['sender'],
        }
      : null,
    unread_count: 0, // TODO: Calculate based on current user
  };
}

/**
 * Create a new conversation
 */
export async function createConversation(
  input: CreateConversationInput
): Promise<Conversation> {
  const { data: conversation, error } = await supabase
    .from('conversation')
    .insert({
      conversation_type: input.conversation_type,
      title: input.title || null,
      match_id: input.match_id || null,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }

  // Add participants
  const participantInserts = input.participant_ids.map((playerId) => ({
    conversation_id: conversation.id,
    player_id: playerId,
  }));

  const { error: partError } = await supabase
    .from('conversation_participant')
    .insert(participantInserts);

  if (partError) {
    console.error('Error adding participants:', partError);
    // Clean up conversation on failure
    await supabase.from('conversation').delete().eq('id', conversation.id);
    throw partError;
  }

  return conversation;
}

/**
 * Create or get existing direct conversation between two players
 */
export async function getOrCreateDirectConversation(
  playerId1: string,
  playerId2: string
): Promise<Conversation> {
  // Check if direct conversation already exists between these two players
  const { data: existingConvs } = await supabase
    .from('conversation')
    .select(`
      id,
      conversation_type,
      title,
      match_id,
      created_by,
      created_at,
      updated_at
    `)
    .eq('conversation_type', 'direct');

  if (existingConvs) {
    for (const conv of existingConvs) {
      const { data: participants } = await supabase
        .from('conversation_participant')
        .select('player_id')
        .eq('conversation_id', conv.id);

      if (participants?.length === 2) {
        const playerIds = participants.map((p) => p.player_id);
        if (playerIds.includes(playerId1) && playerIds.includes(playerId2)) {
          return conv;
        }
      }
    }
  }

  // Create new direct conversation
  return createConversation({
    conversation_type: 'direct',
    participant_ids: [playerId1, playerId2],
    created_by: playerId1,
  });
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Get messages for a conversation with pagination
 * Includes reply_to message data for reply chains
 */
export async function getMessages(
  conversationId: string,
  options: {
    limit?: number;
    offset?: number;
    before?: string; // Get messages before this timestamp
  } = {}
): Promise<MessageWithSender[]> {
  const { limit = 50, offset = 0, before } = options;

  let query = supabase
    .from('message')
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      status,
      read_by,
      created_at,
      updated_at,
      reply_to_message_id,
      is_edited,
      edited_at,
      deleted_at,
      sender:player!message_sender_id_fkey (
        id,
        profile (
          first_name,
          last_name,
          display_name,
          profile_picture_url
        )
      )
    `)
    .eq('conversation_id', conversationId)
    .is('deleted_at', null) // Don't fetch soft-deleted messages
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }

  // Get reply_to message data for messages that have replies
  const messagesWithReplies = data || [];
  const replyToIds = messagesWithReplies
    .filter((m) => m.reply_to_message_id)
    .map((m) => m.reply_to_message_id as string);

  let replyToMap = new Map<string, { id: string; content: string; sender_name: string }>();

  if (replyToIds.length > 0) {
    const { data: replyMessages } = await supabase
      .from('message')
      .select(`
        id,
        content,
        sender:player!message_sender_id_fkey (
          profile (
            first_name
          )
        )
      `)
      .in('id', replyToIds);

    if (replyMessages) {
      for (const rm of replyMessages) {
        const sender = rm.sender as unknown as { profile: { first_name: string } | null };
        replyToMap.set(rm.id, {
          id: rm.id,
          content: rm.content,
          sender_name: sender?.profile?.first_name || 'Unknown',
        });
      }
    }
  }

  return messagesWithReplies.map((msg) => ({
    ...msg,
    status: (msg.status || 'sent') as MessageStatus,
    read_by: msg.read_by as string[] | null,
    sender: msg.sender as unknown as MessageWithSender['sender'],
    reply_to: msg.reply_to_message_id ? replyToMap.get(msg.reply_to_message_id) ?? null : null,
  }));
}

/**
 * Send a new message
/**
 * Send a new message (supports replies)
 * Returns the message with reply_to data populated if it's a reply
 */
export async function sendMessage(input: SendMessageInput): Promise<MessageWithSender> {
  const insertData: Record<string, unknown> = {
    conversation_id: input.conversation_id,
    sender_id: input.sender_id,
    content: input.content,
    status: 'sent',
  };

  // Add reply_to_message_id if provided
  if (input.reply_to_message_id) {
    insertData.reply_to_message_id = input.reply_to_message_id;
  }

  const { data, error } = await supabase
    .from('message')
    .insert(insertData)
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      status,
      read_by,
      created_at,
      updated_at,
      reply_to_message_id,
      is_edited,
      edited_at,
      deleted_at,
      sender:player!message_sender_id_fkey (
        id,
        profile (
          first_name,
          last_name,
          display_name,
          profile_picture_url
        )
      )
    `)
    .single();

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }

  // Update conversation's updated_at
  await supabase
    .from('conversation')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.conversation_id);

  // Build reply_to data if this is a reply
  let replyTo: { id: string; content: string; sender_name: string } | null = null;
  
  if (input.reply_to_message_id) {
    const { data: replyMessage } = await supabase
      .from('message')
      .select(`
        id,
        content,
        sender:player!message_sender_id_fkey (
          profile (
            first_name
          )
        )
      `)
      .eq('id', input.reply_to_message_id)
      .single();

    if (replyMessage) {
      const sender = replyMessage.sender as unknown as { profile: { first_name: string } | null };
      replyTo = {
        id: replyMessage.id,
        content: replyMessage.content,
        sender_name: sender?.profile?.first_name || 'Unknown',
      };
    }
  }

  return {
    ...data,
    status: (data.status || 'sent') as MessageStatus,
    read_by: data.read_by as string[] | null,
    sender: data.sender as unknown as MessageWithSender['sender'],
    reply_to: replyTo,
  };
}

/**
 * Mark messages as read up to a certain point
 */
export async function markMessagesAsRead(
  conversationId: string,
  playerId: string
): Promise<void> {
  const { error } = await supabase
    .from('conversation_participant')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('player_id', playerId);

  if (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}

/**
 * Soft delete a message (shows "This message was deleted")
 * Only the sender can delete their own messages
 */
export async function deleteMessage(
  messageId: string,
  senderId: string
): Promise<void> {
  // Soft delete - set deleted_at timestamp
  const { error } = await supabase
    .from('message')
    .update({ 
      deleted_at: new Date().toISOString(),
      content: '', // Clear content for privacy
    })
    .eq('id', messageId)
    .eq('sender_id', senderId);

  if (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

/**
 * Edit a message (only sender can edit)
 */
export async function editMessage(
  messageId: string,
  senderId: string,
  newContent: string
): Promise<Message | null> {
  const { data, error } = await supabase
    .from('message')
    .update({
      content: newContent,
      is_edited: true,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .eq('sender_id', senderId)
    .select()
    .single();

  if (error) {
    console.error('Error editing message:', error);
    throw error;
  }

  return data ? {
    ...data,
    status: (data.status || 'sent') as MessageStatus,
    read_by: data.read_by as string[] | null,
  } : null;
}

// ============================================================================
// PARTICIPANT OPERATIONS
// ============================================================================

/**
 * Toggle mute status for a conversation
 */
export async function toggleMuteConversation(
  conversationId: string,
  playerId: string,
  isMuted: boolean
): Promise<void> {
  const { error } = await supabase
    .from('conversation_participant')
    .update({ is_muted: isMuted })
    .eq('conversation_id', conversationId)
    .eq('player_id', playerId);

  if (error) {
    console.error('Error toggling mute:', error);
    throw error;
  }
}

/**
 * Leave a conversation (for group conversations)
 */
export async function leaveConversation(
  conversationId: string,
  playerId: string
): Promise<void> {
  const { error } = await supabase
    .from('conversation_participant')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('player_id', playerId);

  if (error) {
    console.error('Error leaving conversation:', error);
    throw error;
  }
}

/**
 * Add participant to a conversation
 */
export async function addParticipant(
  conversationId: string,
  playerId: string
): Promise<void> {
  const { error } = await supabase
    .from('conversation_participant')
    .insert({
      conversation_id: conversationId,
      player_id: playerId,
    });

  if (error) {
    // Ignore if already a participant
    if (error.code !== '23505') {
      console.error('Error adding participant:', error);
      throw error;
    }
  }
}

// ============================================================================
// PIN & ARCHIVE OPERATIONS
// ============================================================================

/**
 * Toggle pin status for a conversation
 */
export async function togglePinConversation(
  conversationId: string,
  playerId: string,
  isPinned: boolean
): Promise<void> {
  const { error } = await supabase
    .from('conversation_participant')
    .update({ 
      is_pinned: isPinned,
      pinned_at: isPinned ? new Date().toISOString() : null,
    })
    .eq('conversation_id', conversationId)
    .eq('player_id', playerId);

  if (error) {
    console.error('Error toggling pin:', error);
    throw error;
  }
}

/**
 * Toggle archive status for a conversation
 */
export async function toggleArchiveConversation(
  conversationId: string,
  playerId: string,
  isArchived: boolean
): Promise<void> {
  const { error } = await supabase
    .from('conversation_participant')
    .update({ 
      is_archived: isArchived,
      archived_at: isArchived ? new Date().toISOString() : null,
    })
    .eq('conversation_id', conversationId)
    .eq('player_id', playerId);

  if (error) {
    console.error('Error toggling archive:', error);
    throw error;
  }
}

// ============================================================================
// ONLINE STATUS OPERATIONS
// ============================================================================

/**
 * Update player's last seen timestamp (call this periodically or on activity)
 */
export async function updatePlayerLastSeen(playerId: string): Promise<void> {
  const { error } = await supabase
    .from('player')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', playerId);

  if (error) {
    console.error('Error updating last seen:', error);
    // Don't throw - this is a background operation
  }
}

/**
 * Get online status for multiple players
 */
export async function getPlayersOnlineStatus(
  playerIds: string[]
): Promise<PlayerOnlineStatus[]> {
  if (playerIds.length === 0) return [];

  const { data, error } = await supabase
    .from('player')
    .select('id, last_seen_at')
    .in('id', playerIds);

  if (error) {
    console.error('Error fetching online status:', error);
    return playerIds.map((id) => ({ player_id: id, is_online: false, last_seen_at: null }));
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  return (data || []).map((player) => ({
    player_id: player.id,
    is_online: player.last_seen_at ? new Date(player.last_seen_at) > fiveMinutesAgo : false,
    last_seen_at: player.last_seen_at,
  }));
}

/**
 * Check if a single player is online
 */
export async function isPlayerOnline(playerId: string): Promise<boolean> {
  const statuses = await getPlayersOnlineStatus([playerId]);
  return statuses[0]?.is_online ?? false;
}

// ============================================================================
// TYPING INDICATORS (using Supabase Realtime Presence)
// ============================================================================

// Store for active typing channels
const typingChannels = new Map<string, RealtimeChannel>();

/**
 * Subscribe to typing indicators in a conversation
 * Uses Supabase Realtime Presence for real-time typing updates
 */
export function subscribeToTypingIndicators(
  conversationId: string,
  playerId: string,
  playerName: string,
  onTypingChange: (typingUsers: TypingIndicator[]) => void
): RealtimeChannel {
  const channelName = `typing:${conversationId}`;
  
  // Clean up existing channel if any
  const existingChannel = typingChannels.get(channelName);
  if (existingChannel) {
    supabase.removeChannel(existingChannel);
  }

  const channel = supabase.channel(channelName, {
    config: {
      presence: {
        key: playerId,
      },
    },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const typingUsers: TypingIndicator[] = [];

      for (const [key, presences] of Object.entries(state)) {
        if (key !== playerId) {
          const presence = presences[0] as { player_name?: string; timestamp?: number };
          if (presence) {
            typingUsers.push({
              player_id: key,
              player_name: presence.player_name || 'Someone',
              conversation_id: conversationId,
              timestamp: presence.timestamp || Date.now(),
            });
          }
        }
      }

      onTypingChange(typingUsers);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track presence with player info
        await channel.track({
          player_name: playerName,
          timestamp: Date.now(),
          is_typing: false,
        });
      }
    });

  typingChannels.set(channelName, channel);
  return channel;
}

/**
 * Send typing indicator (call when user starts/stops typing)
 */
export async function sendTypingIndicator(
  conversationId: string,
  playerId: string,
  playerName: string,
  isTyping: boolean
): Promise<void> {
  const channelName = `typing:${conversationId}`;
  const channel = typingChannels.get(channelName);

  if (channel) {
    await channel.track({
      player_name: playerName,
      timestamp: Date.now(),
      is_typing: isTyping,
    });
  }
}

/**
 * Unsubscribe from typing indicators
 */
export function unsubscribeFromTypingIndicators(conversationId: string): void {
  const channelName = `typing:${conversationId}`;
  const channel = typingChannels.get(channelName);
  
  if (channel) {
    supabase.removeChannel(channel);
    typingChannels.delete(channelName);
  }
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

/**
 * Search messages within a conversation
 * Uses full-text search for efficient querying
 */
export async function searchMessagesInConversation(
  conversationId: string,
  query: string,
  limit = 50
): Promise<SearchMessageResult[]> {
  if (!query.trim()) return [];

  // Use the database function for efficient search
  const { data, error } = await supabase.rpc('search_conversation_messages', {
    p_conversation_id: conversationId,
    p_query: query,
    p_limit: limit,
  });

  if (error) {
    console.error('Error searching messages:', error);
    // Fallback to simple ILIKE search if full-text search fails
    return searchMessagesFallback(conversationId, query, limit);
  }

  // Fetch sender names for results
  const senderIds = [...new Set((data || []).map((r: { sender_id: string }) => r.sender_id))] as string[];
  const senderMap = await getSenderNames(senderIds);

  return (data || []).map((r: { id: string; conversation_id: string; sender_id: string; content: string; created_at: string; rank: number }) => ({
    id: r.id,
    conversation_id: r.conversation_id,
    sender_id: r.sender_id,
    content: r.content,
    created_at: r.created_at,
    rank: r.rank,
    sender_name: senderMap.get(r.sender_id) || 'Unknown',
  }));
}

/**
 * Fallback search using ILIKE (if full-text search is not available)
 */
async function searchMessagesFallback(
  conversationId: string,
  query: string,
  limit: number
): Promise<SearchMessageResult[]> {
  const { data, error } = await supabase
    .from('message')
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      created_at
    `)
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .ilike('content', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error in fallback search:', error);
    return [];
  }

  const senderIds = [...new Set((data || []).map((m) => m.sender_id))];
  const senderMap = await getSenderNames(senderIds);

  return (data || []).map((m) => ({
    id: m.id,
    conversation_id: m.conversation_id,
    sender_id: m.sender_id,
    content: m.content,
    created_at: m.created_at,
    rank: 1, // No ranking for fallback
    sender_name: senderMap.get(m.sender_id) || 'Unknown',
  }));
}

/**
 * Helper to get sender names for search results
 */
async function getSenderNames(senderIds: string[]): Promise<Map<string, string>> {
  if (senderIds.length === 0) return new Map();

  const { data } = await supabase
    .from('player')
    .select(`
      id,
      profile (
        first_name
      )
    `)
    .in('id', senderIds);

  const map = new Map<string, string>();
  for (const player of data || []) {
    const profile = Array.isArray(player.profile) 
      ? player.profile[0] as { first_name: string } | undefined
      : player.profile as { first_name: string } | null;
    map.set(player.id, profile?.first_name || 'Unknown');
  }

  return map;
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new messages in a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: Message) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const msg = payload.new as Message;
        onMessage({
          ...msg,
          status: (msg.status || 'sent') as MessageStatus,
        });
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to conversation updates (new messages in any conversation)
 */
export function subscribeToConversations(
  playerId: string,
  onUpdate: () => void
): RealtimeChannel {
  // Subscribe to conversation updates
  const channel = supabase
    .channel(`conversations:${playerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message',
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a channel
 */
export function unsubscribeFromChannel(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}

// ============================================================================
// EMOJI REACTION OPERATIONS
// ============================================================================

/**
 * Common emoji reactions (like WhatsApp)
 */
export const COMMON_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/**
 * Add a reaction to a message
 */
export async function addReaction(
  messageId: string,
  playerId: string,
  emoji: string
): Promise<void> {
  const { error } = await supabase
    .from('message_reaction')
    .insert({
      message_id: messageId,
      player_id: playerId,
      emoji: emoji,
    });

  if (error) {
    // Ignore duplicate error (user already reacted with this emoji)
    if (error.code !== '23505') {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }
}

/**
 * Remove a reaction from a message
 */
export async function removeReaction(
  messageId: string,
  playerId: string,
  emoji: string
): Promise<void> {
  const { error } = await supabase
    .from('message_reaction')
    .delete()
    .eq('message_id', messageId)
    .eq('player_id', playerId)
    .eq('emoji', emoji);

  if (error) {
    console.error('Error removing reaction:', error);
    throw error;
  }
}

/**
 * Toggle a reaction (add if not exists, remove if exists)
 * If user already has a different reaction, replace it with the new one
 */
export async function toggleReaction(
  messageId: string,
  playerId: string,
  emoji: string
): Promise<{ added: boolean }> {
  // Check if this exact reaction exists (same emoji)
  const { data: existingSame } = await supabase
    .from('message_reaction')
    .select('id')
    .eq('message_id', messageId)
    .eq('player_id', playerId)
    .eq('emoji', emoji)
    .single();

  if (existingSame) {
    // User tapped the same emoji - remove it (toggle off)
    await removeReaction(messageId, playerId, emoji);
    return { added: false };
  }

  // Check if user has a different reaction on this message
  const { data: existingOther } = await supabase
    .from('message_reaction')
    .select('id, emoji')
    .eq('message_id', messageId)
    .eq('player_id', playerId)
    .single();

  if (existingOther) {
    // Remove the old reaction first
    await removeReaction(messageId, playerId, existingOther.emoji);
  }

  // Add the new reaction
  await addReaction(messageId, playerId, emoji);
  return { added: true };
}

/**
 * Get reactions for a message
 */
export async function getMessageReactions(
  messageId: string,
  currentPlayerId: string
): Promise<ReactionSummary[]> {
  const { data, error } = await supabase
    .from('message_reaction')
    .select(`
      id,
      emoji,
      player_id,
      player:player!message_reaction_player_id_fkey (
        id,
        profile (
          first_name
        )
      )
    `)
    .eq('message_id', messageId);

  if (error) {
    console.error('Error fetching reactions:', error);
    throw error;
  }

  // Group by emoji
  const reactionMap = new Map<string, ReactionSummary>();

  for (const reaction of data || []) {
    const emoji = reaction.emoji;
    const player = reaction.player as unknown as {
      id: string;
      profile: { first_name: string } | null;
    };

    if (!reactionMap.has(emoji)) {
      reactionMap.set(emoji, {
        emoji,
        count: 0,
        players: [],
        hasReacted: false,
      });
    }

    const summary = reactionMap.get(emoji)!;
    summary.count++;
    summary.players.push({
      id: player.id,
      first_name: player.profile?.first_name || 'Unknown',
    });
    
    if (reaction.player_id === currentPlayerId) {
      summary.hasReacted = true;
    }
  }

  return Array.from(reactionMap.values());
}

/**
 * Get reactions for multiple messages (batch operation)
 */
export async function getMessagesReactions(
  messageIds: string[],
  currentPlayerId: string
): Promise<Map<string, ReactionSummary[]>> {
  const { data, error } = await supabase
    .from('message_reaction')
    .select(`
      id,
      message_id,
      emoji,
      player_id,
      player:player!message_reaction_player_id_fkey (
        id,
        profile (
          first_name
        )
      )
    `)
    .in('message_id', messageIds);

  if (error) {
    console.error('Error fetching reactions:', error);
    throw error;
  }

  // Group by message, then by emoji
  const result = new Map<string, ReactionSummary[]>();

  for (const messageId of messageIds) {
    result.set(messageId, []);
  }

  const messageReactionMaps = new Map<string, Map<string, ReactionSummary>>();

  for (const reaction of data || []) {
    const { message_id: messageId, emoji } = reaction;
    const player = reaction.player as unknown as {
      id: string;
      profile: { first_name: string } | null;
    };

    if (!messageReactionMaps.has(messageId)) {
      messageReactionMaps.set(messageId, new Map());
    }

    const emojiMap = messageReactionMaps.get(messageId)!;

    if (!emojiMap.has(emoji)) {
      emojiMap.set(emoji, {
        emoji,
        count: 0,
        players: [],
        hasReacted: false,
      });
    }

    const summary = emojiMap.get(emoji)!;
    summary.count++;
    summary.players.push({
      id: player.id,
      first_name: player.profile?.first_name || 'Unknown',
    });

    if (reaction.player_id === currentPlayerId) {
      summary.hasReacted = true;
    }
  }

  // Convert maps to arrays
  for (const [messageId, emojiMap] of messageReactionMaps) {
    result.set(messageId, Array.from(emojiMap.values()));
  }

  return result;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get unread message count for a player across all conversations
 */
export async function getTotalUnreadCount(playerId: string): Promise<number> {
  const conversations = await getPlayerConversations(playerId);
  return conversations.reduce((total, conv) => total + conv.unread_count, 0);
}

/**
 * Get conversation by network (group/community/club)
 * Useful when you have a network ID and need its conversation
 */
export async function getConversationByNetworkId(
  networkId: string
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('network')
    .select('conversation_id')
    .eq('id', networkId)
    .single();

  if (error || !data?.conversation_id) {
    return null;
  }

  const { data: conversation, error: convError } = await supabase
    .from('conversation')
    .select('*')
    .eq('id', data.conversation_id)
    .single();

  if (convError) {
    return null;
  }

  return conversation;
}

/**
 * Get network info for a conversation (for group/community chats)
 * Returns network details including cover image
 */
export async function getNetworkByConversationId(
  conversationId: string
): Promise<{
  id: string;
  name: string;
  cover_image_url: string | null;
  member_count: number;
} | null> {
  const { data, error } = await supabase
    .from('network')
    .select('id, name, cover_image_url, member_count')
    .eq('conversation_id', conversationId)
    .single();


  if (error || !data) {
    return null;
  }

  return data;
}

// ============================================================================
// CHAT AGREEMENT
// ============================================================================

/**
 * Check if player has agreed to chat rules
 */
export async function hasAgreedToChatRules(playerId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('player')
    .select('chat_rules_agreed_at')
    .eq('id', playerId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.chat_rules_agreed_at !== null;
}

/**
 * Record player agreement to chat rules
 */
export async function agreeToChatRules(playerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('player')
    .update({ chat_rules_agreed_at: new Date().toISOString() })
    .eq('id', playerId);

  return !error;
}
