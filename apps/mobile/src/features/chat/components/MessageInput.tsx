/**
 * MessageInput Component
 * Text input for sending messages with emoji keyboard support and reply functionality
 */

import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';
import { spacingPixels, fontSizePixels, primary, neutral } from '@rallia/design-system';
import type { MessageWithSender } from '@rallia/shared-services';

interface MessageInputProps {
  onSend: (message: string, replyToMessageId?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  replyToMessage?: MessageWithSender | null;
  onCancelReply?: () => void;
  onTypingChange?: (isTyping: boolean) => void;
}

function MessageInputComponent({
  onSend,
  placeholder = 'Type your message',
  disabled = false,
  replyToMessage,
  onCancelReply,
  onTypingChange,
}: MessageInputProps) {
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasTypingRef = useRef(false);

  // Handle text change and typing indicator
  const handleTextChange = useCallback((text: string) => {
    setMessage(text);
    
    // Notify typing status
    if (onTypingChange) {
      const isTyping = text.length > 0;
      
      // Only send typing indicator when status changes or periodically
      if (isTyping && !wasTypingRef.current) {
        onTypingChange(true);
        wasTypingRef.current = true;
      }
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 2 seconds of inactivity
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          onTypingChange(false);
          wasTypingRef.current = false;
        }, 2000);
      } else {
        onTypingChange(false);
        wasTypingRef.current = false;
      }
    }
  }, [onTypingChange]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Stop typing when component unmounts
      if (wasTypingRef.current && onTypingChange) {
        onTypingChange(false);
      }
    };
  }, [onTypingChange]);

  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      // Stop typing indicator when sending
      if (onTypingChange && wasTypingRef.current) {
        onTypingChange(false);
        wasTypingRef.current = false;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      onSend(trimmedMessage, replyToMessage?.id);
      setMessage('');
      onCancelReply?.();
      // Keep keyboard open after sending
      inputRef.current?.focus();
    }
  }, [message, onSend, disabled, replyToMessage, onCancelReply, onTypingChange]);

  const canSend = message.trim().length > 0 && !disabled;

  // Get reply preview sender name
  const replySenderName = replyToMessage?.sender?.profile
    ? `${replyToMessage.sender.profile.first_name || 'Unknown'}`
    : 'Unknown';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.background : '#FFFFFF', borderTopColor: colors.border },
      ]}
    >
      {/* Reply Banner */}
      {replyToMessage && (
        <View style={[styles.replyBanner, { backgroundColor: isDark ? colors.card : neutral[100] }]}>
          <View style={[styles.replyIndicator, { backgroundColor: primary[500] }]} />
          <View style={styles.replyContent}>
            <Text style={[styles.replySenderName, { color: primary[500] }]}>
              {t('chat.input.replyingTo' as any, { name: replySenderName })}
            </Text>
            <Text 
              style={[styles.replyPreview, { color: colors.textMuted }]} 
              numberOfLines={1}
            >
              {replyToMessage.content}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} style={styles.cancelReplyButton}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          { backgroundColor: isDark ? colors.card : '#F0F0F0' },
        ]}
      >
        {/* Emoji button - opens native emoji keyboard */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            // On most devices, long-pressing the keyboard button or using globe key shows emoji
            // This is a hint to the user - focusing the input will show the keyboard
            inputRef.current?.focus();
          }}
        >
          <Ionicons name="happy-outline" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text }]}
          value={message}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          editable={!disabled}
          returnKeyType="default"
          blurOnSubmit={false}
        />

        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            canSend && { backgroundColor: primary[500] },
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Ionicons
            name="send"
            size={20}
            color={canSend ? '#FFFFFF' : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const MessageInput = memo(MessageInputComponent);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[2],
    borderTopWidth: 1,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingPixels[2],
    paddingHorizontal: spacingPixels[3],
    marginBottom: spacingPixels[2],
    borderRadius: 8,
  },
  replyIndicator: {
    width: 3,
    height: '100%',
    minHeight: 32,
    borderRadius: 2,
    marginRight: spacingPixels[2],
  },
  replyContent: {
    flex: 1,
  },
  replySenderName: {
    fontSize: fontSizePixels.xs,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyPreview: {
    fontSize: fontSizePixels.sm,
  },
  cancelReplyButton: {
    padding: spacingPixels[1],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: spacingPixels[2],
    paddingVertical: spacingPixels[1],
    minHeight: 48,
  },
  iconButton: {
    padding: spacingPixels[2],
  },
  input: {
    flex: 1,
    fontSize: fontSizePixels.base,
    maxHeight: 100,
    paddingVertical: spacingPixels[2],
    paddingHorizontal: spacingPixels[2],
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacingPixels[1],
  },
});
