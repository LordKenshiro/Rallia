/**
 * MemberListModal
 * Modal showing all group members with management options
 */

import React, { useCallback, useState, useMemo } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, FlatList, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@rallia/shared-components';
import { useThemeStyles } from '../../../hooks';
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
}

export function MemberListModal({
  visible,
  onClose,
  group,
  currentUserId,
  isModerator,
  onMemberRemoved,
}: MemberListModalProps) {
  const { colors, isDark } = useThemeStyles();

  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [showMemberOptions, setShowMemberOptions] = useState(false);

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
          label: 'Promote to Moderator',
          icon: 'arrow-up-circle-outline',
          onPress: async () => {
            try {
              await promoteMemberMutation.mutateAsync({
                groupId: group.id,
                moderatorId: currentUserId,
                playerIdToPromote: selectedMember.player_id,
              });
              Alert.alert('Success', 'Member promoted to moderator');
              onMemberRemoved();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to promote member'
              );
            }
          },
        });
      } else {
        options.push({
          id: 'demote',
          label: 'Demote to Member',
          icon: 'arrow-down-circle-outline',
          onPress: async () => {
            try {
              await demoteMemberMutation.mutateAsync({
                groupId: group.id,
                moderatorId: currentUserId,
                playerIdToDemote: selectedMember.player_id,
              });
              Alert.alert('Success', 'Moderator demoted to member');
              onMemberRemoved();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to demote member'
              );
            }
          },
        });
      }

      options.push({
        id: 'remove',
        label: 'Remove from Group',
        icon: 'person-remove-outline',
        destructive: true,
        onPress: () => {
          Alert.alert(
            'Remove Member',
            `Are you sure you want to remove ${selectedMember.player?.profile?.first_name || 'this member'} from the group?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await removeGroupMemberMutation.mutateAsync({
                      groupId: group.id,
                      moderatorId: currentUserId,
                      playerIdToRemove: selectedMember.player_id,
                    });
                    Alert.alert('Success', 'Member removed from group');
                    onMemberRemoved();
                  } catch (error) {
                    Alert.alert(
                      'Error',
                      error instanceof Error ? error.message : 'Failed to remove member'
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
    };
  }, [selectedMember, group]);

  const renderMemberItem = useCallback(
    ({ item }: { item: GroupMember }) => {
      const isCreator = group.created_by === item.player_id;
      const isSelf = item.player_id === currentUserId;
      const canManage = isModerator && !isSelf && !isCreator;

      return (
        <TouchableOpacity
          style={[styles.memberItem, { borderBottomColor: colors.border }]}
          onPress={() => handleMemberOptions(item)}
          disabled={!canManage}
          activeOpacity={canManage ? 0.7 : 1}
        >
          <View style={[styles.memberAvatar, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
            {item.player?.profile?.profile_picture_url ? (
              <Image
                source={{ uri: item.player.profile.profile_picture_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={24} color={colors.textMuted} />
            )}
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
                  (You)
                </Text>
              )}
            </View>
            <View style={styles.memberBadges}>
              {item.role === 'moderator' && (
                <View style={[styles.badge, { backgroundColor: isDark ? '#FF9500' : '#FFF3E0' }]}>
                  <Text size="xs" style={{ color: isDark ? '#FFFFFF' : '#FF9500' }}>
                    Moderator
                  </Text>
                </View>
              )}
              {isCreator && (
                <View
                  style={[styles.badge, { backgroundColor: isDark ? colors.primary : '#E8F5E9' }]}
                >
                  <Text size="xs" style={{ color: isDark ? '#FFFFFF' : colors.primary }}>
                    Creator
                  </Text>
                </View>
              )}
            </View>
          </View>

          {canManage && <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />}
        </TouchableOpacity>
      );
    },
    [colors, isDark, group, currentUserId, isModerator, handleMemberOptions]
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
                Members ({group.member_count})
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Member List */}
            <FlatList
              data={group.members}
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
  memberAvatar: {
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
