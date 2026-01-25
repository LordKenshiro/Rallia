/**
 * AddMembersToGroupModal
 * Modal to select and add new members to an existing group chat
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';
import { supabase } from '../../../lib/supabase';
import { spacingPixels, fontSizePixels, primary, neutral } from '@rallia/design-system';

interface AddMembersToGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onMembersSelected: (memberIds: string[]) => void;
  existingMemberIds: string[];
  currentUserId?: string;
}

interface PlayerItem {
  id: string;
  firstName: string;
  lastName: string | null;
  displayName: string | null;
  profilePictureUrl: string | null;
}

export function AddMembersToGroupModal({
  visible,
  onClose,
  onMembersSelected,
  existingMemberIds,
  currentUserId,
}: AddMembersToGroupModalProps) {
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load all active players when modal opens
  const loadPlayers = useCallback(async () => {
    if (hasLoaded || isLoading) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('player')
        .select(`
          id,
          profile:profile!player_id_fkey (
            first_name,
            last_name,
            display_name,
            profile_picture_url
          )
        `)
        .limit(200);

      if (error) throw error;

      const players: PlayerItem[] = (data || [])
        .filter((p: unknown) => {
          const player = p as { id: string; profile: { first_name?: string } | null };
          // Exclude current user and existing members
          if (player.id === currentUserId) return false;
          if (existingMemberIds.includes(player.id)) return false;
          return player.profile?.first_name;
        })
        .map((p: unknown) => {
          const player = p as {
            id: string;
            profile: {
              first_name: string;
              last_name?: string | null;
              display_name?: string | null;
              profile_picture_url?: string | null;
            };
          };
          return {
            id: player.id,
            firstName: player.profile.first_name,
            lastName: player.profile.last_name || null,
            displayName: player.profile.display_name || null,
            profilePictureUrl: player.profile.profile_picture_url || null,
          };
        });

      setAllPlayers(players);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error loading players:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, existingMemberIds, hasLoaded, isLoading]);

  // Load players when modal becomes visible
  useEffect(() => {
    if (visible && !hasLoaded) {
      loadPlayers();
    }
  }, [visible, hasLoaded, loadPlayers]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedIds([]);
      setSearchQuery('');
      setHasLoaded(false);
      setAllPlayers([]);
    }
  }, [visible]);

  // Filter by search query
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return allPlayers;
    
    const query = searchQuery.toLowerCase();
    return allPlayers.filter((p) => {
      const fullName = `${p.firstName} ${p.lastName || ''}`.toLowerCase();
      const displayName = (p.displayName || '').toLowerCase();
      return fullName.includes(query) || displayName.includes(query);
    });
  }, [allPlayers, searchQuery]);

  // Toggle selection
  const handleToggleSelect = useCallback((playerId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      return [...prev, playerId];
    });
  }, []);

  // Handle done
  const handleDone = useCallback(() => {
    if (selectedIds.length > 0) {
      onMembersSelected(selectedIds);
    }
    setSelectedIds([]);
    setSearchQuery('');
  }, [selectedIds, onMembersSelected]);

  // Handle close
  const handleClose = useCallback(() => {
    setSelectedIds([]);
    setSearchQuery('');
    onClose();
  }, [onClose]);

  // Render player item
  const renderPlayerItem = useCallback(({ item }: { item: PlayerItem }) => {
    const isSelected = selectedIds.includes(item.id);
    const displayName = item.displayName || `${item.firstName} ${item.lastName || ''}`.trim();

    return (
      <TouchableOpacity
        style={[
          styles.playerItem,
          {
            backgroundColor: isSelected
              ? isDark ? primary[900] : primary[50]
              : 'transparent',
          },
        ]}
        onPress={() => handleToggleSelect(item.id)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        {item.profilePictureUrl ? (
          <Image source={{ uri: item.profilePictureUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: primary[100] }]}>
            <Ionicons name="person" size={20} color={primary[500]} />
          </View>
        )}

        {/* Name */}
        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
        </View>

        {/* Selection indicator */}
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: isSelected ? primary[500] : 'transparent',
              borderColor: isSelected ? primary[500] : colors.border,
            },
          ]}
        >
          {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  }, [colors, isDark, selectedIds, handleToggleSelect]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
            <Text style={[styles.headerButtonText, { color: colors.text }]}>{t('common.cancel' as any)}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('chat.addMembers' as any)}</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDone}
            disabled={selectedIds.length === 0}
          >
            <Text
              style={[
                styles.headerButtonText,
                { color: selectedIds.length > 0 ? primary[500] : colors.textMuted },
              ]}
            >
              {t('chat.addCount' as any, { count: selectedIds.length })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: isDark ? neutral[800] : neutral[100] }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('chat.searchPlayers' as any)}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Player List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primary[500]} />
          </View>
        ) : filteredPlayers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {searchQuery ? t('chat.noPlayersFound' as any) : t('chat.noMorePlayersToAdd' as any)}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredPlayers}
            keyExtractor={(item) => item.id}
            renderItem={renderPlayerItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    minWidth: 70,
  },
  headerButtonText: {
    fontSize: fontSizePixels.base,
  },
  headerTitle: {
    fontSize: fontSizePixels.lg,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacingPixels[4],
    marginVertical: spacingPixels[3],
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[2],
    borderRadius: 10,
    gap: spacingPixels[2],
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizePixels.base,
    paddingVertical: spacingPixels[1],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacingPixels[3],
  },
  emptyText: {
    fontSize: fontSizePixels.base,
  },
  listContent: {
    paddingVertical: spacingPixels[2],
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacingPixels[3],
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacingPixels[3],
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: fontSizePixels.base,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
