/**
 * useGroupMemberManagement Hook
 * Handles member CRUD operations for group chat
 * - Add members
 * - Remove members
 * - Promote to admin
 * - Demote to member
 * - Leave group
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  addConversationParticipant,
  removeConversationParticipant,
  addGroupMember,
  removeGroupMember,
  leaveGroup,
  promoteMember,
  demoteMember,
} from '@rallia/shared-services';

interface NetworkInfo {
  id: string;
  name: string;
  cover_image_url: string | null;
  description: string | null;
  member_count: number;
}

interface UseGroupMemberManagementProps {
  conversationId: string;
  playerId: string | undefined;
  networkInfo: NetworkInfo | null;
  isAdmin: boolean;
  onRefetch: () => Promise<unknown>;
  onRefetchNetworkInfo: () => Promise<void>;
  onLeaveGroup: () => void;
}

interface UseGroupMemberManagementReturn {
  isUpdating: boolean;
  showAddMemberModal: boolean;
  setShowAddMemberModal: (show: boolean) => void;
  handleAddMember: () => void;
  handleMembersAdded: (memberIds: string[]) => Promise<void>;
  handleRemoveMember: (memberId: string) => void;
  handlePromoteMember: (memberId: string) => void;
  handleDemoteMember: (memberId: string) => void;
  handleMemberLongPress: (memberId: string, isMemberAdmin: boolean) => void;
}

export function useGroupMemberManagement({
  conversationId,
  playerId,
  networkInfo,
  isAdmin,
  onRefetch,
  onRefetchNetworkInfo,
  onLeaveGroup,
}: UseGroupMemberManagementProps): UseGroupMemberManagementReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Handle add member
  const handleAddMember = useCallback(() => {
    setShowAddMemberModal(true);
  }, []);

  const handleMembersAdded = useCallback(async (memberIds: string[]) => {
    setShowAddMemberModal(false);
    setIsUpdating(true);
    try {
      for (const memberId of memberIds) {
        // Add to conversation
        await addConversationParticipant(conversationId, memberId);
        
        // For network-linked groups, also add to the network
        if (networkInfo?.id && playerId) {
          try {
            await addGroupMember(networkInfo.id, playerId, memberId);
          } catch (networkError) {
            // Member might already be in network, that's OK
            console.log('Member may already be in network:', networkError);
          }
        }
      }
      await onRefetch();
    } catch (error) {
      console.error('Error adding members:', error);
      Alert.alert('Error', 'Failed to add some members');
    } finally {
      setIsUpdating(false);
    }
  }, [conversationId, onRefetch, networkInfo, playerId]);

  // Handle remove member
  const handleRemoveMember = useCallback(async (memberId: string) => {
    if (memberId === playerId) {
      Alert.alert(
        'Leave Group',
        'Are you sure you want to leave this group?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              try {
                // Remove from conversation
                await removeConversationParticipant(conversationId, memberId);
                
                // For network-linked groups, also leave the network
                if (networkInfo?.id) {
                  try {
                    await leaveGroup(networkInfo.id, memberId);
                  } catch (networkError) {
                    console.log('Error leaving network (may not be a member):', networkError);
                  }
                }
                
                onLeaveGroup();
              } catch (error) {
                console.error('Error leaving group:', error);
                Alert.alert('Error', 'Failed to leave group');
              }
            },
          },
        ]
      );
      return;
    }

    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only group admin can remove members');
      return;
    }

    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            try {
              // Remove from conversation
              await removeConversationParticipant(conversationId, memberId);
              
              // For network-linked groups, also remove from the network
              if (networkInfo?.id && playerId) {
                try {
                  await removeGroupMember(networkInfo.id, playerId, memberId);
                } catch (networkError) {
                  console.log('Error removing from network:', networkError);
                }
              }
              
              await onRefetch();
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', 'Failed to remove member');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  }, [conversationId, playerId, isAdmin, onRefetch, onLeaveGroup, networkInfo]);

  // Handle promote member to admin (only for network-linked groups)
  const handlePromoteMember = useCallback(async (memberId: string) => {
    if (!networkInfo?.id || !playerId) {
      Alert.alert('Error', 'Cannot promote members in this group');
      return;
    }

    Alert.alert(
      'Promote to Admin',
      'Are you sure you want to make this member an admin?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            setIsUpdating(true);
            try {
              await promoteMember(networkInfo.id, playerId, memberId);
              // Refresh moderator list
              await onRefetchNetworkInfo();
            } catch (error) {
              console.error('Error promoting member:', error);
              Alert.alert('Error', 'Failed to promote member');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  }, [networkInfo, playerId, onRefetchNetworkInfo]);

  // Handle demote member to regular member (only for network-linked groups)
  const handleDemoteMember = useCallback(async (memberId: string) => {
    if (!networkInfo?.id || !playerId) {
      Alert.alert('Error', 'Cannot demote members in this group');
      return;
    }

    Alert.alert(
      'Demote to Member',
      'Are you sure you want to remove admin privileges from this member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Demote',
          style: 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            try {
              await demoteMember(networkInfo.id, playerId, memberId);
              // Refresh moderator list
              await onRefetchNetworkInfo();
            } catch (error) {
              console.error('Error demoting member:', error);
              Alert.alert('Error', 'Failed to demote member. You may be the last admin.');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  }, [networkInfo, playerId, onRefetchNetworkInfo]);

  // Show member options (promote/demote/remove)
  const handleMemberLongPress = useCallback((memberId: string, isMemberAdmin: boolean) => {
    if (memberId === playerId) return; // Can't manage yourself
    if (!isAdmin) return; // Only admins can manage members

    const options: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> = [];

    // For network-linked groups, show promote/demote options
    if (networkInfo?.id) {
      if (isMemberAdmin) {
        options.push({
          text: 'Demote to Member',
          style: 'destructive',
          onPress: () => handleDemoteMember(memberId),
        });
      } else {
        options.push({
          text: 'Promote to Admin',
          onPress: () => handlePromoteMember(memberId),
        });
        options.push({
          text: 'Remove from Group',
          style: 'destructive',
          onPress: () => handleRemoveMember(memberId),
        });
      }
    } else {
      // For simple groups, only show remove option (non-admins only)
      if (!isMemberAdmin) {
        options.push({
          text: 'Remove from Group',
          style: 'destructive',
          onPress: () => handleRemoveMember(memberId),
        });
      }
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Manage Member', 'Choose an action', options);
  }, [playerId, isAdmin, networkInfo, handlePromoteMember, handleDemoteMember, handleRemoveMember]);

  return {
    isUpdating,
    showAddMemberModal,
    setShowAddMemberModal,
    handleAddMember,
    handleMembersAdded,
    handleRemoveMember,
    handlePromoteMember,
    handleDemoteMember,
    handleMemberLongPress,
  };
}
