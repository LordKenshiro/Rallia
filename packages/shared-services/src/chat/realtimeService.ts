/**
 * Realtime Service
 * Real-time subscriptions for messages, conversations, and typing indicators
 */

import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Message, MessageStatus, TypingIndicator } from './chatTypes';

// ============================================================================
// MESSAGE SUBSCRIPTIONS
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
