/**
 * MemberListModal
 * Modal showing all group members with management options
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text, useToast } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';
import {
  useRemoveGroupMember,
  usePromoteMember,
  useDemoteMember,
  type GroupWithMembers,
  type GroupMember,
} from '@rallia/shared-hooks';
import { MemberOptionsModal } from './MemberOptionsModal';

interface MemberListModalProps {
  visible: boolean;
  onClose: () => void;
  group: GroupWithMembers;
  currentUserId: string;
  isModerator: boolean;
  onMemberRemoved: () => void;
  onPlayerPress?: (playerId: string) => void;
}

/**
 * Format a date as relative time or date string for join dates
 */
function formatJoinDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Joined today';
  if (diffDays === 1) return 'Joined yesterday';
  if (diffDays < 7) return `Joined ${diffDays} days ago`;
  if (diffDays < 30) return `Joined ${Math.floor(diffDays / 7)} weeks ago`;

  return `Joined ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })}`;
}

/**
 * Format last active status - returns null if never active
 */
function formatLastActive(
  dateStr: string | null | undefined
): { text: string; isOnline: boolean } | null {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Consider online if active within last 5 minutes
  if (diffMins < 5) return { text: 'Online now', isOnline: true };
  if (diffMins < 60) return { text: `Active ${diffMins}m ago`, isOnline: false };
  if (diffHours < 24) return { text: `Active ${diffHours}h ago`, isOnline: false };
  if (diffDays < 7) return { text: `Active ${diffDays}d ago`, isOnline: false };

  return {
    text: `Active ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    isOnline: false,
  };
}

export function MemberListModal({
  visible,
  onClose,
  group,
  currentUserId,
  isModerator,
  onMemberRemoved,
  onPlayerPress,
}: MemberListModalProps) {
  const { colors, isDark } = useThemeStyles();
  const toast = useToast();
  const { t } = useTranslation();

  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [showMemberOptions, setShowMemberOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Clear search when modal closes
  // This effect resets search state when modal closes - standard modal cleanup pattern
  useEffect(() => {
    if (!visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional reset of modal state on close
      setSearchQuery('');
    }
  }, [visible]);

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return group.members;
    const query = searchQuery.toLowerCase().trim();
    return group.members.filter(member => {
      const firstName = member.player?.profile?.first_name?.toLowerCase() || '';
      const lastName = member.player?.profile?.last_name?.toLowerCase() || '';
      const displayName = member.player?.profile?.display_name?.toLowerCase() || '';
      return firstName.includes(query) || lastName.includes(query) || displayName.includes(query);
    });
  }, [group.members, searchQuery]);

  const removeGroupMemberMutation = useRemoveGroupMember();
  const promoteMemberMutation = usePromoteMember();
  const demoteMemberMutation = useDemoteMember();

  const handleMemberOptions = useCallback((member: GroupMember) => {
    setSelectedMember(member);
    setShowMemberOptions(true);
  }, []);

  // Build options for the selected member
  const memberOptions = useMemo(() => {
    if (!selectedMember) return [];

    const isCreator = group.created_by === selectedMember.player_id;
    const isSelf = selectedMember.player_id === currentUserId;
    const memberIsModerator = selectedMember.role === 'moderator';

    const options: {
      id: string;
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      onPress: () => void;
      destructive?: boolean;
    }[] = [];

    // Only moderators can manage members
    if (isModerator && !isSelf && !isCreator) {
      if (!memberIsModerator) {
        options.push({
          id: 'promote',
          label: t('groups.promoteToModerator'),
          icon: 'arrow-up-circle-outline',
          onPress: async () => {
            try {
              await promoteMemberMutation.mutateAsync({
                groupId: group.id,
                moderatorId: currentUserId,
                playerIdToPromote: selectedMember.player_id,
              });
              toast.success(t('groups.memberPromoted'));
              onMemberRemoved();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : t('groups.failedToPromote'));
            }
          },
        });
      } else {
        options.push({
          id: 'demote',
          label: t('groups.demoteToMember'),
          icon: 'arrow-down-circle-outline',
          onPress: async () => {
            try {
              await demoteMemberMutation.mutateAsync({
                groupId: group.id,
                moderatorId: currentUserId,
                playerIdToDemote: selectedMember.player_id,
              });
              toast.success(t('groups.moderatorDemoted'));
              onMemberRemoved();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : t('groups.failedToDemote'));
            }
          },
        });
      }

      options.push({
        id: 'remove',
        label: t('groups.removeFromGroup'),
        icon: 'person-remove-outline',
        destructive: true,
        onPress: () => {
          Alert.alert(
            t('groups.removeMember'),
            t('groups.removeMemberConfirm', {
              name: selectedMember.player?.profile?.first_name || t('groups.thisMember'),
            }),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('common.remove'),
                style: 'destructive',
                onPress: async () => {
                  try {
                    await removeGroupMemberMutation.mutateAsync({
                      groupId: group.id,
                      moderatorId: currentUserId,
                      playerIdToRemove: selectedMember.player_id,
                    });
                    toast.success(t('groups.memberRemoved'));
                    onMemberRemoved();
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : t('groups.failedToRemoveMember')
                    );
                  }
                },
              },
            ]
          );
        },
      });
    }

    return options;
  }, [
    selectedMember,
    group,
    currentUserId,
    isModerator,
    removeGroupMemberMutation,
    promoteMemberMutation,
    demoteMemberMutation,
    onMemberRemoved,
    toast,
    t,
  ]);

  // Get member info for the options modal
  const selectedMemberInfo = useMemo(() => {
    if (!selectedMember) return null;
    return {
      name:
        selectedMember.player?.profile?.display_name ||
        `${selectedMember.player?.profile?.first_name || ''} ${selectedMember.player?.profile?.last_name || ''}`.trim() ||
        'Unknown',
      role: selectedMember.role,
      isCreator: group.created_by === selectedMember.player_id,
      profilePictureUrl: selectedMember.player?.profile?.profile_picture_url,
      playerId: selectedMember.player_id,
    };
  }, [selectedMember, group]);

  const renderMemberItem = useCallback(
    ({ item }: { item: GroupMember }) => {
      const isCreator = group.created_by === item.player_id;
      const isSelf = item.player_id === currentUserId;
      const canManage = isModerator && !isSelf && !isCreator;
      const lastActive = formatLastActive(item.player?.profile?.last_active_at);
      const joinDate = formatJoinDate(item.joined_at);

      return (
        <TouchableOpacity
          style={[styles.memberItem, { borderBottomColor: colors.border }]}
          onPress={() => handleMemberOptions(item)}
          disabled={!canManage}
          activeOpacity={canManage ? 0.7 : 1}
        >
          <View style={styles.avatarContainer}>
            <View
              style={[styles.memberAvatar, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
            >
              {item.player?.profile?.profile_picture_url ? (
                <Image
                  source={{ uri: item.player.profile.profile_picture_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <Ionicons name="person" size={24} color={colors.textMuted} />
              )}
            </View>
            {/* Online indicator */}
            {lastActive?.isOnline && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.memberInfo}>
            <View style={styles.memberNameRow}>
              <Text weight="medium" style={{ color: colors.text }}>
                {item.player?.profile?.display_name ||
                  `${item.player?.profile?.first_name || ''} ${item.player?.profile?.last_name || ''}`.trim() ||
                  'Unknown'}
              </Text>
              {isSelf && (
                <Text size="xs" style={{ color: colors.textSecondary, marginLeft: 6 }}>
                  ({t('common.you')})
                </Text>
              )}
            </View>
            {/* Last active / Join date */}
            <Text
              size="xs"
              style={{
                color: lastActive?.isOnline ? colors.primary : colors.textMuted,
                marginTop: 2,
              }}
            >
              {lastActive ? lastActive.text : joinDate}
            </Text>
            <View style={styles.memberBadges}>
              {item.role === 'moderator' && (
                <View style={[styles.badge, { backgroundColor: isDark ? '#FF9500' : '#FFF3E0' }]}>
                  <Text size="xs" style={{ color: isDark ? '#FFFFFF' : '#FF9500' }}>
                    {t('groups.moderator')}
                  </Text>
                </View>
              )}
              {isCreator && (
                <View
                  style={[styles.badge, { backgroundColor: isDark ? colors.primary : '#E8F5E9' }]}
                >
                  <Text size="xs" style={{ color: isDark ? '#FFFFFF' : colors.primary }}>
                    {t('groups.creator')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {canManage && <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />}
        </TouchableOpacity>
      );
    },
    [colors, isDark, group, currentUserId, isModerator, handleMemberOptions, t]
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

          <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text weight="semibold" size="lg" style={{ color: colors.text }}>
                {t('groups.members')} ({group.member_count})
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Bar - show when 10+ members */}
            {group.member_count >= 10 && (
              <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
                <View
                  style={[
                    styles.searchInputContainer,
                    { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
                  ]}
                >
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color={colors.textMuted}
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder={t('groups.searchMembers')}
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Member List */}
            <FlatList
              data={filteredMembers}
              renderItem={renderMemberItem}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          </View>
        </View>
      </Modal>

      {/* Member Options Modal */}
      <MemberOptionsModal
        visible={showMemberOptions}
        onClose={() => {
          setShowMemberOptions(false);
          setSelectedMember(null);
        }}
        member={selectedMemberInfo}
        options={memberOptions}
        onAvatarPress={playerId => {
          setShowMemberOptions(false);
          setSelectedMember(null);
          onPlayerPress?.(playerId);
        }}
      />
    </>
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
    maxHeight: '70%',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: 24,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  memberAvatar: {
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
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759', // iOS green
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberBadges: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
