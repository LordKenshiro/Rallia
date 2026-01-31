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

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Text, Skeleton, SkeletonCard } from '@rallia/shared-components';
import { lightHaptic } from '@rallia/shared-utils';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { primary } from '@rallia/design-system';
import {
  useSharedLists,
  useDeleteSharedList,
  useSharedListsRealtime,
  type SharedContactList,
} from '@rallia/shared-hooks';
import {
  useThemeStyles,
  useAuth,
  useTranslation,
  useRequireOnboarding,
  type TranslationKey,
} from '../hooks';
import type { CommunityStackParamList } from '../navigation/types';
import { CreateListModal, SharedListCard, ShareMatchModal } from '../features/shared-lists';

type NavigationProp = NativeStackNavigationProp<CommunityStackParamList>;

const SharedLists: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useThemeStyles();
  const { session } = useAuth();
  const { t } = useTranslation();
  const { guardAction } = useRequireOnboarding();
  const playerId = session?.user?.id;

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingList, setEditingList] = useState<SharedContactList | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Queries and mutations
  const { data: lists = [], isLoading, isRefetching, refetch } = useSharedLists();
  const deleteListMutation = useDeleteSharedList();

  // Subscribe to real-time updates for shared lists
  useSharedListsRealtime(playerId);

  // Filter lists based on search query
  const filteredLists = useMemo(() => {
    if (!searchQuery.trim()) return lists;
    const query = searchQuery.toLowerCase().trim();
    return lists.filter(
      list =>
        list.name.toLowerCase().includes(query) || list.description?.toLowerCase().includes(query)
    );
  }, [lists, searchQuery]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Create list handler
  const handleCreateList = useCallback(() => {
    if (!guardAction()) return;
    lightHaptic();
    setEditingList(null);
    setShowCreateModal(true);
  }, [guardAction]);

  // Edit list handler
  const handleEditList = useCallback((list: SharedContactList) => {
    lightHaptic();
    setEditingList(list);
    setShowCreateModal(true);
  }, []);

  // Delete list handler
  const handleDeleteList = useCallback(
    (list: SharedContactList) => {
      Alert.alert(
        t('sharedLists.deleteList'),
        t('sharedLists.deleteListConfirm' as TranslationKey, { name: list.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteListMutation.mutateAsync(list.id);
              } catch (error) {
                console.error('Failed to delete list:', error);
                Alert.alert(
                  t('common.error'),
                  t('sharedLists.errors.failedToDelete' as TranslationKey)
                );
              }
            },
          },
        ]
      );
    },
    [deleteListMutation, t]
  );

  // View list details handler
  const handleViewList = useCallback(
    (list: SharedContactList) => {
      navigation.navigate('SharedListDetail', { listId: list.id, listName: list.name });
    },
    [navigation]
  );

  // Modal close handler
  const handleModalClose = useCallback(() => {
    setShowCreateModal(false);
    setEditingList(null);
    // No need to manually refetch - React Query + Realtime handles it
  }, []);

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
          {t('sharedLists.noLists')}
        </Text>
        <Text size="sm" color={colors.textMuted} style={styles.emptyDescription}>
          {t('sharedLists.noListsDescription')}
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: primary[500] }]}
          onPress={handleCreateList}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text size="sm" weight="semibold" color="#fff">
            {t('sharedLists.createFirstList')}
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
          {/* Share Match CTA Skeleton */}
          <Skeleton
            width="100%"
            height={80}
            borderRadius={radiusPixels.lg}
            backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
            highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
            style={{ marginBottom: spacingPixels[4] }}
          />
          {/* Search Skeleton */}
          <Skeleton
            width="100%"
            height={44}
            borderRadius={radiusPixels.lg}
            backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
            highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
            style={{ marginBottom: spacingPixels[4] }}
          />
          {/* List Items Skeleton */}
          {[1, 2, 3, 4].map(i => (
            <SkeletonCard
              key={i}
              showAvatar={false}
              lines={2}
              backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
              highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
              style={{
                backgroundColor: colors.cardBackground,
                marginBottom: spacingPixels[3],
                borderRadius: radiusPixels.lg,
                padding: spacingPixels[4],
              }}
            />
          ))}
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
        onPress={() => {
          if (!guardAction()) return;
          setShowShareModal(true);
        }}
        activeOpacity={0.8}
      >
        <View
          style={[styles.shareMatchIcon, { backgroundColor: isDark ? primary[700] : primary[100] }]}
        >
          <Ionicons name="share-social" size={24} color={isDark ? primary[300] : primary[600]} />
        </View>
        <View style={styles.shareMatchContent}>
          <Text weight="semibold" style={{ color: colors.text }}>
            {t('sharedLists.shareMatch.title' as TranslationKey)}
          </Text>
          <Text size="sm" style={{ color: colors.textSecondary }}>
            {t('sharedLists.shareMatch.subtitle' as TranslationKey)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text weight="semibold" style={{ color: colors.text }}>
          {t('sharedLists.yourLists' as TranslationKey)}
        </Text>
        {lists.length > 0 && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: primary[500] }]}
            onPress={handleCreateList}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text size="sm" weight="semibold" color="#fff">
              {t('sharedLists.newList')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar - only show when there are lists */}
      {lists.length > 0 && (
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: colors.inputBackground || (isDark ? '#2C2C2E' : '#F2F2F7') },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('sharedLists.searchLists')}
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
        </View>
      )}

      {/* Lists */}
      <FlatList
        data={filteredLists}
        keyExtractor={item => item.id}
        renderItem={renderListItem}
        contentContainerStyle={[styles.listContent, lists.length === 0 && styles.emptyListContent]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
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
    padding: spacingPixels[4],
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
  searchContainer: {
    paddingHorizontal: spacingPixels[4],
    paddingBottom: spacingPixels[2],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radiusPixels.lg,
    paddingHorizontal: spacingPixels[3],
    height: 40,
  },
  searchIcon: {
    marginRight: spacingPixels[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
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
