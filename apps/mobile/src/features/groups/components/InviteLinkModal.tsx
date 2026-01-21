/**
 * InviteLinkModal
 * Modal showing the group invite link with options to copy, share, and generate QR code
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { Text } from '@rallia/shared-components';
import { useThemeStyles } from '../../../hooks';
import {
  useGroupInviteCode,
  useResetGroupInviteCode,
  getGroupInviteLink,
} from '@rallia/shared-hooks';

interface InviteLinkModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  currentUserId: string;
  isModerator: boolean;
}

export function InviteLinkModal({
  visible,
  onClose,
  groupId,
  groupName,
  currentUserId,
  isModerator,
}: InviteLinkModalProps) {
  const { colors, isDark } = useThemeStyles();
  const [copied, setCopied] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  const { data: inviteCode, isLoading, refetch } = useGroupInviteCode(groupId);
  const resetInviteCodeMutation = useResetGroupInviteCode();

  const inviteLink = inviteCode ? getGroupInviteLink(inviteCode) : '';
  
  // Generate QR code URL using a public API (Google Charts API for QR codes)
  const qrCodeUrl = inviteLink 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}&bgcolor=${isDark ? '1C1C1E' : 'F2F2F7'}`
    : '';

  const handleCopyLink = useCallback(async () => {
    if (!inviteLink) return;
    
    try {
      await Clipboard.setStringAsync(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  }, [inviteLink]);

  const handleCopyCode = useCallback(async () => {
    if (!inviteCode) return;
    
    try {
      await Clipboard.setStringAsync(inviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy code');
    }
  }, [inviteCode]);

  const handleShare = useCallback(async () => {
    if (!inviteLink) return;

    try {
      await Share.share({
        message: `Join my group "${groupName}" on Rallia!\n\nUse code: ${inviteCode}\n\nOr click this link: ${inviteLink}`,
        title: `Join ${groupName} on Rallia`,
      });
    } catch (error) {
      // User cancelled or error
      if (error instanceof Error && error.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share invite');
      }
    }
  }, [inviteLink, inviteCode, groupName]);

  const handleResetCode = useCallback(() => {
    Alert.alert(
      'Reset Invite Code',
      'This will invalidate the current invite link. Anyone with the old link won\'t be able to join. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetInviteCodeMutation.mutateAsync({
                groupId,
                moderatorId: currentUserId,
              });
              refetch();
              Alert.alert('Success', 'Invite code has been reset');
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to reset code');
            }
          },
        },
      ]
    );
  }, [groupId, currentUserId, resetInviteCodeMutation, refetch]);

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
              Invite to Group
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                  Generating invite link...
                </Text>
              </View>
            ) : (
              <>
                {/* Description */}
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
                  Share this link or code with anyone you want to invite to the group.
                </Text>

                {/* Toggle between Code and QR */}
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      !showQRCode && { backgroundColor: colors.primary },
                      { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }
                    ]}
                    onPress={() => setShowQRCode(false)}
                  >
                    <Text 
                      size="sm" 
                      weight="medium" 
                      style={{ color: !showQRCode ? '#FFFFFF' : colors.textSecondary }}
                    >
                      Code
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      showQRCode && { backgroundColor: colors.primary },
                      { borderTopRightRadius: 8, borderBottomRightRadius: 8 }
                    ]}
                    onPress={() => setShowQRCode(true)}
                  >
                    <Text 
                      size="sm" 
                      weight="medium" 
                      style={{ color: showQRCode ? '#FFFFFF' : colors.textSecondary }}
                    >
                      QR Code
                    </Text>
                  </TouchableOpacity>
                </View>

                {showQRCode ? (
                  /* QR Code Display */
                  <View style={[styles.qrContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                    <Image
                      source={{ uri: qrCodeUrl }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                    <Text size="xs" style={{ color: colors.textMuted, marginTop: 8 }}>
                      Scan to join the group
                    </Text>
                  </View>
                ) : (
                  /* Invite Code Display */
                  <View style={[styles.codeContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                    <Text size="xs" style={{ color: colors.textMuted, marginBottom: 4 }}>
                      INVITE CODE
                    </Text>
                    <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.7}>
                      <Text weight="bold" size="xl" style={{ color: colors.primary, letterSpacing: 4 }}>
                        {inviteCode}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Link Display */}
                <View style={[styles.linkContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', borderColor: colors.border }]}>
                  <Text numberOfLines={1} style={{ color: colors.text, flex: 1 }}>
                    {inviteLink}
                  </Text>
                  <TouchableOpacity 
                    onPress={handleCopyLink} 
                    style={[styles.copyButton, { backgroundColor: copied ? colors.primary : (isDark ? '#3A3A3C' : '#E5E5EA') }]}
                  >
                    <Ionicons 
                      name={copied ? 'checkmark' : 'copy-outline'} 
                      size={18} 
                      color={copied ? '#FFFFFF' : colors.text} 
                    />
                  </TouchableOpacity>
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={handleShare}
                  >
                    <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                    <Text weight="semibold" style={{ color: '#FFFFFF', marginLeft: 8 }}>
                      Share Invite
                    </Text>
                  </TouchableOpacity>

                  {isModerator && (
                    <TouchableOpacity
                      style={[styles.resetButton, { borderColor: colors.border }]}
                      onPress={handleResetCode}
                      disabled={resetInviteCodeMutation.isPending}
                    >
                      <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
                      <Text size="sm" style={{ color: colors.textSecondary, marginLeft: 6 }}>
                        Reset Code
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Info */}
                <View style={styles.infoSection}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                  <Text size="xs" style={{ color: colors.textMuted, marginLeft: 6, flex: 1 }}>
                    Anyone with this code or link can join the group directly.
                  </Text>
                </View>
              </>
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
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: 16,
  },
  toggleButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  qrImage: {
    width: 180,
    height: 180,
    borderRadius: 8,
  },
  codeContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 24,
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
});
