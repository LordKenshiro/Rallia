/**
 * Chat Screen (Inbox)
 * Shows all conversations the user is part of with tabbed sections:
 * - Direct Messages: User-to-user chats (not linked to matches) + manually created group chats
 * - Groups & Communities: Chats linked to networks (groups/communities)
 * - Match Chats: Chats linked to matches (both singles and doubles)
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Text, SkeletonConversation } from '@rallia/shared-components';
import { lightHaptic, selectionHaptic } from '@rallia/shared-utils';
import { useThemeStyles, useAuth, useTranslation, useTourSequence, type TranslationKey } from '../hooks';
import { CopilotStep, WalkthroughableView } from '../context/TourContext';
import { spacingPixels, fontSizePixels, primary, neutral } from '@rallia/design-system';
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
import { ConversationItem, ConversationActionsSheet, CreateGroupChatModal } from '../features/chat';
import type { ChatStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<ChatStackParamList>;

type TabKey = 'direct' | 'groups' | 'matches';

const TAB_CONFIGS: { key: TabKey; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'direct', icon: 'chatbubble-outline' },
  { key: 'groups', icon: 'people-outline' },
  { key: 'matches', icon: 'tennisball-outline' },
];

const Chat = () => {
  const { colors, isDark } = useThemeStyles();
  const navigation = useNavigation<NavigationProp>();
  const { session } = useAuth();
  const { t } = useTranslation();
  const playerId = session?.user?.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('direct');
  
  // Chat screen tour - triggers after main navigation tour is completed
  const { shouldShowTour: _shouldShowChatTour } = useTourSequence({
    screenId: 'chat',
    isReady: !!playerId,
    delay: 800,
    autoStart: true,
  });
  
  // State for conversation actions sheet
  const [selectedConversation, setSelectedConversation] = useState<ConversationPreview | null>(null);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  
  // State for create group chat modal
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

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

  // Categorize conversations into tabs
  const categorizedConversations = useMemo(() => {
    if (!conversations) return { direct: [], groups: [], matches: [] };
    
    const direct: ConversationPreview[] = [];
    const groups: ConversationPreview[] = [];
    const matches: ConversationPreview[] = [];
    
    conversations.forEach((conv) => {
      // Match chats: has match_id (both direct and group types)
      if (conv.match_id) {
        matches.push(conv);
      }
      // Groups & Communities: networks with type 'player_group', 'club', or 'community'
      else if (conv.network_type && ['player_group', 'club', 'community'].includes(conv.network_type)) {
        groups.push(conv);
      }
      // Direct chats: direct messages not linked to matches + manually created groups (network_type = 'friends')
      else {
        direct.push(conv);
      }
    });
    
    return { direct, groups, matches };
  }, [conversations]);

  // Get counts for each tab (excluding archived)
  const tabCounts = useMemo(() => {
    return {
      direct: categorizedConversations.direct.filter(c => !c.is_archived).length,
      groups: categorizedConversations.groups.filter(c => !c.is_archived).length,
      matches: categorizedConversations.matches.filter(c => !c.is_archived).length,
    };
  }, [categorizedConversations]);

  // Filter conversations based on active tab, search query and exclude archived
  const { filteredConversations, archivedCount } = useMemo(() => {
    if (!conversations) return { filteredConversations: [], archivedCount: 0 };

    // Count total archived conversations across all categories
    const archivedCount = conversations.filter((c) => c.is_archived).length;

    // Get conversations for active tab
    const tabConversations = categorizedConversations[activeTab];

    // When searching, search across current tab only
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const filtered = tabConversations.filter((conversation) => {
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
        // Search by match info (for match chats)
        if (conversation.match_info) {
          const sportName = conversation.match_info.sport_name?.toLowerCase() || '';
          if (sportName.includes(query)) {
            return true;
          }
        }
        return false;
      });
      return { filteredConversations: filtered, archivedCount };
    }

    // Filter out archived conversations for normal view
    const filtered = tabConversations.filter((c) => !c.is_archived);
    return { filteredConversations: filtered, archivedCount };
  }, [conversations, categorizedConversations, activeTab, searchQuery]);

  // Navigate to archived chats
  const handleArchivedPress = useCallback(() => {
    lightHaptic();
    navigation.navigate('ArchivedChats');
  }, [navigation]);

  // Handle new group button press
  const handleNewGroupPress = useCallback(() => {
    lightHaptic();
    setShowCreateGroupModal(true);
  }, []);

  // Handle group creation success - navigate to the new chat
  const handleGroupCreated = useCallback((conversationId: string) => {
    // Refetch conversations to include the new group
    refetch();
    // Navigate to the new conversation
    navigation.navigate('ChatScreen', {
      conversationId,
      title: undefined, // Will be loaded from conversation
    });
  }, [refetch, navigation]);

  const handleConversationPress = useCallback(
    (conversation: ConversationPreview) => {
      lightHaptic();
      navigation.navigate('ChatScreen', {
        conversationId: conversation.id,
        title: conversation.title || undefined,
      });
    },
    [navigation]
  );

  const handleConversationLongPress = useCallback((conversation: ConversationPreview) => {
    selectionHaptic();
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
            {t('common.noResultsFound')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            {t('common.tryDifferentSearch')}
          </Text>
        </View>
      );
    }
    
    // Tab-specific empty messages
    const emptyMessages = {
      direct: {
        icon: 'chatbubble-outline' as keyof typeof Ionicons.glyphMap,
        title: t('chat.empty.direct.title'),
        subtitle: t('chat.empty.direct.subtitle'),
      },
      groups: {
        icon: 'people-outline' as keyof typeof Ionicons.glyphMap,
        title: t('chat.empty.groups.title'),
        subtitle: t('chat.empty.groups.subtitle'),
      },
      matches: {
        icon: 'tennisball-outline' as keyof typeof Ionicons.glyphMap,
        title: t('chat.empty.matches.title'),
        subtitle: t('chat.empty.matches.subtitle'),
      },
    };
    
    const { icon, title, subtitle } = emptyMessages[activeTab];
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={icon} size={64} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      </View>
    );
  }, [isLoading, colors, searchQuery, activeTab, t]);

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
              {t('chat.archived')}
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
  }, [searchQuery, archivedCount, colors, isDark, handleArchivedPress, t]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('chat.inbox')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="create-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar - Wrapped with CopilotStep for tour */}
      <CopilotStep
        text={t('tour.chatScreen.search.description' as TranslationKey)}
        order={30}
        name="chat_search"
      >
        <WalkthroughableView style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: isDark ? colors.card : '#F0F0F0' },
            ]}
          >
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('chat.searchConversations')}
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
          <TouchableOpacity style={styles.newGroupButton} onPress={handleNewGroupPress}>
            <Text style={[styles.newGroupText, { color: primary[500] }]}>
              {t('chat.newGroup')}
            </Text>
          </TouchableOpacity>
        </WalkthroughableView>
      </CopilotStep>

      {/* Tab Bar - Wrapped with CopilotStep for tour */}
      <CopilotStep
        text={t('tour.chatScreen.tabs.description' as TranslationKey)}
        order={31}
        name="chat_tabs"
      >
        <WalkthroughableView style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {TAB_CONFIGS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tabCounts[tab.key];
            const label = t(`chat.tabs.${tab.key}`);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  isActive && styles.activeTab,
                  isActive && { borderBottomColor: primary[500] },
                ]}
                onPress={() => {
                  selectionHaptic();
                  setActiveTab(tab.key);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={isActive ? primary[500] : colors.textMuted}
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { 
                      color: isActive ? primary[500] : colors.textMuted,
                      fontWeight: isActive ? '600' : '500',
                    },
                  ]}
                >
                  {label}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      { backgroundColor: isActive ? primary[500] : neutral[400] },
                    ]}
                  >
                    <Text style={styles.tabBadgeText}>
                      {count > 99 ? '99+' : count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </WalkthroughableView>
      </CopilotStep>

      {/* Content - Conversations List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonConversation 
              key={i}
              backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
              highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
              style={{ paddingHorizontal: spacingPixels[4] }}
            />
          ))}
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

      {/* Create Group Chat Modal */}
      <CreateGroupChatModal
        visible={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onSuccess={handleGroupCreated}
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
  // Tab bar styles
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: spacingPixels[2],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabIcon: {
    marginRight: spacingPixels[1],
  },
  tabLabel: {
    fontSize: fontSizePixels.sm,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacingPixels[1],
    paddingHorizontal: spacingPixels[1],
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default Chat;
