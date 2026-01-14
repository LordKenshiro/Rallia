/**
 * SharedLists Screen
 *
 * Manages shared contact lists for inviting non-app users to matches.
 * Features:
 * - Create/Edit/Delete shared lists
 * - Add contacts from phone book or manually
 * - View and manage contacts in each list
 * - Share matches with contacts via SMS/Email/WhatsApp
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { primary } from '@rallia/design-system';
import {
  getSharedContactLists,
  deleteSharedContactList,
  type SharedContactList,
} from '@rallia/shared-services';
import { useThemeStyles, useAuth } from '../hooks';
import type { CommunityStackParamList } from '../navigation/types';
import { CreateListModal, SharedListCard, ShareMatchModal } from '../features/shared-lists';

type NavigationProp = NativeStackNavigationProp<CommunityStackParamList>;

const SharedLists: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useThemeStyles();
  const { session } = useAuth();

  // State
  const [lists, setLists] = useState<SharedContactList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingList, setEditingList] = useState<SharedContactList | null>(null);

  // Fetch lists
  const fetchLists = useCallback(async () => {
    try {
      const data = await getSharedContactLists();
      setLists(data);
    } catch (error) {
      console.error('Failed to fetch lists:', error);
      Alert.alert('Error', 'Failed to load your shared lists. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchLists();
  }, [fetchLists]);

  // Create list handler
  const handleCreateList = useCallback(() => {
    setEditingList(null);
    setShowCreateModal(true);
  }, []);

  // Edit list handler
  const handleEditList = useCallback((list: SharedContactList) => {
    setEditingList(list);
    setShowCreateModal(true);
  }, []);

  // Delete list handler
  const handleDeleteList = useCallback((list: SharedContactList) => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${list.name}"? This will also delete all contacts in this list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSharedContactList(list.id);
              setLists(prev => prev.filter(l => l.id !== list.id));
            } catch (error) {
              console.error('Failed to delete list:', error);
              Alert.alert('Error', 'Failed to delete the list. Please try again.');
            }
          },
        },
      ]
    );
  }, []);

  // View list details handler
  const handleViewList = useCallback(
    (list: SharedContactList) => {
      navigation.navigate('SharedListDetail', { listId: list.id, listName: list.name });
    },
    [navigation]
  );

  // Modal close handler
  const handleModalClose = useCallback(
    (refreshNeeded?: boolean) => {
      setShowCreateModal(false);
      setEditingList(null);
      if (refreshNeeded) {
        fetchLists();
      }
    },
    [fetchLists]
  );

  // Render list item
  const renderListItem = useCallback(
    ({ item }: { item: SharedContactList }) => (
      <SharedListCard
        list={item}
        colors={colors}
        isDark={isDark}
        onPress={() => handleViewList(item)}
        onEdit={() => handleEditList(item)}
        onDelete={() => handleDeleteList(item)}
      />
    ),
    [colors, isDark, handleViewList, handleEditList, handleDeleteList]
  );

  // Render empty state
  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="list-outline" size={64} color={colors.textMuted} />
        <Text size="lg" weight="semibold" color={colors.textMuted} style={styles.emptyTitle}>
          No Shared Lists Yet
        </Text>
        <Text size="sm" color={colors.textMuted} style={styles.emptyDescription}>
          Create a list to easily invite friends and contacts to your matches
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: primary[500] }]}
          onPress={handleCreateList}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text size="sm" weight="semibold" color="#fff">
            Create Your First List
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['bottom']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      {/* Share Match CTA - Always visible at top */}
      <TouchableOpacity
        style={[
          styles.shareMatchCta,
          {
            backgroundColor: isDark ? primary[800] : primary[50],
            borderColor: isDark ? primary[700] : primary[200],
          },
        ]}
        onPress={() => setShowShareModal(true)}
        activeOpacity={0.8}
      >
        <View
          style={[styles.shareMatchIcon, { backgroundColor: isDark ? primary[700] : primary[100] }]}
        >
          <Ionicons name="share-social" size={24} color={isDark ? primary[300] : primary[600]} />
        </View>
        <View style={styles.shareMatchContent}>
          <Text weight="semibold" style={{ color: colors.text }}>
            Share a Match
          </Text>
          <Text size="sm" style={{ color: colors.textSecondary }}>
            Invite contacts to your upcoming games
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text weight="semibold" style={{ color: colors.text }}>
          Your Contact Lists
        </Text>
        {lists.length > 0 && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: primary[500] }]}
            onPress={handleCreateList}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text size="sm" weight="semibold" color="#fff">
              New List
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lists */}
      <FlatList
        data={lists}
        keyExtractor={item => item.id}
        renderItem={renderListItem}
        contentContainerStyle={[styles.listContent, lists.length === 0 && styles.emptyListContent]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* Create/Edit Modal */}
      <CreateListModal
        visible={showCreateModal}
        editingList={editingList}
        colors={colors}
        isDark={isDark}
        onClose={handleModalClose}
      />

      {/* Share Match Modal */}
      {session?.user?.id && (
        <ShareMatchModal
          visible={showShareModal}
          playerId={session.user.id}
          colors={colors}
          isDark={isDark}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareMatchCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacingPixels[4],
    marginTop: spacingPixels[3],
    padding: spacingPixels[3],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
  },
  shareMatchIcon: {
    width: 48,
    height: 48,
    borderRadius: radiusPixels.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingPixels[3],
  },
  shareMatchContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[4],
    paddingTop: spacingPixels[4],
    paddingBottom: spacingPixels[2],
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[2],
    borderRadius: radiusPixels.lg,
    gap: spacingPixels[1],
  },
  listContent: {
    paddingHorizontal: spacingPixels[4],
    paddingBottom: spacingPixels[4],
  },
  emptyListContent: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacingPixels[8],
  },
  emptyTitle: {
    marginTop: spacingPixels[4],
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: spacingPixels[2],
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacingPixels[6],
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderRadius: radiusPixels.lg,
    gap: spacingPixels[2],
  },
});

export default SharedLists;
