/**
 * ChatConversation Screen
 * The actual chat view for a conversation
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Skeleton, SkeletonAvatar, useToast } from '@rallia/shared-components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { useThemeStyles, useAuth, useProfile } from '../hooks';
import {
  useConversation,
  useMessages,
  useSendMessage,
  useMarkMessagesAsRead,
  useToggleReaction,
  useChatRealtime,
  useReactionsRealtime,
  useChatAgreement,
  useAgreeToChatRules,
  useEditMessage,
  useTypingIndicators,
  useToggleMuteConversation,
  useBlockedStatus,
  useFavoriteStatus,
} from '@rallia/shared-hooks';
import { 
  getMessagesReactions, 
  getNetworkByConversationId, 
  deleteMessage,
  type ReactionSummary,
  type MessageWithSender,
} from '@rallia/shared-services';
import { 
  ChatHeader, 
  MessageList, 
  MessageInput, 
  ChatAgreementModal,
  TypingIndicator,
  MessageActionsSheet,
  EditMessageModal,
  ChatSearchBar,
  BlockedUserModal,
  ReportUserModal,
} from '../features/chat';
import type { MessageListRef } from '../features/chat';
import type { RootStackParamList, ChatStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
// Support both Root Stack 'Chat' and Chat Stack 'ChatScreen' routes
type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'> | RouteProp<ChatStackParamList, 'ChatScreen'>;

interface NetworkInfo {
  id: string;
  name: string;
  cover_image_url: string | null;
  member_count: number;
}

export default function ChatConversationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ChatRouteProp>();
  const { conversationId, title: routeTitle } = route.params;

  const { colors } = useThemeStyles();
  const { session } = useAuth();
  const { profile } = useProfile();
  const toast = useToast();
  const playerId = session?.user?.id;
  // Get player name for typing indicator - use type assertion since DB types may not include first_name directly
  const playerName = (profile as { first_name?: string } | null)?.first_name || 'User';
  const insets = useSafeAreaInsets();

  const [reactions, setReactions] = useState<Map<string, ReactionSummary[]>>(new Map());
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  
  // Reply state
  const [replyToMessage, setReplyToMessage] = useState<MessageWithSender | null>(null);
  
  // Message actions sheet state
  const [selectedMessage, setSelectedMessage] = useState<MessageWithSender | null>(null);
  const [selectedMessageY, setSelectedMessageY] = useState<number | undefined>(undefined);
  const [showMessageActions, setShowMessageActions] = useState(false);
  
  // Edit message modal state
  const [editingMessage, setEditingMessage] = useState<MessageWithSender | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Search bar state
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedMessageIds, setHighlightedMessageIds] = useState<string[]>([]);
  const [currentHighlightedId, setCurrentHighlightedId] = useState<string | undefined>();
  
  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Ref for MessageList to scroll to messages
  const messageListRef = React.useRef<MessageListRef>(null);

  // Check if user has agreed to chat rules
  const { data: hasAgreed, isLoading: isLoadingAgreement } = useChatAgreement(playerId);
  const agreeToChatRulesMutation = useAgreeToChatRules();
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  
  // Mute mutation
  const { mutate: toggleMuteMutation } = useToggleMuteConversation();

  // Show agreement modal if user hasn't agreed yet
  useEffect(() => {
    if (!isLoadingAgreement && hasAgreed === false) {
      setShowAgreementModal(true);
    }
  }, [hasAgreed, isLoadingAgreement]);

  const handleAgreeToRules = useCallback(() => {
    if (!playerId) return;
    
    agreeToChatRulesMutation.mutate(playerId, {
      onSuccess: () => {
        setShowAgreementModal(false);
      },
    });
  }, [playerId, agreeToChatRulesMutation]);

  // Fetch conversation details
  const { data: conversation, isLoading: isLoadingConversation } = useConversation(conversationId);

  // Fetch messages with infinite scroll
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchMessages,
    isRefetching,
  } = useMessages(conversationId);

  // Flatten pages into a single array
  const messages = useMemo(
    () => messagesData?.pages.flat() || [],
    [messagesData]
  );

  // Mutations
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkMessagesAsRead();
  const toggleReactionMutation = useToggleReaction();
  const editMessageMutation = useEditMessage();

  // Typing indicators
  const { typingUsers, sendTyping } = useTypingIndicators(conversationId, playerId, playerName);

  // Handle typing change from input
  const handleTypingChange = useCallback((isTyping: boolean) => {
    sendTyping(isTyping);
  }, [sendTyping]);

  // Real-time subscriptions for messages (including edits and deletes)
  useChatRealtime(conversationId, playerId);
  
  // Real-time subscription for reactions
  useReactionsRealtime(conversationId);

  // Mark messages as read when entering the conversation
  useEffect(() => {
    if (conversationId && playerId) {
      markAsReadMutation.mutate({ conversationId, playerId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, playerId]);

  // Fetch network info for group chats (for cover image)
  useEffect(() => {
    const fetchNetworkInfo = async () => {
      if (!conversation || conversation.conversation_type !== 'group') {
        setNetworkInfo(null);
        return;
      }

      try {
        const info = await getNetworkByConversationId(conversationId);
        setNetworkInfo(info);
      } catch (error) {
        console.error('Error fetching network info:', error);
      }
    };

    fetchNetworkInfo();
  }, [conversation, conversationId]);

  // Fetch reactions for visible messages
  const fetchReactions = useCallback(async () => {
    if (messages.length === 0 || !playerId) return;
    
    try {
      const messageIds = messages.map((m) => m.id);
      const reactionsMap = await getMessagesReactions(messageIds, playerId);
      setReactions(reactionsMap);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  }, [messages, playerId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Get conversation info for header
  const headerTitle = useMemo(() => {
    if (routeTitle) return routeTitle;
    if (conversation?.title) return conversation.title;
    
    // For direct conversations, show the other participant's name
    if (conversation?.conversation_type === 'direct' && conversation.participants) {
      const otherParticipant = conversation.participants.find(
        (p) => p.player_id !== playerId
      );
      if (otherParticipant?.player?.profile) {
        const { first_name, last_name } = otherParticipant.player.profile;
        return last_name ? `${first_name} ${last_name}` : first_name;
      }
    }
    
    return 'Chat';
  }, [routeTitle, conversation, playerId]);

  const headerSubtitle = useMemo(() => {
    if (!conversation) return undefined;
    
    if (conversation.conversation_type === 'group' || 
        conversation.conversation_type === 'announcement') {
      const count = networkInfo?.member_count || conversation.participants?.length || 0;
      return `${count} participant${count !== 1 ? 's' : ''}`;
    }
    
    return undefined;
  }, [conversation, networkInfo]);

  // Get group avatar (if it's a group conversation linked to a network)
  const headerImage = useMemo(() => {
    // For group chats linked to a network, use network cover image
    if (conversation?.conversation_type === 'group' && networkInfo?.cover_image_url) {
      return networkInfo.cover_image_url;
    }
    
    // For simple group chats (no network), use conversation picture_url
    if (conversation?.conversation_type === 'group' && conversation.picture_url) {
      return conversation.picture_url;
    }

    // For direct messages, show the other participant's avatar
    if (conversation?.conversation_type === 'direct' && conversation.participants) {
      const otherParticipant = conversation.participants.find(
        (p) => p.player_id !== playerId
      );
      return otherParticipant?.player?.profile?.profile_picture_url || null;
    }
    
    return null;
  }, [conversation, playerId, networkInfo]);

  // Check if this is a direct (user-to-user) chat
  const isDirectChat = useMemo(() => {
    return conversation?.conversation_type === 'direct';
  }, [conversation]);

  // Get the other user's ID for direct chats (used for blocking)
  const otherUserId = useMemo(() => {
    if (!isDirectChat || !conversation?.participants || !playerId) return undefined;
    const otherParticipant = conversation.participants.find(
      (p) => p.player_id !== playerId
    );
    return otherParticipant?.player_id;
  }, [isDirectChat, conversation, playerId]);

  // Get the other user's name for the blocked modal
  const otherUserName = useMemo(() => {
    if (!isDirectChat || !conversation?.participants || !playerId) return 'this user';
    const otherParticipant = conversation.participants.find(
      (p) => p.player_id !== playerId
    );
    if (otherParticipant?.player?.profile) {
      const { first_name, last_name } = otherParticipant.player.profile;
      return last_name ? `${first_name} ${last_name}` : (first_name || 'this user');
    }
    return 'this user';
  }, [isDirectChat, conversation, playerId]);

  // Block status for direct chats
  const {
    isBlocked,
    isToggling: isTogglingBlock,
    toggleBlock,
    unblockUser,
  } = useBlockedStatus(playerId, otherUserId);

  // Favorite status for direct chats
  const {
    isFavorite,
    toggleFavorite,
  } = useFavoriteStatus(playerId, otherUserId);

  // Get current participant's mute status
  const isMuted = useMemo(() => {
    if (!conversation?.participants || !playerId) return false;
    const currentParticipant = conversation.participants.find(
      (p) => p.player_id === playerId
    );
    return currentParticipant?.is_muted ?? false;
  }, [conversation, playerId]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Navigate to player profile (direct chat) or group info (group chat) when tapping header
  const handleTitlePress = useCallback(() => {
    if (isDirectChat && otherUserId) {
      navigation.navigate('PlayerProfile', { playerId: otherUserId });
    } else if (conversation?.conversation_type === 'group') {
      navigation.navigate('GroupChatInfo', { conversationId });
    }
  }, [isDirectChat, otherUserId, conversation, conversationId, navigation]);

  // Header menu handlers
  const handleSearchPress = useCallback(() => {
    setShowSearchBar(true);
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!playerId || !conversationId) return;
    toggleMuteMutation({
      conversationId,
      playerId,
      isMuted: !isMuted,
    });
  }, [playerId, conversationId, isMuted, toggleMuteMutation]);

  const handleToggleBlock = useCallback(async () => {
    if (!isDirectChat || !otherUserId) return;
    try {
      await toggleBlock();
    } catch (error) {
      console.error('Failed to toggle block:', error);
    }
  }, [isDirectChat, otherUserId, toggleBlock]);

  // Handle toggle favorite
  const handleToggleFavorite = useCallback(async () => {
    if (!isDirectChat || !otherUserId) return;
    try {
      await toggleFavorite();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }, [isDirectChat, otherUserId, toggleFavorite]);

  // Handle unblock from the blocked modal
  const handleUnblockFromModal = useCallback(async () => {
    try {
      await unblockUser();
    } catch (error) {
      console.error('Failed to unblock:', error);
    }
  }, [unblockUser]);

  const handleReport = useCallback(() => {
    if (!isDirectChat || !otherUserId) {
      Alert.alert('Cannot Report', 'You can only report users in direct conversations');
      return;
    }
    setShowReportModal(true);
  }, [isDirectChat, otherUserId]);

  const handleClearChat = useCallback(() => {
    if (!playerId) return;
    
    Alert.alert(
      'Clear Your Messages',
      'This will delete all messages you sent in this conversation. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const { clearChatForUser } = await import('@rallia/shared-services');
              const deletedCount = await clearChatForUser(conversationId, playerId);
              refetchMessages();
              toast.success(`${deletedCount} message${deletedCount !== 1 ? 's' : ''} deleted`);
            } catch (error) {
              console.error('Failed to clear chat:', error);
              toast.error('Failed to clear messages. Please try again.');
            }
          },
        },
      ]
    );
  }, [conversationId, playerId, refetchMessages, toast]);

  const handleCloseSearch = useCallback(() => {
    setShowSearchBar(false);
    setSearchQuery('');
    setHighlightedMessageIds([]);
    setCurrentHighlightedId(undefined);
  }, []);

  // Handle search query change from ChatSearchBar
  const handleSearchChange = useCallback((query: string, matchedIds: string[]) => {
    setSearchQuery(query);
    setHighlightedMessageIds(matchedIds);
    if (matchedIds.length > 0) {
      setCurrentHighlightedId(matchedIds[0]);
    } else {
      setCurrentHighlightedId(undefined);
    }
  }, []);

  // Handle navigation to a matched message
  const handleNavigateToMatch = useCallback((messageId: string) => {
    setCurrentHighlightedId(messageId);
    // Scroll to the message
    messageListRef.current?.scrollToMessage(messageId);
  }, []);

  const handleSendMessage = useCallback(
    (content: string, replyToMessageId?: string) => {
      if (!playerId || !conversationId) return;

      sendMessageMutation.mutate({
        conversation_id: conversationId,
        sender_id: playerId,
        content,
        reply_to_message_id: replyToMessageId,
      });
      
      // Clear reply state after sending
      setReplyToMessage(null);
    },
    [playerId, conversationId, sendMessageMutation]
  );

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      if (!playerId) return;

      toggleReactionMutation.mutate(
        {
          messageId,
          playerId,
          emoji,
          conversationId,
        },
        {
          onSuccess: () => {
            // Refetch reactions to update the count
            fetchReactions();
          },
        }
      );
    },
    [playerId, conversationId, toggleReactionMutation, fetchReactions]
  );

  // Handle reply to message
  const handleReplyToMessage = useCallback((message: MessageWithSender) => {
    setReplyToMessage(message);
  }, []);

  // Handle cancel reply
  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);

  // Handle long press on message (show actions sheet)
  const handleLongPressMessage = useCallback((message: MessageWithSender, pageY?: number) => {
    setSelectedMessage(message);
    setSelectedMessageY(pageY);
    setShowMessageActions(true);
  }, []);

  // Handle message actions sheet close
  const handleCloseMessageActions = useCallback(() => {
    setShowMessageActions(false);
    setSelectedMessage(null);
    setSelectedMessageY(undefined);
  }, []);

  // Handle edit message - open edit modal
  const handleEditMessage = useCallback(() => {
    if (selectedMessage) {
      setEditingMessage(selectedMessage);
      setShowEditModal(true);
    }
    setShowMessageActions(false);
  }, [selectedMessage]);

  // Handle save edited message
  const handleSaveEditedMessage = useCallback(async (newContent: string) => {
    if (!editingMessage || !playerId || !conversationId) return;
    
    try {
      await editMessageMutation.mutateAsync({
        messageId: editingMessage.id,
        senderId: playerId,
        newContent: newContent,
        conversationId: conversationId,
      });
      refetchMessages();
    } catch (error) {
      console.error('Error editing message:', error);
    }
    
    setShowEditModal(false);
    setEditingMessage(null);
  }, [editingMessage, playerId, conversationId, editMessageMutation, refetchMessages]);

  // Handle close edit modal
  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingMessage(null);
  }, []);

  // Handle delete message
  const handleDeleteMessage = useCallback(async () => {
    if (!selectedMessage || !playerId) return;
    
    try {
      await deleteMessage(selectedMessage.id, playerId);
      refetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
    
    setShowMessageActions(false);
    setSelectedMessage(null);
  }, [selectedMessage, playerId, refetchMessages]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    refetchMessages();
  }, [refetchMessages]);

  const isLoading = isLoadingConversation || isLoadingMessages;

  if (isLoading && messages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ChatHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          imageUrl={headerImage}
          onBack={handleBack}
          onTitlePress={handleTitlePress}
          isDirectChat={isDirectChat}
          isMuted={isMuted}
          isBlocked={isBlocked}
          isFavorite={isFavorite}
          onSearchPress={handleSearchPress}
          onToggleMute={handleToggleMute}
          onToggleFavorite={handleToggleFavorite}
          onToggleBlock={handleToggleBlock}
          onReport={handleReport}
          onClearChat={handleClearChat}
        />
        <View style={styles.loadingContainer}>
          {/* Message Skeleton Loaders */}
          {[...Array(6)].map((_, index) => {
            const isMe = index % 3 === 0;
            return (
              <View 
                key={index} 
                style={[
                  styles.messageSkeletonRow, 
                  isMe ? styles.messageSkeletonRowRight : styles.messageSkeletonRowLeft
                ]}
              >
                {!isMe && (
                  <SkeletonAvatar 
                    size={32} 
                    backgroundColor={colors.cardBackground} 
                    highlightColor={colors.border} 
                  />
                )}
                <View style={[styles.messageSkeleton, isMe && styles.messageSkeletonRight]}>
                  <Skeleton 
                    width={isMe ? 150 : 200} 
                    height={50} 
                    borderRadius={16}
                    backgroundColor={colors.cardBackground} 
                    highlightColor={colors.border} 
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <ChatHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        imageUrl={headerImage}
        onBack={handleBack}
        onTitlePress={handleTitlePress}
        isDirectChat={isDirectChat}
        isMuted={isMuted}
        isBlocked={isBlocked}
        isFavorite={isFavorite}
        onSearchPress={handleSearchPress}
        onToggleMute={handleToggleMute}
        onToggleFavorite={handleToggleFavorite}
        onToggleBlock={handleToggleBlock}
        onReport={handleReport}
        onClearChat={handleClearChat}
      />

      {/* Search bar - shown when search is activated from menu */}
      {showSearchBar && (
        <ChatSearchBar
          conversationId={conversationId}
          visible={showSearchBar}
          onClose={handleCloseSearch}
          onSearchChange={handleSearchChange}
          onNavigateToMatch={handleNavigateToMatch}
        />
      )}

      <MessageList
        ref={messageListRef}
        messages={messages}
        currentUserId={playerId || ''}
        onReact={handleReact}
        onLoadMore={handleLoadMore}
        isLoadingMore={isFetchingNextPage}
        hasMore={hasNextPage || false}
        onRefresh={handleRefresh}
        isRefreshing={isRefetching}
        reactions={reactions}
        onReplyToMessage={handleReplyToMessage}
        onLongPressMessage={handleLongPressMessage}
        searchQuery={searchQuery}
        highlightedMessageIds={highlightedMessageIds}
        currentHighlightedId={currentHighlightedId}
      />

      {/* Typing indicators */}
      {typingUsers.length > 0 && (
        <TypingIndicator typingUsers={typingUsers} />
      )}

      {/* Show blocked modal if user has blocked the other user */}
      {isDirectChat && isBlocked ? (
        <BlockedUserModal
          visible={true}
          userName={otherUserName}
          onUnblock={handleUnblockFromModal}
          onReport={handleReport}
          onBack={handleBack}
          isUnblocking={isTogglingBlock}
        />
      ) : (
        <MessageInput
          onSend={handleSendMessage}
          disabled={sendMessageMutation.isPending}
          replyToMessage={replyToMessage}
          onCancelReply={handleCancelReply}
          onTypingChange={handleTypingChange}
        />
      )}

      {/* Bottom safe area spacer for devices with home indicator */}
      <View style={{ height: insets.bottom }} />

      {/* Chat Agreement Modal - only shows once for first-time users */}
      <ChatAgreementModal
        visible={showAgreementModal}
        onAgree={handleAgreeToRules}
        groupName={headerTitle}
        groupImageUrl={headerImage}
      />

      {/* Message Actions Sheet */}
      <MessageActionsSheet
        visible={showMessageActions}
        message={selectedMessage}
        isOwnMessage={selectedMessage?.sender_id === playerId}
        onClose={handleCloseMessageActions}
        onReply={() => {
          if (selectedMessage) {
            handleReplyToMessage(selectedMessage);
          }
          handleCloseMessageActions();
        }}
        onEdit={handleEditMessage}
        onDelete={handleDeleteMessage}
        onReact={(emoji) => {
          if (selectedMessage) {
            handleReact(selectedMessage.id, emoji);
          }
        }}
        messageY={selectedMessageY}
      />

      {/* Edit Message Modal */}
      <EditMessageModal
        visible={showEditModal}
        message={editingMessage}
        onClose={handleCloseEditModal}
        onSave={handleSaveEditedMessage}
        isSaving={editMessageMutation.isPending}
      />

      {/* Report User Modal */}
      {isDirectChat && otherUserId && playerId && (
        <ReportUserModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          reporterId={playerId}
          reportedId={otherUserId}
          reportedName={headerTitle}
          conversationId={conversationId}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  messageSkeletonRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  messageSkeletonRowLeft: {
    justifyContent: 'flex-start',
  },
  messageSkeletonRowRight: {
    justifyContent: 'flex-end',
  },
  messageSkeleton: {
    marginLeft: 8,
  },
  messageSkeletonRight: {
    marginLeft: 0,
    marginRight: 0,
  },
});
