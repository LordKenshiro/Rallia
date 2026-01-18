/**
 * Message Service
 * Operations for messages within conversations
 */

import { supabase } from '../supabase';
import type {
  Message,
  MessageWithSender,
  MessageStatus,
  SendMessageInput,
} from './chatTypes';

// ============================================================================
// READ OPERATIONS
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

  const replyToMap = new Map<string, { id: string; content: string; sender_name: string }>();

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

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

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
