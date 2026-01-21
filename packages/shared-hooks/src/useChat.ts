/**
 * useChat Hook
 * React Query hooks for chat operations
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  getPlayerConversations,
  getConversation,
  createConversation,
  getOrCreateDirectConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
  editMessage,
  toggleMuteConversation,
  leaveConversation,
  togglePinConversation,
  toggleArchiveConversation,
  toggleReaction,
  getMessagesReactions,
  subscribeToMessages,
  subscribeToConversations,
  unsubscribeFromChannel,
  getTotalUnreadCount,
  getConversationByNetworkId,
  hasAgreedToChatRules,
  agreeToChatRules,
  // New enhanced functions
  updatePlayerLastSeen,
  getPlayersOnlineStatus,
  searchMessagesInConversation,
  subscribeToTypingIndicators,
  sendTypingIndicator,
  unsubscribeFromTypingIndicators,
  type ConversationPreview,
  type ConversationWithDetails,
  type Message,
  type MessageWithSender,
  type SendMessageInput,
  type CreateConversationInput,
  type ReactionSummary,
  type PlayerOnlineStatus,
  type TypingIndicator,
  type SearchMessageResult,
} from '@rallia/shared-services';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  playerConversations: (playerId: string) => [...chatKeys.conversations(), playerId] as const,
  conversation: (conversationId: string) => [...chatKeys.all, 'conversation', conversationId] as const,
  messages: (conversationId: string) => [...chatKeys.all, 'messages', conversationId] as const,
  reactions: (messageIds: string[]) => [...chatKeys.all, 'reactions', messageIds.join(',')] as const,
  unreadCount: (playerId: string) => [...chatKeys.all, 'unreadCount', playerId] as const,
  networkConversation: (networkId: string) => [...chatKeys.all, 'networkConversation', networkId] as const,
  chatAgreement: (playerId: string) => [...chatKeys.all, 'chatAgreement', playerId] as const,
  // New enhanced keys
  onlineStatus: (playerIds: string[]) => [...chatKeys.all, 'onlineStatus', playerIds.join(',')] as const,
  searchMessages: (conversationId: string, query: string) => [...chatKeys.all, 'searchMessages', conversationId, query] as const,
};

// ============================================================================
// CONVERSATION HOOKS
// ============================================================================

/**
 * Get all conversations for the current player
 */
export function usePlayerConversations(playerId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.playerConversations(playerId || ''),
    queryFn: () => getPlayerConversations(playerId!),
    enabled: !!playerId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get a single conversation with details
 */
export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.conversation(conversationId || ''),
    queryFn: () => getConversation(conversationId!),
    enabled: !!conversationId,
  });
}

/**
 * Get conversation for a network (group/community)
 */
export function useNetworkConversation(networkId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.networkConversation(networkId || ''),
    queryFn: () => getConversationByNetworkId(networkId!),
    enabled: !!networkId,
  });
}

/**
 * Create a new conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateConversationInput) => createConversation(input),
    onSuccess: (_, variables) => {
      // Invalidate conversations list
      queryClient.invalidateQueries({
        queryKey: chatKeys.playerConversations(variables.created_by),
      });
    },
  });
}

/**
 * Get or create a direct conversation between two players
 */
export function useGetOrCreateDirectConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playerId1, playerId2 }: { playerId1: string; playerId2: string }) =>
      getOrCreateDirectConversation(playerId1, playerId2),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.playerConversations(variables.playerId1),
      });
    },
  });
}

// ============================================================================
// MESSAGE HOOKS
// ============================================================================

/**
 * Get messages for a conversation with infinite scroll
 */
export function useMessages(conversationId: string | undefined, pageSize = 50) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(conversationId || ''),
    queryFn: async ({ pageParam = 0 }) => {
      const messages = await getMessages(conversationId!, {
        limit: pageSize,
        offset: pageParam,
      });
      return messages;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) {
        return undefined; // No more pages
      }
      return allPages.flat().length;
    },
    initialPageParam: 0,
    enabled: !!conversationId,
  });
}

/**
 * Send a message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) => sendMessage(input),
    onSuccess: (newMessage, variables) => {
      // Optimistically update messages list
      queryClient.setQueryData(
        chatKeys.messages(variables.conversation_id),
        (oldData: { pages: MessageWithSender[][]; pageParams: number[] } | undefined) => {
          if (!oldData) return oldData;
          
          // Add new message to the first page (messages are ordered desc)
          const newPages = [...oldData.pages];
          newPages[0] = [newMessage as MessageWithSender, ...newPages[0]];
          
          return {
            ...oldData,
            pages: newPages,
          };
        }
      );

      // Invalidate conversation list to update last message preview
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversations(),
      });
    },
  });
}

/**
 * Mark messages as read
 */
export function useMarkMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      playerId,
    }: {
      conversationId: string;
      playerId: string;
    }) => markMessagesAsRead(conversationId, playerId),
    onSuccess: (_, variables) => {
      // Invalidate unread counts
      queryClient.invalidateQueries({
        queryKey: chatKeys.unreadCount(variables.playerId),
      });
      queryClient.invalidateQueries({
        queryKey: chatKeys.playerConversations(variables.playerId),
      });
    },
  });
}

/**
 * Delete a message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      senderId,
      conversationId,
    }: {
      messageId: string;
      senderId: string;
      conversationId: string;
    }) => deleteMessage(messageId, senderId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages(variables.conversationId),
      });
    },
  });
}

/**
 * Edit a message
 */
export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      senderId,
      newContent,
    }: {
      messageId: string;
      senderId: string;
      newContent: string;
      conversationId: string;
    }) => editMessage(messageId, senderId, newContent),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages(variables.conversationId),
      });
    },
  });
}

// ============================================================================
// REACTION HOOKS
// ============================================================================

/**
 * Toggle a reaction on a message
 */
export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      playerId,
      emoji,
    }: {
      messageId: string;
      playerId: string;
      emoji: string;
      conversationId: string; // For cache invalidation
    }) => toggleReaction(messageId, playerId, emoji),
    onSuccess: (_, variables) => {
      // Invalidate messages to refresh reactions
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages(variables.conversationId),
      });
    },
  });
}

// ============================================================================
// PARTICIPANT HOOKS
// ============================================================================

/**
 * Toggle mute for a conversation
 */
export function useToggleMuteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      playerId,
      isMuted,
    }: {
      conversationId: string;
      playerId: string;
      isMuted: boolean;
    }) => toggleMuteConversation(conversationId, playerId, isMuted),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversation(variables.conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: chatKeys.playerConversations(variables.playerId),
      });
    },
  });
}

/**
 * Toggle pin for a conversation
 */
export function useTogglePinConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      playerId,
      isPinned,
    }: {
      conversationId: string;
      playerId: string;
      isPinned: boolean;
    }) => togglePinConversation(conversationId, playerId, isPinned),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversation(variables.conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: chatKeys.playerConversations(variables.playerId),
      });
    },
  });
}

/**
 * Toggle archive for a conversation
 */
export function useToggleArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      playerId,
      isArchived,
    }: {
      conversationId: string;
      playerId: string;
      isArchived: boolean;
    }) => toggleArchiveConversation(conversationId, playerId, isArchived),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversation(variables.conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: chatKeys.playerConversations(variables.playerId),
      });
    },
  });
}

/**
 * Leave a conversation
 */
export function useLeaveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      playerId,
    }: {
      conversationId: string;
      playerId: string;
    }) => leaveConversation(conversationId, playerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.playerConversations(variables.playerId),
      });
    },
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Get total unread message count
 */
export function useTotalUnreadCount(playerId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.unreadCount(playerId || ''),
    queryFn: () => getTotalUnreadCount(playerId!),
    enabled: !!playerId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// REAL-TIME HOOKS
// ============================================================================

/**
 * Subscribe to real-time messages in a conversation
 */
export function useChatRealtime(
  conversationId: string | undefined,
  playerId: string | undefined,
  onNewMessage?: (message: Message) => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId || !playerId) return;

    const channel = subscribeToMessages(conversationId, (newMessage) => {
      // Add message to cache
      queryClient.setQueryData(
        chatKeys.messages(conversationId),
        (oldData: { pages: MessageWithSender[][]; pageParams: number[] } | undefined) => {
          if (!oldData) return oldData;
          
          const newPages = [...oldData.pages];
          // Only add if not already present (avoid duplicates)
          const exists = newPages[0]?.some((m) => m.id === newMessage.id);
          if (!exists) {
            newPages[0] = [newMessage as MessageWithSender, ...(newPages[0] || [])];
          }
          
          return {
            ...oldData,
            pages: newPages,
          };
        }
      );

      // Call custom handler
      onNewMessage?.(newMessage);
    });

    return () => {
      unsubscribeFromChannel(channel);
    };
  }, [conversationId, playerId, queryClient, onNewMessage]);
}

/**
 * Subscribe to all conversation updates
 */
export function useConversationsRealtime(playerId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!playerId) return;

    const channel = subscribeToConversations(playerId, () => {
      // Refresh conversations list
      queryClient.invalidateQueries({
        queryKey: chatKeys.playerConversations(playerId),
      });
      queryClient.invalidateQueries({
        queryKey: chatKeys.unreadCount(playerId),
      });
    });

    return () => {
      unsubscribeFromChannel(channel);
    };
  }, [playerId, queryClient]);
}

// ============================================================================
// CHAT AGREEMENT HOOKS
// ============================================================================

/**
 * Check if player has agreed to chat rules
 */
export function useChatAgreement(playerId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.chatAgreement(playerId ?? ''),
    queryFn: () => hasAgreedToChatRules(playerId!),
    enabled: !!playerId,
    staleTime: Infinity, // Only need to check once per session
  });
}

/**
 * Agree to chat rules mutation
 */
export function useAgreeToChatRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playerId: string) => agreeToChatRules(playerId),
    onSuccess: (_, playerId) => {
      // Update the cache to reflect agreement
      queryClient.setQueryData(chatKeys.chatAgreement(playerId), true);
    },
  });
}

// ============================================================================
// ONLINE STATUS HOOKS
// ============================================================================

/**
 * Get online status for multiple players
 */
export function usePlayersOnlineStatus(playerIds: string[]) {
  return useQuery({
    queryKey: chatKeys.onlineStatus(playerIds),
    queryFn: () => getPlayersOnlineStatus(playerIds),
    enabled: playerIds.length > 0,
    staleTime: 60 * 1000, // Refresh every minute
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

/**
 * Update current player's last seen timestamp
 * Call this hook to track user activity
 */
export function useUpdateLastSeen(playerId: string | undefined) {
  const lastUpdateRef = useRef<number>(0);

  const updateLastSeen = useCallback(() => {
    if (!playerId) return;
    
    // Throttle updates to max once per minute
    const now = Date.now();
    if (now - lastUpdateRef.current < 60 * 1000) return;
    
    lastUpdateRef.current = now;
    updatePlayerLastSeen(playerId);
  }, [playerId]);

  // Update on mount and periodically
  useEffect(() => {
    if (!playerId) return;

    // Initial update
    updateLastSeen();

    // Update every 2 minutes while active
    const interval = setInterval(updateLastSeen, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [playerId, updateLastSeen]);

  return updateLastSeen;
}

// ============================================================================
// TYPING INDICATOR HOOKS
// ============================================================================

/**
 * Subscribe to typing indicators in a conversation
 */
export function useTypingIndicators(
  conversationId: string | undefined,
  playerId: string | undefined,
  playerName: string | undefined
) {
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId || !playerId || !playerName) {
      setTypingUsers([]);
      return;
    }

    const channel = subscribeToTypingIndicators(
      conversationId,
      playerId,
      playerName,
      (users) => {
        // Filter out stale typing indicators (older than 5 seconds)
        const now = Date.now();
        const activeUsers = users.filter((u) => now - u.timestamp < 5000);
        setTypingUsers(activeUsers);
      }
    );

    return () => {
      unsubscribeFromTypingIndicators(conversationId);
    };
  }, [conversationId, playerId, playerName]);

  // Function to send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!conversationId || !playerId || !playerName) return;

      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      sendTypingIndicator(conversationId, playerId, playerName, isTyping);

      // Auto-stop typing after 3 seconds
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          sendTypingIndicator(conversationId, playerId, playerName, false);
        }, 3000);
      }
    },
    [conversationId, playerId, playerName]
  );

  return {
    typingUsers,
    sendTyping,
  };
}

// ============================================================================
// SEARCH HOOKS
// ============================================================================

/**
 * Search messages within a conversation
 */
export function useSearchMessages(
  conversationId: string | undefined,
  query: string,
  enabled = true
) {
  return useQuery({
    queryKey: chatKeys.searchMessages(conversationId || '', query),
    queryFn: () => searchMessagesInConversation(conversationId!, query),
    enabled: enabled && !!conversationId && query.trim().length >= 2,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  ConversationPreview,
  ConversationWithDetails,
  Message,
  MessageWithSender,
  SendMessageInput,
  CreateConversationInput,
  ReactionSummary,
  PlayerOnlineStatus,
  TypingIndicator,
  SearchMessageResult,
};
