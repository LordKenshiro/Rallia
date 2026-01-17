/**
 * Chat Screen (Inbox)
 * Shows all conversations the user is part of
 * Groups, Communities, Direct Messages, etc.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@rallia/shared-components';
import { useThemeStyles, useAuth } from '../hooks';
import { spacingPixels, fontSizePixels, primary } from '@rallia/design-system';
import {
  usePlayerConversations,
  useConversationsRealtime,
  useTogglePinConversation,
  useToggleMuteConversation,
  useToggleArchiveConversation,
  useUpdateLastSeen,
  useBlockedUserIds,
  type ConversationPreview,
} from '@rallia/shared-hooks';
import { ConversationItem, ConversationActionsSheet } from '../features/chat';
import type { ChatStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<ChatStackParamList>;

const Chat = () => {
  const { colors, isDark } = useThemeStyles();
  const navigation = useNavigation<NavigationProp>();
  const { session } = useAuth();
  const playerId = session?.user?.id;
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for conversation actions sheet
  const [selectedConversation, setSelectedConversation] = useState<ConversationPreview | null>(null);
  const [showActionsSheet, setShowActionsSheet] = useState(false);

  const {
    data: conversations,
    isLoading,
    refetch,
    isRefetching,
  } = usePlayerConversations(playerId);

  // Subscribe to real-time updates
  useConversationsRealtime(playerId);

  // Update last seen for online status tracking
  useUpdateLastSeen(playerId);

  // Mutations for conversation actions
  const { mutate: togglePin } = useTogglePinConversation();
  const { mutate: toggleMute } = useToggleMuteConversation();
  const { mutate: toggleArchive } = useToggleArchiveConversation();

  // Fetch blocked user IDs to show "You blocked this user" in conversation preview
  const { data: blockedUserIds = new Set<string>() } = useBlockedUserIds(playerId);

  // Filter conversations based on search query and exclude archived
  const { filteredConversations, archivedCount } = useMemo(() => {
    if (!conversations) return { filteredConversations: [], archivedCount: 0 };

    // Count archived conversations
    const archived = conversations.filter((c) => c.is_archived);
    const archivedCount = archived.length;

    // When searching, include all conversations
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const filtered = conversations.filter((conversation) => {
        // Search by conversation title (group name)
        if (conversation.title?.toLowerCase().includes(query)) {
          return true;
        }
        // Search by other participant name (for direct messages)
        if (conversation.other_participant) {
          const firstName = conversation.other_participant.first_name?.toLowerCase() || '';
          const lastName = conversation.other_participant.last_name?.toLowerCase() || '';
          const fullName = `${firstName} ${lastName}`.trim();
          if (firstName.includes(query) || lastName.includes(query) || fullName.includes(query)) {
            return true;
          }
        }
        return false;
      });
      return { filteredConversations: filtered, archivedCount };
    }

    // Filter out archived conversations for normal view
    const filtered = conversations.filter((c) => !c.is_archived);
    return { filteredConversations: filtered, archivedCount };
  }, [conversations, searchQuery]);

  // Navigate to archived chats
  const handleArchivedPress = useCallback(() => {
    navigation.navigate('ArchivedChats');
  }, [navigation]);

  const handleConversationPress = useCallback(
    (conversation: ConversationPreview) => {
      navigation.navigate('ChatScreen', {
        conversationId: conversation.id,
        title: conversation.title || undefined,
      });
    },
    [navigation]
  );

  const handleConversationLongPress = useCallback((conversation: ConversationPreview) => {
    setSelectedConversation(conversation);
    setShowActionsSheet(true);
  }, []);

  const handleTogglePin = useCallback(() => {
    if (!selectedConversation || !playerId) return;
    togglePin({
      conversationId: selectedConversation.id,
      playerId,
      isPinned: !selectedConversation.is_pinned,
    });
  }, [selectedConversation, playerId, togglePin]);

  const handleToggleMute = useCallback(() => {
    if (!selectedConversation || !playerId) return;
    toggleMute({
      conversationId: selectedConversation.id,
      playerId,
      isMuted: !selectedConversation.is_muted,
    });
  }, [selectedConversation, playerId, toggleMute]);

  const handleToggleArchive = useCallback(() => {
    if (!selectedConversation || !playerId) return;
    toggleArchive({
      conversationId: selectedConversation.id,
      playerId,
      isArchived: !selectedConversation.is_archived,
    });
  }, [selectedConversation, playerId, toggleArchive]);

  const renderItem = useCallback(
    ({ item }: { item: ConversationPreview }) => {
      // Check if the other user in a direct chat is blocked
      const isOtherUserBlocked = Boolean(
        item.conversation_type === 'direct' && 
        item.other_participant?.id && 
        blockedUserIds.has(item.other_participant.id)
      );
      
      return (
        <ConversationItem
          conversation={item}
          onPress={() => handleConversationPress(item)}
          onLongPress={() => handleConversationLongPress(item)}
          isBlocked={isOtherUserBlocked}
        />
      );
    },
    [handleConversationPress, handleConversationLongPress, blockedUserIds]
  );

  const keyExtractor = useCallback((item: ConversationPreview) => item.id, []);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    
    // Show different message when searching vs no conversations
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No results found
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Try a different search term
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No conversations yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          Join a group or start a conversation with another player
        </Text>
      </View>
    );
  }, [isLoading, colors, searchQuery]);

  const renderSeparator = useCallback(
    () => <View style={[styles.separator, { backgroundColor: colors.border }]} />,
    [colors]
  );

  // Render archived chats row at the top of the list
  const renderListHeader = useCallback(() => {
    // Don't show archived row if searching or no archived chats
    if (searchQuery.trim() || archivedCount === 0) return null;

    return (
      <>
        <TouchableOpacity
          style={styles.archivedRow}
          onPress={handleArchivedPress}
          activeOpacity={0.7}
        >
          <View style={[styles.archivedIconContainer, { backgroundColor: isDark ? colors.card : '#F0F0F0' }]}>
            <Ionicons name="archive" size={20} color={colors.textMuted} />
          </View>
          <View style={styles.archivedContent}>
            <Text style={[styles.archivedText, { color: colors.text }]}>
              Archived
            </Text>
          </View>
          <View style={styles.archivedBadge}>
            <Text style={[styles.archivedCount, { color: colors.textMuted }]}>
              {archivedCount}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
      </>
    );
  }, [searchQuery, archivedCount, colors, isDark, handleArchivedPress]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Inbox</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="create-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            { backgroundColor: isDark ? colors.card : '#F0F0F0' },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search conversations"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.newGroupButton}>
          <Text style={[styles.newGroupText, { color: primary[500] }]}>
            New group
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primary[500]} />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderListHeader}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[primary[500]]}
              tintColor={primary[500]}
            />
          }
          contentContainerStyle={
            filteredConversations?.length === 0 && archivedCount === 0 ? styles.emptyListContent : undefined
          }
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Conversation Actions Sheet */}
      <ConversationActionsSheet
        visible={showActionsSheet}
        conversation={selectedConversation}
        onClose={() => {
          setShowActionsSheet(false);
          setSelectedConversation(null);
        }}
        onTogglePin={handleTogglePin}
        onToggleMute={handleToggleMute}
        onToggleArchive={handleToggleArchive}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[2],
  },
  headerTitle: {
    fontSize: fontSizePixels['2xl'],
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: spacingPixels[0],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingBottom: spacingPixels[2],
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[2],
    marginRight: spacingPixels[3],
  },
  searchInput: {
    flex: 1,
    marginLeft: spacingPixels[2],
    fontSize: fontSizePixels.base,
  },
  newGroupButton: {
    paddingVertical: spacingPixels[2],
  },
  newGroupText: {
    fontSize: fontSizePixels.base,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    marginLeft: 66 + spacingPixels[4], // Avatar width + container padding
  },
  archivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
  },
  archivedIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archivedContent: {
    flex: 1,
    marginLeft: spacingPixels[3],
  },
  archivedText: {
    fontSize: fontSizePixels.base,
    fontWeight: '500',
  },
  archivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  archivedCount: {
    fontSize: fontSizePixels.sm,
    marginRight: spacingPixels[1],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacingPixels[8],
  },
  emptyListContent: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: fontSizePixels.lg,
    fontWeight: '600',
    marginTop: spacingPixels[4],
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: fontSizePixels.base,
    marginTop: spacingPixels[2],
    textAlign: 'center',
  },
});

export default Chat;
