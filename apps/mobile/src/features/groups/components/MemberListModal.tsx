/**
 * MemberListModal
 * Modal showing all group members with management options
 */

import React, { useCallback } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Image,
} from 'react-native';
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

  const removeGroupMemberMutation = useRemoveGroupMember();
  const promoteMemberMutation = usePromoteMember();
  const demoteMemberMutation = useDemoteMember();

  const handleMemberOptions = useCallback((member: GroupMember) => {
    const isCreator = group.created_by === member.player_id;
    const isSelf = member.player_id === currentUserId;
    const memberIsModerator = member.role === 'moderator';

    const options: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }[] = [
      { text: 'Cancel', style: 'cancel' },
    ];

    // Only moderators can manage members
    if (isModerator && !isSelf && !isCreator) {
      if (!memberIsModerator) {
        options.unshift({
          text: 'Promote to Moderator',
          onPress: async () => {
            try {
              await promoteMemberMutation.mutateAsync({
                groupId: group.id,
                moderatorId: currentUserId,
                playerIdToPromote: member.player_id,
              });
              Alert.alert('Success', 'Member promoted to moderator');
              onMemberRemoved();
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to promote member');
            }
          },
        });
      } else {
        options.unshift({
          text: 'Demote to Member',
          onPress: async () => {
            try {
              await demoteMemberMutation.mutateAsync({
                groupId: group.id,
                moderatorId: currentUserId,
                playerIdToDemote: member.player_id,
              });
              Alert.alert('Success', 'Moderator demoted to member');
              onMemberRemoved();
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to demote member');
            }
          },
        });
      }

      options.unshift({
        text: 'Remove from Group',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Remove Member',
            `Are you sure you want to remove ${member.player?.profile?.first_name || 'this member'} from the group?`,
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
                      playerIdToRemove: member.player_id,
                    });
                    Alert.alert('Success', 'Member removed from group');
                    onMemberRemoved();
                  } catch (error) {
                    Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove member');
                  }
                },
              },
            ]
          );
        },
      });
    }

    // Only show alert if there are actions
    if (options.length > 1) {
      Alert.alert(
        member.player?.profile?.first_name || 'Member',
        undefined,
        options
      );
    }
  }, [
    group,
    currentUserId,
    isModerator,
    removeGroupMemberMutation,
    promoteMemberMutation,
    demoteMemberMutation,
    onMemberRemoved,
  ]);

  const renderMemberItem = useCallback(({ item }: { item: GroupMember }) => {
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
              <View style={[styles.badge, { backgroundColor: isDark ? colors.primary : '#E8F5E9' }]}>
                <Text size="xs" style={{ color: isDark ? '#FFFFFF' : colors.primary }}>
                  Creator
                </Text>
              </View>
            )}
          </View>
        </View>

        {canManage && (
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
        )}
      </TouchableOpacity>
    );
  }, [colors, isDark, group, currentUserId, isModerator, handleMemberOptions]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
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
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
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
