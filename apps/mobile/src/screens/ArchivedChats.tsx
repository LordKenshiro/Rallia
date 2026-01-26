/**
 * Archived Chats Screen
 * Shows all archived conversations
 */

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Text, SkeletonConversation } from '@rallia/shared-components';
import { useThemeStyles, useAuth, useTranslation, type TranslationKey } from '../hooks';
import { spacingPixels, fontSizePixels, primary } from '@rallia/design-system';
import {
  usePlayerConversations,
  useTogglePinConversation,
  useToggleMuteConversation,
  useToggleArchiveConversation,
  useBlockedUserIds,
  type ConversationPreview,
} from '@rallia/shared-hooks';
import { ConversationItem, ConversationActionsSheet } from '../features/chat';
import type { ChatStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<ChatStackParamList>;

const ArchivedChats = () => {
  const { colors } = useThemeStyles();
  const navigation = useNavigation<NavigationProp>();
  const { session } = useAuth();
  const { t } = useTranslation();
  const playerId = session?.user?.id;

  // State for conversation actions sheet
  const [selectedConversation, setSelectedConversation] =
    React.useState<ConversationPreview | null>(null);
  const [showActionsSheet, setShowActionsSheet] = React.useState(false);

  const {
    data: conversations,
    isLoading,
    refetch,
    isRefetching,
  } = usePlayerConversations(playerId);

  // Mutations for conversation actions
  const { mutate: togglePin } = useTogglePinConversation();
  const { mutate: toggleMute } = useToggleMuteConversation();
  const { mutate: toggleArchive } = useToggleArchiveConversation();

  // Fetch blocked user IDs to show "You blocked this user" in conversation preview
  const { data: blockedUserIds = new Set<string>() } = useBlockedUserIds(playerId);

  // Filter to only archived conversations
  const archivedConversations = useMemo(() => {
    if (!conversations) return [];
    return conversations.filter(c => c.is_archived);
  }, [conversations]);

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

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="archive-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t('chat.archivedChats.noArchivedChats' as TranslationKey)}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          {t('chat.archivedChats.chatsAppearHere' as TranslationKey)}
        </Text>
      </View>
    );
  }, [isLoading, colors, t]);

  const renderSeparator = useCallback(
    () => <View style={[styles.separator, { backgroundColor: colors.border }]} />,
    [colors]
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('chat.archivedChats.title' as TranslationKey)}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[...Array(5)].map((_, index) => (
            <SkeletonConversation key={index} />
          ))}
        </View>
      ) : (
        <FlatList
          data={archivedConversations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
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
            archivedConversations.length === 0 ? styles.emptyListContent : undefined
          }
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
    alignItems: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
  },
  backButton: {
    padding: spacingPixels[1],
    marginRight: spacingPixels[2],
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSizePixels.xl,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 32, // Balance the back button
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    marginLeft: 66 + spacingPixels[4],
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

export default ArchivedChats;
