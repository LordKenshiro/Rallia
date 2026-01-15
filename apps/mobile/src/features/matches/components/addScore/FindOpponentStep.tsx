/**
 * Find Opponent Step
 *
 * Search for opponents within the app or add from phone contacts.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button } from '@rallia/shared-components';
import { useThemeStyles } from '../../../../hooks';
import { useAddScore } from './AddScoreContext';
import { ContactPickerModal } from './ContactPickerModal';
import type { SelectedPlayer } from './types';
import { supabase } from '../../../../lib/supabase';

interface FindOpponentStepProps {
  onContinue: () => void;
}

export function FindOpponentStep({ onContinue }: FindOpponentStepProps) {
  const { colors, isDark } = useThemeStyles();
  const { formData, updateFormData, matchType } = useAddScore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SelectedPlayer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>(
    formData.opponents || []
  );
  const [showContactPicker, setShowContactPicker] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Query players with their profile info using inner join
      // Use the specific foreign key hint for the player -> profile relationship
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
        .limit(50);

      if (error) throw error;

      // Filter by name in JavaScript since we can't filter on joined table
      const queryLower = query.toLowerCase();
      const filteredPlayers: SelectedPlayer[] = (data || [])
        .filter((p: unknown) => {
          const player = p as { 
            id: string; 
            profile: { 
              first_name?: string; 
              last_name?: string; 
              display_name?: string; 
              profile_picture_url?: string;
            } | null;
          };
          if (!player.profile) return false;
          
          const firstName = (player.profile.first_name || '').toLowerCase();
          const lastName = (player.profile.last_name || '').toLowerCase();
          const displayName = (player.profile.display_name || '').toLowerCase();
          
          return firstName.includes(queryLower) || 
                 lastName.includes(queryLower) || 
                 displayName.includes(queryLower);
        })
        .slice(0, 20)
        .map((p: unknown) => {
          const player = p as { 
            id: string; 
            profile: { 
              first_name?: string; 
              last_name?: string; 
              display_name?: string; 
              profile_picture_url?: string;
            };
          };
          return {
            id: player.id,
            firstName: player.profile.first_name || '',
            lastName: player.profile.last_name,
            displayName: player.profile.display_name,
            profilePictureUrl: player.profile.profile_picture_url,
          };
        });

      setSearchResults(filteredPlayers);
    } catch (error) {
      console.error('Error searching players:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelectPlayer = useCallback((player: SelectedPlayer) => {
    setSelectedPlayers((prev) => {
      // Check if already selected
      if (prev.some((p) => p.id === player.id)) {
        return prev.filter((p) => p.id !== player.id);
      }
      // For singles, only allow 1 opponent
      if (matchType === 'single') {
        return [player];
      }
      // For doubles, allow up to 2 opponents (the opposing team)
      if (prev.length < 2) {
        return [...prev, player];
      }
      return prev;
    });
  }, [matchType]);

  const handleAddFromContacts = useCallback(() => {
    setShowContactPicker(true);
  }, []);

  const handleContactSelected = useCallback((player: SelectedPlayer) => {
    handleSelectPlayer(player);
  }, [handleSelectPlayer]);

  const handleContinue = useCallback(() => {
    updateFormData({ opponents: selectedPlayers });
    onContinue();
  }, [selectedPlayers, updateFormData, onContinue]);

  const isPlayerSelected = (playerId: string) =>
    selectedPlayers.some((p) => p.id === playerId);

  const canContinue = matchType === 'single'
    ? selectedPlayers.length >= 1
    : selectedPlayers.length >= 1; // For doubles, at least 1 opponent

  const renderPlayerItem = ({ item }: { item: SelectedPlayer }) => {
    const isSelected = isPlayerSelected(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.playerItem,
          {
            backgroundColor: isSelected
              ? isDark ? 'rgba(64, 156, 255, 0.1)' : 'rgba(64, 156, 255, 0.1)'
              : colors.cardBackground,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
        onPress={() => handleSelectPlayer(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.playerAvatar, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
          {item.profilePictureUrl ? (
            <Image source={{ uri: item.profilePictureUrl }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={24} color={colors.textMuted} />
          )}
        </View>
        <View style={styles.playerInfo}>
          <Text weight="medium" style={{ color: colors.text }}>
            {item.displayName || `${item.firstName} ${item.lastName || ''}`.trim()}
          </Text>
          {item.isFromContacts && (
            <Text size="sm" style={{ color: colors.textSecondary }}>
              From Contacts
            </Text>
          )}
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Title */}
      <Text weight="bold" size="xl" style={[styles.title, { color: colors.text }]}>
        Find your opponent
      </Text>

      {/* Search input */}
      <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search players"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Selected players - shown below search bar */}
      {selectedPlayers.length > 0 && (
        <View style={styles.selectedPlayersRow}>
          {selectedPlayers.map((player) => (
            <TouchableOpacity
              key={player.id}
              style={styles.selectedPlayerChip}
              onPress={() => handleSelectPlayer(player)}
            >
              <View style={styles.selectedPlayerAvatarContainer}>
                <View style={[styles.selectedPlayerAvatar, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                  {player.profilePictureUrl ? (
                    <Image source={{ uri: player.profilePictureUrl }} style={styles.selectedAvatarImage} />
                  ) : (
                    <Ionicons name="person" size={20} color={colors.textMuted} />
                  )}
                </View>
                <View style={[styles.removePlayerBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="close" size={10} color="#fff" />
                </View>
              </View>
              <Text size="sm" style={[styles.selectedPlayerName, { color: colors.text }]} numberOfLines={1}>
                {player.firstName} {player.lastName || ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Add from contacts button - hidden when searching */}
      {searchQuery.length < 2 && (
        <TouchableOpacity
          style={[styles.addFromContactsButton, { borderColor: colors.border }]}
          onPress={handleAddFromContacts}
        >
          <View style={[styles.contactsIcon, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
            <Ionicons name="person-add" size={20} color={colors.primary} />
          </View>
          <View style={styles.contactsTextContainer}>
            <Text weight="medium" style={{ color: colors.primary }}>
              Add player
            </Text>
            <Text size="sm" style={{ color: colors.textSecondary }}>
              From Phone Contacts
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Search results or empty state */}
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : searchQuery.length < 2 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="search" size={64} color={colors.textMuted} />
          </View>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            Type the name of the player to find them on Rallia
          </Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            No players found matching "{searchQuery}"
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Text size="xs" weight="medium" style={[styles.sectionHeader, { color: colors.textMuted }]}>
            PLAYERS
          </Text>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={renderPlayerItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Continue button */}
      <View style={styles.bottomButton}>
        <Button
          variant="primary"
          onPress={handleContinue}
          disabled={!canContinue}
          style={[!canContinue && styles.disabledButton]}
        >
          Continue
        </Button>
      </View>

      {/* Contact Picker Modal */}
      <ContactPickerModal
        visible={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onSelectContact={handleContactSelected}
        excludeIds={selectedPlayers.map(p => p.id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  addFromContactsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  contactsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactsTextContainer: {
    marginLeft: 12,
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
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  listContent: {
    paddingBottom: 100,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedPlayersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  selectedPlayerChip: {
    alignItems: 'center',
    width: 60,
  },
  selectedPlayerAvatarContainer: {
    position: 'relative',
  },
  selectedPlayerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  selectedAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  removePlayerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPlayerName: {
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
  },
  sectionHeader: {
    marginBottom: 12,
    letterSpacing: 1,
  },
  bottomButton: {
    paddingVertical: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
