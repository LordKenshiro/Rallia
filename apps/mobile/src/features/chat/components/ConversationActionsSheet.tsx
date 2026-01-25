/**
 * ConversationActionsSheet Component
 * Bottom sheet for conversation actions (pin, mute, archive, delete)
 */

import React, { memo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';
import { spacingPixels, fontSizePixels, primary, neutral, status } from '@rallia/design-system';
import type { ConversationPreview } from '@rallia/shared-services';

interface ConversationActionsSheetProps {
  visible: boolean;
  conversation: ConversationPreview | null;
  onClose: () => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onToggleArchive: () => void;
  onLeave?: () => void;
}

function ConversationActionsSheetComponent({
  visible,
  conversation,
  onClose,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  onLeave,
}: ConversationActionsSheetProps) {
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();

  if (!conversation) return null;

  const isPinned = conversation.is_pinned ?? false;
  const isMuted = conversation.is_muted ?? false;
  const isArchived = conversation.is_archived ?? false;
  const isGroup = conversation.conversation_type === 'group';

  // Get conversation name for display
  const conversationName = 
    conversation.conversation_type === 'direct' && conversation.other_participant
      ? `${conversation.other_participant.first_name}${conversation.other_participant.last_name ? ' ' + conversation.other_participant.last_name : ''}`
      : conversation.title || t('chat.actions.conversation' as any);

  type ActionItem = {
    id: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    destructive?: boolean;
    show?: boolean;
  };

  const actions: ActionItem[] = [
    {
      id: 'pin',
      label: isPinned ? t('chat.actions.unpin' as any) : t('chat.actions.pin' as any),
      icon: isPinned ? 'pin-outline' : 'pin',
      onPress: () => {
        onTogglePin();
        onClose();
      },
    },
    {
      id: 'mute',
      label: isMuted ? t('chat.actions.unmute' as any) : t('chat.actions.mute' as any),
      icon: isMuted ? 'notifications' : 'notifications-off',
      onPress: () => {
        onToggleMute();
        onClose();
      },
    },
    {
      id: 'archive',
      label: isArchived ? t('chat.actions.unarchive' as any) : t('chat.actions.archive' as any),
      icon: isArchived ? 'archive-outline' : 'archive',
      onPress: () => {
        onToggleArchive();
        onClose();
      },
    },
    {
      id: 'leave',
      label: t('chat.actions.leaveGroup' as any),
      icon: 'exit',
      onPress: () => {
        onLeave?.();
        onClose();
      },
      destructive: true,
      show: isGroup && !!onLeave,
    },
  ];

  const visibleActions = actions.filter((action) => action.show !== false);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable 
          style={[
            styles.sheet,
            { backgroundColor: isDark ? colors.card : '#FFFFFF' }
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Conversation Name Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text 
              style={[styles.headerText, { color: colors.text }]}
              numberOfLines={1}
            >
              {conversationName}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {visibleActions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionItem,
                  index < visibleActions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={action.icon}
                  size={22}
                  color={action.destructive ? status.error.DEFAULT : primary[500]}
                  style={styles.actionIcon}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    { color: action.destructive ? status.error.DEFAULT : colors.text },
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: isDark ? neutral[800] : neutral[100] }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>
              {t('common.cancel' as any)}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const ConversationActionsSheet = memo(ConversationActionsSheetComponent);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacingPixels[4],
    paddingBottom: spacingPixels[8],
    paddingHorizontal: spacingPixels[4],
  },
  header: {
    paddingBottom: spacingPixels[3],
    marginBottom: spacingPixels[2],
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: fontSizePixels.lg,
    fontWeight: '600',
  },
  actionsContainer: {
    marginBottom: spacingPixels[3],
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingPixels[3],
  },
  actionIcon: {
    marginRight: spacingPixels[3],
    width: 24,
  },
  actionLabel: {
    fontSize: fontSizePixels.base,
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: spacingPixels[3],
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSizePixels.base,
    fontWeight: '600',
  },
});
