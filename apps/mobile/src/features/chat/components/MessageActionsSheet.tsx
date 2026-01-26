/**
 * MessageActionsSheet Component
 * Bottom sheet for message actions (react, reply, edit, delete, copy)
 * Includes integrated emoji picker for reactions
 */

import React, { memo, useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';
import { spacingPixels, fontSizePixels, primary, neutral, status } from '@rallia/design-system';
import type { MessageWithSender } from '@rallia/shared-services';
import { EmojiReactionPicker } from './EmojiReactionPicker';

interface MessageActionsSheetProps {
  visible: boolean;
  message: MessageWithSender | null;
  isOwnMessage: boolean;
  onClose: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  /** Y position of the message for positioning the emoji picker */
  messageY?: number;
}

type ActionItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  ownOnly?: boolean;
};

function MessageActionsSheetComponent({
  visible,
  message,
  isOwnMessage,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onReact,
  messageY,
}: MessageActionsSheetProps) {
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleCopy = useCallback(async () => {
    if (message?.content) {
      await Clipboard.setStringAsync(message.content);
    }
    onClose();
  }, [message, onClose]);

  const handleReply = useCallback(() => {
    onReply();
    onClose();
  }, [onReply, onClose]);

  const handleEdit = useCallback(() => {
    onEdit();
    onClose();
  }, [onEdit, onClose]);

  const handleDelete = useCallback(() => {
    onDelete();
    onClose();
  }, [onDelete, onClose]);

  const handleShowEmojiPicker = useCallback(() => {
    setShowEmojiPicker(true);
    // Note: The action sheet will hide via visible && !showEmojiPicker
  }, []);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      setShowEmojiPicker(false);
      onReact(emoji);
      onClose();
    },
    [onReact, onClose]
  );

  const handleCloseEmojiPicker = useCallback(() => {
    // Close everything when emoji picker is dismissed
    setShowEmojiPicker(false);
    onClose();
  }, [onClose]);

  // Reset emoji picker state when modal closes
  const handleClose = useCallback(() => {
    setShowEmojiPicker(false);
    onClose();
  }, [onClose]);

  const actions: ActionItem[] = [
    {
      id: 'react',
      label: t('chat.messageActions.addReaction'),
      icon: 'happy-outline',
      onPress: handleShowEmojiPicker,
    },
    {
      id: 'reply',
      label: t('chat.messageActions.reply'),
      icon: 'arrow-undo',
      onPress: handleReply,
    },
    {
      id: 'copy',
      label: t('chat.messageActions.copy'),
      icon: 'copy',
      onPress: handleCopy,
    },
    {
      id: 'edit',
      label: t('chat.messageActions.edit'),
      icon: 'pencil',
      onPress: handleEdit,
      ownOnly: true,
    },
    {
      id: 'delete',
      label: t('chat.messageActions.delete'),
      icon: 'trash',
      onPress: handleDelete,
      destructive: true,
      ownOnly: true,
    },
  ];

  // Filter actions based on ownership
  const visibleActions = actions.filter(action => !action.ownOnly || isOwnMessage);

  if (!message) return null;

  return (
    <>
      <Modal
        visible={visible && !showEmojiPicker}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable
            style={[styles.sheet, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}
            onPress={e => e.stopPropagation()}
          >
            {/* Message Preview */}
            <View style={[styles.preview, { borderBottomColor: colors.border }]}>
              <Text style={[styles.previewText, { color: colors.textMuted }]} numberOfLines={2}>
                {message.content}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              {visibleActions.map((action, index) => (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.actionItem,
                    index < visibleActions.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
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
              style={[styles.cancelButton, { backgroundColor: neutral[100] }]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Emoji Reaction Picker - shown when "Add Reaction" is tapped */}
      <EmojiReactionPicker
        visible={showEmojiPicker}
        onSelect={handleEmojiSelect}
        onClose={handleCloseEmojiPicker}
        anchorY={messageY}
        isOwnMessage={isOwnMessage}
      />
    </>
  );
}

export const MessageActionsSheet = memo(MessageActionsSheetComponent);

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
  preview: {
    paddingBottom: spacingPixels[3],
    marginBottom: spacingPixels[2],
    borderBottomWidth: 1,
  },
  previewText: {
    fontSize: fontSizePixels.sm,
    fontStyle: 'italic',
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
