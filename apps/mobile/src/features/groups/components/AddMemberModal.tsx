/**
 * AddMemberModal
 * Modal for adding a new member to a group
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@rallia/shared-components';
import { useThemeStyles, useAuth } from '../../../hooks';
import { useDebounce, useAddGroupMember } from '@rallia/shared-hooks';
import { supabase } from '@rallia/shared-services';

interface PlayerProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  city: string | null;
  profile_picture_url: string | null;
}

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  currentMemberIds: string[];
  onSuccess: () => void;
}

export function AddMemberModal({
  visible,
  onClose,
  groupId,
  currentMemberIds,
  onSuccess,
}: AddMemberModalProps) {
  const { colors, isDark } = useThemeStyles();
  const { session } = useAuth();
  const playerId = session?.user?.id;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const addMemberMutation = useAddGroupMember();

  // Search players when query changes
  useEffect(() => {
    const searchPlayers = async () => {
      if (debouncedSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchTerm = `%${debouncedSearch}%`;
        const { data, error } = await supabase
          .from('player')
          .select('id, first_name, last_name, display_name, city, profile_picture_url')
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
          .limit(20);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error('Error searching players:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    searchPlayers();
  }, [debouncedSearch]);

  // Filter out current members
  const filteredResults = useMemo(() => {
    return searchResults.filter(player => !currentMemberIds.includes(player.id));
  }, [searchResults, currentMemberIds]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  }, [onClose]);

  const handleAddMember = useCallback(async (memberPlayerId: string) => {
    if (!playerId) return;

    try {
      await addMemberMutation.mutateAsync({
        groupId,
        inviterId: playerId,
        playerIdToAdd: memberPlayerId,
      });
      Alert.alert('Success', 'Member added to the group');
      onSuccess();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add member');
    }
  }, [groupId, playerId, addMemberMutation, onSuccess]);

  const renderPlayerItem = useCallback(({ item }: { item: PlayerProfile }) => (
    <View style={[styles.playerItem, { borderBottomColor: colors.border }]}>
      <View style={[styles.playerAvatar, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
        {item.profile_picture_url ? (
          <Image
            source={{ uri: item.profile_picture_url }}
            style={styles.avatarImage}
          />
        ) : (
          <Ionicons name="person" size={24} color={colors.textMuted} />
        )}
      </View>
      <View style={styles.playerInfo}>
        <Text weight="medium" style={{ color: colors.text }}>
          {item.display_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown'}
        </Text>
        {item.city && (
          <Text size="sm" style={{ color: colors.textSecondary }}>
            {item.city}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => handleAddMember(item.id)}
        disabled={addMemberMutation.isPending}
      >
        {addMemberMutation.isPending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="add" size={20} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  ), [colors, isDark, handleAddMember, addMemberMutation.isPending]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text weight="semibold" size="lg" style={{ color: colors.text }}>
              Add Member
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchInput, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Ionicons name="search" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.searchTextInput, { color: colors.text }]}
                placeholder="Search players..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Results */}
          <View style={styles.resultsContainer}>
            {searchQuery.length < 2 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                  Enter at least 2 characters to search
                </Text>
              </View>
            ) : isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : filteredResults.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="person-outline" size={48} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                  No players found
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredResults}
                renderItem={renderPlayerItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 16,
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  playerInfo: {
    flex: 1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
