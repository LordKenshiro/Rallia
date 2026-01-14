/**
 * Groups Screen
 * Lists all player groups the user is a member of
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text } from '@rallia/shared-components';
import { useThemeStyles, useAuth } from '../hooks';
import { usePlayerGroups, useCreateGroup, type Group } from '@rallia/shared-hooks';
import type { RootStackParamList } from '../navigation/types';
import { CreateGroupModal } from '../features/groups';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function GroupsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useThemeStyles();
  const { session } = useAuth();
  const playerId = session?.user?.id;

  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    data: groups,
    isLoading,
    isRefetching,
    refetch,
  } = usePlayerGroups(playerId);

  const createGroupMutation = useCreateGroup();

  const handleCreateGroup = useCallback(async (name: string, description?: string) => {
    if (!playerId) return;

    try {
      const newGroup = await createGroupMutation.mutateAsync({
        playerId,
        input: { name, description },
      });
      setShowCreateModal(false);
      // Navigate to the new group
      navigation.navigate('GroupDetail', { groupId: newGroup.id });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create group');
    }
  }, [playerId, createGroupMutation, navigation]);

  const handleGroupPress = useCallback((group: Group) => {
    navigation.navigate('GroupDetail', { groupId: group.id });
  }, [navigation]);

  const renderGroupItem = useCallback(({ item }: { item: Group }) => (
    <TouchableOpacity
      style={[styles.groupCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => handleGroupPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.groupIcon, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
        <Ionicons name="people" size={28} color={colors.primary} />
      </View>
      
      <View style={styles.groupInfo}>
        <Text weight="semibold" size="base" style={{ color: colors.text }}>
          {item.name}
        </Text>
        {item.description && (
          <Text size="sm" style={{ color: colors.textSecondary }} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        <View style={styles.memberCount}>
          <Ionicons name="person" size={14} color={colors.textMuted} />
          <Text size="xs" style={{ color: colors.textMuted, marginLeft: 4 }}>
            {item.member_count} / {item.max_members} members
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  ), [colors, isDark, handleGroupPress]);

  const renderEmptyState = useMemo(() => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color={colors.textMuted} />
      <Text weight="semibold" size="lg" style={[styles.emptyTitle, { color: colors.text }]}>
        No Groups Yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Create a group to organize matches with your friends and teammates
      </Text>
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text weight="semibold" style={styles.createButtonText}>
          Create Group
        </Text>
      </TouchableOpacity>
    </View>
  ), [colors]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          (!groups || groups.length === 0) && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB to create new group */}
      {groups && groups.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateGroup}
        isLoading={createGroupMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  groupIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
    gap: 2,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
