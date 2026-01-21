/**
 * Chat Service - Export all chat-related functions and types
 */

export {
  // Types
  type ConversationType,
  type MessageStatus,
  type Conversation,
  type ConversationParticipant,
  type Message,
  type MessageWithSender,
  type ConversationWithDetails,
  type ConversationPreview,
  type SendMessageInput,
  type CreateConversationInput,
  type MessageReaction,
  type ReactionSummary,
  // New enhanced types
  type PlayerOnlineStatus,
  type TypingIndicator,
  type SearchMessageResult,
  
  // Constants
  COMMON_REACTIONS,
  
  // Conversation Operations
  getPlayerConversations,
  getConversation,
  createConversation,
  getOrCreateDirectConversation,
  
  // Message Operations
  getMessages,
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
  editMessage,
  clearChatForUser,
  
  // Participant Operations
  toggleMuteConversation,
  leaveConversation,
  addParticipant,
  
  // Pin & Archive Operations
  togglePinConversation,
  toggleArchiveConversation,
  
  // Online Status Operations
  updatePlayerLastSeen,
  getPlayersOnlineStatus,
  isPlayerOnline,
  
  // Typing Indicator Operations
  subscribeToTypingIndicators,
  sendTypingIndicator,
  unsubscribeFromTypingIndicators,
  
  // Search Operations
  searchMessagesInConversation,
  
  // Reaction Operations
  addReaction,
  removeReaction,
  toggleReaction,
  getMessageReactions,
  getMessagesReactions,
  
  // Real-time Subscriptions
  subscribeToMessages,
  subscribeToConversations,
  unsubscribeFromChannel,
  
  // Utility Functions
  getTotalUnreadCount,
  getConversationByNetworkId,
  getNetworkByConversationId,
  
  // Chat Agreement
  hasAgreedToChatRules,
  agreeToChatRules,
  
  // Conversation Management
  type UpdateConversationInput,
  updateConversation,
  addConversationParticipant,
  removeConversationParticipant,
} from './chatService';
