/**
 * CreateGroupChatModal
 * Multi-step modal for creating a group chat (friends network).
 * Step 1: Select members from all active players
 * Step 2: Set group name and picture
 * 
 * Creates a network with type 'friends' which automatically creates
 * a linked conversation and adds members to both.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Text, Button } from '@rallia/shared-components';
import { useThemeStyles, useAuth, useTranslation } from '../../../hooks';
import { uploadImage } from '../../../services/imageUpload';
import { primary, spacingPixels, fontSizePixels } from '@rallia/design-system';
import { supabase } from '../../../lib/supabase';

interface SelectedMember {
  id: string;
  firstName: string;
  lastName?: string | null;
  displayName?: string | null;
  profilePictureUrl?: string | null;
}

interface CreateGroupChatModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (conversationId: string) => void;
}

type Step = 'select-members' | 'group-details';

export function CreateGroupChatModal({
  visible,
  onClose,
  onSuccess,
}: CreateGroupChatModalProps) {
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();
  const { session } = useAuth();
  const currentUserId = session?.user?.id;

  // Step state
  const [step, setStep] = useState<Step>('select-members');

  // Step 1: Member selection
  const [searchQuery, setSearchQuery] = useState('');
  const [allPlayers, setAllPlayers] = useState<SelectedMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [hasLoadedPlayers, setHasLoadedPlayers] = useState(false);

  // Step 2: Group details
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all active players when modal opens
  const loadPlayers = useCallback(async () => {
    if (hasLoadedPlayers || isLoadingPlayers) return;

    setIsLoadingPlayers(true);
    try {
      const { data, error: fetchError } = await supabase
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
        .neq('id', currentUserId)
        .limit(200);

      if (fetchError) throw fetchError;

      const players: SelectedMember[] = (data || [])
        .filter((p: unknown) => {
          const player = p as { profile: { first_name?: string } | null };
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
            lastName: player.profile.last_name,
            displayName: player.profile.display_name,
            profilePictureUrl: player.profile.profile_picture_url,
          };
        });

      setAllPlayers(players);
      setHasLoadedPlayers(true);
    } catch (err) {
      console.error('Error loading players:', err);
    } finally {
      setIsLoadingPlayers(false);
    }
  }, [currentUserId, hasLoadedPlayers, isLoadingPlayers]);

  // Load players when modal becomes visible
  React.useEffect(() => {
    if (visible && !hasLoadedPlayers) {
      loadPlayers();
    }
  }, [visible, hasLoadedPlayers, loadPlayers]);

  // Filter players based on search
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return allPlayers;

    const query = searchQuery.toLowerCase().trim();
    return allPlayers.filter((player) => {
      const firstName = (player.firstName || '').toLowerCase();
      const lastName = (player.lastName || '').toLowerCase();
      const displayName = (player.displayName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();

      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        displayName.includes(query) ||
        fullName.includes(query)
      );
    });
  }, [allPlayers, searchQuery]);

  // Reset modal state
  const resetModal = useCallback(() => {
    setStep('select-members');
    setSearchQuery('');
    setSelectedMembers([]);
    setGroupName('');
    setGroupImage(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  // Member selection handlers
  const handleSelectMember = useCallback((player: SelectedMember) => {
    setSelectedMembers((prev) => {
      if (prev.some((p) => p.id === player.id)) {
        return prev.filter((p) => p.id !== player.id);
      }
      return [...prev, player];
    });
  }, []);

  const handleContinueToDetails = useCallback(() => {
    if (selectedMembers.length === 0) {
      Alert.alert(t('chat.selectMembers' as any), t('chat.pleaseSelectMember' as any));
      return;
    }
    setStep('group-details');
  }, [selectedMembers]);

  const handleBackToMembers = useCallback(() => {
    setStep('select-members');
  }, []);

  // Image picker
  const handlePickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.permissionRequired' as any), t('chat.photoAccessRequired' as any));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setGroupImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert(t('common.error' as any), t('chat.failedToPickImage' as any));
    }
  }, [t]);

  const handleRemoveImage = useCallback(() => {
    setGroupImage(null);
  }, []);

  // Create group chat (simple group conversation without network)
  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      setError(t('chat.groupNameRequired' as any));
      return;
    }

    if (groupName.trim().length < 2) {
      setError(t('chat.groupNameTooShort' as any));
      return;
    }

    if (!currentUserId) {
      Alert.alert(t('common.error' as any), t('chat.mustBeLoggedIn' as any));
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      let pictureUrl: string | undefined;

      // Upload image if selected
      if (groupImage) {
        const { url, error: uploadError } = await uploadImage(groupImage, 'group-images');
        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          // Continue without image
        } else if (url) {
          pictureUrl = url;
        }
      }

      // 1. Create the conversation with picture_url
      const { data: conversation, error: convError } = await supabase
        .from('conversation')
        .insert({
          conversation_type: 'group',
          title: groupName.trim(),
          created_by: currentUserId,
          picture_url: pictureUrl || null,
        })
        .select('id')
        .single();

      if (convError || !conversation) {
        throw new Error('Failed to create conversation');
      }

      // 2. Add creator as conversation participant
      await supabase
        .from('conversation_participant')
        .insert({ conversation_id: conversation.id, player_id: currentUserId });

      // 3. Add selected members to conversation
      for (const member of selectedMembers) {
        await supabase
          .from('conversation_participant')
          .insert({ conversation_id: conversation.id, player_id: member.id });
      }

      // Success - return the conversation ID
      handleClose();
      onSuccess?.(conversation.id);
    } catch (err) {
      console.error('Error creating group:', err);
      Alert.alert(t('common.error' as any), t('chat.failedToCreateGroup' as any));
    } finally {
      setIsCreating(false);
    }
  }, [groupName, groupImage, selectedMembers, currentUserId, handleClose, onSuccess]);

  // Render player item
  const renderPlayerItem = useCallback(
    ({ item }: { item: SelectedMember }) => {
      const isSelected = selectedMembers.some((p) => p.id === item.id);
      const displayName = item.displayName || `${item.firstName} ${item.lastName || ''}`.trim();

      return (
        <TouchableOpacity
          style={[
            styles.playerItem,
            {
              backgroundColor: isSelected
                ? isDark
                  ? 'rgba(64, 156, 255, 0.1)'
                  : 'rgba(64, 156, 255, 0.1)'
                : colors.cardBackground,
              borderColor: isSelected ? primary[500] : colors.border,
            },
          ]}
          onPress={() => handleSelectMember(item)}
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
              {displayName}
            </Text>
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={24} color={primary[500]} />}
        </TouchableOpacity>
      );
    },
    [colors, isDark, handleSelectMember, selectedMembers]
  );

  // Render selected member chips
  const renderSelectedChips = () => {
    if (selectedMembers.length === 0) return null;

    return (
      <View style={styles.selectedChipsRow}>
        {selectedMembers.map((member) => (
          <TouchableOpacity
            key={member.id}
            style={styles.selectedChip}
            onPress={() => handleSelectMember(member)}
          >
            <View style={styles.selectedChipAvatarContainer}>
              <View style={[styles.selectedChipAvatar, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                {member.profilePictureUrl ? (
                  <Image source={{ uri: member.profilePictureUrl }} style={styles.selectedChipAvatarImage} />
                ) : (
                  <Ionicons name="person" size={16} color={colors.textMuted} />
                )}
              </View>
              <View style={[styles.removeChipBadge, { backgroundColor: primary[500] }]}>
                <Ionicons name="close" size={10} color="#fff" />
              </View>
            </View>
            <Text size="xs" style={[styles.selectedChipName, { color: colors.text }]} numberOfLines={1}>
              {member.firstName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render Step 1: Select Members
  const renderSelectMembersStep = () => (
    <View style={styles.stepContainer}>
      {/* Title */}
      <Text weight="bold" size="xl" style={[styles.stepTitle, { color: colors.text }]}>
        {t('chat.selectMembers' as any)}
      </Text>

      {/* Search input */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: isDark ? colors.card : '#F0F0F0', borderColor: colors.border },
        ]}
      >
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('chat.searchPlayers' as any)}
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

      {/* Selected members chips */}
      {renderSelectedChips()}

      {/* Player list */}
      {isLoadingPlayers ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primary[500]} />
          <Text style={{ color: colors.textMuted, marginTop: 12 }}>{t('chat.loadingPlayers' as any)}</Text>
        </View>
      ) : filteredPlayers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, marginTop: 12, textAlign: 'center' }}>
            {searchQuery ? t('chat.noPlayersFoundMatching' as any, { query: searchQuery }) : t('chat.noPlayersAvailable' as any)}
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

      {/* Continue button */}
      <View style={styles.bottomButtonContainer}>
        <Button
          variant="primary"
          onPress={handleContinueToDetails}
          disabled={selectedMembers.length === 0}
          style={[selectedMembers.length === 0 && styles.disabledButton]}
        >
          {t('chat.continueSelected' as any, { count: selectedMembers.length })}
        </Button>
      </View>
    </View>
  );

  // Render Step 2: Group Details
  const renderGroupDetailsStep = () => (
    <View style={styles.stepContainer}>
      {/* Back button + Title */}
      <View style={styles.detailsHeader}>
        <TouchableOpacity onPress={handleBackToMembers} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text weight="bold" size="xl" style={{ color: colors.text }}>
          {t('chat.groupDetails' as any)}
        </Text>
      </View>

      {/* Group Image */}
      <View style={styles.imageSection}>
        {groupImage ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: groupImage }} style={styles.groupImagePreview} />
            <TouchableOpacity
              style={[styles.removeImageButton, { backgroundColor: colors.cardBackground }]}
              onPress={handleRemoveImage}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.changeImageButton, { backgroundColor: primary[500] }]}
              onPress={handlePickImage}
            >
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.imagePicker,
              { backgroundColor: isDark ? primary[900] : primary[100], borderColor: colors.border },
            ]}
            onPress={handlePickImage}
          >
            <View style={[styles.imagePickerIcon, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="camera" size={24} color={primary[500]} />
            </View>
            <Text size="sm" style={{ color: colors.textMuted, marginTop: 8 }}>
              {t('chat.addPhoto' as any)}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Group Name Input */}
      <View style={styles.inputSection}>
        <Text weight="medium" size="sm" style={{ color: colors.text, marginBottom: 8 }}>
          {t('chat.groupName' as any)} *
        </Text>
        <TextInput
          style={[
            styles.nameInput,
            {
              backgroundColor: isDark ? colors.card : '#F0F0F0',
              color: colors.text,
              borderColor: error ? '#EF4444' : colors.border,
            },
          ]}
          placeholder={t('chat.enterGroupName' as any)}
          placeholderTextColor={colors.textMuted}
          value={groupName}
          onChangeText={(text) => {
            setGroupName(text);
            setError(null);
          }}
          maxLength={50}
        />
        {error && (
          <Text size="sm" style={{ color: '#EF4444', marginTop: 4 }}>
            {error}
          </Text>
        )}
      </View>

      {/* Members preview */}
      <View style={styles.membersPreview}>
        <Text size="sm" weight="medium" style={{ color: colors.text, marginBottom: 8 }}>
          {t('chat.members' as any)} ({selectedMembers.length + 1})
        </Text>
        <View style={styles.memberAvatars}>
          {/* Current user */}
          <View style={[styles.memberAvatar, { backgroundColor: primary[500] }]}>
            <Ionicons name="person" size={16} color="#fff" />
          </View>
          {/* Selected members (show first 5) */}
          {selectedMembers.slice(0, 5).map((member) => (
            <View
              key={member.id}
              style={[styles.memberAvatar, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
            >
              {member.profilePictureUrl ? (
                <Image source={{ uri: member.profilePictureUrl }} style={styles.memberAvatarImage} />
              ) : (
                <Ionicons name="person" size={16} color={colors.textMuted} />
              )}
            </View>
          ))}
          {selectedMembers.length > 5 && (
            <View style={[styles.memberAvatar, { backgroundColor: colors.border }]}>
              <Text size="xs" weight="bold" style={{ color: colors.text }}>
                +{selectedMembers.length - 5}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Create button */}
      <View style={styles.bottomButtonContainer}>
        <Button
          variant="primary"
          onPress={handleCreateGroup}
          disabled={isCreating || !groupName.trim()}
          style={[(isCreating || !groupName.trim()) && styles.disabledButton]}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            t('chat.createGroup' as any)
          )}
        </Button>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text weight="semibold" size="lg" style={{ color: colors.text }}>
              {t('chat.newGroup' as any)}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {step === 'select-members' ? renderSelectMembersStep() : renderGroupDetailsStep()}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacingPixels[4],
    paddingHorizontal: spacingPixels[4],
    borderBottomWidth: 1,
  },
  closeButton: {
    position: 'absolute',
    right: spacingPixels[4],
    padding: spacingPixels[1],
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: spacingPixels[4],
    paddingTop: spacingPixels[4],
  },
  stepTitle: {
    marginBottom: spacingPixels[4],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[2],
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacingPixels[3],
  },
  searchInput: {
    flex: 1,
    marginLeft: spacingPixels[2],
    fontSize: fontSizePixels.base,
  },
  selectedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacingPixels[3],
    gap: spacingPixels[2],
  },
  selectedChip: {
    alignItems: 'center',
    width: 56,
  },
  selectedChipAvatarContainer: {
    position: 'relative',
  },
  selectedChipAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  selectedChipAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  removeChipBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedChipName: {
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
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
    paddingHorizontal: spacingPixels[8],
  },
  listContent: {
    paddingBottom: 100,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacingPixels[2],
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
    marginLeft: spacingPixels[3],
  },
  bottomButtonContainer: {
    paddingVertical: spacingPixels[4],
    paddingBottom: spacingPixels[6],
  },
  disabledButton: {
    opacity: 0.5,
  },
  // Step 2 styles
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingPixels[4],
  },
  backButton: {
    marginRight: spacingPixels[3],
    padding: spacingPixels[1],
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: spacingPixels[6],
  },
  imagePicker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  imagePickerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  groupImagePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputSection: {
    marginBottom: spacingPixels[4],
  },
  nameInput: {
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderRadius: 12,
    borderWidth: 1,
    fontSize: fontSizePixels.base,
  },
  membersPreview: {
    marginBottom: spacingPixels[4],
  },
  memberAvatars: {
    flexDirection: 'row',
    gap: -8,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  memberAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});

export default CreateGroupChatModal;
